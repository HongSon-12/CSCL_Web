# 04 - Auth, Login, RBAC & Permission Model

## 1. Mục tiêu

Thiết kế đăng nhập và phân quyền cho QLCL Web ngay từ đầu. Không để dashboard, nhập liệu, import, duyệt, khóa kỳ hoặc export hoạt động khi chưa có kiểm soát quyền.

---

## 2. Nguyên tắc

1. User chưa đăng nhập không vào được route nội bộ.
2. Login/session phải dùng chung cho toàn bộ QLCL Web.
3. Frontend chỉ ẩn/hiện menu, backend mới enforce permission.
4. Permission quyết định **được làm gì**.
5. Scope quyết định **được làm trên dữ liệu nào**.
6. Mọi action thay đổi dữ liệu phải ghi audit log.
7. Agent-AI có permission riêng nhưng triển khai ở phase sau.

---

## 3. Trang đăng nhập

### Route frontend

```text
/login
/logout hoặc action logout trên topbar
```

### Hành vi

| Tình huống | Kết quả |
|---|---|
| User chưa đăng nhập vào `/` | Redirect `/login` |
| User chưa đăng nhập vào `/reports/input` | Redirect `/login` |
| Login sai | Hiển thị lỗi chung, không tiết lộ user tồn tại hay không |
| Login đúng | Redirect về `/` hoặc URL trước đó |
| Token/session hết hạn | Redirect `/login` |
| User không có permission vào route | Hiển thị 403 hoặc redirect trang không có quyền |

### API tối thiểu

```http
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
GET  /api/v1/auth/permissions
```

Nếu repo đã có auth hiện tại, Phase 1 chỉ cần chuẩn hóa để portal sử dụng được.

---

## 4. Role đề xuất

| Role | Mô tả |
|---|---|
| `system_admin` | Toàn quyền hệ thống |
| `quality_admin` | Quản trị QLCL, chỉ số, kỳ báo cáo, duyệt/khóa |
| `department_manager` | Xem và duyệt dữ liệu đơn vị phụ trách |
| `data_entry` | Nhập liệu, upload file, sửa nháp, gửi duyệt |
| `dashboard_viewer` | Xem dashboard theo phạm vi |
| `etl_operator` | Chạy calculation, xem log ELT |
| `auditor` | Chỉ xem log, dữ liệu đã khóa, lịch sử |
| `ai_agent_user` | Dùng Agent-AI khi module được tích hợp ở Phase 10 |

---

## 5. Permission catalog

### 5.1 Portal/Auth

```text
portal:view
profile:view
```

### 5.2 Dashboard

```text
dashboard:view
dashboard:view_bgd
dashboard:view_kdh
dashboard:view_kccnbv
dashboard:view_quality
dashboard:export_snapshot
```

### 5.3 Manual input

```text
reports:input:view
reports:input:create
reports:input:update_own
reports:input:update_department
reports:input:delete_draft
reports:input:submit
```

### 5.4 Excel import

```text
reports:import:view
reports:import:upload
reports:import:preview
reports:import:confirm
reports:import:cancel_own
reports:import:cancel_any
```

### 5.5 Review and period lock

```text
reports:review:view
reports:review:approve
reports:review:reject
reports:period_lock:view
reports:period_lock:lock
reports:period_lock:unlock
```

### 5.6 Indicators

```text
indicators:view
indicators:manage_catalog
indicators:manage_thresholds
indicators:view_results
indicators:recalculate
```

### 5.7 Calculation/ELT

```text
etl:view
etl:run
etl:rerun
etl:view_logs
etl:view_data_quality
etl:cancel_run
```

### 5.8 Admin

```text
admin:view
admin:manage_users
admin:manage_roles
admin:manage_permissions
admin:manage_scopes
admin:view_audit_logs
```

### 5.9 Export

```text
reports:export:view
reports:export:excel
reports:export:pdf
reports:export:word
```

### 5.10 Agent-AI later

```text
ai_agent:use
ai_agent:manage_sources
```

`ai_agent:use` không bắt buộc trong MVP phase đầu, nhưng cần seed sẵn để Phase 10 dùng.

---

## 6. Role -> permission mặc định

### 6.1 `system_admin`

Có toàn bộ permission.

### 6.2 `quality_admin`

```text
portal:view
profile:view
dashboard:view
dashboard:view_bgd
dashboard:view_kdh
dashboard:view_kccnbv
dashboard:view_quality
dashboard:export_snapshot
reports:input:view
reports:input:create
reports:input:update_department
reports:input:delete_draft
reports:input:submit
reports:import:view
reports:import:upload
reports:import:preview
reports:import:confirm
reports:import:cancel_any
reports:review:view
reports:review:approve
reports:review:reject
reports:period_lock:view
reports:period_lock:lock
reports:period_lock:unlock
indicators:view
indicators:manage_catalog
indicators:manage_thresholds
indicators:view_results
indicators:recalculate
etl:view
etl:run
etl:rerun
etl:view_logs
etl:view_data_quality
reports:export:view
reports:export:excel
admin:view
admin:view_audit_logs
```

### 6.3 `department_manager`

```text
portal:view
profile:view
dashboard:view
reports:input:view
reports:import:view
reports:review:view
reports:review:approve
reports:review:reject
reports:period_lock:view
indicators:view
indicators:view_results
etl:view
etl:view_data_quality
reports:export:view
reports:export:excel
```

Giới hạn bằng scope `department` hoặc `station`.

### 6.4 `data_entry`

```text
portal:view
profile:view
reports:input:view
reports:input:create
reports:input:update_own
reports:input:delete_draft
reports:input:submit
reports:import:view
reports:import:upload
reports:import:preview
reports:import:cancel_own
```

Không được tự duyệt batch của mình nếu không có cấu hình đặc biệt.

### 6.5 `etl_operator`

```text
portal:view
profile:view
etl:view
etl:run
etl:rerun
etl:view_logs
etl:view_data_quality
indicators:view_results
```

### 6.6 `dashboard_viewer`

```text
portal:view
profile:view
dashboard:view
indicators:view_results
reports:export:view
```

Scope quyết định dashboard/phạm vi được xem.

### 6.7 `auditor`

```text
portal:view
profile:view
dashboard:view
reports:review:view
reports:period_lock:view
indicators:view_results
etl:view
etl:view_logs
etl:view_data_quality
admin:view_audit_logs
```

Chỉ đọc.

### 6.8 `ai_agent_user`

```text
portal:view
profile:view
ai_agent:use
```

Chỉ có ý nghĩa từ Phase 10.

---

## 7. Scope dữ liệu

Permission là hành động. Scope là phạm vi dữ liệu.

Ví dụ:

```json
{
  "user_id": "u001",
  "roles": ["department_manager"],
  "scopes": {
    "department": ["KDH"],
    "station": [],
    "dashboard": ["kdh"],
    "indicator_group": ["A"]
  }
}
```

Scope type:

| Scope | Ý nghĩa |
|---|---|
| `department` | Chỉ xem/sửa/duyệt khoa/phòng được cấp |
| `station` | Chỉ xem/sửa/duyệt trạm được cấp |
| `dashboard` | Chỉ xem dashboard được cấp |
| `indicator_group` | Chỉ xem/quản lý nhóm chỉ số được cấp |

---

## 8. Backend guard

Tạo helper:

```python
def require_permission(user, permission_code: str):
    ...


def require_any_permission(user, permission_codes: list[str]):
    ...


def require_scope(user, scope_type: str, scope_code: str | None):
    ...


def require_period_not_locked(report_date, period_type='daily', department_code=None, station_code=None):
    ...
```

Áp dụng:

```python
@router.post('/quality/import/upload')
def upload_import(payload, user=Depends(get_current_user)):
    require_permission(user, 'reports:import:upload')
    require_scope(user, 'department', payload.department_code)
    require_period_not_locked(payload.report_date, payload.period_type, payload.department_code, payload.station_code)
    ...
```

---

## 9. Frontend guard

Frontend cần:

- Redirect nếu chưa đăng nhập.
- Ẩn menu nếu thiếu permission.
- Disable button nếu thiếu quyền.
- Hiển thị 403 rõ ràng.
- Không lưu secret trong localStorage nếu có thể dùng HttpOnly cookie.

Menu mapping:

| Menu | Permission |
|---|---|
| Dashboard | `dashboard:view` |
| Nhập liệu | `reports:input:view` |
| Import Excel | `reports:import:view` |
| Duyệt dữ liệu | `reports:review:view` |
| Khóa kỳ | `reports:period_lock:view` |
| ETL/Calculation | `etl:view` |
| Chỉ số | `indicators:view` |
| Admin | `admin:view` |
| Trợ lý AI | `ai_agent:use` |

---

## 10. Audit policy

Ghi audit log khi:

- Login thành công/thất bại.
- Tạo/sửa/xóa input batch/record.
- Submit batch.
- Upload/confirm/cancel import.
- Approve/reject batch.
- Lock/unlock period.
- Chạy/rerun calculation.
- Export report.
- Thay đổi role/permission/scope.
- Tích hợp hoặc bật/tắt Agent-AI menu.

---

## 11. Acceptance criteria

- User chưa đăng nhập không vào được route nội bộ.
- User thiếu permission bị backend trả 403.
- User thiếu scope không xem/sửa dữ liệu đơn vị khác.
- Data entry chỉ sửa draft của mình hoặc trong scope cho phép.
- Department manager duyệt được trong scope.
- Quality admin khóa/mở khóa kỳ được.
- Audit log ghi đúng action quan trọng.
- Menu/nút frontend thay đổi theo permission.
- Agent-AI có permission riêng để dùng ở Phase 10.
