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

@app.get("/")
async def root():
    return {"message": "Welcome to AI Chatbot API"}
