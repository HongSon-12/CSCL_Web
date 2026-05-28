# 08 - Phase 0: Baseline & Repo Audit

## 1. Mục tiêu

Hiểu hiện trạng repo, deployment, database, auth và migration trước khi sửa code. Phase này giúp tránh Codex làm sai stack hoặc tạo trùng chức năng đã có.

---

## 2. Không làm trong phase này

- Không tạo UI mới.
- Không tạo migration mới.
- Không sửa business logic.
- Không tích hợp Agent-AI.
- Không commit `.env`, backup, secret.

---

## 3. Batch 0A - Repo structure audit

### Việc làm

- Ghi nhận cây thư mục chính.
- Xác định frontend framework: Next.js App Router hay Pages Router.
- Xác định backend framework: FastAPI/module structure.
- Xác định nơi khai báo route/API.
- Xác định nơi đặt service/model/schema.

### Output

Tạo file:

```text
docs/phase0_repo_audit.md
```

Nội dung tối thiểu:

```text
Frontend path:
Backend path:
Docker compose path:
Migration path:
Auth path:
Config/env path:
Test/lint commands:
```

---

## 4. Batch 0B - Auth audit

### Việc làm

- Kiểm tra hiện có login chưa.
- Kiểm tra user table hoặc identity source.
- Kiểm tra token/session/JWT/cookie.
- Kiểm tra endpoint `/auth/me` hoặc tương đương.
- Kiểm tra frontend lưu auth ở đâu.

### Output

Thêm vào `docs/phase0_repo_audit.md`:

```text
Auth existing: yes/no
Login route:
Auth API:
User model/table:
Token storage:
Current permission model:
Gap for Phase 1:
```

---

## 5. Batch 0C - Database and migration audit

### Việc làm

- Kiểm tra PostgreSQL connection.
- Kiểm tra ORM/migration framework.
- Kiểm tra bảng hiện có.
- Xác định có Alembic hay SQL migration.
- Xác định command chạy migration.

### Output

```text
DB engine:
Migration framework:
Migration command:
Existing user/auth tables:
Existing quality tables:
Risk of table name conflict:
```

---

## 6. Batch 0D - Deployment and test audit

### Việc làm

- Kiểm tra Docker Compose service.
- Kiểm tra port frontend/backend/db.
- Kiểm tra lệnh build/lint/test.
- Kiểm tra health endpoint nếu có.

### Output

```text
Docker services:
Frontend port:
Backend port:
DB port:
Health endpoints:
Build commands:
Known failures:
```

---

## 7. Acceptance criteria

- Có `docs/phase0_repo_audit.md`.
- Biết stack frontend/backend.
- Biết auth hiện có hay chưa.
- Biết migration dùng gì.
- Biết lệnh test/build tối thiểu.
- Chưa sửa logic hệ thống.

---

## 8. Prompt Codex gợi ý

```text
Bạn đang thực hiện Phase 0 - Baseline & Repo Audit cho QLCL Web.
Không sửa logic hệ thống. Hãy kiểm tra repo structure, frontend/backend stack, auth hiện có, migration framework, Docker Compose, lệnh test/build.
Tạo file docs/phase0_repo_audit.md ghi rõ phát hiện và gap cho Phase 1.
Không commit .env, secret, backup. Không làm Agent-AI ở phase này.
Sau khi xong, báo file đã tạo và lệnh đã chạy.
```
