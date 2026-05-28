# 21 - Codex Phase Prompts

Tài liệu này chứa prompt ngắn để copy cho Codex theo từng phase/batch. Nên gửi từng prompt nhỏ, không gửi toàn bộ file một lần.

---

## Phase 0 Prompt

```text
Bạn đang thực hiện Phase 0 - Baseline & Repo Audit cho QLCL Web.
Không sửa logic hệ thống. Hãy kiểm tra repo structure, frontend/backend stack, auth hiện có, migration framework, Docker Compose, lệnh test/build.
Tạo file docs/phase0_repo_audit.md ghi rõ phát hiện và gap cho Phase 1.
Không commit .env, secret, backup. Không làm Agent-AI ở phase này.
Sau khi xong, báo file đã tạo và lệnh đã chạy.
```

---

## Phase 1A Prompt - Login/Auth

```text
Thực hiện Phase 1A - Login/Auth baseline.
Nếu repo đã có auth, tái sử dụng và chuẩn hóa /api/v1/auth/me để trả user, roles, permissions, scopes. Nếu chưa có auth, tạo login tối thiểu an toàn, không hard-code secret/password trong repo.
Tạo /login, auth provider/client, logout flow. User chưa login phải bị chặn khỏi route nội bộ.
Không làm RBAC schema đầy đủ, không làm input/import/dashboard, không Agent-AI.
Chạy lint/build/compile phù hợp và báo file đã sửa, cách test.
```

## Phase 1B Prompt - Portal shell

```text
Thực hiện Phase 1B - Portal shell.
Tạo PortalLayout, Sidebar, Topbar, PageHeader, PermissionGate. Tạo route placeholder: /, /dashboard, /indicators, /reports/input, /reports/import, /reports/review, /reports/locked-periods, /etl, /admin.
Menu hiển thị theo permission từ auth/me nếu có, hoặc cấu trúc sẵn để Phase 2 kết nối.
Không làm chức năng thật của input/import/dashboard. Không Agent-AI.
Chạy build/lint và báo cách kiểm.
```

## Phase 1C Prompt - Route guard

```text
Thực hiện Phase 1C - Route guard & permission UI.
Tạo protected route guard, PermissionDenied/403 UI, redirect /login khi chưa đăng nhập. Ẩn/disable menu hoặc button nếu thiếu permission.
Không làm DB migration hoặc feature nghiệp vụ. Không Agent-AI.
Chạy test/build và báo cách kiểm.
```

---

## Phase 2A Prompt - Master data migration

```text
Thực hiện Phase 2A - Master data and indicator metadata migration.
Tạo migration cho quality_departments, quality_stations, quality_hospitals, quality_indicator_catalog, quality_indicator_variables, quality_indicator_thresholds. Thêm indexes cần thiết. Seed tối thiểu departments và một số indicator/variables mẫu nếu phù hợp.
Migration phải idempotent hoặc theo framework migration hiện có.
Không làm input/import/review/calculation/dashboard/Agent-AI.
Chạy migration/test và báo cách kiểm query.
```

## Phase 2B Prompt - RBAC migration

```text
Thực hiện Phase 2B - RBAC and logs migration.
Tạo quality_roles, quality_permissions, quality_role_permissions, quality_user_roles, quality_user_scopes, quality_audit_logs, quality_data_quality_logs. Thêm indexes.
Không thay đổi bảng ngoài quality_* trừ khi bắt buộc để liên kết user hiện có.
Không làm UI admin đầy đủ. Không Agent-AI.
Chạy migration/test và báo cách kiểm.
```

## Phase 2C Prompt - RBAC seed

```text
Thực hiện Phase 2C - RBAC seed.
Seed roles: system_admin, quality_admin, department_manager, data_entry, dashboard_viewer, etl_operator, auditor, ai_agent_user.
Seed permissions theo tài liệu RBAC, gồm portal, dashboard, reports input/import/review/lock, indicators, etl, admin, export, ai_agent:use. Map role_permissions mặc định. Seed phải chạy lại không tạo trùng.
Không làm UI admin đầy đủ. Không Agent-AI.
Chạy seed/test và báo cách kiểm.
```

## Phase 2D Prompt - RBAC helpers

```text
Thực hiện Phase 2D - Backend RBAC helpers and audit service.
Tạo require_permission, require_any_permission, require_scope, require_period_not_locked và audit_service.log_audit. Tạo API đọc master data: departments, stations, hospitals, indicator catalog, variables.
API phải yêu cầu login. Không làm input/import/review/calculation/dashboard thật. Không Agent-AI.
Chạy test/compile và báo cách kiểm.
```

---

## Phase 3 Prompt - Manual input MVP

```text
Thực hiện Phase 3 - Manual Web Input MVP.
Tạo API form-template, create/list/detail/update/submit input batch. Áp dụng permission reports:input:view/create/update_own/update_department/submit, scope department/station, period lock guard. Ghi audit log khi tạo/sửa/submit.
Tạo frontend /reports/input với filter, form fields, validate, save draft, submit, loading/error/empty state.
Không làm Excel import, review approve/reject đầy đủ, calculation, dashboard, Agent-AI.
Sau khi xong chạy test/build phù hợp và báo cách kiểm thủ công.
```

---

## Phase 4 Prompt - Excel import

```text
Thực hiện Phase 4 - Excel Import, Preview & Validation.
Tạo upload API nhận xlsx/xls/csv, kiểm extension/dung lượng, lưu private storage, tính hash, tạo import batch. Parse rows, ghi quality_import_rows, validate row và trả preview. Tạo confirm/cancel API với permission/scope/period lock guard và audit log. Tạo UI /reports/import.
Không làm calculation, dashboard, Agent-AI, không đưa file vào public storage.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```

---

## Phase 5 Prompt - Review and lock

```text
Thực hiện Phase 5 - Review, Approval & Period Lock.
Tạo review task list, approve/reject input batch với permission/scope guard và audit log. Không cho người nhập tự duyệt nếu không có quyền đặc biệt. Tạo period lock APIs, lock/unlock với reason, và guard chặn sửa dữ liệu kỳ đã khóa. Tạo UI /reports/review và /reports/locked-periods.
Không làm calculation, dashboard, export, Agent-AI.
Sau khi xong chạy test/build phù hợp và báo cách kiểm thủ công.
```

---

## Phase 6 Prompt - Calculation engine

```text
Thực hiện Phase 6 - Calculation Engine MVP.
Tạo backend/data_engine với safe_math, variable loader, indicator registry và job run_calculation. Tạo API calculate/run, calculate/runs, calculate/runs/{id}. Calculation đọc input records đã approved/locked, ghi quality_calculation_runs và upsert quality_indicator_results. Tính tối thiểu nhóm chỉ số MVP khả dụng, ưu tiên CS1-CS5 nếu đủ dữ liệu. Tạo UI /etl/calculation-runs.
Không tính đủ 53 chỉ số, không làm dashboard phức tạp, không Agent-AI.
Sau khi xong chạy compile/test phù hợp và báo cách kiểm.
```

---

## Phase 7 Prompt - Dashboard MVP

```text
Thực hiện Phase 7 - Dashboard MVP.
Tạo API dashboard summary, trend, station-compare và indicators/results đọc từ quality_indicator_results, áp dụng permission/scope guard. Tạo components dashboard và các route /dashboard/bgd, /dashboard/kdh, /dashboard/kccnbv, /dashboard/quality với filters, KPI cards, chart/table MVP, loading/error/empty states.
Không query raw/import/input trực tiếp từ frontend. Không làm export PDF phức tạp, không Agent-AI.
Sau khi xong chạy build/test phù hợp và báo cách kiểm.
```

---

## Phase 8 Prompt - Export

```text
Thực hiện Phase 8 - Export Reports.
Tạo Excel export API đọc từ quality_indicator_results/catalog, áp dụng permission reports:export:excel và scope guard, ghi audit export_report. Tạo UI /reports/export để chọn kỳ/phạm vi và download Excel. PDF/Word chỉ làm skeleton hoặc ghi rõ deferred nếu chưa đủ thời gian.
Không lưu file nhạy cảm public, không Agent-AI.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```

---

## Phase 9 Prompt - Admin/Audit/Monitoring

```text
Thực hiện Phase 9 - Admin, Audit & Monitoring Hardening.
Tạo Admin RBAC APIs/UI để xem/gán roles, permissions, scopes; tạo audit log viewer và data quality log viewer; tạo /api/v1/system/health. Áp dụng admin permissions và audit log cho thay đổi role/scope. Kiểm tra không log password/token, upload folder private.
Không làm Agent-AI nếu chưa chuyển Phase 10.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```

---

## Phase 10 Prompt - Agent-AI later

```text
Thực hiện Phase 10 - Agent-AI Integration Later.
Chỉ tích hợp Agent-AI như module phụ trong QLCL Web. Trước hết audit route/API/component AI hiện có và ghi docs/phase10_agent_ai_audit.md. Sau đó thêm permission gate ai_agent:use, menu Trợ lý AI, route /ai-agent/chat và bọc UI chat trong PortalLayout.
Không rewrite RAG, không đổi embedding/LLM, không re-index tài liệu, không làm ảnh hưởng các module QLCL đã có.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```
