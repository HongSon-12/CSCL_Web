# 06 - Backend API Contracts

## 1. Quy ước chung

Base path đề xuất:

```text
/api/v1
```

Module QLCL:

```text
/api/v1/quality
```

Response thành công:

```json
{
  "success": true,
  "data": {},
  "message": null
}
```

Response lỗi:

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Bạn không có quyền thực hiện thao tác này",
    "details": {}
  }
}
```

HTTP status:

| Status | Ý nghĩa |
|---:|---|
| 200 | OK |
| 201 | Created |
| 400 | Validation error |
| 401 | Chưa đăng nhập/token sai |
| 403 | Thiếu permission/scope |
| 404 | Không tìm thấy |
| 409 | Conflict, ví dụ kỳ đã khóa |
| 422 | Payload không hợp lệ |
| 500 | Lỗi hệ thống |

---

## 2. Auth APIs

### 2.1 Login

```http
POST /api/v1/auth/login
```

Payload:

```json
{
  "username": "admin",
  "password": "***"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "u001",
      "username": "admin",
      "display_name": "Admin",
      "roles": ["system_admin"]
    },
    "permissions": ["portal:view", "admin:view"],
    "scopes": []
  }
}
```

Token/session nên dùng cơ chế hiện có nếu repo đã có. Nếu tạo mới, ưu tiên HttpOnly cookie.

### 2.2 Current user

```http
GET /api/v1/auth/me
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "u001",
    "username": "admin",
    "display_name": "Admin",
    "roles": ["system_admin"],
    "permissions": ["portal:view", "admin:view"],
    "scopes": [
      {"scope_type": "department", "scope_code": "KDH"}
    ]
  }
}
```

### 2.3 Logout

```http
POST /api/v1/auth/logout
```

---

## 3. Master data APIs

```http
GET /api/v1/quality/master/departments
GET /api/v1/quality/master/stations
GET /api/v1/quality/master/hospitals
GET /api/v1/quality/indicators/catalog
GET /api/v1/quality/indicators/variables
```

Các API quản lý master data cần quyền admin/quality admin:

```http
POST /api/v1/quality/master/departments
PUT  /api/v1/quality/master/departments/{id}
```

---

## 4. Manual input APIs

### 4.1 Form template

```http
GET /api/v1/quality/input/form-template?date=2026-05-27&period_type=daily&department_code=KDH&station_code=&group=A
```

Permission: `reports:input:view`

Response:

```json
{
  "success": true,
  "data": {
    "report_date": "2026-05-27",
    "period_type": "daily",
    "department_code": "KDH",
    "station_code": null,
    "fields": [
      {
        "variable_code": "A1",
        "indicator_code": null,
        "label": "Tổng số cuộc gọi",
        "data_type": "number",
        "unit": "cuộc",
        "required": true,
        "min": 0,
        "max": null
      }
    ]
  }
}
```

### 4.2 Create/update draft batch

```http
POST /api/v1/quality/input/batches
```

Permission: `reports:input:create`

Payload:

```json
{
  "report_date": "2026-05-27",
  "period_type": "daily",
  "department_code": "KDH",
  "station_code": null,
  "note": "Ca trực ngày",
  "records": [
    {"variable_code": "A1", "value": 1200, "note": ""}
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "batch_id": 1,
    "batch_code": "INP-20260527-0001",
    "status": "draft"
  }
}
```

### 4.3 List batches

```http
GET /api/v1/quality/input/batches?date=2026-05-27&status=draft&department_code=KDH
```

### 4.4 Batch detail

```http
GET /api/v1/quality/input/batches/{batch_id}
```

### 4.5 Submit batch

```http
POST /api/v1/quality/input/batches/{batch_id}/submit
```

Permission: `reports:input:submit`

---

## 5. Excel import APIs

### 5.1 Upload

```http
POST /api/v1/quality/import/upload
Content-Type: multipart/form-data
```

Form data:

```text
file
import_type
report_date
period_type
department_code
station_code
```

Permission: `reports:import:upload`

Backend rules:

- Chỉ nhận `.xlsx`, `.xls`, `.csv`.
- Max size đọc từ env.
- Lưu private storage.
- Tính file hash.
- Ghi `quality_import_batches`.
- Parse và ghi `quality_import_rows`.
- Validate row.
- Trả preview summary.

Response:

```json
{
  "success": true,
  "data": {
    "batch_id": 10,
    "import_code": "IMP-20260527-0001",
    "status": "validated",
    "total_rows": 100,
    "valid_rows": 95,
    "warning_rows": 0,
    "error_rows": 5
  }
}
```

### 5.2 Preview

```http
GET /api/v1/quality/import/batches/{batch_id}/preview?page=1&page_size=50&status=error
```

Response:

```json
{
  "success": true,
  "data": {
    "batch_id": 10,
    "status": "has_errors",
    "columns": ["ngay", "tram", "tong_so_ca"],
    "summary": {
      "total_rows": 100,
      "valid_rows": 95,
      "error_rows": 5
    },
    "rows": [
      {
        "row_number": 6,
        "row_status": "error",
        "raw_payload": {},
        "normalized_payload": null,
        "error_code": "MISSING_REQUIRED_FIELD",
        "error_message": "Thiếu ngày báo cáo"
      }
    ]
  }
}
```

### 5.3 Confirm import

```http
POST /api/v1/quality/import/batches/{batch_id}/confirm
```

Permission: `reports:import:confirm`

Kết quả:

- Chuyển rows valid sang `quality_input_records` hoặc fact table tương ứng.
- Tạo input batch nếu cần.
- Audit log.
- Không cho confirm nếu kỳ đã khóa.

### 5.4 Cancel import

```http
POST /api/v1/quality/import/batches/{batch_id}/cancel
```

---

## 6. Review APIs

### 6.1 List review tasks

```http
GET /api/v1/quality/review/tasks?status=pending&department_code=KDH
```

Permission: `reports:review:view`

### 6.2 Approve batch

```http
POST /api/v1/quality/input/batches/{batch_id}/approve
```

Permission: `reports:review:approve`

Payload:

```json
{"review_note": "Đã đối chiếu"}
```

### 6.3 Reject batch

```http
POST /api/v1/quality/input/batches/{batch_id}/reject
```

Permission: `reports:review:reject`

Payload:

```json
{"review_note": "Sai số liệu trạm A"}
```

---

## 7. Period lock APIs

### 7.1 List locks

```http
GET /api/v1/quality/period-locks?date=2026-05-27&period_type=daily&department_code=KDH
```

### 7.2 Lock period

```http
POST /api/v1/quality/period-locks
```

Payload:

```json
{
  "period_type": "daily",
  "report_date": "2026-05-27",
  "department_code": "KDH",
  "station_code": null
}
```

Permission: `reports:period_lock:lock`

### 7.3 Unlock period

```http
POST /api/v1/quality/period-locks/{lock_id}/unlock
```

Payload:

```json
{"unlock_reason": "Cần điều chỉnh sau đối chiếu"}
```

Permission: `reports:period_lock:unlock`

---

## 8. Calculation APIs

### 8.1 Run calculation

```http
POST /api/v1/quality/calculate/run
```

Permission: `etl:run` hoặc `indicators:recalculate`

Payload:

```json
{
  "report_date": "2026-05-27",
  "period_type": "daily",
  "department_code": null,
  "station_code": null,
  "indicator_codes": ["CS1", "CS2"]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "run_id": 100,
    "run_code": "CALC-20260527-0001",
    "status": "running"
  }
}
```

### 8.2 List calculation runs

```http
GET /api/v1/quality/calculate/runs?date=2026-05-27&status=success
```

### 8.3 Run detail

```http
GET /api/v1/quality/calculate/runs/{run_id}
```

---

## 9. Dashboard APIs

### 9.1 Summary

```http
GET /api/v1/quality/dashboard/summary?date=2026-05-27&department_code=&station_code=
```

Permission: `dashboard:view`

Response:

```json
{
  "success": true,
  "data": {
    "report_date": "2026-05-27",
    "last_calculated_at": "2026-05-27T20:00:00",
    "kpis": [
      {
        "code": "CS1",
        "name": "Tổng số cuộc gọi",
        "value": 1234,
        "unit": "cuộc",
        "status": "good"
      }
    ],
    "charts": {
      "daily_trend": [],
      "station_compare": [],
      "indicator_status": []
    }
  }
}
```

### 9.2 Trend

```http
GET /api/v1/quality/dashboard/trend?indicator_code=CS1&from=2026-05-01&to=2026-05-27&department_code=KDH
```

### 9.3 Station compare

```http
GET /api/v1/quality/dashboard/station-compare?indicator_code=CS15&date=2026-05-27
```

### 9.4 Indicator results

```http
GET /api/v1/quality/indicators/results?date=2026-05-27&indicator_code=CS1
```

---

## 10. Export APIs

```http
GET /api/v1/quality/export/excel?period_type=monthly&month=2026-05&department_code=KDH
GET /api/v1/quality/export/pdf?dashboard=bgd&date=2026-05-27
```

Permission:

```text
reports:export:excel
reports:export:pdf
```

Export phải kiểm scope dữ liệu.

---

## 11. Admin/RBAC APIs

```http
GET  /api/v1/quality/admin/roles
GET  /api/v1/quality/admin/permissions
GET  /api/v1/quality/admin/users/{user_id}/roles
POST /api/v1/quality/admin/users/{user_id}/roles
GET  /api/v1/quality/admin/users/{user_id}/scopes
POST /api/v1/quality/admin/users/{user_id}/scopes
GET  /api/v1/quality/admin/audit-logs
```

Permission:

```text
admin:view
admin:manage_roles
admin:manage_permissions
admin:manage_scopes
admin:view_audit_logs
```

---

## 12. Agent-AI APIs later

Phase 10 chỉ cần đảm bảo:

- Frontend AI route yêu cầu `ai_agent:use`.
- Nếu backend AI API hiện có chưa có guard, thêm guard nhẹ hoặc proxy guard qua QLCL Web.
- Không bắt buộc sửa RAG/LLM/embedding trong phase tích hợp đầu tiên.

---

## 13. Kiến trúc Tích hợp và Hợp nhất Next.js Backend (Phase 6 - Hiện tại)

Để tối ưu hóa hiệu năng, đồng bộ kiểu dữ liệu TypeScript và đẩy nhanh tốc độ phản hồi UI, kiến trúc hệ thống đã được tái cấu trúc theo mô hình **Next.js-centric Gateway API**:

1. **Next.js API Routes (JavaScript/TypeScript) đóng vai trò là API Gateway & Backend chính:**
   - Đảm nhận toàn bộ các API Auth, phân quyền RBAC, kiểm tra Scopes khoa/trạm, CRUD báo cáo, hàng đợi duyệt báo cáo, khóa sổ và mở khóa kỳ báo cáo (`/apps/agent-ai/frontend/app/api/v1/...`).
   - Kết nối trực tiếp PostgreSQL bằng Connection Pool (`pg` native queries) cho tốc độ I/O nhanh nhất.
   - Nginx proxy (cổng 80) chuyển tiếp toàn bộ yêu cầu `/api/v1/` sang Next.js (cổng 3000).

2. **Python FastAPI đóng vai trò Dedicated Microservice chuyên biệt:**
   - Rút gọn toàn bộ các API CRUD, chỉ giữ lại cổng REST API `/api/v1/quality/calculate/run` để nhận lệnh tính toán lâm sàng CS1 - CS10 và lưu logs gỡ lỗi.
   - Nhận yêu cầu kích hoạt tính toán nền bất đồng bộ được gửi ngầm từ Next.js qua HTTP REST API nội bộ (`http://backend:8000`), có hỗ trợ truyền kèm tham số `run_type: "auto"` hoặc `"manual"`.
   - Các phân hệ đặc thù của Python (RAG Chat, legacy login, master data tạm thời) được Next.js tự động chuyển tiếp qua cấu hình `rewrites` trong `next.config.js` ngầm dưới nền.

