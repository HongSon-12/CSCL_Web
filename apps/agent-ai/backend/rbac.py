# --- HỆ THỐNG PHÂN QUYỀN VÀ BẢO MẬT CORE (RBAC & SCOPES) ---
# File này chứa các helper kiểm tra quyền truy cập (Permission), phạm vi dữ liệu (Scope)
# và trạng thái khóa kỳ sổ (Period Lock) để đảm bảo an toàn thông tin dữ liệu chỉ số chất lượng.

from datetime import date
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from models import QualityRole, QualityUserRole, QualityUserScope, User

# Định nghĩa danh sách các quyền cốt lõi thuộc Portal QLCL Web (Phase 1)
# Bất kỳ user nào muốn thao tác trên các phân hệ này đều cần có quyền tương ứng.
PHASE1_PORTAL_PERMISSIONS = {
    "portal:view",             # Quyền xem cổng thông tin Portal chung
    "dashboard:view",          # Quyền xem màn hình Dashboard tổng hợp chỉ số
    "reports:input:view",      # Quyền xem biểu mẫu và danh sách lô nhập liệu
    "reports:import:view",     # Quyền truy cập tính năng import báo cáo từ Excel
    "reports:review:view",     # Quyền xem và duyệt/từ chối báo cáo số liệu
    "reports:period_lock:view",# Quyền xem cấu hình và thực hiện khóa/mở khóa kỳ sổ
    "etl:view",                # Quyền xem trạng thái đồng bộ dữ liệu tự động ETL
    "indicators:view",         # Quyền xem danh mục chỉ số và biến số lâm sàng
    "admin:view",              # Quyền truy cập các tính năng quản trị hệ thống
    "ai_agent:use",            # Quyền sử dụng Agent AI/RAG tư vấn
}

# Ánh xạ bí danh (alias) từ các quyền của hệ thống cũ sang quyền mới của Portal
# Giúp tương thích ngược khi hệ thống cũ gọi các API mới.
LEGACY_PERMISSION_ALIASES = {
    "chat:use": {"ai_agent:use", "portal:view"},
    "users:read": {"admin:view"},
    "users:manage": {"admin:view"},
    "roles:manage": {"admin:view"},
}


def user_identifiers(user: User) -> list[str]:
    """
    Helper lấy ra danh sách các định danh của User (ID dạng chuỗi UUID và tên tài khoản).
    Dùng để đối chiếu chéo trong các bảng gán quyền gộp.
    """
    return [str(user.id), user.username]


def get_quality_roles(db: Session, user: User) -> list[QualityRole]:
    """
    Truy vấn danh sách các vai trò (Roles) chất lượng của User hiện tại từ bảng `quality_roles`
    thông qua bảng liên kết `quality_user_roles`. Chỉ lấy các vai trò đang hoạt động (is_active = True).
    """
    return (
        db.query(QualityRole)
        .join(QualityUserRole, QualityUserRole.role_id == QualityRole.id)
        .filter(QualityUserRole.user_id.in_(user_identifiers(user)))
        .filter(QualityRole.is_active.is_(True))
        .all()
    )


def get_user_role_codes(db: Session, user: User) -> list[str]:
    """
    Lấy toàn bộ danh sách mã vai trò của User, bao gồm cả vai trò cũ (từ user.roles)
    và các vai trò chất lượng mới (từ quality_roles). Trả về danh sách chuỗi đã sắp xếp.
    """
    legacy_roles = {role.name for role in user.roles}
    quality_roles = {role.role_code for role in get_quality_roles(db, user)}
    return sorted(legacy_roles | quality_roles)


def get_user_permission_codes(db: Session, user: User) -> list[str]:
    """
    Tính toán và tổng hợp toàn bộ danh sách mã quyền (Permission Codes) của User:
    1. Lấy quyền từ các vai trò hệ thống cũ (legacy roles) và ánh xạ qua alias.
    2. Lấy quyền từ các vai trò nghiệp vụ chất lượng mới (quality roles).
    3. Đặc cách: Nếu user có vai trò hệ thống cũ là 'Admin', tự động cấp toàn bộ quyền Portal QLCL.
    """
    permission_codes = set()
    legacy_role_names = {role.name for role in user.roles}

    # 1. Thu thập quyền cũ + áp dụng alias tương thích ngược
    for role in user.roles:
        for permission in role.permissions:
            permission_codes.add(permission.code)
            permission_codes.update(LEGACY_PERMISSION_ALIASES.get(permission.code, set()))

    # 2. Thu thập quyền mới từ phân hệ QLCL Web
    for role in get_quality_roles(db, user):
        for permission in role.permissions:
            permission_codes.add(permission.permission_code)

    # 3. Đặc quyền cho Admin cũ
    if "Admin" in legacy_role_names:
        permission_codes.update(PHASE1_PORTAL_PERMISSIONS)

    return sorted(permission_codes)


def get_user_scopes(db: Session, user: User) -> list[dict]:
    """
    Truy vấn phạm vi dữ liệu được phép thao tác của User từ bảng `quality_user_scopes`.
    Trả về danh sách dạng: [{'scope_type': 'department', 'scope_code': 'QLCL'}]
    Ví dụ: Nhân viên khoa A chỉ được nhập số liệu của khoa A.
    """
    scopes = (
        db.query(QualityUserScope)
        .filter(QualityUserScope.user_id.in_(user_identifiers(user)))
        .order_by(QualityUserScope.scope_type, QualityUserScope.scope_code)
        .all()
    )
    return [
        {
            "scope_type": scope.scope_type,
            "scope_code": scope.scope_code,
        }
        for scope in scopes
    ]


def require_permission(db: Session, user: User, permission_code: str) -> None:
    """
    [BẢO VỆ API] Yêu cầu User phải có chính xác mã quyền `permission_code`.
    Nếu không có, chặn ngay lập tức và trả về mã lỗi HTTP 403 Forbidden.
    """
    if permission_code not in get_user_permission_codes(db, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing permission: {permission_code}",
        )


def require_any_permission(db: Session, user: User, permission_codes: Iterable[str]) -> None:
    """
    [BẢO VỆ API] Yêu cầu User phải có ít nhất một trong các mã quyền thuộc danh sách `permission_codes`.
    Nếu không có quyền nào thỏa mãn, trả về mã lỗi HTTP 403 Forbidden.
    """
    permissions = set(get_user_permission_codes(db, user))
    required = set(permission_codes)
    if permissions.isdisjoint(required):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing one of permissions: {', '.join(sorted(required))}",
        )


def require_scope(db: Session, user: User, scope_type: str, scope_code: str | None) -> None:
    """
    [KIỂM TRA PHẠM VI DỮ LIỆU] Chặn người dùng thao tác ngoài khoa/trạm được giao.
    
    Quy tắc nghiệp vụ:
    1. Nếu scope_code trống -> Bỏ qua không cần kiểm tra.
    2. Nếu User có vai trò Quản trị cao cấp ('Admin', 'system_admin', 'quality_admin') ->
       Đặc cách bỏ qua, được quyền xem và thao tác dữ liệu toàn bệnh viện.
    3. Đối với các vai trò khác -> So khớp cặp (scope_type, scope_code) với dữ liệu đã gán trong `quality_user_scopes`.
       Nếu không khớp, trả về lỗi HTTP 403 Forbidden.
    """
    if not scope_code:
        return

    role_codes = set(get_user_role_codes(db, user))
    # Đặc cách bỏ qua kiểm tra scope cho Admin
    if {"Admin", "system_admin", "quality_admin"} & role_codes:
        return

    user_scopes = {
        (scope["scope_type"], scope["scope_code"])
        for scope in get_user_scopes(db, user)
    }
    if (scope_type, scope_code) not in user_scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing scope: {scope_type}:{scope_code}",
        )


def require_period_not_locked(
    db: Session,
    report_date: date,
    period_type: str = "daily",
    department_code: str | None = None,
    station_code: str | None = None,
) -> None:
    """
    [BẢO VỆ KỲ BÁO CÁO] Ngăn chặn tạo/sửa đổi số liệu khi đợt báo cáo đã bị Khóa sổ (Locked).
    
    Quy tắc nghiệp vụ:
    1. Kiểm tra bảng khóa sổ `quality_period_locks` có tồn tại trong CSDL không.
       Nếu bảng chưa được tạo (phục vụ Phase 5), hệ thống coi như chưa khóa (Cho qua).
    2. Nếu bảng tồn tại, thực hiện truy vấn dòng khóa tương thích với:
       - Tần suất (period_type): daily hoặc monthly.
       - Ngày báo cáo (report_date).
       - Khoa phòng (department_code).
       - Trạm vệ tinh (station_code).
    3. Nếu dòng khóa sổ tồn tại và `is_locked = true`, chặn hành động bằng mã lỗi HTTP 409 Conflict.
    """
    table_exists = db.execute(text("SELECT to_regclass('public.quality_period_locks')")).scalar()
    if not table_exists:
        return

    locked = db.execute(
        text(
            """
            SELECT 1
            FROM quality_period_locks
            WHERE period_type = :period_type
              AND report_date = :report_date
              AND COALESCE(department_code, '') = COALESCE(:department_code, '')
              AND COALESCE(station_code, '') = COALESCE(:station_code, '')
              AND is_locked = true
            LIMIT 1
            """
        ),
        {
            "period_type": period_type,
            "report_date": report_date,
            "department_code": department_code,
            "station_code": station_code,
        },
    ).first()

    if locked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reporting period is locked.",
        )
