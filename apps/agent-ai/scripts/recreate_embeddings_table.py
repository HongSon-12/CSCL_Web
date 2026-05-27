import os
import sys
import urllib.parse
from sqlalchemy import create_engine, text
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

def recreate_table():
    with engine.connect() as conn:
        print("Dropping document_embeddings table...")
        conn.execute(text("DROP TABLE IF EXISTS document_embeddings CASCADE"))
        conn.commit()
        
        # Now use SQLAlchemy to create all tables (it will only create missing ones)
        from backend.models import Base
        print("Recreating tables with new schema...")
        Base.metadata.create_all(bind=engine)
        print("Done! Table document_embeddings has been recreated with 3072 dimensions.")

if __name__ == "__main__":
    recreate_table()
