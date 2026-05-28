# 05 - Frontend UI/UX Specification

## 1. Mục tiêu giao diện

Giao diện QLCL Web phải phục vụ người dùng nội bộ, ưu tiên rõ ràng, dễ thao tác, dễ kiểm lỗi. Không cần quá cầu kỳ ở MVP, nhưng phải có cấu trúc tốt để mở rộng.

---

## 2. Route tổng thể

```text
/login
/
/dashboard
/dashboard/bgd
/dashboard/kdh
/dashboard/kccnbv
/dashboard/quality
/indicators
/indicators/catalog
/indicators/results
/indicators/thresholds
/reports
/reports/input
/reports/import
/reports/review
/reports/locked-periods
/reports/history
/reports/export
/etl
/etl/calculation-runs
/etl/data-quality
/admin
/admin/users
/admin/roles
/admin/permissions
/admin/scopes
/admin/audit-logs
/ai-agent              # Phase 10 later
/ai-agent/chat         # Phase 10 later
```

---

## 3. Layout chính

### 3.1 `PortalLayout`

Thành phần:

- Sidebar trái.
- Topbar.
- Content area.
- Breadcrumb hoặc page title.
- Global loading/error boundary.

```text
components/layout/PortalLayout.tsx
components/layout/Sidebar.tsx
components/layout/Topbar.tsx
components/layout/PageHeader.tsx
components/layout/PermissionGate.tsx
components/layout/EmptyState.tsx
components/layout/ErrorState.tsx
```

### 3.2 Sidebar

Menu theo permission:

| Menu | Route | Permission |
|---|---|---|
| Tổng quan | `/` | `portal:view` |
| Dashboard | `/dashboard` | `dashboard:view` |
| Chỉ số | `/indicators` | `indicators:view` |
| Nhập liệu | `/reports/input` | `reports:input:view` |
| Import Excel | `/reports/import` | `reports:import:view` |
| Duyệt dữ liệu | `/reports/review` | `reports:review:view` |
| Khóa kỳ | `/reports/locked-periods` | `reports:period_lock:view` |
| ETL/Calculation | `/etl/calculation-runs` | `etl:view` |
| Admin | `/admin` | `admin:view` |
| Trợ lý AI | `/ai-agent/chat` | `ai_agent:use` |

Agent-AI menu chỉ bật ở Phase 10.

### 3.3 Topbar

Hiển thị:

- Tên user.
- Role chính.
- Đơn vị/scope nếu có.
- Nút logout.
- Trạng thái hệ thống nhỏ: OK/warning nếu cần.

---

## 4. Trang login

Route: `/login`

Thành phần:

- Logo/tên hệ thống.
- Username/email.
- Password.
- Button đăng nhập.
- Lỗi đăng nhập.
- Loading state.

Không hiển thị chi tiết như “username không tồn tại”. Chỉ báo lỗi chung: “Thông tin đăng nhập không đúng hoặc tài khoản chưa được cấp quyền.”

---

## 5. Trang chủ `/`

Mục tiêu: portal home.

Thành phần:

- Welcome card.
- Module cards theo quyền.
- Tóm tắt trạng thái kỳ báo cáo hiện tại.
- Shortcut nhanh:
  - Nhập liệu hôm nay.
  - Import file.
  - Batch chờ duyệt.
  - Dashboard BGD/KĐH/KCCNBV.

Card module:

```text
Dashboard
Nhập liệu báo cáo
Import Excel
Duyệt & khóa kỳ
Calculation/ELT
Chỉ số chất lượng
Admin
Trợ lý AI (Phase 10)
```

---

## 6. Module nhập liệu thủ công

Route: `/reports/input`

### 6.1 Bộ lọc đầu form

- `report_date`
- `period_type`
- `department_code`
- `station_code`
- `input_group`

### 6.2 Form fields

Lấy từ API form template.

Mỗi dòng:

- Mã biến/chỉ số.
- Tên biến/chỉ số.
- Ô nhập value/text value.
- Unit.
- Required indicator.
- Validation message.
- Note.

### 6.3 Action buttons

| Button | Permission | Điều kiện |
|---|---|---|
| Lưu nháp | `reports:input:create` hoặc `reports:input:update_own` | Kỳ chưa khóa |
| Gửi duyệt | `reports:input:submit` | Batch draft và valid |
| Xóa nháp | `reports:input:delete_draft` | Batch draft |

### 6.4 UI state

- Loading template.
- Empty template.
- Field error inline.
- Batch saved success toast.
- Period locked warning.
- Permission denied.

---

## 7. Module import Excel

Route: `/reports/import`

### 7.1 Form upload

- File upload area.
- `import_type`.
- `report_date`.
- `period_type`.
- `department_code`.
- `station_code`.
- Nút upload.

### 7.2 Preview

Sau upload:

- Tổng số dòng.
- Số dòng hợp lệ.
- Số dòng warning.
- Số dòng lỗi.
- Bảng preview có highlight dòng lỗi.
- Tab hoặc filter: All / Valid / Warning / Error.
- Nút tải file lỗi nếu Phase 8 hỗ trợ.

### 7.3 Actions

| Button | Permission | Điều kiện |
|---|---|---|
| Xác nhận import | `reports:import:confirm` | Không có lỗi blocking |
| Hủy import | `reports:import:cancel_own` hoặc `reports:import:cancel_any` | Batch chưa processed |

---

## 8. Module duyệt dữ liệu

Route: `/reports/review`

### 8.1 Danh sách batch chờ duyệt

Columns:

- Batch code.
- Loại: web form/import.
- Ngày báo cáo.
- Khoa/trạm.
- Người gửi.
- Thời điểm gửi.
- Số dòng.
- Trạng thái.
- Action.

### 8.2 Detail drawer/page

- Thông tin batch.
- Danh sách records.
- Lịch sử audit.
- Ghi chú duyệt.
- Button Approve/Reject.

### 8.3 Quy tắc UX

- Người nhập không thấy nút tự duyệt nếu không có quyền đặc biệt.
- Nếu thiếu scope, không hiện batch hoặc hiển thị 403.
- Reject bắt buộc nhập lý do.

---

## 9. Module khóa kỳ

Route: `/reports/locked-periods`

Thành phần:

- Filter period/date/department/station.
- Bảng kỳ đã khóa/chưa khóa.
- Button lock/unlock theo quyền.
- Unlock bắt buộc nhập lý do.
- Cảnh báo tác động khi lock: không sửa input/import kỳ đó.

---

## 10. Module calculation/ELT

Route: `/etl/calculation-runs`

Thành phần:

- Button chạy calculation theo quyền.
- Filter date/period/department/station/status.
- Bảng calculation runs.
- Detail lỗi run.
- Link sang data quality logs.

Route: `/etl/data-quality`

- Bảng lỗi dữ liệu.
- Filter severity/source/batch/date.
- Detail raw payload.

---

## 11. Dashboard MVP

### Routes

```text
/dashboard/bgd
/dashboard/kdh
/dashboard/kccnbv
/dashboard/quality
```

### Component

```text
components/dashboard/KpiCard.tsx
components/dashboard/TrendChart.tsx
components/dashboard/BarCompareChart.tsx
components/dashboard/IndicatorTable.tsx
components/dashboard/DashboardFilters.tsx
components/dashboard/StatusBadge.tsx
```

### Dashboard state

- Loading.
- Empty data.
- API error.
- Permission denied.
- Last calculated timestamp.

### Nguyên tắc

Frontend chỉ gọi API:

```text
/api/v1/quality/dashboard/summary
/api/v1/quality/dashboard/trend
/api/v1/quality/dashboard/station-compare
/api/v1/quality/indicators/results
```

Không gọi raw/import/input rows trực tiếp cho dashboard.

---

## 12. Admin UI

Routes:

```text
/admin/users
/admin/roles
/admin/permissions
/admin/scopes
/admin/audit-logs
```

MVP admin:

- Xem user.
- Gán role.
- Gán scope.
- Xem permission matrix.
- Xem audit logs.

Có thể làm UI chỉnh sửa role/permission ở Phase 9, trước đó seed bằng script.

---

## 13. Agent-AI UI later

Phase 10:

```text
/ai-agent
/ai-agent/chat
```

Yêu cầu:

- Dùng `PortalLayout`.
- Menu chỉ hiện khi có `ai_agent:use`.
- Chat UI không dùng `100vw` làm tràn layout.
- Giao diện đồng bộ với QLCL Web.

---

## 14. Accessibility và usability cơ bản

- Button có trạng thái disabled rõ.
- Form field có label rõ.
- Error hiển thị gần field.
- Không chỉ dùng màu để báo lỗi.
- Bảng dài có pagination.
- Date filter có giá trị mặc định hợp lý.
- Modal confirm cho action nguy hiểm: lock, unlock, delete, cancel, approve.
