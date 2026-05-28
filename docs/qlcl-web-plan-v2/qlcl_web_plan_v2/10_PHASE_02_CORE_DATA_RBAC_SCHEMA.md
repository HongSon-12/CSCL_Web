# 10 - Phase 2: Core Data Schema & RBAC Foundation

## 1. Mục tiêu

Tạo nền database cho QLCL Web: master data, indicator catalog, RBAC, audit logs. Phase này phải hoàn thành trước khi nhập liệu/import/dashboards thực tế.

**Ghi chú DB bắt buộc:** Phase 2 phải tạo và seed các bảng `quality_*` trên database QLCL Web qua biến `QUALITY_POSTGRES_*` trỏ tới `172.16.20.17`. Database local dùng `POSTGRES_*` chỉ phục vụ Agent-AI/RAG, không được dùng làm nơi lưu dữ liệu QLCL Web.

---

## 2. Đầu ra chính

- Migration tạo bảng `quality_*` lõi.
- Seed roles/permissions.
- Backend helper permission/scope.
- Audit service.
- Master data APIs đọc danh mục.
- Backend tách session DB: Agent-AI dùng `POSTGRES_*`, QLCL Web dùng `QUALITY_POSTGRES_*`.

---

## 3. Không làm trong phase này

- Không làm form nhập liệu đầy đủ.
- Không upload Excel.
- Không review/lock.
- Không calculation chỉ số.
- Không dashboard thật.
- Không Agent-AI.
- Không tạo hoặc seed bảng `quality_*` vào database Agent-AI local.
- Không tự gán role QLCL cho user hiện có; chỉ thêm mapping vào `quality_user_roles` khi có yêu cầu rõ ràng.

---

## 4. Batch 2A - Master data and indicator metadata migration

### Bảng

```text
quality_departments
quality_stations
quality_hospitals
quality_indicator_catalog
quality_indicator_variables
quality_indicator_thresholds
```

### Seed tối thiểu

- Departments: BGD, KDH, KCCNBV, QLCL.
- Một số station mẫu nếu có dữ liệu thật.
- Indicator catalog có thể seed CS1-CS10 trước.
- Variables có thể seed nhóm A/B trước.

### Acceptance

- Migration chạy được.
- Chạy lại migration không lỗi nếu dùng SQL idempotent.
- Query được danh mục.
- Migration chạy trên database `QUALITY_POSTGRES_HOST=172.16.20.17`, không chạy trên database Agent-AI local.

---

## 5. Batch 2B - RBAC and logs migration

### Bảng

```text
quality_roles
quality_permissions
quality_role_permissions
quality_user_roles
quality_user_scopes
quality_audit_logs
quality_data_quality_logs
```

### Acceptance

- Bảng tạo thành công.
- Có index cần thiết.
- Không đụng bảng ngoài `quality_*` trừ khi cần liên kết user hiện có.
- `quality_user_roles` có thể trống sau seed; không auto-map user cũ.

---

## 6. Batch 2C - Seed roles and permissions

### Roles

```text
system_admin
quality_admin
department_manager
data_entry
dashboard_viewer
etl_operator
auditor
ai_agent_user
```

### Permission groups

Seed theo file `04_AUTH_RBAC_PERMISSION_MODEL.md`.

### Acceptance

- Seed chạy được nhiều lần không tạo trùng.
- `system_admin` có toàn bộ permission.
- `quality_admin`, `data_entry`, `department_manager` có quyền đúng mặc định.
- Seed chỉ insert/update trong các bảng `quality_*` trên database QLCL Web.

---

## 7. Batch 2D - Backend RBAC helpers and master APIs

### Helper cần có

```python
require_permission(user, permission_code)
require_any_permission(user, permission_codes)
require_scope(user, scope_type, scope_code)
require_period_not_locked(...)
```

### Audit service

```python
log_audit(actor, action, target_table, target_id, before_data, after_data, request)
```

### API đọc danh mục

```http
GET /api/v1/quality/master/departments
GET /api/v1/quality/master/stations
GET /api/v1/quality/master/hospitals
GET /api/v1/quality/indicators/catalog
GET /api/v1/quality/indicators/variables
```

### Acceptance

- API đọc danh mục chạy được.
- API yêu cầu login.
- Helper permission có unit test hoặc test thủ công rõ.

---

## 8. Checklist nghiệm thu Phase 2

```text
[ ] Có migration master data
[ ] Có migration indicator metadata
[ ] Có migration RBAC
[ ] Có migration audit/data quality logs
[ ] Có seed role/permission
[ ] Seed idempotent
[ ] Có require_permission
[ ] Có require_scope
[ ] Có audit_service
[ ] Có API master data đọc được
[ ] Không làm Agent-AI
```

---

## 9. Prompt Codex gợi ý

```text
Thực hiện Phase 2 - Core Data Schema & RBAC Foundation.
Tạo migration cho các bảng quality_* lõi: departments, stations, hospitals, indicator_catalog, indicator_variables, thresholds, roles, permissions, role_permissions, user_roles, user_scopes, audit_logs, data_quality_logs.
Tạo seed roles/permissions theo tài liệu RBAC. Seed phải idempotent.
Tạo backend helper require_permission, require_scope và audit_service. Tạo API đọc master data.
Không làm input form, import Excel, review/lock, calculation, dashboard thật, Agent-AI.
Sau khi xong chạy migration/test phù hợp và báo cách kiểm.
```
