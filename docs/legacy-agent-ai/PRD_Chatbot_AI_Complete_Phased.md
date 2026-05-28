# PRD - Product Requirements Document
## Dự án: Chatbot AI Trợ lý Nội bộ - Complete Phased Local Storage MVP

**Phiên bản:** 3.0  
**Ngày:** 05/05/2026  
**Mục tiêu:** Xây dựng sản phẩm chatbot AI nội bộ theo roadmap phase nhỏ, chạy trên 01 máy chủ Debian với Docker Compose và local storage.

---

## 1. Tổng quan sản phẩm

Sản phẩm là một hệ thống chatbot web/widget giúp nhân viên hỏi đáp dựa trên tài liệu nội bộ. Hệ thống sử dụng RAG để tìm các đoạn tài liệu liên quan trước, sau đó đưa context vào prompt cho LLM trả lời. MVP tập trung vào 3 mục tiêu: nạp và chuẩn hóa 400 file DOCX/PDF, tìm kiếm ngữ nghĩa bằng PostgreSQL + pgvector, và trả lời câu hỏi theo prompt chống ảo giác có nguồn.

---

## 2. Roadmap sản phẩm theo phase

| Phase | Tên phase | Mục tiêu chính | Kết quả bàn giao |
|---|---|---|---|
| Phase 0 | Chuẩn bị nền tảng | Chuẩn hóa server, Docker, repo, DB, storage | Debian + Docker Compose chạy được backend/frontend/worker/postgres/nginx |
| Phase 1 | Phân quyền người dùng nền tảng | Xây RBAC backend trước khi mở cho nhân viên | users/roles/permissions, middleware, seed role Admin/Contributor/End-user |
| Phase 2 | Setup RAG tiếp nhận & chuyển hóa DOCX/PDF | Nạp khoảng 400 file, convert, chunk, embedding, search | Pipeline index local, PostgreSQL + pgvector, search Top K |
| Phase 3A | Setup API LLM để trả lời theo prompt | Kết nối Gemini/API provider, prompt builder, chống ảo giác | API chat trả lời theo context, có nguồn, có log token |
| Phase 3B | Trang người dùng chat Web/Widget | Cho nhân viên hỏi đáp qua web/widget | UI chat, source citation, history, feedback cơ bản |
| Phase 4 | Trang phân quyền người dùng | Admin quản lý user/role/permission bằng UI | User list, user detail, role permission matrix, audit log |
| Phase 5 | Trang thêm mới hoặc cập nhật tài liệu | Upload UI riêng, không qua Drive/MinIO | Upload mới, thay thế bản cũ, review, versioning, re-index |
| Phase sau MVP | Tối ưu vận hành | Dashboard, backup nâng cao, model routing, local LLM test | Báo cáo usage/cost, feedback quality, mở rộng khi cần |


---

## 3. Kiến trúc sản phẩm mục tiêu MVP

```txt
[Browser/Web Widget]
        ↓
[Nginx]
        ↓
[Frontend]
        ↓
[Backend API]
        ↓
[PostgreSQL + pgvector]
        ↓
[Local Storage]
        ↓
[Worker Indexing]
        ↓
[LLM API Provider]
```

| Thành phần | Vai trò | Công nghệ đề xuất |
|---|---|---|
| Frontend | UI chat, widget, admin screens sau này | Next.js/React |
| Backend API | Auth, chat API, retrieval, prompt builder | FastAPI hoặc Node.js |
| Worker | Convert file, chunk, embedding, indexing | Python worker |
| Database | Metadata, RBAC, chunks, vectors, logs | PostgreSQL + pgvector |
| Storage | File gốc/Markdown/JSON | Local folder/Docker volume |
| LLM Provider | Trả lời theo prompt | Gemini Flash mặc định, có thể đổi OpenAI/Claude |
| Reverse proxy | Route frontend/backend | Nginx/Caddy |

---

## 4. Yêu cầu hạ tầng sản phẩm

### 4.1 Cấu hình nếu dùng API cloud

| Mức | CPU | RAM | Disk | GPU | Ghi chú |
|---|---:|---:|---:|---|---|
| Dev/test cá nhân | 4 vCPU | 8GB | SSD 100GB | Không cần | Chạy được nhưng hạn chế khi index nhiều file |
| MVP khuyến nghị | 6-8 vCPU | 16GB | SSD/NVMe 200-300GB | Không cần | Phù hợp 400 file và 20% user active |
| Pilot ổn định | 8 vCPU | 32GB | SSD/NVMe 500GB | Không cần | Dư địa logs, backup, nhiều job indexing |
| Có local LLM thử nghiệm | 8-16 vCPU | 32-64GB | SSD 500GB+ | Tùy model | CPU-only sẽ chậm; GPU chỉ cần nếu chạy local model |

**Kết luận:** MVP không cần GPU nếu dùng Gemini/OpenAI/Claude API.

### 4.2 Cấu trúc thư mục sản phẩm

```txt
/opt/ai-chatbot/
├── docker-compose.yml
├── .env
├── backend/
├── frontend/
├── deploy/
├── scripts/
├── backups/
└── storage/
    ├── original/
    ├── normalized/
    ├── extracted/
    └── temp/
```

---

## 5. Product requirements theo phase

## Phase 0 - Chuẩn bị nền tảng

### Mục tiêu
Chuẩn bị môi trường chạy ổn định trên 1 server Debian.

### Phạm vi
- Repository dự án.
- Docker Compose.
- PostgreSQL + pgvector.
- Backend skeleton.
- Frontend skeleton.
- Worker skeleton.
- Local storage folders.
- `.env.example`.
- Health check.

### User stories
- Là admin kỹ thuật, tôi muốn chạy toàn bộ hệ thống bằng `docker compose up -d`.
- Là admin kỹ thuật, tôi muốn biết service nào đang lỗi qua health check.
- Là admin kỹ thuật, tôi muốn dữ liệu không mất khi container bị xóa/recreate.

### Acceptance criteria
- Docker Compose chạy được toàn bộ service nền.
- PostgreSQL có extension `vector`.
- Backend trả `/health`.
- Frontend mở được trang mặc định.
- Local storage được mount vào container backend/worker.
- Có script backup cơ bản cho database và storage.

---

## Phase 1 - Phân quyền người dùng nền tảng

### Mục tiêu
Xây nền RBAC backend trước khi mở chatbot cho nhiều nhân viên.

### Phạm vi
- Bảng users.
- Bảng roles.
- Bảng permissions.
- Gán user-role.
- Middleware kiểm tra quyền.
- Seed role mặc định.

### Role mặc định

| Role | Quyền |
|---|---|
| Admin | Toàn quyền hệ thống |
| Contributor | Sau này được upload/đề xuất cập nhật tài liệu |
| End-user | Chat và xem nguồn được phép |

### Acceptance criteria
- Có ít nhất 3 role mặc định.
- API chat yêu cầu đăng nhập/token.
- API admin chỉ role Admin gọi được.
- Permission được kiểm tra ở backend, không chỉ ẩn UI.

---

## Phase 2 - Setup RAG tiếp nhận và chuyển hóa DOCX/PDF

### Mục tiêu
Nạp khoảng 400 file DOCX/PDF vào local storage, chuyển đổi thành Markdown/Text, chunk, embedding và lưu pgvector.

### Luồng xử lý

```txt
File DOCX/PDF
→ storage/original
→ convert Markdown
→ storage/normalized
→ extract metadata/JSON
→ storage/extracted
→ chunk
→ embedding
→ document_embeddings
→ ready for semantic search
```

### Định dạng chuẩn hóa

| Lớp | Nơi lưu | Mục đích |
|---|---|---|
| File gốc | `storage/original` | Lưu trữ/đối chiếu |
| Markdown | `storage/normalized` | Giữ cấu trúc heading/list/table |
| JSON extracted | `storage/extracted` | Metadata, bảng, page info |
| Chunk | PostgreSQL | Truy xuất khi RAG |
| Vector | PostgreSQL/pgvector | Semantic search |

### Acceptance criteria
- Index thành công tối thiểu 90-95% trong 400 file text-based.
- File lỗi được ghi log, không làm dừng toàn bộ batch.
- Search Top K trả về chunk có source/title/page nếu có.
- Chỉ chunk thuộc version `active` được đưa vào retrieval.

---

## Phase 3A - Setup API LLM để trả lời theo prompt

### Mục tiêu
Kết nối provider LLM, build prompt, chống ảo giác và trả lời theo tài liệu.

### Provider strategy
Hệ thống phải thiết kế để đổi provider bằng cấu hình:

```env
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini-embedding-001
```

Sau này có thể đổi:

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-5-mini
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
```

### Prompt bắt buộc

```txt
Bạn là trợ lý AI nội bộ.
Chỉ được sử dụng thông tin trong DỮ LIỆU NGỮ CẢNH để trả lời.
Nếu không có thông tin phù hợp, hãy trả lời:
"Tôi không tìm thấy thông tin trong dữ liệu ngữ cảnh."
Không tự suy đoán, không thêm thông tin ngoài tài liệu.
Luôn nêu nguồn nếu có.
```

### Acceptance criteria
- Câu hỏi có context → trả lời đúng và có nguồn.
- Câu hỏi không có context → trả lời không tìm thấy thông tin.
- Log được input token, output token, model, user, latency.
- Có similarity threshold để tránh trả lời khi retrieval yếu.

---

## Phase 3B - Trang người dùng chat Web/Widget

### Mục tiêu
Cho nhân viên dùng chatbot qua web hoặc widget.

### Chức năng UI
- Khung chat.
- Lịch sử hội thoại theo session.
- Markdown rendering.
- Loading state.
- Hiển thị nguồn tài liệu.
- Copy answer.
- Gửi feedback: hữu ích/không hữu ích.
- Widget có thể nhúng vào hệ thống nội bộ sau này.

### Acceptance criteria
- Người dùng gửi câu hỏi và nhận trả lời.
- Câu trả lời có nguồn nếu retrieval có source.
- UI không crash khi API timeout/lỗi.
- Chat history được lưu.
- Có phân quyền gọi API chat.

---

## Phase 4 - Trang phân quyền người dùng

### Mục tiêu
Admin có giao diện quản lý người dùng, role và permission.

### Chức năng
- Danh sách user.
- Tạo/sửa/tắt user.
- Gán role.
- Xem role hiện tại.
- Quản lý permission theo module.
- Search/filter user.
- Audit log thay đổi quyền.

### Acceptance criteria
- Admin có thể gán End-user/Contributor/Admin.
- Người bị disable không gọi được API.
- UI chỉ là hỗ trợ; backend vẫn enforce permission.
- Có audit log cho thay đổi quyền.

---

## Phase 5 - Trang thêm mới hoặc cập nhật tài liệu

### Mục tiêu
Mở upload dữ liệu bằng UI riêng của hệ thống, không thông qua Drive, chưa tính MinIO.

### Hai chế độ upload
1. **Thêm tài liệu mới**
2. **Cập nhật/thay thế tài liệu cũ**

### Workflow tài liệu mới

```txt
Contributor/Admin upload
→ pending_review
→ convert preview
→ admin duyệt
→ processing
→ active
→ AI được dùng
```

### Workflow thay thế tài liệu cũ

```txt
Chọn tài liệu hiện có
→ upload file bản mới
→ tạo document_version mới
→ pending_review
→ admin duyệt
→ bản cũ archived
→ bản mới active
→ re-index
```

### Acceptance criteria
- Người upload phải chọn upload mới hoặc thay thế.
- Không xóa bản cũ ngay; dùng versioning.
- Chỉ version `active` được dùng trong RAG.
- Có nút re-index.
- File trùng checksum được cảnh báo.
- Admin có thể reject tài liệu và nhập lý do.

---

## 6. Data model sản phẩm

```txt
users
roles
permissions
user_roles
role_permissions

documents
document_versions
document_chunks
document_embeddings
indexing_jobs

conversations
messages
retrieval_logs
api_usage_logs
audit_logs
```

Trạng thái `document_versions`:

```txt
draft
pending_review
processing
active
rejected
archived
failed
```

---

## 7. Non-functional requirements

| Nhóm | Yêu cầu |
|---|---|
| Hiệu năng | P95 chat response < 8 giây với prompt chuẩn |
| Bảo mật | API key chỉ nằm trong `.env`, không commit |
| Backup | Backup PostgreSQL + storage hằng ngày |
| Chi phí | Có token usage log |
| Quan sát | Health check, logs, indexing job status |
| Tính mở rộng | Có provider abstraction cho LLM/embedding |
| Dữ liệu | Không parse file gốc khi user chat |
| Phân quyền | Permission enforce ở backend |

---

## 8. Ưu tiên MVP

### Must-have
- Docker Compose.
- PostgreSQL/pgvector.
- Local storage.
- RAG pipeline cho 400 file.
- Chat API.
- Prompt chống ảo giác.
- Web chat.
- RBAC backend cơ bản.
- Token/cost log.

### Won't-have trong MVP
- Drive.
- MinIO.
- Kubernetes.
- OCR scan nâng cao.
- Bot Zalo/Teams/Telegram.

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

