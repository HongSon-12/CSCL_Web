from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Table, Integer, Float, JSON
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import relationship, declarative_base
from pgvector.sqlalchemy import Vector
import uuid
from datetime import datetime

Base = declarative_base()

# Many-to-Many relationship table for User-Role
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True),
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id"), primary_key=True),
)

# Many-to-Many relationship table for Role-Permission
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id"), primary_key=True),
    Column("permission_id", UUID(as_uuid=True), ForeignKey("permissions.id"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True)
    full_name = Column(String)
    password_hash = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    roles = relationship("Role", secondary=user_roles, back_populates="users")

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    description = Column(String)
    
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, nullable=False)
    description = Column(String)
    
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")

# --- NEW RAG TABLES ---

class Document(Base):
    __tablename__ = "documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    document_type = Column(String)
    department = Column(String)
    description = Column(String)
    current_version_id = Column(UUID(as_uuid=True))
    status = Column(String, default="active")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    versions = relationship("DocumentVersion", back_populates="document")

class DocumentVersion(Base):
    __tablename__ = "document_versions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"))
    version_number = Column(Integer, nullable=False)
    file_name = Column(String, nullable=False)
    file_ext = Column(String)
    mime_type = Column(String)
    original_path = Column(String)
    normalized_path = Column(String)
    extracted_path = Column(String)
    checksum = Column(String)
    status = Column(String, default="pending_review")
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    indexed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("Document", back_populates="versions")
    chunks = relationship("DocumentChunk", back_populates="version")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"))
    document_version_id = Column(UUID(as_uuid=True), ForeignKey("document_versions.id"))
    chunk_index = Column(Integer, nullable=False)
    title_path = Column(ARRAY(String))
    content_md = Column(String, nullable=False)
    content_text = Column(String, nullable=False)
    page_number = Column(Integer)
    token_count = Column(Integer)
    chunk_metadata = Column(JSONB)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    version = relationship("DocumentVersion", back_populates="chunks")
    embedding = relationship("DocumentEmbedding", uselist=False, back_populates="chunk")

class DocumentEmbedding(Base):
    __tablename__ = "document_embeddings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chunk_id = Column(UUID(as_uuid=True), ForeignKey("document_chunks.id", ondelete="CASCADE"))
    document_version_id = Column(UUID(as_uuid=True), ForeignKey("document_versions.id"))
    embedding = Column(Vector(1024)) # For BAAI/bge-m3 local model
    embedding_model = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    chunk = relationship("DocumentChunk", back_populates="embedding")

class IndexingJob(Base):
    __tablename__ = "indexing_jobs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_version_id = Column(UUID(as_uuid=True), ForeignKey("document_versions.id"))
    status = Column(String, default="pending") # pending, processing, completed, failed
    attempts = Column(Integer, default=0)
    error_message = Column(String)
    started_at = Column(DateTime)
    finished_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
