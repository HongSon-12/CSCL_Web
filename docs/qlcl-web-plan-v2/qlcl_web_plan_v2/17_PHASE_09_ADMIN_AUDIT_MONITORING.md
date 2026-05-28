# 17 - Phase 9: Admin, Audit & Monitoring Hardening

## 1. Mục tiêu

Hoàn thiện phần quản trị, audit log, data quality log và health monitoring để hệ thống vận hành ổn định hơn.

---

## 2. Đầu ra chính

```text
/admin/users
/admin/roles
/admin/permissions
/admin/scopes
/admin/audit-logs
/etl/data-quality
/api/v1/system/health
```

---

## 3. Không làm trong phase này

- Không thay đổi sâu calculation formula.
- Không làm Agent-AI nếu chưa tới Phase 10.
- Không tạo SSO phức tạp nếu chưa cần.

---

## 4. Batch 9A - Admin RBAC APIs

APIs:

```http
GET  /api/v1/quality/admin/roles
GET  /api/v1/quality/admin/permissions
GET  /api/v1/quality/admin/users/{user_id}/roles
POST /api/v1/quality/admin/users/{user_id}/roles
GET  /api/v1/quality/admin/users/{user_id}/scopes
POST /api/v1/quality/admin/users/{user_id}/scopes
```

Permission:

```text
admin:view
admin:manage_roles
admin:manage_permissions
admin:manage_scopes
```

Audit:

```text
change_role
change_permission
change_scope
```

---

## 5. Batch 9B - Admin UI

Routes:

```text
/admin/users
/admin/roles
/admin/permissions
/admin/scopes
```

MVP UI:

- User list.
- Assign roles.
- Assign scopes.
- Permission matrix read-only/edit basic.

---

## 6. Batch 9C - Audit and data quality UI

Routes:

```text
/admin/audit-logs
/etl/data-quality
```

UI:

- Filter actor/action/date/target.
- View before/after JSON.
- Filter severity/source/batch for data quality logs.
- Detail raw payload.

---

## 7. Batch 9D - Health check and hardening

API:

```http
GET /api/v1/system/health
```

Response:

```json
{
  "status": "ok",
  "modules": {
    "database": "ok",
    "auth": "ok",
    "quality_dashboard": "ok",
    "calculation": "ok",
    "file_storage": "ok"
  }
}
```

Hardening:

- Ensure upload folder private.
- Ensure no env/secret committed.
- Ensure 403 messages consistent.
- Ensure logs không chứa password/token.

---

## 8. Checklist nghiệm thu Phase 9

```text
[ ] Admin roles API
[ ] Admin permissions API
[ ] Assign role/scope được
[ ] Audit logs UI xem được
[ ] Data quality logs UI xem được
[ ] Health check tổng chạy được
[ ] Không log password/token
[ ] Không public upload folder
[ ] Không làm Agent-AI nếu chưa sang Phase 10
```

---

## 9. Prompt Codex gợi ý

```text
Thực hiện Phase 9 - Admin, Audit & Monitoring Hardening.
Tạo Admin RBAC APIs/UI để xem/gán roles, permissions, scopes; tạo audit log viewer và data quality log viewer; tạo /api/v1/system/health. Áp dụng admin permissions và audit log cho thay đổi role/scope. Kiểm tra không log password/token, upload folder private.
Không làm Agent-AI nếu chưa chuyển Phase 10.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```
