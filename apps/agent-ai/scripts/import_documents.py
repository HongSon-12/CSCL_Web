import os
import sys
import uuid
import shutil
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add project root to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Base, Document, DocumentVersion, IndexingJob, User
from pipeline import get_file_checksum

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

def import_documents(source_path: str):
    db = SessionLocal()
    
    # Get default admin user
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        print("Error: Admin user not found. Please run seed_rbac.py first.")
        return

    storage_root = os.getenv("STORAGE_ROOT", "storage")
    original_dir = os.path.join(storage_root, "original")
    os.makedirs(original_dir, exist_ok=True)

    print(f"Scanning directory: {source_path}")
    
    import_count = 0
    for root, dirs, files in os.walk(source_path):
        # Determine document type from subfolder name
        rel_path = os.path.relpath(root, source_path)
        doc_type = "General" if rel_path == "." else rel_path.replace(os.sep, " / ")
        
        valid_files = [f for f in files if f.endswith(('.docx', '.pdf'))]
        
        for file_name in valid_files:
            file_path = os.path.join(root, file_name)
            checksum = get_file_checksum(file_path)
            
            # Check if version exists
            existing_version = db.query(DocumentVersion).filter(DocumentVersion.checksum == checksum).first()
            if existing_version:
                # print(f"Skipping {file_name}: already imported.")
                continue

            # Create Document
            doc = Document(
                title=os.path.splitext(file_name)[0],
                document_type=doc_type,
                status="active",
                created_by=admin.id
            )
            db.add(doc)
            db.flush()

            # Copy to storage
            ext = os.path.splitext(file_name)[1]
            version_id = uuid.uuid4()
            dest_file_name = f"{version_id}{ext}"
            dest_path = os.path.join(original_dir, dest_file_name)
            shutil.copy(file_path, dest_path)

            # Create Version
            version = DocumentVersion(
                id=version_id,
                document_id=doc.id,
                version_number=1,
                file_name=file_name,
                file_ext=ext,
                original_path=dest_path,
                checksum=checksum,
                status="pending_review",
                uploaded_by=admin.id
            )
            db.add(version)
            db.flush()
            
            doc.current_version_id = version.id

            # Create Indexing Job
            job = IndexingJob(
                document_version_id=version.id,
                status="pending"
            )
            db.add(job)
            import_count += 1
            print(f"[{doc_type}] Imported: {file_name}")

    db.commit()
    print(f"Import completed. Total {import_count} new documents added to queue.")
    db.close()

if __name__ == "__main__":
    import_path = sys.argv[1] if len(sys.argv) > 1 else "storage/import_batch"
    if not os.path.exists(import_path):
        os.makedirs(import_path, exist_ok=True)
        print(f"Created directory {import_path}. Please put your files there and run again.")
    else:
        import_documents(import_path)
