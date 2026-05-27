# Chiến lược kiến trúc và phân nhánh logic
## Không ảnh hưởng cụm Agent-AI hiện tại

**Phiên bản:** 1.0  
**Ngày lập:** 27/05/2026

---

## 1. Nguyên tắc thiết kế

### Nguyên tắc 1: Không rewrite hệ thống đang chạy

Hệ thống Agent-AI đang có:

```text
FastAPI backend
Next.js frontend
PostgreSQL + pgvector
Worker indexing
Nginx
Docker Compose
```

Không rewrite toàn bộ. Chỉ mở rộng theo module.

### Nguyên tắc 2: Tách module chất lượng khỏi module RAG

Agent-AI dùng bảng:

```text
documents
document_versions
document_profiles
document_chunks
document_embeddings
chat_feedback
retrieval_logs
```

Module chỉ số chất lượng dùng bảng riêng:

```text
quality_*
```

hoặc schema riêng:

```text
quality.*
```

### Nguyên tắc 3: Route cũ vẫn tồn tại

Không xóa `/chat`. Tạo route mới:

```text
/ai-agent/chat
```

Sau khi ổn định có thể redirect `/chat` sang `/ai-agent/chat`.

---

## 2. Kiến trúc mục tiêu

```text
Nginx
  ↓
Frontend Next.js Portal
  ├── /                         Portal home
  ├── /dashboard/*              Quality dashboard
  ├── /indicators/*             Indicator catalog/results
  ├── /reports/*                Input/import/export reports
  ├── /etl/*                    ETL monitoring
  ├── /admin/*                  Admin/RBAC
  ├── /ai-agent/chat            New AI route
  └── /chat                     Backward compatible old route

Backend API
  ├── /api/v1/chat/*            Existing Agent-AI APIs
  ├── /api/v1/documents/*       Existing RAG document APIs
  ├── /api/v1/quality/*         New quality APIs
  ├── /api/v1/etl/*             New ETL APIs
  └── /api/v1/admin/*           User/role APIs

PostgreSQL
  ├── public/RAG tables         Existing
  └── quality tables/schema     New

Workers
  ├── existing worker           RAG indexing
  └── quality worker/jobs       ETL + calculation
```

---

## 3. Git branch strategy

### Branch đề xuất

```text
main hoặc master
└── feature/quality-dashboard-portal
    ├── feature/portal-shell
    ├── feature/quality-db-schema
    ├── feature/quality-etl-engine
    ├── feature/quality-dashboard-ui
    └── feature/report-input-export
```

Nếu dự án nhỏ có thể chỉ dùng:

```text
feature/quality-dashboard-portal
```

nhưng commit phải rõ theo module.

### Commit convention

```text
feat(portal): add portal shell and module navigation
feat(ai-agent): add /ai-agent/chat alias route
feat(quality-db): add quality indicator schema
feat(etl): add callcenter ETL job skeleton
feat(calc): add CS1-CS5 calculation functions
feat(dashboard): add BGD dashboard MVP
fix(ai-agent): preserve chat layout in portal shell
```

---

## 4. Docker Compose strategy

### Giai đoạn đầu: dùng chung stack hiện tại

Không thêm quá nhiều service. Ưu tiên:

```text
postgres
backend
worker
frontend
nginx
```

Quality ETL có thể chạy trong:

- `backend` container bằng command riêng.
- hoặc `worker` container hiện có.
- hoặc service mới `quality-worker` nếu cần tách.

### Khi nào thêm `quality-worker`?

Thêm khi:

- ETL chạy nặng.
- Calculation cần chạy theo lịch.
- Không muốn ảnh hưởng worker RAG.

Service đề xuất:

```yaml
quality-worker:
  build: ./backend
  command: python -m data_engine.jobs.run_worker
  env_file: .env
  volumes:
    - ./storage:/app/storage
  depends_on:
    - postgres
```

### Không mở port mới nếu không cần

Quality worker không expose port.

---

## 5. Database strategy

### Phương án A - Prefix bảng

Dễ triển khai nếu project hiện tại chưa hỗ trợ multi-schema:

```text
quality_indicator_catalog
quality_indicator_results
quality_etl_jobs
```

### Phương án B - Schema riêng

Sạch hơn, nhưng cần kiểm tra migration/ORM:

```sql
CREATE SCHEMA quality;
```

Khuyến nghị ban đầu: **prefix bảng** để Codex dễ triển khai và ít rủi ro.

---

## 6. Frontend strategy

### Cấu trúc đề xuất

```text
frontend/
├── app/
│   ├── page.tsx
│   ├── chat/                         # route cũ giữ lại
│   ├── ai-agent/
│   │   └── chat/
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── bgd/
│   │   ├── kdh/
│   │   ├── kccnbv/
│   │   └── quality/
│   ├── indicators/
│   ├── reports/
│   ├── etl/
│   └── admin/
├── components/
│   ├── layout/
│   ├── dashboard/
│   ├── indicators/
│   ├── reports/
│   └── ai-agent/
```

### Chat component

Nếu chat hiện tại nằm trong `/chat`, tách thành component dùng chung:

```text
components/ai-agent/ChatApp.tsx
```

Sau đó:

```text
app/chat/page.tsx            → render <ChatApp />
app/ai-agent/chat/page.tsx   → render <PortalLayout><ChatApp /></PortalLayout>
```

---

## 7. Backend strategy

### API mới

Thêm module không ảnh hưởng chat:

```text
backend/quality/
├── router.py
├── models.py
├── schemas.py
├── services.py
└── permissions.py
```

Route prefix:

```python
app.include_router(quality_router, prefix="/api/v1/quality")
```

### Không sửa API chat

Tránh đổi:

```text
/api/v1/chat/query
/api/v1/auth/login
/api/v1/health
```

---

## 8. Python data engine strategy

### Tách khỏi RAG pipeline

Không trộn ETL chỉ số vào `pipeline.py` RAG.

Tạo:

```text
data_engine/
```

hoặc:

```text
backend/data_engine/
```

Nếu backend Docker build chỉ copy backend, đặt trong `backend/data_engine` dễ hơn.

### Job entrypoints

```bash
python -m data_engine.jobs.run_daily_etl --date 2026-05-27
python -m data_engine.jobs.run_calculation --date 2026-05-27
```

---

## 9. Feature flag strategy

Thêm env:

```env
FEATURE_QUALITY_DASHBOARD=true
FEATURE_AI_AGENT=true
FEATURE_REPORT_INPUT=false
FEATURE_ETL_MONITORING=true
```

Nếu module lỗi, có thể ẩn menu mà không ảnh hưởng chat.

---

## 10. Rollback strategy

### Nếu frontend lỗi

- Revert commit portal shell.
- Giữ backend/database.
- Hoặc route `/chat` vẫn hoạt động ngoài portal.

### Nếu database migration lỗi

- Không đụng bảng RAG.
- Drop bảng `quality_*` nếu chưa có dữ liệu thật.
- Restore backup nếu cần.

### Nếu ETL/calculation lỗi

- Tắt menu dashboard bằng feature flag.
- Power BI tiếp tục là nguồn báo cáo chính.
- Agent-AI không ảnh hưởng.

---

## 11. Checklist an toàn trước khi Codex sửa

```text
[ ] git status sạch hoặc đã commit trước đó
[ ] backup database
[ ] backup storage
[ ] backup .env
[ ] xác nhận /chat chạy
[ ] xác nhận /api/v1/health chạy
[ ] tạo branch mới
[ ] không sửa RAG nếu task không yêu cầu
[ ] migration chỉ thêm bảng quality_*
[ ] build frontend pass
[ ] py_compile backend pass
[ ] docker compose up không recreate postgres nếu không cần
```
