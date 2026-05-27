# Codex Implementation Notes

## Mục tiêu lượt triển khai đầu tiên

Triển khai phase 0 và phase 1 theo hướng an toàn:

1. Ghi nhận baseline hệ thống Agent-AI.
2. Tạo branch `feature/quality-dashboard-portal`.
3. Tạo portal shell trong frontend.
4. Thêm route `/ai-agent/chat`.
5. Giữ route `/chat` hoạt động.
6. Tạo các route placeholder: `/dashboard`, `/indicators`, `/reports`, `/etl`, `/admin`.

## Ranh giới không được vượt

- Không xóa hoặc rewrite Agent-AI.
- Không đổi RAG retrieval, indexing worker, embedding model hoặc LLM provider nếu task không yêu cầu.
- Không tạo PostgreSQL mới cho dashboard.
- Không commit file `.env`, `.env.dashboard` hoặc backup database.
- Không dùng lại `dashboard115-demo`; demo này đã được dọn.

## Database dashboard

Khi cần kết nối DB dashboard, đọc cấu hình từ file server-local:

```text
/home/sonnguyen/Docx_plan/.env.dashboard
```

Nếu cần đưa cấu hình mẫu vào repo, chỉ tạo `.env.dashboard.example` không chứa secret thật.

## Thứ tự triển khai khuyến nghị

1. Kiểm tra `apps/agent-ai/frontend` đang là Next.js App Router.
2. Tách chat UI thành component dùng chung nếu cần.
3. Tạo `PortalLayout`, `Sidebar`, `Topbar`.
4. Bọc các route mới bằng layout portal.
5. Test `/chat` và `/ai-agent/chat`.
6. Sau khi portal ổn mới tạo migration/schema `quality_*`.

