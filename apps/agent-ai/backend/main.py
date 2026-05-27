from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
import os
import urllib.parse
from dotenv import load_dotenv
from models import Base, User, Role
from auth import verify_password, create_access_token, get_current_user

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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(title="AI Chatbot Backend", version="3.0")

@app.on_event("startup")
def startup():
    # Enable pgvector extension
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    Base.metadata.create_all(bind=engine)

@app.get("/api/v1/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Check database connection
        db.execute("SELECT 1")
        db_status = "ok"
    except Exception:
        db_status = "error"
        
    return {
        "status": "ok",
        "database": db_status,
        "storage": "ok",
        "version": "3.0"
    }

@app.post("/api/v1/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/v1/admin/users")
async def get_users(current_user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == current_user).first()
    isAdmin = any(role.name == "Admin" for role in user.roles)
    
    if not isAdmin:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    users = db.query(User).all()
    return [{"username": u.username, "roles": [r.name for r in u.roles]} for u in users]

@app.get("/")
async def root():
    return {"message": "Welcome to AI Chatbot API"}
