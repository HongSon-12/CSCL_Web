import os
import sys
import urllib.parse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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

def reset_jobs():
    db = SessionLocal()
    try:
        result = db.execute(text("UPDATE indexing_jobs SET status = 'pending', error_message = NULL WHERE status = 'failed'"))
        db.commit()
        print(f"Reset {result.rowcount} failed jobs to pending.")
    except Exception as e:
        print(f"Error resetting jobs: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_jobs()
