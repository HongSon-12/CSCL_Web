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

