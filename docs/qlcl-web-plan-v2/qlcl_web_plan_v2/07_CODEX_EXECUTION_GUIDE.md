# 07 - Codex Execution Guide: Chia việc để không quá tải

## 1. Mục tiêu

Tài liệu này dùng để giao việc cho Codex theo từng phần nhỏ, tránh một prompt quá rộng khiến Codex sửa lan man hoặc không kiểm soát được.

---

## 2. Quy tắc vàng khi giao Codex

1. **Một prompt chỉ làm một phase hoặc một batch trong phase.**
2. **Không giao “làm toàn bộ hệ thống” trong một lần.**
3. **Luôn yêu cầu Codex báo file đã sửa và cách test.**
4. **Nếu có DB migration, làm migration trước, API sau, UI sau.**
5. **Nếu có permission, backend guard phải làm cùng API.**
6. **Nếu có action thay đổi dữ liệu, audit log phải làm cùng.**
7. **Mỗi prompt phải có “không làm gì” để tránh lan phạm vi.**
8. **Sau mỗi batch, chạy test/build/compile phù hợp.**
9. **Không commit secret, `.env`, file upload, backup.**
10. **Agent-AI không làm cho tới Phase 10.**

---

## 3. Cấu trúc prompt chuẩn cho Codex

```text
Bối cảnh:
- Repo hiện đang ở Phase X.
- Mục tiêu batch này là ...

Phạm vi làm:
1. ...
2. ...

Không làm:
- Không làm phase kế tiếp.
- Không sửa Agent-AI.
- Không thay đổi secret/env.
- Không tạo dữ liệu fake quá mức nếu không cần.

Yêu cầu kỹ thuật:
- Backend phải kiểm permission.
- Action thay đổi dữ liệu phải ghi audit log.
- Migration phải idempotent/versioned.

Acceptance criteria:
- ...

Sau khi làm xong, báo:
- File đã sửa.
- Lệnh test đã chạy.
- Cách kiểm thủ công.
- Rủi ro còn lại.
```

---

## 4. Gợi ý chia batch theo phase

### Phase 0 - Baseline

- Batch 0A: Inspect repo structure.
- Batch 0B: Inspect auth/session hiện có.
- Batch 0C: Inspect DB/migration.
- Batch 0D: Viết baseline report.

### Phase 1 - Auth + Portal

- Batch 1A: Chuẩn hóa auth client/server và `/login`.
- Batch 1B: Tạo `PortalLayout`, sidebar, topbar, route guard.
- Batch 1C: Tạo home page và placeholder pages theo permission.

### Phase 2 - Core DB/RBAC

- Batch 2A: Migration master data + indicator metadata.
- Batch 2B: Migration RBAC + audit/data quality logs.
- Batch 2C: Seed roles/permissions.
- Batch 2D: Backend helpers `require_permission`, `require_scope`, audit service.

### Phase 3 - Manual Input

- Batch 3A: Backend form template + create/list/detail batch.
- Batch 3B: Backend update records + submit batch + audit.
- Batch 3C: Frontend `/reports/input` form.
- Batch 3D: Integration test and UI polish.

### Phase 4 - Excel Import

- Batch 4A: File upload validation + private storage.
- Batch 4B: Parse Excel/CSV + import rows + validate.
- Batch 4C: Preview/cancel/confirm APIs.
- Batch 4D: Frontend `/reports/import`.

### Phase 5 - Review/Lock

- Batch 5A: Review task APIs and approve/reject.
- Batch 5B: Period lock APIs and guards.
- Batch 5C: Frontend review and locked-period pages.

### Phase 6 - Calculation

- Batch 6A: Python calculation package skeleton.
- Batch 6B: Variable loader + safe math + MVP indicator registry.
- Batch 6C: Calculation run API + result upsert.
- Batch 6D: UI calculation runs and logs.

### Phase 7 - Dashboard

- Batch 7A: Dashboard summary/trend APIs.
- Batch 7B: Dashboard components.
- Batch 7C: BGD dashboard MVP.
- Batch 7D: KĐH/KCCNBV/Quality pages and filters.

### Phase 8 - Export

- Batch 8A: Excel export service.
- Batch 8B: Export UI.
- Batch 8C: PDF/Word skeleton or deferred template notes.

### Phase 9 - Admin/Audit

- Batch 9A: Admin roles/permissions/scopes APIs.
- Batch 9B: Admin UI.
- Batch 9C: Audit/data quality log viewer.
- Batch 9D: Health check and hardening.

### Phase 10 - Agent-AI later

- Batch 10A: Inspect existing AI route/API.
- Batch 10B: Add QLCL permission gate `ai_agent:use`.
- Batch 10C: Wrap AI UI in portal layout.
- Batch 10D: Polish UI and test.

---

## 5. Lệnh test Codex nên chạy

Tùy repo, Codex phải tự phát hiện. Gợi ý:

```bash
git status
npm run lint
npm run build
python -m compileall backend
pytest
```

Nếu repo dùng Docker:

```bash
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

Nếu có migration:

```bash
alembic upgrade head
```

hoặc script tương ứng.

---

## 6. Báo cáo sau mỗi batch

Codex phải trả lời theo mẫu:

```text
Đã làm:
- ...

File đã sửa:
- ...

Migration/DB:
- ...

Cách test:
- ...

Kết quả test:
- ...

Cách kiểm thủ công:
- ...

Chưa làm / để phase sau:
- ...

Rủi ro:
- ...
```

---

## 7. Checklist chống quá tải

Trước khi gửi prompt cho Codex, kiểm:

```text
[ ] Prompt chỉ thuộc 1 phase hoặc 1 batch
[ ] Có mục “không làm”
[ ] Có acceptance criteria
[ ] Có yêu cầu test/build
[ ] Có yêu cầu báo file sửa
[ ] Không yêu cầu tính đủ 53 chỉ số khi phase chỉ làm skeleton
[ ] Không yêu cầu tích hợp Agent-AI trước Phase 10
[ ] Không yêu cầu xóa hệ thống cũ/Dagster/Power BI ngay
```
