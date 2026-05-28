from fastapi import Depends, FastAPI, HTTPException, Request, status, UploadFile, File, Form, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
import os
import hashlib
import shutil
import csv
import io
import openpyxl
import urllib.parse
from dotenv import load_dotenv
from audit_service import log_audit
from auth import verify_password, create_access_token, get_current_user
from models import (
    Base,
    QualityDepartment,
    QualityHospital,
    QualityIndicatorCatalog,
    QualityIndicatorVariable,
    QualityStation,
    User,
    QualityInputBatch,
    QualityInputRecord,
    QualityImportBatch,
    QualityImportRow,
    QualityReviewTask,
    QualityPeriodLock,
    QualityCalculationRun,
    QualityIndicatorResult,
)
from rbac import (
    get_user_permission_codes,
    get_user_role_codes,
    get_user_scopes,
    require_any_permission,
)

load_dotenv()

# Database setup.
# NOTE: POSTGRES_* is the local AgentAI/RAG database. QUALITY_POSTGRES_* is
# the external QLCL Web database at 172.16.20.17. Do not store quality_* data
# in the local AgentAI database.


def build_database_url(prefix: str = "") -> str:
    url = os.getenv(f"{prefix}POSTGRES_URL")
    if url:
        return url.replace("postgresql+psycopg2://", "postgresql://", 1)

    db_user = os.getenv(f"{prefix}POSTGRES_USER")
    db_password = urllib.parse.quote_plus(os.getenv(f"{prefix}POSTGRES_PASSWORD", ""))
    db_host = os.getenv(f"{prefix}POSTGRES_HOST")
    db_port = os.getenv(f"{prefix}POSTGRES_PORT")
    db_name = os.getenv(f"{prefix}POSTGRES_DB")
    return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


AGENTAI_DATABASE_URL = build_database_url()
QUALITY_DATABASE_URL = build_database_url("QUALITY_")

engine = create_engine(AGENTAI_DATABASE_URL)
quality_engine = create_engine(QUALITY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
QualitySessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=quality_engine)

AGENTAI_TABLES = [table for table in Base.metadata.sorted_tables if not table.name.startswith("quality_")]
QUALITY_TABLES = [table for table in Base.metadata.sorted_tables if table.name.startswith("quality_")]

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_quality_db():
    db = QualitySessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(title="AI Chatbot Backend", version="3.0")


def get_current_user_model(current_user: str = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.username == current_user).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive or missing user")
    return user


def serialize_current_user(db: Session, user: User) -> dict:
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "roles": get_user_role_codes(db, user),
        "permissions": get_user_permission_codes(db, user),
        "scopes": get_user_scopes(db, user),
    }


def ok_response(data, message=None):
    return {"success": True, "data": data, "message": message}


def serialize_department(department: QualityDepartment) -> dict:
    return {
        "id": department.id,
        "code": department.code,
        "name": department.name,
        "short_name": department.short_name,
        "parent_code": department.parent_code,
        "is_active": department.is_active,
    }


def serialize_station(station: QualityStation) -> dict:
    return {
        "id": station.id,
        "code": station.code,
        "name": station.name,
        "department_code": station.department_code,
        "is_satellite": station.is_satellite,
        "is_active": station.is_active,
    }


def serialize_hospital(hospital: QualityHospital) -> dict:
    return {
        "id": hospital.id,
        "code": hospital.code,
        "name": hospital.name,
        "api_id": hospital.api_id,
        "excel_name": hospital.excel_name,
        "is_active": hospital.is_active,
    }


def numeric_or_none(value):
    return float(value) if value is not None else None


def serialize_indicator(indicator: QualityIndicatorCatalog) -> dict:
    return {
        "id": indicator.id,
        "code": indicator.code,
        "name": indicator.name,
        "description": indicator.description,
        "group_code": indicator.group_code,
        "formula_text": indicator.formula_text,
        "formula_python_key": indicator.formula_python_key,
        "unit": indicator.unit,
        "frequency": indicator.frequency,
        "source_type": indicator.source_type,
        "owner_department_code": indicator.owner_department_code,
        "is_active": indicator.is_active,
    }


def serialize_variable(variable: QualityIndicatorVariable) -> dict:
    return {
        "id": variable.id,
        "variable_code": variable.variable_code,
        "name": variable.name,
        "description": variable.description,
        "group_code": variable.group_code,
        "data_type": variable.data_type,
        "unit": variable.unit,
        "source_type": variable.source_type,
        "source_table": variable.source_table,
        "source_column": variable.source_column,
        "required": variable.required,
        "min_value": numeric_or_none(variable.min_value),
        "max_value": numeric_or_none(variable.max_value),
        "calculation_note": variable.calculation_note,
        "is_active": variable.is_active,
    }

@app.on_event("startup")
def startup():
    # Enable pgvector extension
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    # NOTE: AgentAI startup creates only non-quality tables in the local DB.
    # It does not create quality_* tables in the AgentAI database.
    Base.metadata.create_all(bind=engine, tables=AGENTAI_TABLES)

    try:
        # NOTE: QLCL Web tables are created only on QUALITY_POSTGRES_*.
        # This creates missing tables and does not rewrite existing rows.
        Base.metadata.create_all(bind=quality_engine, tables=QUALITY_TABLES)
    except Exception as exc:
        print(f"Quality database startup check failed: {exc}")

@app.get("/api/v1/health")
async def health_check(db: Session = Depends(get_db), quality_db: Session = Depends(get_quality_db)):
    try:
        # Check database connection
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"

    try:
        quality_db.execute(text("SELECT 1"))
        quality_db_status = "ok"
    except Exception:
        quality_db_status = "error"
        
    return {
        "status": "ok",
        "database": db_status,
        "quality_database": quality_db_status,
        "storage": "ok",
        "version": "3.0"
    }

@app.post("/api/v1/auth/login")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    quality_db: Session = Depends(get_quality_db),
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not user.is_active or not user.password_hash or not verify_password(form_data.password, user.password_hash):
        try:
            log_audit(
                quality_db,
                form_data.username,
                "login_failed",
                "users",
                str(user.id) if user else None,
                after_data={"username": form_data.username},
                request=request,
            )
        except Exception:
            quality_db.rollback()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username})
    try:
        log_audit(
            quality_db,
            user,
            "login_success",
            "users",
            str(user.id),
            after_data={"username": user.username},
            request=request,
        )
    except Exception:
        quality_db.rollback()
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/v1/auth/me")
async def get_me(user: User = Depends(get_current_user_model), quality_db: Session = Depends(get_quality_db)):
    return serialize_current_user(quality_db, user)

@app.get("/api/v1/admin/users")
async def get_users(current_user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    isAdmin = any(role.name == "Admin" for role in user.roles)
    
    if not isAdmin:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    users = db.query(User).all()
    return [{"username": u.username, "roles": [r.name for r in u.roles]} for u in users]


@app.get("/api/v1/quality/master/departments")
async def list_quality_departments(
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    require_any_permission(quality_db, current_user, ["portal:view", "admin:view"])
    departments = (
        quality_db.query(QualityDepartment)
        .filter(QualityDepartment.is_active.is_(True))
        .order_by(QualityDepartment.code)
        .all()
    )
    return ok_response([serialize_department(department) for department in departments])


@app.get("/api/v1/quality/master/stations")
async def list_quality_stations(
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    require_any_permission(quality_db, current_user, ["portal:view", "admin:view"])
    stations = (
        quality_db.query(QualityStation)
        .filter(QualityStation.is_active.is_(True))
        .order_by(QualityStation.code)
        .all()
    )
    return ok_response([serialize_station(station) for station in stations])


@app.get("/api/v1/quality/master/hospitals")
async def list_quality_hospitals(
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    require_any_permission(quality_db, current_user, ["portal:view", "admin:view"])
    hospitals = (
        quality_db.query(QualityHospital)
        .filter(QualityHospital.is_active.is_(True))
        .order_by(QualityHospital.name)
        .all()
    )
    return ok_response([serialize_hospital(hospital) for hospital in hospitals])


@app.get("/api/v1/quality/indicators/catalog")
async def list_quality_indicator_catalog(
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    require_any_permission(quality_db, current_user, ["indicators:view", "admin:view"])
    indicators = (
        quality_db.query(QualityIndicatorCatalog)
        .filter(QualityIndicatorCatalog.is_active.is_(True))
        .order_by(QualityIndicatorCatalog.code)
        .all()
    )
    return ok_response([serialize_indicator(indicator) for indicator in indicators])


@app.get("/api/v1/quality/indicators/variables")
async def list_quality_indicator_variables(
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    require_any_permission(quality_db, current_user, ["indicators:view", "admin:view"])
    variables = (
        quality_db.query(QualityIndicatorVariable)
        .filter(QualityIndicatorVariable.is_active.is_(True))
        .order_by(QualityIndicatorVariable.variable_code)
        .all()
    )
    return ok_response([serialize_variable(variable) for variable in variables])


# ==============================================================================
# --- PHASE 3: BIỂU MẪU VÀ QUY TRÌNH NHẬP LIỆU CHỈ SỐ LÂM SÀNG THỦ CÔNG (MANUAL INPUT) ---
# Phân hệ này cho phép nhân viên nhập liệu ghi nhận số liệu thô cho các chỉ số lâm sàng
# trên giao diện web dạng bảng biểu (form-template), lưu nháp (draft), cập nhật, và gửi duyệt (submit).
# ==============================================================================

from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from rbac import require_permission, require_scope, require_period_not_locked

# --- ĐỊNH NGHĨA DỮ LIỆU ĐẦU VÀO (PYDANTIC SCHEMAS) ---

class RecordInput(BaseModel):
    """
    Schema đại diện cho từng dòng giá trị chỉ số/biến số thô được nhập vào form.
    """
    variable_code: str                      # Mã biến số lâm sàng (Ví dụ: A1, A2, B1...)
    indicator_code: Optional[str] = None     # Mã chỉ số tương ứng (nếu có)
    value: Optional[float] = None            # Giá trị số thực (Ví dụ: 15.5)
    text_value: Optional[str] = None        # Giá trị văn bản (nếu là câu hỏi chữ)
    note: Optional[str] = None              # Ghi chú riêng cho biến số này

class BatchCreateInput(BaseModel):
    """
    Schema đầu vào khi TẠO MỚI một lô báo cáo nhập liệu.
    """
    report_date: date                       # Ngày báo cáo số liệu
    period_type: str = "daily"              # Tần suất báo cáo: daily (ngày), monthly (tháng)
    department_code: str                    # Mã khoa phòng lập báo cáo (Ví dụ: QLCL, KDH...)
    station_code: Optional[str] = None     # Mã trạm vệ tinh (nếu có)
    note: Optional[str] = None              # Nhận xét chung cho ca trực/ngày báo cáo
    records: List[RecordInput]              # Danh sách chi tiết các dòng số liệu thô

class BatchUpdateInput(BaseModel):
    """
    Schema đầu vào khi CẬP NHẬT thông tin một lô báo cáo đang ở dạng Nháp.
    """
    note: Optional[str] = None              # Cập nhật nhận xét chung
    records: List[RecordInput]              # Danh sách chi tiết các dòng số liệu thô mới/cập nhật


class BatchReviewInput(BaseModel):
    """
    [PHASE 5] Schema phê duyệt lô số liệu lâm sàng.
    """
    review_note: Optional[str] = None


class BatchRejectInput(BaseModel):
    """
    [PHASE 5] Schema từ chối phê duyệt lô số liệu lâm sàng (bắt buộc lý do).
    """
    review_note: str


class PeriodLockInput(BaseModel):
    """
    [PHASE 5] Schema yêu cầu khóa sổ kỳ báo cáo.
    """
    report_date: date
    period_type: str = "daily"
    department_code: Optional[str] = None
    station_code: Optional[str] = None
    override_pending: bool = False


class PeriodUnlockInput(BaseModel):
    """
    [PHASE 5] Schema mở khóa sổ kỳ báo cáo (bắt buộc lý do).
    """
    unlock_reason: str



# --- SERIALIZATION HELPERS (CHUYỂN ĐỔI SANG JSON) ---

def serialize_record(record) -> dict:
    """
    Chuyển đổi một đối tượng bản ghi chi tiết QualityInputRecord thành từ điển JSON.
    """
    return {
        "id": record.id,
        "batch_id": record.batch_id,
        "report_date": record.report_date.isoformat() if record.report_date else None,
        "period_type": record.period_type,
        "department_code": record.department_code,
        "station_code": record.station_code,
        "variable_code": record.variable_code,
        "indicator_code": record.indicator_code,
        "value": float(record.value) if record.value is not None else None,
        "text_value": record.text_value,
        "unit": record.unit,
        "note": record.note,
        "row_status": record.row_status,      # Trạng thái dòng: valid (hợp lệ) hoặc error (có lỗi biên)
        "error_code": record.error_code,      # Mã lỗi nghiệp vụ nếu có (Ví dụ: OUT_OF_BOUNDS_MIN)
        "error_message": record.error_message,# Thông báo lỗi hiển thị cho người dùng
    }

def serialize_batch(batch) -> dict:
    """
    Chuyển đổi một lô báo cáo QualityInputBatch gộp đầy đủ chi tiết các records thành JSON.
    """
    return {
        "id": batch.id,
        "batch_code": batch.batch_code,
        "report_date": batch.report_date.isoformat() if batch.report_date else None,
        "period_type": batch.period_type,
        "department_code": batch.department_code,
        "station_code": batch.station_code,
        "source_type": batch.source_type,
        "status": batch.status,                # Trạng thái lô: draft, submitted, approved, rejected, locked
        "created_by": batch.created_by,
        "submitted_by": batch.submitted_by,
        "approved_by": batch.approved_by,
        "rejected_by": batch.rejected_by,
        "locked_by": batch.locked_by,
        "created_at": batch.created_at.isoformat() if batch.created_at else None,
        "submitted_at": batch.submitted_at.isoformat() if batch.submitted_at else None,
        "approved_at": batch.approved_at.isoformat() if batch.approved_at else None,
        "rejected_at": batch.rejected_at.isoformat() if batch.rejected_at else None,
        "locked_at": batch.locked_at.isoformat() if batch.locked_at else None,
        "note": batch.note,
        "reject_reason": batch.reject_reason,
        "records": [serialize_record(r) for r in batch.records] if batch.records else [],
    }


# --- HTTP ENDPOINTS (APIS CHÍNH) ---

@app.get("/api/v1/quality/input/form-template")
async def get_form_template(
    report_date: Optional[date] = None,
    period_type: str = "daily",
    department_code: str = "QLCL",
    station_code: Optional[str] = None,
    group: Optional[str] = None,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [LẤY BIỂU MẪU DỰA TRÊN BỘ LỌC]
    API này trả về cấu trúc trường nhập liệu động (fields) giúp frontend vẽ đúng form cho khoa/trạm được chọn.
    
    Quy tắc kiểm tra:
    1. Quyền truy cập: Yêu cầu 'reports:input:view'.
    2. Phạm vi dữ liệu (Scope): Người dùng chỉ được xem khoa/trạm thuộc scope quản lý của mình.
    3. Đọc dữ liệu chỉ số từ danh mục biến số lâm sàng (`QualityIndicatorVariable`) đang hoạt động.
    """
    # 1. Kiểm tra phân quyền truy cập chung
    require_any_permission(quality_db, current_user, ["reports:input:view", "admin:view"])
    
    # 2. Kiểm tra giới hạn phạm vi khoa phòng & trạm của người dùng
    require_scope(quality_db, current_user, "department", department_code)
    if station_code:
        require_scope(quality_db, current_user, "station", station_code)

    # 3. Lấy danh sách các biến số lâm sàng đang được cấu hình hoạt động
    query = quality_db.query(QualityIndicatorVariable).filter(QualityIndicatorVariable.is_active.is_(True))
    if group:
        query = query.filter(QualityIndicatorVariable.group_code == group)
    variables = query.order_by(QualityIndicatorVariable.variable_code).all()

    # 4. Ánh xạ các thông tin cấu hình phục vụ validation phía client-side (min, max, required, đơn vị...)
    fields = []
    for var in variables:
        fields.append({
            "variable_code": var.variable_code,
            "indicator_code": None,
            "label": var.name,
            "data_type": var.data_type,
            "unit": var.unit,
            "required": var.required,
            "min": float(var.min_value) if var.min_value is not None else 0,
            "max": float(var.max_value) if var.max_value is not None else None,
        })

    return ok_response({
        "report_date": report_date.isoformat() if report_date else date.today().isoformat(),
        "period_type": period_type,
        "department_code": department_code,
        "station_code": station_code,
        "fields": fields,
    })


@app.post("/api/v1/quality/input/batches")
async def create_input_batch(
    payload: BatchCreateInput,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [LƯU NHÁP LÔ BÁO CÁO MỚI]
    API này nhận dữ liệu form gửi lên, validate nghiệp vụ chi tiết, sinh mã lô tự động, và lưu ở trạng thái Nháp (draft).
    
    Quy tắc kiểm tra:
    1. Quyền truy cập: Yêu cầu 'reports:input:create'.
    2. Scope: Khoa/trạm lập báo cáo phải thuộc scope được phép thao tác.
    3. Kỳ sổ (Period Lock): Ngăn chặn tuyệt đối nếu ca trực/ngày báo cáo đó đã bị khóa sổ (Trả lỗi 409).
    4. Validate biên thô từng dòng:
       - Kiểm tra giá trị nhập vào có nằm ngoài ngưỡng [min_value, max_value] của Catalog không.
       - Kiểm tra xem các trường bắt buộc (required) có bị trống không.
       - Nếu vi phạm, đánh dấu trạng thái dòng `row_status = 'error'` kèm mã lỗi thích hợp (không chặn lưu nháp nhưng chặn gửi duyệt).
    5. Mã lô tự sinh định dạng: INP-YYYYMMDD-XXXX (tuần tự theo ngày báo cáo).
    6. Ghi nhật ký hệ thống (Audit Log): Hành động 'create_input_batch'.
    """
    # 1. Kiểm tra phân quyền truy cập hệ thống
    require_any_permission(quality_db, current_user, ["reports:input:create", "admin:view"])
    
    # 2. Kiểm tra giới hạn phạm vi khoa phòng dữ liệu được gán
    require_scope(quality_db, current_user, "department", payload.department_code)
    if payload.station_code:
        require_scope(quality_db, current_user, "station", payload.station_code)

    # 3. Chặn hành động nếu ngày và khoa phòng báo cáo đã bị Khóa sổ
    require_period_not_locked(
        quality_db,
        payload.report_date,
        payload.period_type,
        payload.department_code,
        payload.station_code,
    )

    # 4. Tự sinh mã lô tuần tự duy nhất theo ngày báo cáo (Format: INP-YYYYMMDD-XXXX)
    date_str = payload.report_date.strftime("%Y%m%d")
    existing_count = (
        quality_db.query(QualityInputBatch)
        .filter(QualityInputBatch.report_date == payload.report_date)
        .count()
    )
    batch_code = f"INP-{date_str}-{existing_count + 1:04d}"

    # Vòng lặp chống trùng lặp mã lô trong trường hợp trùng tiến trình ghi đồng thời
    while quality_db.query(QualityInputBatch).filter(QualityInputBatch.batch_code == batch_code).first():
        existing_count += 1
        batch_code = f"INP-{date_str}-{existing_count + 1:04d}"

    # 5. Khởi tạo lô báo cáo với trạng thái ban đầu là Draft (Nháp)
    batch = QualityInputBatch(
        batch_code=batch_code,
        report_date=payload.report_date,
        period_type=payload.period_type,
        department_code=payload.department_code,
        station_code=payload.station_code,
        source_type="web_form",
        status="draft",
        created_by=current_user.username,
        note=payload.note,
    )
    quality_db.add(batch)
    quality_db.flush() # Lấy ID của Batch vừa tạo để gán cho chi tiết Records

    # 6. Ghi nhận và Validate chi tiết từng dòng dữ liệu chỉ số gửi lên
    for rec in payload.records:
        var_def = (
            quality_db.query(QualityIndicatorVariable)
            .filter(QualityIndicatorVariable.variable_code == rec.variable_code)
            .first()
        )
        if not var_def:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Variable code '{rec.variable_code}' does not exist in catalog."
            )

        row_status = "valid"
        error_code = None
        error_message = None

        # Kiểm tra giới hạn cận trên, cận dưới
        if rec.value is not None:
            if var_def.min_value is not None and rec.value < float(var_def.min_value):
                row_status = "error"
                error_code = "OUT_OF_BOUNDS_MIN"
                error_message = f"Value {rec.value} is below minimum allowed ({var_def.min_value})."
            elif var_def.max_value is not None and rec.value > float(var_def.max_value):
                row_status = "error"
                error_code = "OUT_OF_BOUNDS_MAX"
                error_message = f"Value {rec.value} is above maximum allowed ({var_def.max_value})."

        # Kiểm tra trường bắt buộc nhập
        if var_def.required and rec.value is None and rec.text_value is None:
            row_status = "error"
            error_code = "REQUIRED_FIELD_MISSING"
            error_message = f"Required field '{var_def.name}' is missing."

        # Tạo bản ghi dòng số liệu thô
        record = QualityInputRecord(
            batch_id=batch.id,
            report_date=payload.report_date,
            period_type=payload.period_type,
            department_code=payload.department_code,
            station_code=payload.station_code,
            variable_code=rec.variable_code,
            indicator_code=rec.indicator_code,
            value=rec.value,
            text_value=rec.text_value,
            unit=var_def.unit,
            note=rec.note,
            row_status=row_status,
            error_code=error_code,
            error_message=error_message,
            created_by=current_user.username,
        )
        quality_db.add(record)

    quality_db.commit()

    # 7. Ghi Audit Log hành động để phục vụ giám sát và lưu lịch sử đổi
    log_audit(
        quality_db,
        current_user,
        "create_input_batch",
        "quality_input_batches",
        str(batch.id),
        after_data={"batch_code": batch.batch_code, "status": batch.status},
        request=request,
    )

    trigger_auto_calculation(
        db=quality_db,
        background_tasks=background_tasks,
        report_date=payload.report_date,
        period_type=payload.period_type,
        department_code=payload.department_code,
        station_code=payload.station_code,
        username=current_user.username
    )

    return ok_response({
        "batch_id": batch.id,
        "batch_code": batch.batch_code,
        "status": batch.status
    })


@app.get("/api/v1/quality/input/batches")
async def list_input_batches(
    date: Optional[date] = None,
    status: Optional[str] = None,
    department_code: Optional[str] = None,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [DANH SÁCH CÁC LÔ SỐ LIỆU ĐÃ TẠO]
    Trả về danh sách các lô số liệu báo cáo đã nhập trong hệ thống kèm bộ lọc.
    
    Quy tắc kiểm tra:
    1. Quyền truy cập: Yêu cầu 'reports:input:view'.
    2. Bảo mật dữ liệu: 
       - Nếu là Quản trị viên (Admin): Có quyền xem toàn bộ danh sách báo cáo.
       - Nếu là nhân viên thông thường: Lọc chỉ trả về các lô thuộc phạm vi Scope dữ liệu khoa/trạm được giao.
    """
    require_any_permission(quality_db, current_user, ["reports:input:view", "admin:view"])

    query = quality_db.query(QualityInputBatch)
    if date:
        query = query.filter(QualityInputBatch.report_date == date)
    if status:
        query = query.filter(QualityInputBatch.status == status)
    if department_code:
        query = query.filter(QualityInputBatch.department_code == department_code)

    batches = query.order_by(QualityInputBatch.created_at.desc()).all()

    # Kiểm tra quyền quản trị cao cấp
    role_codes = set(get_user_role_codes(quality_db, current_user))
    is_admin = {"Admin", "system_admin", "quality_admin"} & role_codes

    filtered_batches = []
    if is_admin:
        filtered_batches = batches
    else:
        # Lọc thủ công dựa trên phạm vi Scope khoa/trạm được gán
        user_scopes = {
            (scope["scope_type"], scope["scope_code"])
            for scope in get_user_scopes(quality_db, current_user)
        }
        for b in batches:
            dept_allowed = ("department", b.department_code) in user_scopes
            station_allowed = b.station_code is None or ("station", b.station_code) in user_scopes
            if dept_allowed and station_allowed:
                filtered_batches.append(b)

    return ok_response([serialize_batch(b) for b in filtered_batches])


@app.get("/api/v1/quality/input/batches/{batch_id}")
async def get_input_batch(
    batch_id: int,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [CHI TIẾT MỘT LÔ BÁO CÁO]
    Lấy thông tin chi tiết một lô báo cáo cùng toàn bộ các giá trị dòng dữ liệu chỉ số bên trong.
    Yêu cầu quyền xem và scope truy cập tương ứng khoa phòng của lô số liệu.
    """
    require_any_permission(quality_db, current_user, ["reports:input:view", "admin:view"])

    batch = quality_db.query(QualityInputBatch).filter(QualityInputBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=404,
            detail=f"Batch {batch_id} not found."
        )

    # Bảo vệ phạm vi dữ liệu của khoa và trạm tương ứng lô
    require_scope(quality_db, current_user, "department", batch.department_code)
    if batch.station_code:
        require_scope(quality_db, current_user, "station", batch.station_code)

    return ok_response(serialize_batch(batch))


@app.put("/api/v1/quality/input/batches/{batch_id}")
async def update_input_batch(
    batch_id: int,
    payload: BatchUpdateInput,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [CẬP NHẬT SỐ LIỆU LÔ DRAFT]
    Cập nhật lại giá trị các chỉ số thô và ghi chú của một lô báo cáo hiện có.
    
    Quy tắc kiểm tra:
    1. Quyền truy cập: Yêu cầu 'reports:input:create'.
    2. Trạng thái lô: Chỉ cho phép cập nhật nếu lô đang ở trạng thái 'draft' (Nháp) hoặc 'rejected' (Bị từ chối làm lại).
       Chặn không cho sửa đổi lô đã gửi duyệt (submitted) hoặc đã duyệt (approved/locked).
    3. Scope: Người dùng phải được phân quyền tại khoa/trạm của lô báo cáo này.
    4. Kỳ sổ: Ngày báo cáo của lô phải chưa bị Khóa.
    5. Validate chi tiết tương tự khi tạo mới (min, max, required).
    6. Ghi Audit Log lịch sử thay đổi (trước và sau khi sửa).
    """
    require_any_permission(quality_db, current_user, ["reports:input:create", "admin:view"])

    batch = quality_db.query(QualityInputBatch).filter(QualityInputBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=404,
            detail=f"Batch {batch_id} not found."
        )

    # Chặn hành động sửa đổi nếu trạng thái lô không hợp lệ
    if batch.status not in ["draft", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit batch in status '{batch.status}'. Only draft or rejected batches can be edited."
        )

    # Kiểm tra giới hạn quyền khoa phòng và kỳ sổ khóa
    require_scope(quality_db, current_user, "department", batch.department_code)
    if batch.station_code:
        require_scope(quality_db, current_user, "station", batch.station_code)

    require_period_not_locked(
        quality_db,
        batch.report_date,
        batch.period_type,
        batch.department_code,
        batch.station_code,
    )

    # Lưu lại dữ liệu trước khi thay đổi để ghi nhận vào Audit Log
    before_data = serialize_batch(batch)

    if payload.note is not None:
        batch.note = payload.note

    # Lấy danh sách records hiện có để cập nhật đè hoặc chèn mới
    existing_records = {rec.variable_code: rec for rec in batch.records}

    for rec in payload.records:
        var_def = (
            quality_db.query(QualityIndicatorVariable)
            .filter(QualityIndicatorVariable.variable_code == rec.variable_code)
            .first()
        )
        if not var_def:
            raise HTTPException(
                status_code=400,
                detail=f"Variable code '{rec.variable_code}' does not exist in catalog."
            )

        row_status = "valid"
        error_code = None
        error_message = None

        # Thực hiện các bước kiểm tra nghiệp vụ
        if rec.value is not None:
            if var_def.min_value is not None and rec.value < float(var_def.min_value):
                row_status = "error"
                error_code = "OUT_OF_BOUNDS_MIN"
                error_message = f"Value {rec.value} is below minimum allowed ({var_def.min_value})."
            elif var_def.max_value is not None and rec.value > float(var_def.max_value):
                row_status = "error"
                error_code = "OUT_OF_BOUNDS_MAX"
                error_message = f"Value {rec.value} is above maximum allowed ({var_def.max_value})."

        if var_def.required and rec.value is None and rec.text_value is None:
            row_status = "error"
            error_code = "REQUIRED_FIELD_MISSING"
            error_message = f"Required field '{var_def.name}' is missing."

        # Cập nhật đè nếu biến số đã tồn tại trong lô báo cáo
        if rec.variable_code in existing_records:
            record = existing_records[rec.variable_code]
            record.value = rec.value
            record.text_value = rec.text_value
            record.note = rec.note
            record.row_status = row_status
            record.error_code = error_code
            record.error_message = error_message
            record.updated_by = current_user.username
            record.updated_at = datetime.utcnow()
        # Chèn thêm record mới nếu biến số được bổ sung thêm sau
        else:
            record = QualityInputRecord(
                batch_id=batch.id,
                report_date=batch.report_date,
                period_type=batch.period_type,
                department_code=batch.department_code,
                station_code=batch.station_code,
                variable_code=rec.variable_code,
                indicator_code=rec.indicator_code,
                value=rec.value,
                text_value=rec.text_value,
                unit=var_def.unit,
                note=rec.note,
                row_status=row_status,
                error_code=error_code,
                error_message=error_message,
                created_by=current_user.username,
            )
            quality_db.add(record)

    quality_db.commit()
    quality_db.refresh(batch)

    # Ghi nhận Audit Log hành động sửa đổi đợt báo cáo kèm cấu trúc thay đổi
    log_audit(
        quality_db,
        current_user,
        "update_input_batch",
        "quality_input_batches",
        str(batch.id),
        before_data=before_data,
        after_data=serialize_batch(batch),
        request=request,
    )

    trigger_auto_calculation(
        db=quality_db,
        background_tasks=background_tasks,
        report_date=batch.report_date,
        period_type=batch.period_type,
        department_code=batch.department_code,
        station_code=batch.station_code,
        username=current_user.username
    )

    return ok_response({
        "batch_id": batch.id,
        "batch_code": batch.batch_code,
        "status": batch.status
    })


@app.post("/api/v1/quality/input/batches/{batch_id}/submit")
async def submit_input_batch(
    batch_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [NỘP BÁO CÁO GỬI DUYỆT]
    Khóa lô dữ liệu nháp và chuyển trạng thái lên 'submitted' để chờ trưởng khoa/quản trị phê duyệt.
    
    Quy tắc kiểm tra và chặn nghiêm ngặt (Hard Stop):
    1. Quyền truy cập: Yêu cầu 'reports:input:submit'.
    2. Trạng thái lô: Chỉ cho phép nộp lô đang là 'draft' hoặc 'rejected'.
    3. Giới hạn phạm vi Scope dữ liệu và kiểm tra khóa kỳ sổ (chặn nếu đã khóa).
    4. BẮT BUỘC: Không cho phép nộp báo cáo (Hard Stop) nếu có bất kỳ dòng dữ liệu nào
       đang bị trạng thái lỗi chặn nộp (`row_status = 'error'`). Trả lỗi HTTP 400 Bad Request ngay.
    5. Cập nhật trạng thái lô báo cáo, ngày nộp và username người nộp.
    6. Ghi Audit Log hành động 'submit_input_batch'.
    """
    # 1. Kiểm tra phân quyền truy cập tính năng nộp
    require_any_permission(quality_db, current_user, ["reports:input:submit", "admin:view"])

    batch = quality_db.query(QualityInputBatch).filter(QualityInputBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=404,
            detail=f"Batch {batch_id} not found."
        )

    # Chặn nếu trạng thái lô hiện tại đã được nộp/duyệt trước đó
    if batch.status not in ["draft", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit batch in status '{batch.status}'."
        )

    # Kiểm tra giới hạn quyền khoa phòng và kỳ sổ khóa
    require_scope(quality_db, current_user, "department", batch.department_code)
    if batch.station_code:
        require_scope(quality_db, current_user, "station", batch.station_code)

    require_period_not_locked(
        quality_db,
        batch.report_date,
        batch.period_type,
        batch.department_code,
        batch.station_code,
    )

    # [HARD STOP] Chặn nộp tuyệt đối nếu có bất kỳ dòng nào chứa lỗi dữ liệu (chưa sửa min/max hoặc required)
    for rec in batch.records:
        if rec.row_status == "error":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot submit batch because variable '{rec.variable_code}' has validation errors: {rec.error_message}"
            )

    before_data = serialize_batch(batch)

    # Cập nhật trạng thái lô báo cáo sang submitted
    batch.status = "submitted"
    batch.submitted_by = current_user.username
    batch.submitted_at = datetime.utcnow()

    # [PHASE 5] Tự động tạo / cập nhật review task cho lô báo cáo này
    existing_task = quality_db.query(QualityReviewTask).filter(
        QualityReviewTask.target_id == batch.id,
        QualityReviewTask.target_type == "input_batch"
    ).first()

    if existing_task:
        existing_task.status = "pending"
        existing_task.requested_by = current_user.username
        existing_task.requested_at = datetime.utcnow()
        existing_task.reviewed_by = None
        existing_task.reviewed_at = None
        existing_task.review_note = None
    else:
        new_task = QualityReviewTask(
            target_type="input_batch",
            target_id=batch.id,
            status="pending",
            requested_by=current_user.username,
            requested_at=datetime.utcnow()
        )
        quality_db.add(new_task)

    quality_db.commit()

    # Ghi nhận Audit Log hành động nộp phê duyệt
    log_audit(
        quality_db,
        current_user,
        "submit_input_batch",
        "quality_input_batches",
        str(batch.id),
        before_data=before_data,
        after_data=serialize_batch(batch),
        request=request,
    )

    trigger_auto_calculation(
        db=quality_db,
        background_tasks=background_tasks,
        report_date=batch.report_date,
        period_type=batch.period_type,
        department_code=batch.department_code,
        station_code=batch.station_code,
        username=current_user.username
    )

    return ok_response({
        "batch_id": batch.id,
        "batch_code": batch.batch_code,
        "status": batch.status
    })

# --- PHASE 4: EXCEL / CSV IMPORT APIs ---

# Đảm bảo thư mục lưu trữ private tồn tại
IMPORT_STORAGE_DIR = "/app/storage/private/quality_imports"
os.makedirs(IMPORT_STORAGE_DIR, exist_ok=True)


@app.post("/api/v1/quality/import/upload")
async def upload_import_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [PHASE 4] ĐĂNG TẢI VÀ VALIDATE TỆP EXCEL/CSV (upload)
    Đăng tải tệp tin, tính mã SHA256 để chống trùng, phân tích các dòng và thực hiện validate biên.
    """
    # 1. Phân quyền
    require_any_permission(quality_db, current_user, ["reports:input:create", "admin:view"])

    # 2. Kiểm tra phần mở rộng file
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".xlsx", ".xls", ".csv"]:
        raise HTTPException(
            status_code=400,
            detail="Định dạng tệp không hợp lệ. Chỉ chấp nhận các tệp .xlsx, .xls hoặc .csv"
        )

    # 3. Đọc dữ liệu vào bộ nhớ để tính toán hash và kiểm tra size
    content = await file.read()
    file_size = len(content)
    max_mb = int(os.getenv("QUALITY_IMPORT_MAX_MB", "10"))
    if file_size > max_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Dung lượng tệp vượt quá giới hạn tối đa cho phép ({max_mb}MB)."
        )

    # Tính mã SHA256 của file để chống trùng lặp
    file_hash = hashlib.sha256(content).hexdigest()
    
    # Kiểm tra xem file này đã được upload và confirmed chưa (hoặc có đang nháp không)
    existing_batch = quality_db.query(QualityImportBatch).filter(
        QualityImportBatch.file_hash == file_hash,
        QualityImportBatch.status != "cancelled"
    ).first()
    if existing_batch:
        raise HTTPException(
            status_code=400,
            detail="Tệp tin này đã được tải lên hệ thống trước đó."
        )

    # 4. Lưu file vào Private Storage
    batch_code = f"IMP-{datetime.utcnow().strftime('%Y%m%d')}-{hashlib.md5(content).hexdigest()[:6].upper()}"
    file_save_name = f"{batch_code}{ext}"
    file_save_path = os.path.join(IMPORT_STORAGE_DIR, file_save_name)
    
    with open(file_save_path, "wb") as f:
        f.write(content)

    # 5. Phân tách dòng dữ liệu và Validate nghiệp vụ
    rows_to_import = []
    
    # helper to normalize header search
    def find_header_indices(headers):
        indices = {"report_date": -1, "dept_station": -1, "variable": -1, "value": -1, "note": -1}
        for idx, h in enumerate(headers):
            if h is None:
                continue
            h_clean = str(h).strip().lower()
            # Vietnamese: ngày báo cáo, ngày, ngay_bao_cao, report_date, date
            if "ngày" in h_clean or "ngay" in h_clean or "date" in h_clean:
                indices["report_date"] = idx
            # Vietnamese: mã khoa/trạm, mã khoa, mã trạm, ma_khoa_tram, department_code, station_code, khoa, tram
            elif "khoa" in h_clean or "trạm" in h_clean or "tram" in h_clean or "dept" in h_clean or "station" in h_clean:
                indices["dept_station"] = idx
            # Vietnamese: mã biến số, mã biến, ma_bien_so, variable_code, variable, biến
            elif "biến" in h_clean or "bien" in h_clean or "variable" in h_clean:
                indices["variable"] = idx
            # Vietnamese: giá trị, gia_tri, value, số liệu, so_lieu
            elif "trị" in h_clean or "tri" in h_clean or "value" in h_clean or "số" in h_clean or "so" in h_clean:
                indices["value"] = idx
            # Vietnamese: ghi chú, ghi_chu, note
            elif "chú" in h_clean or "chu" in h_clean or "note" in h_clean:
                indices["note"] = idx
        return indices

    total_rows = 0
    valid_rows = 0
    warning_rows = 0
    error_rows = 0

    parsed_rows_data = []

    # Đọc nội dung file
    if ext in [".xlsx", ".xls"]:
        try:
            wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
            sheet = wb.active
            # Đọc headers ở dòng đầu tiên có dữ liệu
            first_row = next(sheet.iter_rows(values_only=True), None)
            if not first_row:
                raise Exception("Tệp Excel trống.")
            
            headers = [str(val) if val is not None else "" for val in first_row]
            indices = find_header_indices(headers)
            
            # Kiểm tra nếu thiếu các cột cốt lõi
            if indices["report_date"] == -1 or indices["dept_station"] == -1 or indices["variable"] == -1 or indices["value"] == -1:
                # Fallback to column index mapping if headers are not recognized: 0: Date, 1: Dept/Station, 2: Var, 3: Val, 4: Note
                indices = {"report_date": 0, "dept_station": 1, "variable": 2, "value": 3, "note": 4}

            # Parse các dòng tiếp theo
            row_idx = 1
            for row in sheet.iter_rows(min_row=2, values_only=True):
                # Bỏ qua dòng trống hoàn toàn
                if all(val is None for val in row):
                    continue
                row_idx += 1
                total_rows += 1
                
                raw_payload = {
                    "report_date": str(row[indices["report_date"]]) if indices["report_date"] < len(row) and row[indices["report_date"]] is not None else "",
                    "dept_station": str(row[indices["dept_station"]]) if indices["dept_station"] < len(row) and row[indices["dept_station"]] is not None else "",
                    "variable_code": str(row[indices["variable"]]) if indices["variable"] < len(row) and row[indices["variable"]] is not None else "",
                    "value": str(row[indices["value"]]) if indices["value"] < len(row) and row[indices["value"]] is not None else "",
                    "note": str(row[indices["note"]]) if indices["note"] < len(row) and row[indices["note"]] is not None else ""
                }
                parsed_rows_data.append((row_idx, raw_payload))
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Lỗi đọc định dạng Excel: {str(exc)}"
            )
    else: # CSV
        try:
            csv_text = content.decode("utf-8")
            reader = csv.reader(io.StringIO(csv_text))
            first_row = next(reader, None)
            if not first_row:
                raise Exception("Tệp CSV trống.")
            
            headers = first_row
            indices = find_header_indices(headers)
            if indices["report_date"] == -1 or indices["dept_station"] == -1 or indices["variable"] == -1 or indices["value"] == -1:
                indices = {"report_date": 0, "dept_station": 1, "variable": 2, "value": 3, "note": 4}

            row_idx = 1
            for row in reader:
                if not row or all(val.strip() == "" for val in row):
                    continue
                row_idx += 1
                total_rows += 1
                
                raw_payload = {
                    "report_date": row[indices["report_date"]] if indices["report_date"] < len(row) else "",
                    "dept_station": row[indices["dept_station"]] if indices["dept_station"] < len(row) else "",
                    "variable_code": row[indices["variable"]] if indices["variable"] < len(row) else "",
                    "value": row[indices["value"]] if indices["value"] < len(row) else "",
                    "note": row[indices["note"]] if indices["note"] < len(row) else ""
                }
                parsed_rows_data.append((row_idx, raw_payload))
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Lỗi đọc định dạng CSV: {str(exc)}"
            )

    # 6. Khởi tạo lô import batch lưu tạm
    import_batch = QualityImportBatch(
        batch_code=batch_code,
        file_name=filename,
        file_path=file_save_path,
        file_hash=file_hash,
        status="uploaded",
        total_rows=total_rows,
        created_by=current_user.username,
        created_at=datetime.utcnow(),
    )
    quality_db.add(import_batch)
    quality_db.flush() # Để có import_batch.id

    # 7. Phân tích chi tiết và Validate từng dòng
    for row_num, raw in parsed_rows_data:
        row_status = "valid"
        error_message = None
        normalized = {}

        # 7.1 Validate Date
        report_date_str = raw["report_date"].strip()
        report_date_val = None
        
        # Thử parse date (hỗ trợ định dạng Excel YYYY-MM-DD hoặc DD/MM/YYYY)
        if " " in report_date_str:
            report_date_str = report_date_str.split(" ")[0] # Bỏ bớt phần giờ nếu có
            
        try:
            if "-" in report_date_str:
                report_date_val = datetime.strptime(report_date_str, "%Y-%m-%d").date()
            elif "/" in report_date_str:
                # Thử DD/MM/YYYY hoặc YYYY/MM/DD
                parts = report_date_str.split("/")
                if len(parts[0]) == 4:
                    report_date_val = datetime.strptime(report_date_str, "%Y/%m/%d").date()
                else:
                    report_date_val = datetime.strptime(report_date_str, "%d/%m/%y" if len(parts[2]) == 2 else "%d/%m/%Y").date()
            else:
                report_date_val = date.fromisoformat(report_date_str)
        except Exception:
            row_status = "error"
            error_message = f"Ngày báo cáo '{report_date_str}' không hợp lệ (định dạng mong muốn: YYYY-MM-DD)."

        # 7.2 Validate Khoa/Trạm
        dept_station_code = raw["dept_station"].strip()
        department_code = None
        station_code = None

        if row_status == "valid":
            if not dept_station_code:
                row_status = "error"
                error_message = "Mã khoa/trạm báo cáo không được bỏ trống."
            else:
                # Kiểm tra khoa phòng
                dept = quality_db.query(QualityDepartment).filter(
                    QualityDepartment.code == dept_station_code,
                    QualityDepartment.is_active == True
                ).first()
                if dept:
                    department_code = dept.code
                else:
                    # Kiểm tra trạm vệ tinh
                    station = quality_db.query(QualityStation).filter(
                        QualityStation.code == dept_station_code,
                        QualityStation.is_active == True
                    ).first()
                    if station:
                        station_code = station.code
                        department_code = station.department_code
                    else:
                        row_status = "error"
                        error_message = f"Mã khoa/trạm '{dept_station_code}' không tồn tại hoặc đã bị khóa."

        # 7.3 Scope check & Period lock check
        if row_status == "valid":
            try:
                # Kiểm tra quyền truy cập khoa phòng của user
                require_scope(quality_db, current_user, "department", department_code)
                if station_code:
                    require_scope(quality_db, current_user, "station", station_code)
            except HTTPException:
                row_status = "error"
                error_message = f"Tài khoản không có quyền nhập liệu cho khoa/trạm '{dept_station_code}'."
            except Exception:
                row_status = "error"
                error_message = "Lỗi kiểm tra quyền scope khoa phòng."

        if row_status == "valid":
            try:
                # Kiểm tra khóa kỳ báo cáo
                require_period_not_locked(
                    quality_db,
                    report_date_val,
                    "daily",  # Mặc định là daily
                    department_code,
                    station_code
                )
            except HTTPException:
                row_status = "error"
                error_message = f"Kỳ báo cáo ngày {report_date_val} của khoa/trạm '{dept_station_code}' đã bị khóa sổ."
            except Exception:
                row_status = "error"
                error_message = "Lỗi kiểm tra kỳ khóa sổ."

        # 7.4 Validate Biến số nghiệp vụ
        var_code = raw["variable_code"].strip()
        variable = None
        if row_status == "valid":
            if not var_code:
                row_status = "error"
                error_message = "Mã biến số nghiệp vụ không được bỏ trống."
            else:
                variable = quality_db.query(QualityIndicatorVariable).filter(
                    QualityIndicatorVariable.variable_code == var_code,
                    QualityIndicatorVariable.is_active == True
                ).first()
                if not variable:
                    row_status = "error"
                    error_message = f"Mã biến số '{var_code}' không tồn tại trong danh mục hoặc đã bị khóa."

        # 7.5 Validate Giá trị biến số
        val_str = raw["value"].strip()
        numeric_val = None
        text_val = None

        if row_status == "valid" and variable:
            # Nếu là dạng số
            if variable.data_type in ["number", "percentage", "ratio", "currency"] or not variable.data_type:
                if not val_str:
                    if variable.required:
                        row_status = "error"
                        error_message = f"Biến số '{var_code}' là bắt buộc nhưng giá trị bị bỏ trống."
                else:
                    try:
                        numeric_val = float(val_str)
                        # Kiểm tra cận min_value / max_value
                        if variable.min_value is not None and numeric_val < float(variable.min_value):
                            row_status = "error"
                            error_message = f"Giá trị {numeric_val} nhỏ hơn ngưỡng tối thiểu cho phép ({variable.min_value})."
                        elif variable.max_value is not None and numeric_val > float(variable.max_value):
                            row_status = "error"
                            error_message = f"Giá trị {numeric_val} lớn hơn ngưỡng tối đa cho phép ({variable.max_value})."
                    except ValueError:
                        row_status = "error"
                        error_message = f"Giá trị '{val_str}' của biến số '{var_code}' phải là dạng số thực."
            else:
                # Dạng văn bản/chữ
                text_val = val_str
                if not text_val and variable.required:
                    row_status = "error"
                    error_message = f"Biến số '{var_code}' là bắt buộc nhưng bị bỏ trống."

        # 7.6 Tổng kết trạng thái dòng
        if row_status == "valid":
            valid_rows += 1
        elif row_status == "warning":
            warning_rows += 1
        else:
            error_rows += 1

        # Chuẩn hóa payload lưu trữ
        normalized = {
            "report_date": report_date_val.isoformat() if report_date_val else None,
            "department_code": department_code,
            "station_code": station_code,
            "variable_code": var_code,
            "value": numeric_val,
            "text_value": text_val,
            "unit": variable.unit if variable else None,
            "note": raw["note"].strip()
        }

        # Lưu dòng vào database
        import_row = QualityImportRow(
            import_batch_id=import_batch.id,
            row_index=row_num,
            raw_payload=raw,
            normalized_payload=normalized,
            row_status=row_status,
            error_message=error_message,
            created_at=datetime.utcnow()
        )
        quality_db.add(import_row)

    # 8. Cập nhật lại số liệu tóm tắt của đợt upload
    import_batch.valid_rows = valid_rows
    import_batch.warning_rows = warning_rows
    import_batch.error_rows = error_rows
    import_batch.status = "validated" if error_rows == 0 else "uploaded"
    
    quality_db.commit()

    # 9. Ghi Audit Log hành động upload
    log_audit(
        quality_db,
        current_user,
        "upload_import_batch",
        "quality_import_batches",
        str(import_batch.id),
        after_data={
            "batch_code": batch_code,
            "file_name": filename,
            "total_rows": total_rows,
            "valid_rows": valid_rows,
            "error_rows": error_rows
        },
        request=request
    )

    return ok_response({
        "batch_id": import_batch.id,
        "batch_code": import_batch.batch_code,
        "file_name": import_batch.file_name,
        "status": import_batch.status,
        "total_rows": import_batch.total_rows,
        "valid_rows": import_batch.valid_rows,
        "warning_rows": import_batch.warning_rows,
        "error_rows": import_batch.error_rows
    }, "Tải lên và phân tích tệp dữ liệu thành công.")


@app.get("/api/v1/quality/import/batches")
async def list_import_batches(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [PHASE 4] XEM DANH SÁCH CÁC ĐỢT IMPORT FILE (list)
    """
    require_any_permission(quality_db, current_user, ["reports:input:view", "admin:view"])

    query = quality_db.query(QualityImportBatch)
    user_roles = get_user_role_codes(SessionLocal(), current_user)
    if "admin" not in user_roles and "quality_manager" not in user_roles:
        query = query.filter(QualityImportBatch.created_by == current_user.username)

    if status:
        query = query.filter(QualityImportBatch.status == status)

    batches = query.order_by(QualityImportBatch.created_at.desc()).all()

    data = []
    for b in batches:
        data.append({
            "id": b.id,
            "batch_code": b.batch_code,
            "file_name": b.file_name,
            "status": b.status,
            "total_rows": b.total_rows,
            "valid_rows": b.valid_rows,
            "warning_rows": b.warning_rows,
            "error_rows": b.error_rows,
            "created_by": b.created_by,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "processed_by": b.processed_by,
            "processed_at": b.processed_at.isoformat() if b.processed_at else None
        })

    return ok_response(data)


@app.get("/api/v1/quality/import/batches/{batch_id}/preview")
async def preview_import_batch(
    batch_id: int,
    page: int = 1,
    limit: int = 10,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [PHASE 4] XEM TRƯỚC VÀ PHÂN TRANG CÁC DÒNG DỮ LIỆU ĐÃ PARSE (preview)
    """
    require_any_permission(quality_db, current_user, ["reports:input:view", "admin:view"])

    batch = quality_db.query(QualityImportBatch).filter(QualityImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Không tìm thấy đợt import.")

    user_roles = get_user_role_codes(SessionLocal(), current_user)
    if "admin" not in user_roles and "quality_manager" not in user_roles:
        if batch.created_by != current_user.username:
            raise HTTPException(status_code=403, detail="Bạn không có quyền xem đợt import này.")

    query = quality_db.query(QualityImportRow).filter(QualityImportRow.import_batch_id == batch_id)
    if status_filter:
        query = query.filter(QualityImportRow.row_status == status_filter)

    total_items = query.count()
    rows = query.order_by(QualityImportRow.row_index.asc()).offset((page - 1) * limit).limit(limit).all()

    rows_data = []
    for r in rows:
        rows_data.append({
            "id": r.id,
            "row_index": r.row_index,
            "raw_payload": r.raw_payload,
            "normalized_payload": r.normalized_payload,
            "row_status": r.row_status,
            "error_message": r.error_message
        })

    return ok_response({
        "batch": {
            "id": batch.id,
            "batch_code": batch.batch_code,
            "file_name": batch.file_name,
            "status": batch.status,
            "total_rows": batch.total_rows,
            "valid_rows": batch.valid_rows,
            "warning_rows": batch.warning_rows,
            "error_rows": batch.error_rows,
            "created_by": batch.created_by,
            "created_at": batch.created_at.isoformat() if batch.created_at else None
        },
        "rows": rows_data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_pages": (total_items + limit - 1) // limit,
            "total_items": total_items
        }
    })


@app.post("/api/v1/quality/import/batches/{batch_id}/confirm")
async def confirm_import_batch(
    batch_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [PHASE 4] XÁC NHẬN NẠP DỮ LIỆU CHÍNH THỨC (confirm)
    Tạo các lô báo cáo QualityInputBatch và QualityInputRecord tương ứng từ dữ liệu import.
    """
    require_any_permission(quality_db, current_user, ["reports:input:create", "admin:view"])

    batch = quality_db.query(QualityImportBatch).filter(QualityImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Không tìm thấy đợt import.")

    if batch.status == "confirmed":
        raise HTTPException(status_code=400, detail="Đợt import này đã được xác nhận nạp chính thức trước đó.")
    if batch.status == "cancelled":
        raise HTTPException(status_code=400, detail="Đợt import này đã bị hủy bỏ.")

    # [HARD STOP] Chặn nộp tuyệt đối nếu có bất kỳ dòng lỗi nào
    if batch.error_rows > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Không thể xác nhận đợt nhập do còn {batch.error_rows} dòng dữ liệu bị lỗi. Vui lòng kiểm tra lại tệp tin."
        )

    # Lấy toàn bộ dòng hợp lệ
    rows = quality_db.query(QualityImportRow).filter(QualityImportRow.import_batch_id == batch_id).all()
    if not rows:
        raise HTTPException(status_code=400, detail="Đợt import không chứa dòng dữ liệu nào.")

    # 1. Gom nhóm dữ liệu theo (Ngày báo cáo, Khoa, Trạm) để sinh các QualityInputBatch tương ứng
    groups = {}
    for r in rows:
        norm = r.normalized_payload
        r_date = norm["report_date"]
        d_code = norm["department_code"]
        s_code = norm["station_code"]
        
        group_key = (r_date, d_code, s_code)
        if group_key not in groups:
            groups[group_key] = []
        groups[group_key].append(norm)

    created_batches = []
    
    try:
        # Gom tất cả trong một transaction
        for (r_date_str, d_code, s_code), records_data in groups.items():
            report_date_val = datetime.strptime(r_date_str, "%Y-%m-%d").date()
            
            # Kiểm tra xem kỳ báo cáo có bị khóa không
            require_period_not_locked(
                quality_db,
                report_date_val,
                "daily",
                d_code,
                s_code
            )

            # Tìm xem đã có lô báo cáo chính thức nào trùng Ngày + Khoa + Trạm chưa
            input_batch = quality_db.query(QualityInputBatch).filter(
                QualityInputBatch.report_date == report_date_val,
                QualityInputBatch.department_code == d_code,
                QualityInputBatch.station_code == s_code
            ).first()

            if not input_batch:
                # Tự sinh mã lô chính thức: INP-YYYYMMDD-XXXX
                date_str = report_date_val.strftime("%Y%m%d")
                existing_count = quality_db.query(QualityInputBatch).filter(
                    QualityInputBatch.report_date == report_date_val
                ).count()
                new_batch_code = f"INP-{date_str}-{existing_count + 1:04d}"

                input_batch = QualityInputBatch(
                    batch_code=new_batch_code,
                    report_date=report_date_val,
                    period_type="daily",
                    department_code=d_code,
                    station_code=s_code,
                    source_type="import",
                    status="draft", # Khởi tạo ở trạng thái draft
                    created_by=current_user.username,
                    created_at=datetime.utcnow(),
                    note=f"Nạp tự động từ tệp tin import {batch.file_name}"
                )
                quality_db.add(input_batch)
                quality_db.flush()

            # Thêm hoặc cập nhật chi tiết bản ghi số liệu biến số nghiệp vụ
            for rec in records_data:
                var_code = rec["variable_code"]
                val = rec["value"]
                text_val = rec["text_value"]
                unit_val = rec["unit"]
                note_val = rec["note"]

                existing_rec = quality_db.query(QualityInputRecord).filter(
                    QualityInputRecord.batch_id == input_batch.id,
                    QualityInputRecord.variable_code == var_code
                ).first()

                if existing_rec:
                    existing_rec.value = val
                    existing_rec.text_value = text_val
                    existing_rec.unit = unit_val
                    existing_rec.note = note_val
                    existing_rec.row_status = "valid"
                    existing_rec.error_message = None
                    existing_rec.updated_by = current_user.username
                    existing_rec.updated_at = datetime.utcnow()
                else:
                    new_rec = QualityInputRecord(
                        batch_id=input_batch.id,
                        report_date=report_date_val,
                        period_type="daily",
                        department_code=d_code,
                        station_code=s_code,
                        variable_code=var_code,
                        value=val,
                        text_value=text_val,
                        unit=unit_val,
                        note=note_val,
                        row_status="valid",
                        created_by=current_user.username,
                        created_at=datetime.utcnow()
                    )
                    quality_db.add(new_rec)

            created_batches.append(input_batch.batch_code)

        # Cập nhật trạng thái đợt import
        batch.status = "confirmed"
        batch.processed_by = current_user.username
        batch.processed_at = datetime.utcnow()

        quality_db.commit()
    except Exception as exc:
        quality_db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Lỗi hệ thống khi lưu trữ dữ liệu chính thức: {str(exc)}"
        )

    # 2. Ghi Audit Log hành động confirm
    log_audit(
        quality_db,
        current_user,
        "confirm_import_batch",
        "quality_import_batches",
        str(batch.id),
        after_data={
            "batch_code": batch.batch_code,
            "created_input_batches": created_batches
        },
        request=request
    )

    # Sau khi commit thành công, chạy tính toán tự động cho các nhóm ngày/khoa/trạm
    for (r_date_str, d_code, s_code), _ in groups.items():
        report_date_val = datetime.strptime(r_date_str, "%Y-%m-%d").date()
        trigger_auto_calculation(
            db=quality_db,
            background_tasks=background_tasks,
            report_date=report_date_val,
            period_type="daily",
            department_code=d_code,
            station_code=s_code,
            username=current_user.username
        )

    return ok_response({
        "import_batch_id": batch.id,
        "status": batch.status,
        "created_input_batches": created_batches
    }, f"Xác nhận nhập dữ liệu thành công! Đã tạo {len(created_batches)} lô số liệu chính thức.")


@app.post("/api/v1/quality/import/batches/{batch_id}/cancel")
async def cancel_import_batch(
    batch_id: int,
    request: Request,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [PHASE 4] HỦY ĐỢT IMPORT NHÁP (cancel)
    """
    require_any_permission(quality_db, current_user, ["reports:input:create", "admin:view"])

    batch = quality_db.query(QualityImportBatch).filter(QualityImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Không tìm thấy đợt import.")

    if batch.status == "confirmed":
        raise HTTPException(status_code=400, detail="Không thể hủy đợt import đã được confirm.")
    if batch.status == "cancelled":
        return ok_response({"batch_id": batch.id, "status": batch.status}, "Đợt import này đã được hủy bỏ trước đó.")

    batch.status = "cancelled"
    batch.processed_by = current_user.username
    batch.processed_at = datetime.utcnow()

    # Xóa file vật lý
    if batch.file_path and os.path.exists(batch.file_path):
        try:
            os.remove(batch.file_path)
        except Exception:
            pass

    quality_db.commit()

    # Ghi Audit Log
    log_audit(
        quality_db,
        current_user,
        "cancel_import_batch",
        "quality_import_batches",
        str(batch.id),
        after_data={"batch_code": batch.batch_code},
        request=request
    )

    return ok_response({
        "batch_id": batch.id,
        "status": batch.status
    }, "Đã hủy bỏ đợt nhập dữ liệu nháp thành công.")


# --- PHASE 5: REVIEW, APPROVAL & PERIOD LOCK APIs ---

@app.get("/api/v1/quality/review/tasks")
async def list_review_tasks(
    status: Optional[str] = "pending",
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [PHASE 5] LẤY DANH SÁCH NHIỆM VỤ DUYỆT (review tasks)
    Lấy danh sách hàng đợi các lô số liệu lâm sàng cần duyệt dựa theo phân quyền scope của reviewer.
    """
    require_any_permission(quality_db, current_user, ["reports:review:view", "admin:view"])

    query = quality_db.query(QualityReviewTask)
    if status:
        query = query.filter(QualityReviewTask.status == status)

    tasks = query.order_by(QualityReviewTask.requested_at.desc()).all()

    user_scopes = get_user_scopes(quality_db, current_user)
    dept_scopes = {s["scope_code"] for s in user_scopes if s["scope_type"] == "department"}
    station_scopes = {s["scope_code"] for s in user_scopes if s["scope_type"] == "station"}

    user_roles = get_user_role_codes(SessionLocal(), current_user)
    is_admin = bool({"Admin", "admin", "system_admin", "quality_admin", "quality_manager"} & set(user_roles))

    data = []
    for t in tasks:
        batch = quality_db.query(QualityInputBatch).filter(QualityInputBatch.id == t.target_id).first()
        if not batch:
            continue

        # Lọc bảo mật scope phòng ban
        if not is_admin:
            if batch.department_code not in dept_scopes:
                if not batch.station_code or batch.station_code not in station_scopes:
                    continue

        data.append({
            "id": t.id,
            "target_type": t.target_type,
            "target_id": t.target_id,
            "status": t.status,
            "assigned_to": t.assigned_to,
            "requested_by": t.requested_by,
            "reviewed_by": t.reviewed_by,
            "requested_at": t.requested_at.isoformat() if t.requested_at else None,
            "reviewed_at": t.reviewed_at.isoformat() if t.reviewed_at else None,
            "review_note": t.review_note,
            "batch": {
                "id": batch.id,
                "batch_code": batch.batch_code,
                "report_date": batch.report_date.isoformat(),
                "period_type": batch.period_type,
                "department_code": batch.department_code,
                "station_code": batch.station_code,
                "status": batch.status,
                "note": batch.note,
                "created_by": batch.created_by,
                "created_at": batch.created_at.isoformat() if batch.created_at else None
            }
        })

    return ok_response(data)


@app.post("/api/v1/quality/input/batches/{batch_id}/approve")
async def approve_input_batch(
    batch_id: int,
    payload: BatchReviewInput,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [PHASE 5] PHÊ DUYỆT LÔ BÁO CÁO (approve)
    Chuyển trạng thái lô sang locked trực tiếp, tự động tạo khóa kỳ sổ, ghi audit log, cập nhật review task con tương ứng.
    """
    require_any_permission(quality_db, current_user, ["reports:review:approve", "admin:view"])

    batch = quality_db.query(QualityInputBatch).filter(QualityInputBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô báo cáo.")

    if batch.status != "submitted":
        raise HTTPException(status_code=400, detail=f"Không thể phê duyệt lô báo cáo đang ở trạng thái '{batch.status}'.")

    # Kiểm tra phân vùng scope của reviewer
    require_scope(quality_db, current_user, "department", batch.department_code)
    if batch.station_code:
        require_scope(quality_db, current_user, "station", batch.station_code)

    # Chặn tự duyệt lô số liệu của chính mình
    user_roles = get_user_role_codes(SessionLocal(), current_user)
    is_admin = bool({"Admin", "admin", "system_admin", "quality_admin", "quality_manager"} & set(user_roles))
    if batch.created_by == current_user.username and not is_admin:
        raise HTTPException(status_code=400, detail="Không được phép tự phê duyệt lô số liệu do chính mình nhập liệu.")

    before_data = serialize_batch(batch)

    # Cập nhật trạng thái lô báo cáo chính trực tiếp sang LOCKED
    batch.status = "locked"
    batch.approved_by = current_user.username
    batch.approved_at = datetime.utcnow()
    batch.locked_by = current_user.username
    batch.locked_at = datetime.utcnow()
    if payload.review_note:
        batch.note = (batch.note or "") + f"\n[Duyệt bởi {current_user.username}]: {payload.review_note}"

    # Tự động tạo / cập nhật bản ghi khóa sổ cho kỳ báo cáo tương ứng
    lock_rec = quality_db.query(QualityPeriodLock).filter(
        QualityPeriodLock.period_type == batch.period_type,
        QualityPeriodLock.report_date == batch.report_date,
        QualityPeriodLock.department_code == batch.department_code,
        QualityPeriodLock.station_code == batch.station_code
    ).first()

    if lock_rec:
        lock_rec.is_locked = True
        lock_rec.locked_by = current_user.username
        lock_rec.locked_at = datetime.utcnow()
        lock_rec.unlock_reason = None
        lock_rec.unlocked_by = None
        lock_rec.unlocked_at = None
    else:
        lock_rec = QualityPeriodLock(
            period_type=batch.period_type,
            report_date=batch.report_date,
            department_code=batch.department_code,
            station_code=batch.station_code,
            is_locked=True,
            locked_by=current_user.username,
            locked_at=datetime.utcnow()
        )
        quality_db.add(lock_rec)

    # Cập nhật review task con sang approved
    task = quality_db.query(QualityReviewTask).filter(
        QualityReviewTask.target_id == batch_id,
        QualityReviewTask.target_type == "input_batch",
        QualityReviewTask.status == "pending"
    ).first()
    if task:
        task.status = "approved"
        task.reviewed_by = current_user.username
        task.reviewed_at = datetime.utcnow()
        task.review_note = payload.review_note

    quality_db.commit()

    # Audit log
    log_audit(
        quality_db,
        current_user,
        "approve_input_batch",
        "quality_input_batches",
        str(batch.id),
        before_data=before_data,
        after_data=serialize_batch(batch),
        request=request
    )

    trigger_auto_calculation(
        db=quality_db,
        background_tasks=background_tasks,
        report_date=batch.report_date,
        period_type=batch.period_type,
        department_code=batch.department_code,
        station_code=batch.station_code,
        username=current_user.username
    )

    return ok_response({
        "batch_id": batch.id,
        "batch_code": batch.batch_code,
        "status": batch.status
    }, "Phê duyệt và tự động khóa sổ lô số liệu thành công.")


@app.post("/api/v1/quality/input/batches/{batch_id}/reject")
async def reject_input_batch(
    batch_id: int,
    payload: BatchRejectInput,
    request: Request,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [PHASE 5] TỪ CHỐI DUYỆT LÔ BÁO CÁO (reject)
    Chuyển trạng thái lô trở lại rejected, bắt buộc cung cấp lý do để nhân viên chỉnh sửa.
    """
    require_any_permission(quality_db, current_user, ["reports:review:reject", "admin:view"])

    if not payload.review_note or not payload.review_note.strip():
        raise HTTPException(status_code=400, detail="Lý do từ chối phê duyệt là bắt buộc.")

    batch = quality_db.query(QualityInputBatch).filter(QualityInputBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Không tìm thấy lô báo cáo.")

    if batch.status != "submitted":
        raise HTTPException(status_code=400, detail=f"Không thể từ chối lô báo cáo đang ở trạng thái '{batch.status}'.")

    # Kiểm tra scope của reviewer
    require_scope(quality_db, current_user, "department", batch.department_code)
    if batch.station_code:
        require_scope(quality_db, current_user, "station", batch.station_code)

    before_data = serialize_batch(batch)

    # Cập nhật trạng thái lô báo cáo sang rejected
    batch.status = "rejected"
    batch.rejected_by = current_user.username
    batch.rejected_at = datetime.utcnow()
    batch.reject_reason = payload.review_note

    # Cập nhật review task con
    task = quality_db.query(QualityReviewTask).filter(
        QualityReviewTask.target_id == batch_id,
        QualityReviewTask.target_type == "input_batch",
        QualityReviewTask.status == "pending"
    ).first()
    if task:
        task.status = "rejected"
        task.reviewed_by = current_user.username
        task.reviewed_at = datetime.utcnow()
        task.review_note = payload.review_note

    quality_db.commit()

    # Audit log
    log_audit(
        quality_db,
        current_user,
        "reject_input_batch",
        "quality_input_batches",
        str(batch.id),
        before_data=before_data,
        after_data=serialize_batch(batch),
        request=request
    )

    return ok_response({
        "batch_id": batch.id,
        "batch_code": batch.batch_code,
        "status": batch.status
    }, "Đã từ chối duyệt và trả lại lô báo cáo số liệu thành công.")


@app.get("/api/v1/quality/period-locks")
async def list_period_locks(
    period_type: Optional[str] = None,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [PHASE 5] DANH SÁCH LỊCH SỬ KHÓA SỔ KỲ BÁO CÁO (period locks)
    """
    require_any_permission(quality_db, current_user, ["reports:period_lock:view", "admin:view"])

    query = quality_db.query(QualityPeriodLock)
    if period_type:
        query = query.filter(QualityPeriodLock.period_type == period_type)

    locks = query.order_by(QualityPeriodLock.locked_at.desc()).all()

    data = []
    for l in locks:
        data.append({
            "id": l.id,
            "period_type": l.period_type,
            "report_date": l.report_date.isoformat(),
            "department_code": l.department_code,
            "station_code": l.station_code,
            "is_locked": l.is_locked,
            "locked_by": l.locked_by,
            "locked_at": l.locked_at.isoformat() if l.locked_at else None,
            "unlock_reason": l.unlock_reason,
            "unlocked_by": l.unlocked_by,
            "unlocked_at": l.unlocked_at.isoformat() if l.unlocked_at else None
        })

    return ok_response(data)


@app.post("/api/v1/quality/period-locks")
async def lock_period(
    payload: PeriodLockInput,
    request: Request,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [PHASE 5] THỰC HIỆN KHÓA SỔ KỲ BÁO CÁO (lock)
    Đóng băng dữ liệu của kỳ, chặn mọi chỉnh sửa hoặc import Excel con.
    """
    require_any_permission(quality_db, current_user, ["reports:period_lock:lock", "admin:view"])

    # 1. Kiểm tra an toàn: Xem có còn lô số liệu nào trong kỳ này chưa duyệt (Draft hoặc Submitted) không
    if not payload.override_pending:
        pending_query = quality_db.query(QualityInputBatch).filter(
            QualityInputBatch.report_date == payload.report_date,
            QualityInputBatch.period_type == payload.period_type
        )
        if payload.department_code:
            pending_query = pending_query.filter(QualityInputBatch.department_code == payload.department_code)
        if payload.station_code:
            pending_query = pending_query.filter(QualityInputBatch.station_code == payload.station_code)

        pending_batches = pending_query.filter(QualityInputBatch.status.in_(["draft", "submitted", "rejected"])).all()
        if pending_batches:
            codes = ", ".join([b.batch_code for b in pending_batches])
            raise HTTPException(
                status_code=400,
                detail=f"Không thể khóa sổ! Còn {len(pending_batches)} lô số liệu chưa được duyệt hoặc đã bị từ chối: {codes}."
            )

    # 2. Lưu thông tin khóa sổ vào DB
    lock_rec = quality_db.query(QualityPeriodLock).filter(
        QualityPeriodLock.period_type == payload.period_type,
        QualityPeriodLock.report_date == payload.report_date,
        QualityPeriodLock.department_code == payload.department_code,
        QualityPeriodLock.station_code == payload.station_code
    ).first()

    if lock_rec:
        lock_rec.is_locked = True
        lock_rec.locked_by = current_user.username
        lock_rec.locked_at = datetime.utcnow()
        lock_rec.unlock_reason = None
        lock_rec.unlocked_by = None
        lock_rec.unlocked_at = None
    else:
        lock_rec = QualityPeriodLock(
            period_type=payload.period_type,
            report_date=payload.report_date,
            department_code=payload.department_code,
            station_code=payload.station_code,
            is_locked=True,
            locked_by=current_user.username,
            locked_at=datetime.utcnow()
        )
        quality_db.add(lock_rec)

    # Đồng thời cập nhật trạng thái của tất cả các lô báo cáo con tương ứng sang 'locked'
    batches_to_lock_query = quality_db.query(QualityInputBatch).filter(
        QualityInputBatch.report_date == payload.report_date,
        QualityInputBatch.period_type == payload.period_type
    )
    if payload.department_code:
        batches_to_lock_query = batches_to_lock_query.filter(QualityInputBatch.department_code == payload.department_code)
    if payload.station_code:
        batches_to_lock_query = batches_to_lock_query.filter(QualityInputBatch.station_code == payload.station_code)
    
    batches_to_lock = batches_to_lock_query.all()
    for b in batches_to_lock:
        b.status = "locked"
        b.locked_by = current_user.username
        b.locked_at = datetime.utcnow()

    quality_db.commit()

    # Audit Log
    log_audit(
        quality_db,
        current_user,
        "lock_period",
        "quality_period_locks",
        str(lock_rec.id),
        after_data={
            "period_type": payload.period_type,
            "report_date": payload.report_date.isoformat(),
            "department_code": payload.department_code,
            "station_code": payload.station_code
        },
        request=request
    )

    return ok_response({
        "lock_id": lock_rec.id,
        "is_locked": lock_rec.is_locked
    }, "Khóa sổ kỳ báo cáo thành công! Dữ liệu của kỳ đã được đóng băng.")


@app.post("/api/v1/quality/period-locks/{lock_id}/unlock")
async def unlock_period(
    lock_id: int,
    payload: PeriodUnlockInput,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [PHASE 5] THỰC HIỆN MỞ KHÓA SỔ KỲ BÁO CÁO (unlock)
    Cho phép nhân viên tiếp tục cập nhật số liệu sau khi mở khóa. Bắt buộc lý do.
    """
    require_any_permission(quality_db, current_user, ["reports:period_lock:unlock", "admin:view"])

    if not payload.unlock_reason or not payload.unlock_reason.strip():
        raise HTTPException(status_code=400, detail="Lý do mở khóa kỳ sổ là bắt buộc.")

    lock_rec = quality_db.query(QualityPeriodLock).filter(QualityPeriodLock.id == lock_id).first()
    if not lock_rec:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi khóa sổ kỳ báo cáo.")

    if not lock_rec.is_locked:
        return ok_response({"lock_id": lock_rec.id, "is_locked": lock_rec.is_locked}, "Kỳ báo cáo này đang ở trạng thái mở khóa sổ.")

    # Cập nhật bản ghi khóa sổ
    lock_rec.is_locked = False
    lock_rec.unlock_reason = payload.unlock_reason
    lock_rec.unlocked_by = current_user.username
    lock_rec.unlocked_at = datetime.utcnow()

    # Đồng thời cập nhật trạng thái của tất cả các lô báo cáo con tương ứng ngược về 'draft' để cho phép chỉnh sửa lại
    batches_to_unlock_query = quality_db.query(QualityInputBatch).filter(
        QualityInputBatch.report_date == lock_rec.report_date,
        QualityInputBatch.period_type == lock_rec.period_type
    )
    if lock_rec.department_code:
        batches_to_unlock_query = batches_to_unlock_query.filter(QualityInputBatch.department_code == lock_rec.department_code)
    if lock_rec.station_code:
        batches_to_unlock_query = batches_to_unlock_query.filter(QualityInputBatch.station_code == lock_rec.station_code)

    batches_to_unlock = batches_to_unlock_query.all()
    for b in batches_to_unlock:
        b.status = "draft"

    quality_db.commit()

    # Audit Log
    log_audit(
        quality_db,
        current_user,
        "unlock_period",
        "quality_period_locks",
        str(lock_rec.id),
        after_data={
            "lock_id": lock_rec.id,
            "unlock_reason": payload.unlock_reason,
            "unlocked_by": current_user.username
        },
        request=request
    )

    trigger_auto_calculation(
        db=quality_db,
        background_tasks=background_tasks,
        report_date=lock_rec.report_date,
        period_type=lock_rec.period_type,
        department_code=lock_rec.department_code,
        station_code=lock_rec.station_code,
        username=current_user.username
    )

    return ok_response({
        "lock_id": lock_rec.id,
        "is_locked": lock_rec.is_locked
    }, "Mở khóa sổ kỳ báo cáo thành công! Nhân viên có thể chỉnh sửa lại số liệu của kỳ này.")


# --- PHASE 6: CALCULATION ENGINE MVP APIs ---

from fastapi import BackgroundTasks
from pydantic import BaseModel, Field
from datetime import date
from data_engine.jobs.run_calculation import run_calculation_job

class CalculationRunInput(BaseModel):
    period_type: str = Field(default="daily", description="Tần suất báo cáo: daily hoặc monthly")
    report_date: date = Field(..., description="Ngày số liệu chạy tính toán")
    department_code: Optional[str] = Field(default=None, description="Mã khoa phòng lọc")
    station_code: Optional[str] = Field(default=None, description="Mã trạm vệ tinh lọc")
    run_type: Optional[str] = Field(default="manual", description="Loại chạy tính toán: manual hoặc auto")


def run_calculation_background(
    run_id: int,
    report_date: date,
    period_type: str,
    department_code: Optional[str],
    station_code: Optional[str]
):
    """Tiến trình nền chạy động cơ tính toán sử dụng Session độc lập."""
    db = SessionLocal()
    try:
        run_calculation_job(
            db=db,
            run_id=run_id,
            report_date=report_date,
            period_type=period_type,
            department_code=department_code,
            station_code=station_code
        )
    finally:
        db.close()


def trigger_auto_calculation(
    db: Session,
    background_tasks: BackgroundTasks,
    report_date: date,
    period_type: str,
    department_code: Optional[str] = None,
    station_code: Optional[str] = None,
    username: str = "system"
):
    """[PHASE 6] Tự động đăng ký lượt tính toán và khởi chạy nền bất đồng bộ."""
    run_rec = QualityCalculationRun(
        status="pending",
        period_type=period_type,
        report_date=report_date,
        department_code=department_code,
        station_code=station_code,
        run_type="auto",
        created_by=username,
        started_at=datetime.utcnow()
    )
    db.add(run_rec)
    db.commit()
    db.refresh(run_rec)

    background_tasks.add_task(
        run_calculation_background,
        run_rec.id,
        report_date,
        period_type,
        department_code,
        station_code
    )
    return run_rec


@app.post("/api/v1/quality/calculate/run")
async def trigger_calculation_run(
    payload: CalculationRunInput,
    background_tasks: BackgroundTasks,
    request: Request,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [PHASE 6] KÍCH HOẠT LƯỢT CHẠY TÍNH TOÁN CHỈ SỐ LÂM SÀNG
    Ghi nhận một lượt chạy tính toán mới ở trạng thái pending và đẩy tiến trình tính toán lâm sàng vào background workers.
    """
    require_any_permission(quality_db, current_user, ["indicators:recalculate", "etl:run", "admin:view"])

    # 1. Khởi tạo bản ghi lượt chạy lưu lịch sử trong DB ở trạng thái pending
    run_rec = QualityCalculationRun(
        status="pending",
        period_type=payload.period_type,
        report_date=payload.report_date,
        department_code=payload.department_code,
        station_code=payload.station_code,
        run_type=payload.run_type or "manual",
        created_by=current_user.username,
        started_at=datetime.utcnow()
    )
    quality_db.add(run_rec)
    quality_db.commit()

    # 2. Đẩy tiến trình chạy bất đồng bộ vào background tasks của FastAPI
    background_tasks.add_task(
        run_calculation_background,
        run_rec.id,
        payload.report_date,
        payload.period_type,
        payload.department_code,
        payload.station_code
    )

    # 3. Ghi Audit Log hành động
    log_audit(
        quality_db,
        current_user,
        "run_calculation",
        "quality_calculation_runs",
        str(run_rec.id),
        after_data={
            "period_type": payload.period_type,
            "report_date": payload.report_date.isoformat(),
            "department_code": payload.department_code,
            "station_code": payload.station_code
        },
        request=request
    )

    return ok_response({
        "run_id": run_rec.id,
        "status": run_rec.status,
        "report_date": payload.report_date.isoformat(),
        "period_type": payload.period_type
    }, "Đã kích hoạt động cơ tính toán chỉ số chất lượng lâm sàng thành công ở nền.")


@app.get("/api/v1/quality/calculate/runs")
async def list_calculation_runs(
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [PHASE 6] LẤY DANH SÁCH LỊCH SỬ CÁC LƯỢT CHẠY TÍNH TOÁN
    """
    require_any_permission(quality_db, current_user, ["etl:view", "admin:view"])

    runs = quality_db.query(QualityCalculationRun).order_by(QualityCalculationRun.started_at.desc()).all()
    
    data = []
    for r in runs:
        data.append({
            "id": r.id,
            "status": r.status,
            "period_type": r.period_type,
            "report_date": r.report_date.isoformat() if r.report_date else None,
            "department_code": r.department_code,
            "station_code": r.station_code,
            "run_type": r.run_type,
            "created_by": r.created_by,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "finished_at": r.finished_at.isoformat() if r.finished_at else None,
            "success_count": r.success_count,
            "error_count": r.error_count
        })

    return ok_response(data)


@app.get("/api/v1/quality/calculate/runs/{run_id}")
async def get_calculation_run_detail(
    run_id: int,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [PHASE 6] XEM CHI TIẾT LOG VÀ THÔNG SỐ CỦA LƯỢT CHẠY TÍNH TOÁN
    """
    require_any_permission(quality_db, current_user, ["etl:view_logs", "etl:view", "admin:view"])

    run_rec = quality_db.query(QualityCalculationRun).filter(QualityCalculationRun.id == run_id).first()
    if not run_rec:
        raise HTTPException(status_code=404, detail="Không tìm thấy lượt chạy tính toán.")

    return ok_response({
        "id": run_rec.id,
        "status": run_rec.status,
        "period_type": run_rec.period_type,
        "report_date": run_rec.report_date.isoformat() if run_rec.report_date else None,
        "department_code": run_rec.department_code,
        "station_code": run_rec.station_code,
        "run_type": run_rec.run_type,
        "created_by": run_rec.created_by,
        "started_at": run_rec.started_at.isoformat() if run_rec.started_at else None,
        "finished_at": run_rec.finished_at.isoformat() if run_rec.finished_at else None,
        "success_count": run_rec.success_count,
        "error_count": run_rec.error_count,
        "logs": run_rec.logs
    })


@app.get("/")
async def root():
    return {"message": "Welcome to AI Chatbot API"}

