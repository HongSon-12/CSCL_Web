import time
import os
import sys
import urllib.parse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import Base, IndexingJob, DocumentVersion, DocumentChunk, DocumentEmbedding
from pipeline import convert_docx_to_markdown, convert_pdf_to_markdown, chunk_text, generate_embeddings

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

def process_jobs():
    db = SessionLocal()
    job = db.query(IndexingJob).filter(IndexingJob.status == "pending").first()
    
    if not job:
        db.close()
        return

    try:
        job.status = "processing"
        job.started_at = datetime.utcnow()
        db.commit()
        
        version = db.query(DocumentVersion).filter(DocumentVersion.id == job.document_version_id).first()
        print(f"Processing file: {version.file_name}")

        # 1. Convert to Markdown
        if version.file_ext.lower() == '.docx':
            md_content = convert_docx_to_markdown(version.original_path)
        elif version.file_ext.lower() == '.pdf':
            md_content = convert_pdf_to_markdown(version.original_path)
        else:
            raise ValueError(f"Unsupported extension: {version.file_ext}")

        # Save normalized path
        storage_root = os.getenv("STORAGE_ROOT", "storage")
        norm_dir = os.path.join(storage_root, "normalized")
        os.makedirs(norm_dir, exist_ok=True)
        norm_path = os.path.join(norm_dir, f"{version.id}.md")
        with open(norm_path, "w", encoding="utf-8") as f:
            f.write(md_content)
        version.normalized_path = norm_path

        # 2. Chunking
        chunks = chunk_text(md_content)
        
        # 3. Embedding
        embeddings = generate_embeddings(chunks)

        # 4. Save to DB
        for i, (chunk_text_content, embedding_vec) in enumerate(zip(chunks, embeddings)):
            chunk = DocumentChunk(
                document_id=version.document_id,
                document_version_id=version.id,
                chunk_index=i,
                content_md=chunk_text_content,
                content_text=chunk_text_content, # In MVP, text = md
                token_count=len(chunk_text_content.split()), # Rough estimate
                status="active",
                chunk_metadata={} # Initialize empty metadata
            )
            db.add(chunk)
            db.flush()
            
            embedding_record = DocumentEmbedding(
                chunk_id=chunk.id,
                document_version_id=version.id,
                embedding=embedding_vec,
                embedding_model=os.getenv("EMBEDDING_MODEL", "models/gemini-embedding-2")
            )
            db.add(embedding_record)

        version.status = "active" # Auto-activate for MVP
        version.indexed_at = datetime.utcnow()
        job.status = "completed"
        job.finished_at = datetime.utcnow()
        db.commit()
        print(f"Successfully indexed: {version.file_name}")

    except Exception as e:
        db.rollback()
        import traceback
        error_detail = traceback.format_exc()
        job.status = "failed"
        job.error_message = str(e)
        job.finished_at = datetime.utcnow()
        db.commit()
        print(f"Failed to process job: {str(e)}")
        print(f"DEBUG: Traceback:\n{error_detail}")
    
    finally:
        db.close()

def main():
    print("Worker starting and monitoring jobs...")
    
    # Wait for database to be ready
    retries = 5
    while retries > 0:
        try:
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            db.close()
            print("Database connection established.")
            break
        except Exception as e:
            print(f"Waiting for database... ({retries} retries left)")
            retries -= 1
            time.sleep(5)
    
    if retries == 0:
        print("Could not connect to database. Exiting.")
        return

    while True:
        process_jobs()
        time.sleep(5)

if __name__ == "__main__":
    main()
