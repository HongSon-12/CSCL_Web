import os
import sys
import urllib.parse

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_ROOT = os.path.dirname(os.path.dirname(PROJECT_ROOT))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.append(BACKEND_DIR)

from models import (  # noqa: E402
    QualityAuditLog,
    QualityDataQualityLog,
    QualityDepartment,
    QualityHospital,
    QualityIndicatorCatalog,
    QualityIndicatorThreshold,
    QualityIndicatorVariable,
    QualityPermission,
    QualityRole,
    QualityStation,
    QualityUserRole,
    QualityUserScope,
    quality_role_permissions,
)
from quality_seed_data import (  # noqa: E402
    QUALITY_DEPARTMENTS,
    QUALITY_INDICATORS,
    QUALITY_PERMISSIONS,
    QUALITY_ROLES,
    QUALITY_VARIABLES,
)

# NOTE: For split storage, POSTGRES_* remains AgentAI local DB, while
# QUALITY_POSTGRES_* is the external QLCL Web DB. This seed script must use
# only QUALITY_POSTGRES_* so it never writes quality_* data to AgentAI DB.
load_dotenv(os.path.join(PROJECT_ROOT, ".env"), override=False)
load_dotenv(os.path.join(REPO_ROOT, ".env.example"), override=False)

user = os.getenv("QUALITY_POSTGRES_USER")
password = urllib.parse.quote_plus(os.getenv("QUALITY_POSTGRES_PASSWORD", ""))
host = os.getenv("QUALITY_POSTGRES_HOST")
port = os.getenv("QUALITY_POSTGRES_PORT")
db_name = os.getenv("QUALITY_POSTGRES_DB")

SQLALCHEMY_DATABASE_URL = os.getenv("QUALITY_POSTGRES_URL") or f"postgresql://{user}:{password}@{host}:{port}/{db_name}"
SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://", 1)
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

QUALITY_TABLES = [
    QualityDepartment.__table__,
    QualityStation.__table__,
    QualityHospital.__table__,
    QualityIndicatorCatalog.__table__,
    QualityIndicatorVariable.__table__,
    QualityIndicatorThreshold.__table__,
    QualityPermission.__table__,
    QualityRole.__table__,
    quality_role_permissions,
    QualityUserRole.__table__,
    QualityUserScope.__table__,
    QualityAuditLog.__table__,
    QualityDataQualityLog.__table__,
]


def upsert_department(db, payload):
    department = db.query(QualityDepartment).filter(QualityDepartment.code == payload["code"]).first()
    if not department:
        department = QualityDepartment(code=payload["code"])
        db.add(department)

    department.name = payload["name"]
    department.short_name = payload.get("short_name")
    department.parent_code = payload.get("parent_code")
    department.is_active = payload.get("is_active", True)
    return department


def upsert_permission(db, code, name, module_code):
    permission = db.query(QualityPermission).filter(QualityPermission.permission_code == code).first()
    if not permission:
        permission = QualityPermission(permission_code=code)
        db.add(permission)

    permission.permission_name = name
    permission.module_code = module_code
    permission.description = name
    return permission


def upsert_role(db, role_code, payload, permissions_by_code):
    role = db.query(QualityRole).filter(QualityRole.role_code == role_code).first()
    if not role:
        role = QualityRole(role_code=role_code)
        db.add(role)

    role.role_name = payload["name"]
    role.description = payload.get("description")
    role.is_system = payload.get("is_system", False)
    role.is_active = True
    role.permissions = [permissions_by_code[code] for code in payload["permissions"]]
    return role


def upsert_indicator(db, payload):
    indicator = db.query(QualityIndicatorCatalog).filter(QualityIndicatorCatalog.code == payload["code"]).first()
    if not indicator:
        indicator = QualityIndicatorCatalog(code=payload["code"])
        db.add(indicator)

    for key, value in payload.items():
        setattr(indicator, key, value)
    indicator.is_active = payload.get("is_active", True)
    return indicator


def upsert_variable(db, payload):
    variable = db.query(QualityIndicatorVariable).filter(
        QualityIndicatorVariable.variable_code == payload["variable_code"]
    ).first()
    if not variable:
        variable = QualityIndicatorVariable(variable_code=payload["variable_code"])
        db.add(variable)

    for key, value in payload.items():
        setattr(variable, key, value)
    variable.is_active = payload.get("is_active", True)
    return variable


def seed():
    db = SessionLocal()
    try:
        # NOTE: Existing database data is not updated here. This creates only
        # missing Phase 2 quality_* tables and upserts seed rows inside them.
        QualityDepartment.metadata.create_all(bind=engine, tables=QUALITY_TABLES)

        for department in QUALITY_DEPARTMENTS:
            upsert_department(db, department)

        permissions_by_code = {}
        for code, name, module_code in QUALITY_PERMISSIONS:
            permissions_by_code[code] = upsert_permission(db, code, name, module_code)
        db.flush()

        roles_by_code = {}
        for role_code, payload in QUALITY_ROLES.items():
            roles_by_code[role_code] = upsert_role(db, role_code, payload, permissions_by_code)
        db.flush()

        for indicator in QUALITY_INDICATORS:
            upsert_indicator(db, indicator)

        for variable in QUALITY_VARIABLES:
            upsert_variable(db, variable)
        db.flush()

        # NOTE: Do not auto-assign quality roles to existing users. User/role
        # mapping must be created explicitly later in quality_user_roles.
        db.commit()
        print("Quality RBAC seed completed successfully.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
