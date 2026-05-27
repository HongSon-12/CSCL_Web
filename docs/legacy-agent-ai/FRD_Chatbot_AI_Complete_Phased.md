# FRD - Tài liệu Yêu cầu Chức năng
## Dự án: Chatbot AI Trợ lý Nội bộ - Complete Phased Local Storage MVP

**Phiên bản:** 3.0  
**Ngày:** 05/05/2026  
**Mục tiêu:** Đặc tả chức năng chi tiết theo phase cho đội phát triển.

---

## 1. Quy ước mã chức năng

| Prefix | Nhóm |
|---|---|
| F-P0 | Phase 0 - Nền tảng |
| F-P1 | Phase 1 - RBAC backend |
| F-P2 | Phase 2 - RAG ingestion |
| F-P3A | Phase 3A - LLM API & Prompt |
| F-P3B | Phase 3B - Chat UI/Widget |
| F-P4 | Phase 4 - User permission UI |
| F-P5 | Phase 5 - Document upload/update UI |
| F-SEC | Security |
| F-LOG | Logging/Audit |
| F-OPS | Operations/Backup |

---

## 2. Phase 0 - Chuẩn bị nền tảng

### F-P0-01: Docker Compose stack

Hệ thống phải chạy bằng Docker Compose trên Debian.

Service tối thiểu:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
  backend:
    build: ./backend
  worker:
    build: ./backend
  frontend:
    build: ./frontend
  nginx:
    image: nginx:stable-alpine
```

### F-P0-02: Local storage mount

Backend và worker phải mount chung thư mục:

```txt
/app/storage/original
/app/storage/normalized
/app/storage/extracted
/app/storage/temp
```

Host path đề xuất:

```txt
/opt/ai-chatbot/storage
```

### F-P0-03: Environment config

`.env` tối thiểu:

```env
APP_ENV=production
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=ai_chatbot
POSTGRES_USER=ai_user
POSTGRES_PASSWORD=change_me

STORAGE_ROOT=/app/storage

LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini-embedding-001

CHUNK_SIZE=1000
CHUNK_OVERLAP=150
RETRIEVAL_TOP_K=5
MIN_SIMILARITY_SCORE=0.65
MAX_CHAT_HISTORY_TURNS=6
MAX_OUTPUT_TOKENS=1200
```

### F-P0-04: Health check

```http
GET /api/v1/health
```

Response:

```json
{
  "status": "ok",
  "database": "ok",
  "storage": "ok",
  "version": "3.0"
}
```

---

## 3. Phase 1 - Phân quyền người dùng backend

### F-P1-01: Users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    full_name TEXT,
    password_hash TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

### F-P1-02: Roles & permissions

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id),
    permission_id UUID REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);
```

### F-P1-03: Permission seed

```txt
chat:use
documents:read
documents:index
documents:upload
documents:review
users:read
users:manage
roles:manage
system:view_logs
system:manage_settings
```

---

## 4. Phase 2 - Setup RAG tiếp nhận & chuyển hóa DOCX/PDF

### F-P2-01: Document metadata

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    document_type TEXT,
    department TEXT,
    description TEXT,
    current_version_id UUID,
    status TEXT DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

### F-P2-02: Document versions

```sql
CREATE TABLE document_versions (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id),
    version_number INT NOT NULL,
    file_name TEXT NOT NULL,
    file_ext TEXT,
    mime_type TEXT,
    original_path TEXT,
    normalized_path TEXT,
    extracted_path TEXT,
    checksum TEXT,
    status TEXT DEFAULT 'pending_review',
    replace_reason TEXT,
    uploaded_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_note TEXT,
    effective_date DATE,
    indexed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

### F-P2-03: Chunks

```sql
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id),
    document_version_id UUID REFERENCES document_versions(id),
    chunk_index INT NOT NULL,
    title_path TEXT[],
    content_md TEXT NOT NULL,
    content_text TEXT NOT NULL,
    page_number INT,
    token_count INT,
    metadata JSONB,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT now()
);
```

### F-P2-04: Embeddings

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY,
    chunk_id UUID REFERENCES document_chunks(id) ON DELETE CASCADE,
    document_version_id UUID REFERENCES document_versions(id),
    embedding vector(768),
    embedding_model TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);
```

> `vector(768)` phải chỉnh theo số chiều thật của embedding model.

### F-P2-05: Indexing jobs

```sql
CREATE TABLE indexing_jobs (
    id UUID PRIMARY KEY,
    document_version_id UUID REFERENCES document_versions(id),
    status TEXT DEFAULT 'pending',
    attempts INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);
```

### F-P2-06: Batch import local

```bash
python -m app.scripts.import_documents --path /app/storage/import_batch
```

Yêu cầu:
- Copy file vào `storage/original`.
- Tính SHA256 checksum.
- Tạo document/document_version.
- Tạo indexing job.

### F-P2-07: Convert DOCX/PDF

| Loại file | Công cụ đề xuất |
|---|---|
| DOCX | python-docx hoặc pandoc |
| PDF text | PyMuPDF |
| PDF bảng | pdfplumber nếu cần |

Output:

```txt
storage/normalized/<document_version_id>.md
storage/extracted/<document_version_id>.json
```

### F-P2-08: Chunking

Quy tắc:
1. Ưu tiên cắt theo heading Markdown.
2. Nếu section quá dài, cắt theo token.
3. Chunk size mặc định 800-1000 token.
4. Overlap 100-150 token.
5. Mỗi chunk lưu `title_path`, `content_md`, `content_text`, `page_number` nếu có.

### F-P2-09: Semantic search

```sql
SELECT
    dc.id,
    dc.content_text,
    dc.title_path,
    dv.file_name,
    de.embedding <=> :query_embedding AS distance
FROM document_embeddings de
JOIN document_chunks dc ON dc.id = de.chunk_id
JOIN document_versions dv ON dv.id = dc.document_version_id
WHERE dv.status = 'active'
ORDER BY de.embedding <=> :query_embedding
LIMIT :top_k;
```

---

## 5. Phase 3A - API LLM và Prompt

### F-P3A-01: Chat API

```http
POST /api/v1/chat
```

Request:

```json
{
  "conversation_id": "uuid|null",
  "message": "Người dùng hỏi...",
  "options": {
    "top_k": 5
  }
}
```

Response:

```json
{
  "conversation_id": "uuid",
  "answer": "string",
  "sources": [
    {
      "document_id": "uuid",
      "document_version_id": "uuid",
      "chunk_id": "uuid",
      "title": "string",
      "file_name": "string",
      "page_number": 1,
      "score": 0.82
    }
  ],
  "usage": {
    "provider": "gemini",
    "model": "gemini-2.5-flash",
    "input_tokens": 4200,
    "output_tokens": 850,
    "latency_ms": 5200
  }
}
```

### F-P3A-02: Provider abstraction

```python
class LLMProvider:
    def generate(self, messages, max_output_tokens): ...
    def count_tokens(self, text): ...

class EmbeddingProvider:
    def embed(self, texts: list[str]) -> list[list[float]]: ...
```

### F-P3A-03: Prompt builder

Prompt gồm:

```txt
SYSTEM PERSONA
ANTI-HALLUCINATION RULES
CHAT HISTORY gần nhất
DỮ LIỆU NGỮ CẢNH Top K
CÂU HỎI USER
OUTPUT FORMAT
```

### F-P3A-04: Anti-hallucination

```txt
Chỉ trả lời dựa trên DỮ LIỆU NGỮ CẢNH.
Nếu không có thông tin, trả lời:
"Tôi không tìm thấy thông tin trong dữ liệu ngữ cảnh."
Không suy đoán.
Không thêm quy định ngoài tài liệu.
Luôn nêu nguồn nếu có.
```

### F-P3A-05: Token management

- Top K mặc định: 5.
- Chat history: 4-6 lượt.
- Max output: 800-1200 token.
- Log input/output token.
- Nếu context quá dài, giảm Top K hoặc rút gọn context.

---

## 6. Phase 3B - Web chat/widget

### F-P3B-01: Chat page

Route: `/chat`

Chức năng:
- Danh sách hội thoại.
- Ô nhập câu hỏi.
- Gửi bằng Enter.
- Hiển thị câu trả lời Markdown.
- Loading state.
- Hiển thị nguồn.
- Copy answer.

### F-P3B-02: Source cards

Mỗi source card hiển thị:

```txt
Tên tài liệu
Version
Trang/mục nếu có
Score
Đoạn trích ngắn
```

### F-P3B-03: Feedback

```http
POST /api/v1/messages/{message_id}/feedback
```

Request:

```json
{
  "rating": "up|down",
  "comment": "string|null"
}
```

---

## 7. Phase 4 - Trang phân quyền người dùng

### F-P4-01: User list

Route: `/admin/users`

Chức năng:
- Search user.
- Filter role/status.
- Enable/disable user.
- Xem role.

### F-P4-02: User detail

Route: `/admin/users/{id}`

Chức năng:
- Cập nhật tên/email.
- Gán/bỏ role.
- Xem audit log gần nhất.

### F-P4-03: Role management

Route: `/admin/roles`

Chức năng:
- Xem role.
- Gán permission cho role.
- Tooltip mô tả permission.

---

## 8. Phase 5 - Trang thêm mới hoặc cập nhật tài liệu

### F-P5-01: Document list

Route: `/admin/documents`

Chức năng:
- Danh sách tài liệu.
- Filter trạng thái.
- Search title/file name.
- Xem current active version.
- Xem index status.

### F-P5-02: Upload tài liệu mới

Route: `/admin/documents/new`

Form:

```txt
Tên tài liệu
Loại tài liệu
Phòng ban
Mô tả
Ngày hiệu lực
File DOCX/PDF
```

### F-P5-03: Thay thế tài liệu cũ

Route: `/admin/documents/{id}/replace`

Form:

```txt
Tài liệu cần thay thế
File bản mới
Lý do thay thế
Ngày hiệu lực mới
```

### F-P5-04: Review tài liệu

Route: `/admin/documents/review`

Chức năng:
- Xem file gốc.
- Xem Markdown preview.
- Xem chunk preview.
- Duyệt.
- Từ chối.
- Ghi chú review.

### F-P5-05: Version activation

Khi approve version mới:

```txt
version cũ active → archived
version mới pending_review → processing → active
documents.current_version_id = version mới
index lại chunk/vector
```

---

## 9. Logging và audit

### F-LOG-01: Retrieval logs

```sql
CREATE TABLE retrieval_logs (
    id UUID PRIMARY KEY,
    message_id UUID,
    chunk_id UUID,
    document_version_id UUID,
    score FLOAT,
    rank INT,
    created_at TIMESTAMP DEFAULT now()
);
```

### F-LOG-02: API usage logs

```sql
CREATE TABLE api_usage_logs (
    id UUID PRIMARY KEY,
    user_id UUID,
    provider TEXT,
    model TEXT,
    input_tokens INT,
    output_tokens INT,
    estimated_cost_usd NUMERIC,
    latency_ms INT,
    request_type TEXT,
    created_at TIMESTAMP DEFAULT now()
);
```

### F-LOG-03: Audit logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    actor_user_id UUID,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT now()
);
```

---

## 10. Security requirements

### F-SEC-01: API keys
- Không commit API key.
- Chỉ lưu trong `.env` hoặc secret manager sau này.
- Không trả lỗi chứa API key ra frontend.

### F-SEC-02: File upload security Phase 5
- Chỉ cho phép `.docx`, `.pdf`.
- Giới hạn kích thước file.
- Kiểm tra MIME type.
- Đổi tên file theo UUID, không dùng filename trực tiếp.
- Không cho upload executable/script.

### F-SEC-03: Permission enforcement
- Backend kiểm tra permission.
- Frontend chỉ hỗ trợ UX.
- Mọi action upload/review/role phải có audit log.

---

## 11. Operations

### F-OPS-01: Backup

```bash
pg_dump ai_chatbot > backups/db_YYYYMMDD.sql
tar -czf backups/storage_YYYYMMDD.tar.gz storage/
```

### F-OPS-02: Restore test
Mỗi tháng nên test restore ít nhất 1 lần trên môi trường staging/dev.

### F-OPS-03: Monitoring MVP
Tối thiểu log:
- API error.
- LLM provider error.
- Indexing job failed.
- Token usage bất thường.
- Disk gần đầy.

---

## 12. Tiêu chí nghiệm thu tổng

| Phase | Điều kiện nghiệm thu |
|---|---|
| Phase 0 | Stack chạy ổn bằng Docker Compose |
| Phase 1 | RBAC backend hoạt động |
| Phase 2 | 400 file được import/index, lỗi có log |
| Phase 3A | Chat API trả lời theo context và có nguồn |
| Phase 3B | User chat được qua web/widget |
| Phase 4 | Admin quản lý user/role qua UI |
| Phase 5 | Upload mới/thay thế tài liệu có review/versioning |

---

## Tài liệu tham khảo chính thức

- Google Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Google Gemini API models: https://ai.google.dev/gemini-api/docs/models
- OpenAI API pricing/models: https://developers.openai.com/api/docs/pricing
- OpenAI GPT-4.1 mini model: https://developers.openai.com/api/docs/models/gpt-4.1-mini
- OpenAI GPT-5 mini model: https://developers.openai.com/api/docs/models/gpt-5-mini
- OpenAI text-embedding-3-small: https://developers.openai.com/api/docs/models/text-embedding-3-small
- Anthropic Claude pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Docker volumes: https://docs.docker.com/engine/storage/volumes/
- pgvector: https://github.com/pgvector/pgvector
- Ollama Docker/local model: https://github.com/ollama/ollama
- Qwen3: https://github.com/QwenLM/qwen3

