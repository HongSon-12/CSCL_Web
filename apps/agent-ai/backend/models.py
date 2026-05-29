from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import relationship, declarative_base
from pgvector.sqlalchemy import Vector
import uuid
from datetime import datetime

Base = declarative_base()

# Many-to-Many relationship table for User-Role
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True),
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id"), primary_key=True),
)

# Many-to-Many relationship table for Role-Permission
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id"), primary_key=True),
    Column("permission_id", UUID(as_uuid=True), ForeignKey("permissions.id"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True)
    full_name = Column(String)
    password_hash = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    roles = relationship("Role", secondary=user_roles, back_populates="users")

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    description = Column(String)
    
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, nullable=False)
    description = Column(String)
    
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")

# --- NEW RAG TABLES ---

class Document(Base):
    __tablename__ = "documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    document_type = Column(String)
    department = Column(String)
    description = Column(String)
    current_version_id = Column(UUID(as_uuid=True))
    status = Column(String, default="active")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    versions = relationship("DocumentVersion", back_populates="document")

class DocumentVersion(Base):
    __tablename__ = "document_versions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"))
    version_number = Column(Integer, nullable=False)
    file_name = Column(String, nullable=False)
    file_ext = Column(String)
    mime_type = Column(String)
    original_path = Column(String)
    normalized_path = Column(String)
    extracted_path = Column(String)
    checksum = Column(String)
    status = Column(String, default="pending_review")
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    indexed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("Document", back_populates="versions")
    chunks = relationship("DocumentChunk", back_populates="version")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"))
    document_version_id = Column(UUID(as_uuid=True), ForeignKey("document_versions.id"))
    chunk_index = Column(Integer, nullable=False)
    title_path = Column(ARRAY(String))
    content_md = Column(String, nullable=False)
    content_text = Column(String, nullable=False)
    page_number = Column(Integer)
    token_count = Column(Integer)
    chunk_metadata = Column(JSONB)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    version = relationship("DocumentVersion", back_populates="chunks")
    embedding = relationship("DocumentEmbedding", uselist=False, back_populates="chunk")

class DocumentEmbedding(Base):
    __tablename__ = "document_embeddings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chunk_id = Column(UUID(as_uuid=True), ForeignKey("document_chunks.id", ondelete="CASCADE"))
    document_version_id = Column(UUID(as_uuid=True), ForeignKey("document_versions.id"))
    embedding = Column(Vector(1024)) # For BAAI/bge-m3 local model
    embedding_model = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    chunk = relationship("DocumentChunk", back_populates="embedding")

class IndexingJob(Base):
    __tablename__ = "indexing_jobs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_version_id = Column(UUID(as_uuid=True), ForeignKey("document_versions.id"))
    status = Column(String, default="pending") # pending, processing, completed, failed
    attempts = Column(Integer, default=0)
    error_message = Column(String)
    started_at = Column(DateTime)
    finished_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


# --- QLCL WEB PHASE 2 TABLES ---
# NOTE: These are new, isolated `quality_*` tables for QLCL Web. They are
# intentionally separate from existing Agent-AI/RAG tables so creating them
# does not mutate existing business data.

quality_role_permissions = Table(
    "quality_role_permissions",
    Base.metadata,
    Column("role_id", BigInteger, ForeignKey("quality_roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", BigInteger, ForeignKey("quality_permissions.id", ondelete="CASCADE"), primary_key=True),
)


class QualityDepartment(Base):
    __tablename__ = "quality_departments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    code = Column(Text, unique=True, nullable=False)
    name = Column(Text, nullable=False)
    short_name = Column(Text)
    parent_code = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QualityStation(Base):
    __tablename__ = "quality_stations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    code = Column(Text, unique=True, nullable=False)
    name = Column(Text, nullable=False)
    department_code = Column(Text)
    is_satellite = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QualityHospital(Base):
    __tablename__ = "quality_hospitals"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    code = Column(Text, unique=True)
    name = Column(Text, nullable=False)
    api_id = Column(Text)
    excel_name = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QualityIndicatorCatalog(Base):
    __tablename__ = "quality_indicator_catalog"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    code = Column(Text, unique=True, nullable=False)
    name = Column(Text, nullable=False)
    description = Column(Text)
    group_code = Column(Text)
    formula_text = Column(Text)
    formula_python_key = Column(Text)
    unit = Column(Text)
    frequency = Column(Text, default="daily")
    source_type = Column(Text, default="mixed")
    owner_department_code = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QualityIndicatorVariable(Base):
    __tablename__ = "quality_indicator_variables"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    variable_code = Column(Text, unique=True, nullable=False)
    name = Column(Text, nullable=False)
    description = Column(Text)
    group_code = Column(Text)
    department_code = Column(Text)
    data_type = Column(Text, default="number")
    unit = Column(Text)
    source_type = Column(Text, default="manual")
    source_table = Column(Text)
    source_column = Column(Text)
    required = Column(Boolean, default=False)
    min_value = Column(Numeric)
    max_value = Column(Numeric)
    calculation_note = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QualityIndicatorThreshold(Base):
    __tablename__ = "quality_indicator_thresholds"
    __table_args__ = (
        UniqueConstraint(
            "indicator_code",
            "department_code",
            "station_code",
            "period_type",
            name="uq_quality_indicator_threshold_scope",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    indicator_code = Column(Text, nullable=False)
    department_code = Column(Text)
    station_code = Column(Text)
    period_type = Column(Text, default="daily")
    warning_min = Column(Numeric)
    warning_max = Column(Numeric)
    critical_min = Column(Numeric)
    critical_max = Column(Numeric)
    target_value = Column(Numeric)
    comparison_direction = Column(Text, default="higher_is_better")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QualityRole(Base):
    __tablename__ = "quality_roles"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    role_code = Column(Text, unique=True, nullable=False)
    role_name = Column(Text, nullable=False)
    description = Column(Text)
    is_system = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    permissions = relationship("QualityPermission", secondary=quality_role_permissions, back_populates="roles")
    user_roles = relationship("QualityUserRole", back_populates="role")


class QualityPermission(Base):
    __tablename__ = "quality_permissions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    permission_code = Column(Text, unique=True, nullable=False)
    permission_name = Column(Text, nullable=False)
    module_code = Column(Text, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    roles = relationship("QualityRole", secondary=quality_role_permissions, back_populates="permissions")


class QualityUserRole(Base):
    __tablename__ = "quality_user_roles"

    user_id = Column(Text, primary_key=True)
    role_id = Column(BigInteger, ForeignKey("quality_roles.id", ondelete="CASCADE"), primary_key=True)
    assigned_by = Column(Text)
    assigned_at = Column(DateTime, default=datetime.utcnow)

    role = relationship("QualityRole", back_populates="user_roles")


class QualityUserScope(Base):
    __tablename__ = "quality_user_scopes"
    __table_args__ = (
        UniqueConstraint("user_id", "scope_type", "scope_code", name="uq_quality_user_scope"),
        Index("idx_quality_user_scopes_user", "user_id"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Text, nullable=False)
    scope_type = Column(Text, nullable=False)
    scope_code = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class QualityAuditLog(Base):
    __tablename__ = "quality_audit_logs"
    __table_args__ = (
        Index("idx_quality_audit_target", "target_table", "target_id"),
        Index("idx_quality_audit_actor_time", "actor", "created_at"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    actor = Column(Text)
    action = Column(Text, nullable=False)
    target_table = Column(Text)
    target_id = Column(Text)
    before_data = Column(JSONB)
    after_data = Column(JSONB)
    ip_address = Column(Text)
    user_agent = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class QualityDataQualityLog(Base):
    __tablename__ = "quality_data_quality_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    source_type = Column(Text)
    batch_id = Column(BigInteger)
    table_name = Column(Text)
    row_identifier = Column(Text)
    severity = Column(Text, default="error")
    error_code = Column(Text)
    error_message = Column(Text)
    raw_payload = Column(JSONB)
    created_at = Column(DateTime, default=datetime.utcnow)


class QualityInputBatch(Base):
    """
    [PHASE 3] Lô/Đợt Báo Cáo Nghiệp Vụ Chỉ Số Chất Lượng (quality_input_batches)
    Bảng này quản lý tổng thể một đợt nhập báo cáo số liệu của một khoa/phòng ban hoặc trạm vệ tinh.
    """
    __tablename__ = "quality_input_batches"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    batch_code = Column(Text, unique=True, nullable=False)  # Mã lô duy nhất (Format: INP-YYYYMMDD-XXXX)
    report_date = Column(Date, nullable=False)  # Ngày của dữ liệu báo cáo
    period_type = Column(Text, default="daily")  # Tần suất báo cáo: daily (hàng ngày), monthly (hàng tháng)
    department_code = Column(Text)  # Mã phòng ban báo cáo (BGD, KDH, KCCNBV, QLCL...)
    station_code = Column(Text)  # Mã trạm vệ tinh (nếu có, ví dụ thuộc KCCNBV)
    source_type = Column(Text, default="web_form")  # Nguồn nhập: web_form (nhập web thủ công) hoặc import (Excel)
    status = Column(Text, default="draft")  # Trạng thái: draft (nháp), submitted (chờ duyệt), approved (đã duyệt), rejected (bị từ chối), locked (khóa sổ)
    created_by = Column(Text)  # Username tài khoản nhập liệu tạo lô
    submitted_by = Column(Text)  # Username tài khoản nộp báo cáo
    approved_by = Column(Text)  # Username tài khoản duyệt báo cáo
    rejected_by = Column(Text)  # Username tài khoản từ chối báo cáo
    locked_by = Column(Text)  # Username tài khoản thực hiện khóa kỳ sổ
    created_at = Column(DateTime, default=datetime.utcnow)  # Thời điểm tạo lô nháp
    submitted_at = Column(DateTime)  # Thời điểm nộp báo cáo
    approved_at = Column(DateTime)  # Thời điểm phê duyệt báo cáo
    rejected_at = Column(DateTime)  # Thời điểm từ chối báo cáo
    locked_at = Column(DateTime)  # Thời điểm khóa đợt báo cáo này
    note = Column(Text)  # Ghi chú tổng hợp của ca trực/đợt báo cáo
    reject_reason = Column(Text)  # Lý do từ chối phê duyệt (bắt buộc khi trạng thái là rejected)

    # Thiết lập mối quan hệ 1-N tới chi tiết số liệu báo cáo
    records = relationship("QualityInputRecord", back_populates="batch", cascade="all, delete-orphan")


class QualityInputRecord(Base):
    """
    [PHASE 3] Chi Tiết Bản Ghi Số Liệu Biến Số Nghiệp Vụ (quality_input_records)
    Bảng này lưu trữ giá trị cụ thể của từng biến số hoặc chỉ số nghiệp vụ thô được điền trong form.
    """
    __tablename__ = "quality_input_records"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    batch_id = Column(BigInteger, ForeignKey("quality_input_batches.id", ondelete="CASCADE"))  # Liên kết tới Lô báo cáo cha
    report_date = Column(Date, nullable=False)  # Ngày của số liệu (đồng bộ với Batch cha)
    period_type = Column(Text, default="daily")  # Tần suất báo cáo: daily hoặc monthly
    department_code = Column(Text)  # Mã phòng ban báo cáo
    station_code = Column(Text)  # Mã trạm vệ tinh (nếu có)
    variable_code = Column(Text)  # Mã biến số nghiệp vụ thô (ví dụ: A1, A2, B1...)
    indicator_code = Column(Text)  # Mã chỉ số lâm sàng (nếu có nhập trực tiếp)
    value = Column(Numeric)  # Giá trị số thực (Float/Decimal) nhập vào
    text_value = Column(Text)  # Giá trị dạng văn bản (nếu biến số yêu cầu chữ)
    unit = Column(Text)  # Đơn vị tính (cuộc, trường hợp, phút...) đồng bộ từ Catalog lúc tạo
    note = Column(Text)  # Ghi chú riêng cho dòng số liệu này
    row_status = Column(Text, default="valid")  # Trạng thái dòng số liệu: valid (hợp lệ), warning (cảnh báo), error (lỗi chặn nộp)
    error_code = Column(Text)  # Mã lỗi nếu có vi phạm luật nghiệp vụ (ví dụ: OUT_OF_BOUNDS_MIN)
    error_message = Column(Text)  # Nội dung thông báo lỗi cụ thể để sửa
    created_by = Column(Text)  # Username tài khoản điền số liệu dòng này
    updated_by = Column(Text)  # Username tài khoản cập nhật số liệu lần gần nhất
    created_at = Column(DateTime, default=datetime.utcnow)  # Thời điểm tạo bản ghi
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # Thời điểm cập nhật

    # Quan hệ liên kết ngược tới Lô báo cáo cha
    batch = relationship("QualityInputBatch", back_populates="records")


class QualityImportBatch(Base):
    """
    [PHASE 4] Đợt Nhập Báo Cáo Từ Tệp Excel/CSV (quality_import_batches)
    Bảng này lưu trữ siêu dữ liệu (metadata) của một tệp Excel/CSV được tải lên hệ thống.
    """
    __tablename__ = "quality_import_batches"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    batch_code = Column(Text, unique=True, nullable=False)      # Mã đợt import (Ví dụ: IMP-YYYYMMDD-XXXX)
    file_name = Column(Text, nullable=False)                    # Tên tệp tin gốc của người dùng
    file_path = Column(Text, nullable=False)                    # Đường dẫn lưu trữ private thực tế trên máy chủ
    file_hash = Column(Text, nullable=False)                    # Chữ ký số SHA256 chống trùng lặp tệp
    status = Column(Text, default="uploaded")                   # Trạng thái: uploaded (đang chờ), validated (đã kiểm tra), confirmed (đã nạp chính thức), cancelled (đã hủy)
    total_rows = Column(Integer, default=0)                     # Tổng số dòng trong tệp
    valid_rows = Column(Integer, default=0)                     # Số dòng hợp lệ
    warning_rows = Column(Integer, default=0)                   # Số dòng có cảnh báo nhẹ
    error_rows = Column(Integer, default=0)                     # Số dòng có lỗi nghiêm trọng (chặn nộp)
    created_by = Column(Text, nullable=False)                   # Tài khoản thực hiện tải lên tệp
    created_at = Column(DateTime, default=datetime.utcnow)      # Thời điểm đăng tải
    processed_by = Column(Text)                                 # Tài khoản phê duyệt nạp hoặc hủy đợt import
    processed_at = Column(DateTime)                             # Thời điểm xử lý hành động confirm/cancel

    # Mối quan hệ 1-N tới chi tiết các dòng Excel được phân tách lưu tạm
    rows = relationship("QualityImportRow", back_populates="batch", cascade="all, delete-orphan")


class QualityImportRow(Base):
    """
    [PHASE 4] Dòng Dữ Liệu Phân Tách Từ Tệp Excel/CSV Lưu Tạm (quality_import_rows)
    Bảng đệm (staging area) lưu trữ tạm thời từng dòng dữ liệu Excel đã parse phục vụ validate và preview.
    """
    __tablename__ = "quality_import_rows"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    import_batch_id = Column(BigInteger, ForeignKey("quality_import_batches.id", ondelete="CASCADE"), nullable=False)
    row_index = Column(Integer, nullable=False)                 # Vị trí số thứ tự dòng trong file Excel gốc
    raw_payload = Column(JSONB, nullable=False)                 # Bản lưu thô nguyên bản của dòng dưới dạng JSON
    normalized_payload = Column(JSONB)                          # Bản chuẩn hóa kiểu dữ liệu nghiệp vụ
    row_status = Column(Text, default="valid")                  # Trạng thái dòng: valid (hợp lệ), warning (cảnh báo), error (lỗi nghiêm trọng)
    error_message = Column(Text)                                # Mô tả chi tiết lỗi phát sinh để sửa tệp
    created_at = Column(DateTime, default=datetime.utcnow)      # Thời điểm lưu trữ đệm

    # Liên kết ngược tới đợt import cha
    batch = relationship("QualityImportBatch", back_populates="rows")


class QualityReviewTask(Base):
    """
    [PHASE 5] Nhiệm Vụ Phê Duyệt Báo Cáo Lâm Sàng (quality_review_tasks)
    Bảng này lưu trữ hàng đợi phê duyệt của các đợt số liệu báo cáo gửi lên.
    """
    __tablename__ = "quality_review_tasks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    target_type = Column(Text, nullable=False, default="input_batch")  # Loại đối tượng duyệt (ví dụ: input_batch)
    target_id = Column(BigInteger, nullable=False)                     # ID của Lô báo cáo
    status = Column(Text, default="pending")                           # Trạng thái duyệt: pending (chờ duyệt), approved (đã duyệt), rejected (bị từ chối)
    assigned_to = Column(Text)                                         # Người được gán xử lý
    requested_by = Column(Text, nullable=False)                        # Username người gửi duyệt
    reviewed_by = Column(Text)                                         # Username người duyệt
    requested_at = Column(DateTime, default=datetime.utcnow)           # Thời điểm gửi duyệt
    reviewed_at = Column(DateTime)                                     # Thời điểm duyệt / từ chối
    review_note = Column(Text)                                         # Ghi chú nhận xét phê duyệt / Lý do từ chối


class QualityPeriodLock(Base):
    """
    [PHASE 5] Khóa Sổ Kỳ Báo Cáo Chỉ Số Chất Lượng (quality_period_locks)
    Bảng này đóng băng dữ liệu báo cáo của khoa/phòng trong kỳ báo cáo để tránh thay đổi ngoài ý muốn.
    """
    __tablename__ = "quality_period_locks"
    __table_args__ = (
        UniqueConstraint("period_type", "report_date", "department_code", "station_code", name="uq_period_lock_scope"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    period_type = Column(Text, nullable=False, default="daily")         # Tần suất khóa: daily hoặc monthly
    report_date = Column(Date, nullable=False)                          # Ngày báo cáo được khóa
    department_code = Column(Text)                                      # Khoa phòng được khóa
    station_code = Column(Text)                                         # Trạm vệ tinh được khóa (nếu có)
    is_locked = Column(Boolean, default=True)                           # Đã khóa hay mở khóa
    locked_by = Column(Text)                                            # Username người khóa
    locked_at = Column(DateTime, default=datetime.utcnow)               # Thời điểm khóa
    unlock_reason = Column(Text)                                        # Lý do mở khóa (bắt buộc)
    unlocked_by = Column(Text)                                          # Username người mở khóa
    unlocked_at = Column(DateTime)                                      # Thời điểm mở khóa


class QualityCalculationRun(Base):
    """
    [PHASE 6] Nhật Ký Các Lượt Chạy Tính Toán Chỉ Số Chất Lượng (quality_calculation_runs)
    Bảng này ghi nhận thông tin lịch sử của từng lượt kích hoạt động cơ tính toán.
    """
    __tablename__ = "quality_calculation_runs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    status = Column(Text, default="pending")                           # Trạng thái: pending (chờ chạy), running (đang chạy), success (thành công), failed (thất bại), partial_success (thành công một phần)
    period_type = Column(Text, nullable=False, default="daily")         # Tần suất tính toán: daily hoặc monthly
    report_date = Column(Date, nullable=False)                          # Ngày số liệu được tính toán
    department_code = Column(Text)                                      # Mã khoa phòng lọc (nếu chạy cho riêng khoa)
    station_code = Column(Text)                                         # Mã trạm vệ tinh lọc (nếu có)
    run_type = Column(Text, default="manual")                           # Loại chạy: manual (nhấp tay) hoặc scheduled (cronjob tự động)
    created_by = Column(Text, nullable=False)                           # Username tài khoản kích hoạt tính toán
    started_at = Column(DateTime, default=datetime.utcnow)              # Thời điểm bắt đầu tiến trình
    finished_at = Column(DateTime)                                      # Thời điểm kết thúc tiến trình
    success_count = Column(Integer, default=0)                          # Số lượng chỉ số tính toán thành công
    error_count = Column(Integer, default=0)                            # Số lượng chỉ số bị lỗi tính toán
    logs = Column(Text)                                                 # Logs chi tiết lỗi hoặc tiến trình của động cơ tính toán


class QualityIndicatorResult(Base):
    """
    [PHASE 6] Kết Quả Tính Toán Chỉ Số Chất Lượng Lâm Sàng Chính Thức (quality_indicator_results)
    Bảng này lưu trữ giá trị chỉ số chất lượng chính thức sau khi tổng hợp qua động cơ tính toán.
    """
    __tablename__ = "quality_indicator_results"
    __table_args__ = (
        UniqueConstraint(
            "indicator_code", "period_type", "report_date", "department_code", "station_code",
            name="uq_indicator_result_scope"
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    indicator_code = Column(Text, nullable=False)                       # Mã chỉ số lâm sàng (ví dụ: CS1, CS2...)
    period_type = Column(Text, nullable=False, default="daily")         # Chu kỳ: daily hoặc monthly
    report_date = Column(Date, nullable=False)                          # Ngày tính toán kết quả chỉ số
    department_code = Column(Text)                                      # Khoa phòng được tính toán
    station_code = Column(Text)                                         # Trạm vệ tinh được tính toán (nếu có)
    numerator_value = Column(Numeric)                                   # Giá trị tử số thô
    denominator_value = Column(Numeric)                                 # Giá trị mẫu số thô (nếu có)
    value = Column(Numeric)                                             # Kết quả chỉ số cuối cùng (Float/Decimal)
    calculated_at = Column(DateTime, default=datetime.utcnow)           # Thời điểm tính toán
    calculation_run_id = Column(BigInteger, ForeignKey("quality_calculation_runs.id")) # ID của lượt chạy tính toán tương ứng


class QualityKccnbv(Base):
    """
    [PHASE 4] Bảng Dữ Liệu Chi Tiết Cấp Cứu Ngoài Bệnh Viện (kccnbv)
    """
    __tablename__ = "kccnbv"

    so_benh_an = Column(BigInteger, primary_key=True)  # Số bệnh án cấp cứu (Khóa chính)
    stt = Column(Integer)
    ngay = Column(Date, nullable=False)
    xu_ly_boi = Column(Text)
    tram_duoc_thong_bao = Column(Text)
    tram_xu_ly = Column(Text)
    ho_ten_benh_nhan = Column(Text)
    gioi_tinh = Column(Text)
    sinh_nam = Column(Integer)
    dia_chi_cap_cuu = Column(Text)
    goi_cap_cuu = Column(Text)  # hh:nn
    thoi_gian_tao_phieu_tiep_nhan = Column(Text)
    thoi_gian_nhan_dien_thoai = Column(Text)
    thoi_gian_xuat_xe = Column(Text)
    thoi_gian_den_hien_truong = Column(Text)
    thoi_gian_den_benh_vien = Column(Text)
    thoi_gian_hoan_tat = Column(Text)
    thoi_luong_xu_ly = Column(Integer)
    thoi_luong_dieu_phoi = Column(Integer)
    thoi_luong_xuat_xe = Column(Integer)
    thoi_luong_den_hien_truong = Column(Integer)
    thoi_luong_den_benh_vien = Column(Integer)
    thoi_luong_hoan_tat_ban_giao = Column(Integer)
    ly_do_goi_den_cap_cuu = Column(Text)
    huyet_ap = Column(Text)
    mach = Column(Text)
    nhiet_do = Column(Text)
    nhip_tho = Column(Text)
    spo2 = Column(Text)
    ly_do_cap_cuu = Column(Text)
    ma_benh = Column(Text)
    chan_doan_theo_icd = Column(Text)
    chan_doan_so_bo = Column(Text)
    benh_vien_nhan = Column(Text)
    xu_tri = Column(Text)
    ghi_chu_sau_xu_tri = Column(Text)
    huyet_ap_2 = Column(Text)
    mach_2 = Column(Text)
    nhiet_do_2 = Column(Text)
    nhip_tho_2 = Column(Text)
    spo2_2 = Column(Text)


class QualityChiSo(Base):
    """
    [PHASE 3] Bảng Chỉ Số Chất Lượng Khoa Phòng (chi_so)
    """
    __tablename__ = "chi_so"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    time = Column(DateTime, default=datetime.utcnow)
    by = Column(Text)
    phone = Column(Text)
    datereport = Column(Date, nullable=False)
    room = Column(Text)

    # CS24 to CS53 columns (CS24, CS25, CS28-CS53)
    cs24 = Column(Numeric)
    cs24cg = Column(Numeric)
    cs24q8 = Column(Numeric)
    cs24td = Column(Numeric)
    cs24ub = Column(Numeric)
    cs25 = Column(Numeric)
    cs25cg = Column(Numeric)
    cs25q8 = Column(Numeric)
    cs25td = Column(Numeric)
    cs25ub = Column(Numeric)
    cs28 = Column(Numeric)
    cs29 = Column(Numeric)
    cs30 = Column(Numeric)
    cs31 = Column(Numeric)
    cs32 = Column(Numeric)
    cs33 = Column(Numeric)
    cs34 = Column(Text)  # cs34 is Text character grades
    cs35 = Column(Numeric)
    cs36 = Column(Numeric)
    cs37 = Column(Numeric)
    cs38 = Column(Numeric)
    cs39 = Column(Numeric)
    cs40 = Column(Numeric)
    cs41 = Column(Numeric)
    cs42 = Column(Numeric)
    cs43 = Column(Numeric)
    cs44 = Column(Numeric)
    cs45 = Column(Numeric)
    cs46 = Column(Numeric)
    cs47 = Column(Numeric)
    cs48 = Column(Numeric)
    cs49 = Column(Numeric)
    cs50 = Column(Numeric)
    cs51 = Column(Numeric)
    cs51cg = Column(Numeric)
    cs51q8 = Column(Numeric)
    cs51td = Column(Numeric)
    cs51ub = Column(Numeric)
    cs52 = Column(Numeric)
    cs52cg = Column(Numeric)
    cs52q8 = Column(Numeric)
    cs52td = Column(Numeric)
    cs52ub = Column(Numeric)
    cs53 = Column(Numeric)
    cs53cg = Column(Numeric)
    cs53q8 = Column(Numeric)
    cs53td = Column(Numeric)
    cs53ub = Column(Numeric)


class QualityCallCenterData(Base):
    """
    [PHASE 6] Bảng Dữ Liệu Cuộc Gọi Tổng Đài (callcenterdata)
    """
    __tablename__ = "callcenterdata"

    id = Column(BigInteger, primary_key=True)
    totalcalls = Column(Integer)
    callsreceived = Column(Integer)
    callswithcontent = Column(Integer)
    callswithemergencysignstotal = Column(Integer)
    callswithoutemergencysigns = Column(Integer)
    averagecallsperday = Column(Numeric)
    reportfordate = Column(Date)
    lastupdatedat = Column(DateTime)


class QualityHandleByArea(Base):
    """
    [PHASE 6] Bảng Điều Phối Cấp Cứu Theo Địa Bàn (handlebyarea)
    """
    __tablename__ = "handlebyarea"

    id = Column(BigInteger, primary_key=True)
    receivedbysatellite = Column(Integer)
    transfertosatellite = Column(Integer)
    nolongerneededcalls = Column(Integer)
    nolongerneededtrip = Column(Integer)
    othertransfer = Column(Integer)
    transfertohospitalpatient = Column(Integer)
    transfertoservice = Column(Integer)
    tripwithpatient = Column(Integer)
    diedpatient = Column(Integer)
    byarea = Column(Text)
    date_created = Column(DateTime)




