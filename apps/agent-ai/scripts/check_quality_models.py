import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.append(BACKEND_DIR)

from models import QualityInputBatch, QualityInputRecord, Base

print("Checking models...")
print("QualityInputBatch table name:", QualityInputBatch.__tablename__)
print("QualityInputRecord table name:", QualityInputRecord.__tablename__)

# Verify columns
print("Batch columns:", [c.name for c in QualityInputBatch.__table__.columns])
print("Record columns:", [c.name for c in QualityInputRecord.__table__.columns])

print("Check completed successfully!")
