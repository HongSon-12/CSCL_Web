# 20 - Deployment & Rollback Runbook

## 1. Mục tiêu

Đảm bảo mỗi phase triển khai có thể kiểm soát, backup và rollback nếu lỗi. Runbook này là khung chung, cần điều chỉnh theo repo/server thực tế sau Phase 0 audit.

---

## 2. Nguyên tắc deploy

1. Không deploy nhiều phase cùng lúc nếu chưa test.
2. Backup trước migration lớn.
3. Migration chỉ thêm bảng/cột/index trong các phase đầu, tránh drop dữ liệu.
4. Feature mới có thể ẩn bằng permission/menu nếu lỗi.
5. Không lưu file upload vào public folder.
6. Không deploy secret trong repo.
7. Tách database khi deploy:
   - `POSTGRES_*` là database local cho Agent-AI/RAG.
   - `QUALITY_POSTGRES_*` là database QLCL Web tại `172.16.20.17`.
   - Migration/seed QLCL chỉ được chạy vào `QUALITY_POSTGRES_*`, không chạy vào database Agent-AI local.

---

## 3. Trước khi deploy

```bash
git status
git log --oneline -5
docker compose ps
```

Checklist:

```text
[ ] Branch đúng
[ ] Working tree sạch hoặc đã commit
[ ] Backup database Agent-AI nếu thay đổi module Agent-AI
[ ] Backup database QLCL Web `172.16.20.17` nếu chạy migration `quality_*`
[ ] Backup private storage nếu cần
[ ] Backup .env ngoài repo
[ ] Build frontend pass
[ ] Compile backend pass
[ ] Migration đã test ở staging/local
[ ] Có rollback note
```

---

## 4. Backup gợi ý

```bash
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
pg_dump "$POSTGRES_URL" > backups/$(date +%Y%m%d_%H%M%S)/agentai_db.sql
pg_dump "$QUALITY_POSTGRES_URL" > backups/$(date +%Y%m%d_%H%M%S)/quality_db.sql
cp .env backups/$(date +%Y%m%d_%H%M%S)/env.backup
# Nếu có storage:
tar -czf backups/$(date +%Y%m%d_%H%M%S)/storage.tar.gz storage/
```

Không commit thư mục backup.

---

## 5. Deploy flow đề xuất

```text
Pull code
→ install/build nếu cần
→ run migration
→ restart service
→ health check
→ smoke test UI/API
→ monitor logs
```

Lệnh tham khảo:

```bash
git pull
npm run build
python -m compileall backend
# alembic upgrade head hoặc migration command tương ứng
# QLCL migration phải dùng QUALITY_POSTGRES_URL, không dùng POSTGRES_URL
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

---

## 6. Smoke test sau deploy

### Auth/portal

```text
[ ] /login mở được
[ ] Login được
[ ] / mở được
[ ] Sidebar/topbar đúng
[ ] User thiếu quyền bị 403
```

### Data workflow

```text
[ ] /reports/input mở được
[ ] Tạo draft được
[ ] Submit được
[ ] /reports/review thấy task
[ ] Approve/reject được
[ ] Lock kỳ được
```

### Import

```text
[ ] Upload file nhỏ được
[ ] Preview có dữ liệu
[ ] Confirm/cancel được
```

### Calculation/dashboard

```text
[ ] Chạy calculation được
[ ] Có result
[ ] Dashboard có dữ liệu
```

---

## 7. Rollback theo loại lỗi

### 7.1 Frontend lỗi

- Revert commit frontend.
- Hoặc tắt menu bằng permission.
- Backend/migration có thể giữ nếu chưa gây lỗi.

### 7.2 Backend API lỗi

- Revert commit backend.
- Restart backend.
- Nếu migration chỉ thêm bảng/cột, thường không cần rollback DB ngay.

### 7.3 Migration lỗi

- Nếu chưa có dữ liệu thật: có thể drop bảng `quality_*` mới tạo sai.
- Nếu đã có dữ liệu: restore backup hoặc tạo migration sửa.
- Không drop dữ liệu sản xuất nếu chưa backup.

### 7.4 Import file lỗi

- Tắt permission `reports:import:upload` tạm thời.
- Giữ dữ liệu đã import trong batch để đối chiếu.
- Không xóa file/batch nếu cần audit.

### 7.5 Calculation sai

- Tắt `etl:run` hoặc dashboard menu.
- Giữ Power BI/báo cáo cũ làm nguồn đối chiếu.
- Tạo calculation_version mới khi sửa công thức.

---

## 8. Feature toggle bằng permission

Có thể tắt module bằng cách gỡ permission khỏi role:

```text
reports:import:view
reports:import:upload
dashboard:view
etl:run
ai_agent:use
```

Đây là rollback mềm, không cần revert code ngay.

---

## 9. Logging cần theo dõi

- Backend errors.
- Frontend build/runtime errors.
- DB migration logs.
- Import parsing errors.
- Calculation run errors.
- Audit logs bất thường.
- Disk storage upload.

---

## 10. Go-live khuyến nghị

Không bật toàn bộ role cho tất cả người dùng ngay.

```text
Tuần 1: Admin/QLCL test nội bộ
Tuần 2: Data entry nhập thử
Tuần 3: Department manager duyệt thử
Tuần 4: Dashboard đối chiếu Power BI
Sau 1-2 kỳ: mở rộng người dùng
```

Agent-AI chỉ tích hợp sau khi QLCL Web ổn định.
