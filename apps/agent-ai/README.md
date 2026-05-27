# Agent-AI Snapshot

Đây là snapshot code Agent-AI hiện tại để mở rộng thành portal CSCL Web.

## Nguyên tắc

- Không đổi pipeline RAG nếu task chỉ liên quan dashboard/chỉ số.
- Không đổi embedding model, LLM provider, bảng document/chunk/embedding trong phase dashboard.
- Giữ route `/chat` hoạt động.
- Thêm route mới `/ai-agent/chat` khi làm portal shell.
- Các bảng nghiệp vụ chỉ số phải dùng prefix/schema riêng, ví dụ `quality_*`.

## Thành phần

| Đường dẫn | Nội dung |
|---|---|
| `frontend/` | Next.js frontend hiện tại |
| `backend/` | FastAPI backend, RAG, auth, models |
| `scripts/` | Script import/reset/seed hiện có |
| `deploy/` | Nginx config |
| `storage/` | Chỉ giữ skeleton `.gitkeep`, không commit dữ liệu runtime |
| `docker-compose.yml` | Compose stack Agent-AI hiện tại |

## Lệnh baseline gợi ý

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
curl -i http://localhost:8000/api/v1/health
curl -i http://localhost/api/v1/health
curl -i http://localhost:3000/chat
```

