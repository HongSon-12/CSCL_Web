from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
import os
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


# --- PHASE 3: MANUAL WEB INPUT MVP ENDPOINTS ---

from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from rbac import require_permission, require_scope, require_period_not_locked

class RecordInput(BaseModel):
    variable_code: str
    indicator_code: Optional[str] = None
    value: Optional[float] = None
    text_value: Optional[str] = None
    note: Optional[str] = None

class BatchCreateInput(BaseModel):
    report_date: date
    period_type: str = "daily"
    department_code: str
    station_code: Optional[str] = None
    note: Optional[str] = None
    records: List[RecordInput]

class BatchUpdateInput(BaseModel):
    note: Optional[str] = None
    records: List[RecordInput]

def serialize_record(record) -> dict:
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
        "row_status": record.row_status,
        "error_code": record.error_code,
        "error_message": record.error_message,
    }

def serialize_batch(batch) -> dict:
    return {
        "id": batch.id,
        "batch_code": batch.batch_code,
        "report_date": batch.report_date.isoformat() if batch.report_date else None,
        "period_type": batch.period_type,
        "department_code": batch.department_code,
        "station_code": batch.station_code,
        "source_type": batch.source_type,
        "status": batch.status,
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
    [PHASE 3] Lấy Biểu Mẫu Nhập Liệu Lâm Sàng (Form Template)
    API này trả về danh sách các biến số động cần điền tương ứng với bộ lọc được chọn.
    
    Quy tắc:
    1. Người dùng phải có quyền 'reports:input:view'.
    2. Người dùng phải nằm trong phạm vi phòng ban/trạm được truy cập (Scope check).
    3. Trả về cấu trúc dạng trường nhập liệu (fields) giúp frontend tự động vẽ form.
    """
    require_any_permission(quality_db, current_user, ["reports:input:view", "admin:view"])
    require_scope(quality_db, current_user, "department", department_code)
    if station_code:
        require_scope(quality_db, current_user, "station", station_code)

    # Fetch active variables from indicator variables catalog
    query = quality_db.query(QualityIndicatorVariable).filter(QualityIndicatorVariable.is_active.is_(True))
    if group:
        query = query.filter(QualityIndicatorVariable.group_code == group)
    variables = query.order_by(QualityIndicatorVariable.variable_code).all()

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
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    """
    [PHASE 3] Lưu Nháp Lô Số Liệu Mới (Create Batch Draft)
    API này cho phép tạo mới đợt nhập số liệu chất lượng và lưu dưới dạng Bản nháp (status='draft').
    
    Quy tắc nghiệp vụ:
    1. Yêu cầu quyền 'reports:input:create'.
    2. Kiểm tra Scope của người dùng đối với phòng ban và trạm được báo cáo.
    3. Kiểm tra đợt báo cáo đã bị Khóa sổ (Period Lock) chưa. Nếu khóa rồi thì chặn không cho tạo (trả 409).
    4. Validate biên của giá trị nhập thô ứng với định nghĩa trong Catalog (ví dụ: không được nhỏ hơn min_value).
    5. Tự động sinh mã lô tuần tự duy nhất dạng: INP-YYYYMMDD-XXXX.
    6. Ghi Audit Log 'create_input_batch' để phục vụ giám sát bảo mật.
    """
    require_any_permission(quality_db, current_user, ["reports:input:create", "admin:view"])
    require_scope(quality_db, current_user, "department", payload.department_code)
    if payload.station_code:
        require_scope(quality_db, current_user, "station", payload.station_code)

    require_period_not_locked(
        quality_db,
        payload.report_date,
        payload.period_type,
        payload.department_code,
        payload.station_code,
    )

    # Generate batch code
    # Format: INP-YYYYMMDD-XXXX
    date_str = payload.report_date.strftime("%Y%m%d")
    existing_count = (
        quality_db.query(QualityInputBatch)
        .filter(QualityInputBatch.report_date == payload.report_date)
        .count()
    )
    batch_code = f"INP-{date_str}-{existing_count + 1:04d}"

    # Verify that batch code is unique
    while quality_db.query(QualityInputBatch).filter(QualityInputBatch.batch_code == batch_code).first():
        existing_count += 1
        batch_code = f"INP-{date_str}-{existing_count + 1:04d}"

    # Create batch
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
    quality_db.flush() # Populate batch.id

    # Create records
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

    # Log audit
    log_audit(
        quality_db,
        current_user,
        "create_input_batch",
        "quality_input_batches",
        str(batch.id),
        after_data={"batch_code": batch.batch_code, "status": batch.status},
        request=request,
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
    require_any_permission(quality_db, current_user, ["reports:input:view", "admin:view"])

    query = quality_db.query(QualityInputBatch)
    if date:
        query = query.filter(QualityInputBatch.report_date == date)
    if status:
        query = query.filter(QualityInputBatch.status == status)
    if department_code:
        query = query.filter(QualityInputBatch.department_code == department_code)

    batches = query.order_by(QualityInputBatch.created_at.desc()).all()

    role_codes = set(get_user_role_codes(quality_db, current_user))
    is_admin = {"Admin", "system_admin", "quality_admin"} & role_codes

    filtered_batches = []
    if is_admin:
        filtered_batches = batches
    else:
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
    require_any_permission(quality_db, current_user, ["reports:input:view", "admin:view"])

    batch = quality_db.query(QualityInputBatch).filter(QualityInputBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=404,
            detail=f"Batch {batch_id} not found."
        )

    require_scope(quality_db, current_user, "department", batch.department_code)
    if batch.station_code:
        require_scope(quality_db, current_user, "station", batch.station_code)

    return ok_response(serialize_batch(batch))

@app.put("/api/v1/quality/input/batches/{batch_id}")
async def update_input_batch(
    batch_id: int,
    payload: BatchUpdateInput,
    request: Request,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    require_any_permission(quality_db, current_user, ["reports:input:create", "admin:view"])

    batch = quality_db.query(QualityInputBatch).filter(QualityInputBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=404,
            detail=f"Batch {batch_id} not found."
        )

    if batch.status not in ["draft", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit batch in status '{batch.status}'. Only draft or rejected batches can be edited."
        )

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

    before_data = serialize_batch(batch)

    if payload.note is not None:
        batch.note = payload.note

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

    return ok_response({
        "batch_id": batch.id,
        "batch_code": batch.batch_code,
        "status": batch.status
    })

@app.post("/api/v1/quality/input/batches/{batch_id}/submit")
async def submit_input_batch(
    batch_id: int,
    request: Request,
    current_user: User = Depends(get_current_user_model),
    quality_db: Session = Depends(get_quality_db),
):
    require_any_permission(quality_db, current_user, ["reports:input:submit", "admin:view"])

    batch = quality_db.query(QualityInputBatch).filter(QualityInputBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=404,
            detail=f"Batch {batch_id} not found."
        )

    if batch.status not in ["draft", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit batch in status '{batch.status}'."
        )

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

    for rec in batch.records:
        if rec.row_status == "error":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot submit batch because variable '{rec.variable_code}' has validation errors: {rec.error_message}"
            )

    before_data = serialize_batch(batch)

    batch.status = "submitted"
    batch.submitted_by = current_user.username
    batch.submitted_at = datetime.utcnow()

    quality_db.commit()

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

    return ok_response({
        "batch_id": batch.id,
        "batch_code": batch.batch_code,
        "status": batch.status
    })

@app.get("/")
async def root():
    return {"message": "Welcome to AI Chatbot API"}
