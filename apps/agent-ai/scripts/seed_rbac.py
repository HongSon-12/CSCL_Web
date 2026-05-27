import sys
import os
import urllib.parse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add project root to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Base, User, Role, Permission
from auth import get_password_hash

load_dotenv()

# Database setup
user = os.getenv('POSTGRES_USER')
password = urllib.parse.quote_plus(os.getenv('POSTGRES_PASSWORD', ''))
host = os.getenv('POSTGRES_HOST')
port = os.getenv('POSTGRES_PORT')
db_name = os.getenv('POSTGRES_DB')

SQLALCHEMY_DATABASE_URL = f"postgresql://{user}:{password}@{host}:{port}/{db_name}"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed():
    db = SessionLocal()
    # Enable pgvector extension
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
    
    permissions_list = [
        ("chat:use", "Can use chatbot"),
        ("documents:read", "Can read documents"),
        ("documents:index", "Can index documents"),
        ("documents:upload", "Can upload documents"),
        ("documents:review", "Can review documents"),
        ("users:read", "Can view users"),
        ("users:manage", "Can manage users"),
        ("roles:manage", "Can manage roles"),
        ("system:view_logs", "Can view system logs"),
        ("system:manage_settings", "Can manage system settings"),
    ]
    
    perms_map = {}
    for code, desc in permissions_list:
        perm = db.query(Permission).filter(Permission.code == code).first()
        if not perm:
            perm = Permission(code=code, description=desc)
            db.add(perm)
        perms_map[code] = perm
    db.commit()
    
    roles_config = {
        "Admin": permissions_list,
        "Contributor": [("chat:use", ""), ("documents:read", ""), ("documents:upload", "")],
        "End-user": [("chat:use", ""), ("documents:read", "")]
    }
    
    roles_map = {}
    for role_name, perms in roles_config.items():
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name, description=f"{role_name} role")
            db.add(role)
        role.permissions = [perms_map[p[0]] for p in perms]
        roles_map[role_name] = role
    db.commit()
    
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        admin_user = User(
            username="admin",
            email="admin@example.com",
            full_name="System Administrator",
            password_hash=get_password_hash("admin123"),
            is_active=True
        )
        db.add(admin_user)
        admin_user.roles = [roles_map["Admin"]]
    db.commit()
    print("RBAC Seeding completed successfully.")
    db.close()

if __name__ == "__main__":
    seed()
