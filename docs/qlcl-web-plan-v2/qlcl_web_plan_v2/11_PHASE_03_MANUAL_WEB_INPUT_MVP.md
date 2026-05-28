# 11 - Phase 3: Manual Web Input MVP

## 1. Mục tiêu

Cho phép người dùng nhập dữ liệu trực tiếp trên web, lưu nháp và gửi duyệt. Đây là nguồn dữ liệu nội bộ chính cho các chỉ số chưa tự động hóa.

---

## 2. Đầu ra chính

```text
/reports/input
GET  /api/v1/quality/input/form-template
POST /api/v1/quality/input/batches
GET  /api/v1/quality/input/batches
GET  /api/v1/quality/input/batches/{batch_id}
PUT  /api/v1/quality/input/batches/{batch_id}
POST /api/v1/quality/input/batches/{batch_id}/submit
```

---

## 3. Không làm trong phase này

- Không upload Excel.
- Không duyệt approve/reject đầy đủ nếu chuyển Phase 5.
- Không khóa kỳ.
- Không calculation.
- Không dashboard thật.
- Không Agent-AI.

---

## 4. Batch 3A - Backend form template and create batch

### API

```http
GET /api/v1/quality/input/form-template
POST /api/v1/quality/input/batches
```

### Validation

- User phải có `reports:input:view` để xem form.
- User phải có `reports:input:create` để tạo batch.
- Kiểm `department_code`/`station_code` theo scope.
- Kiểm kỳ chưa khóa.
- Giá trị số không âm nếu field quy định `min_value >= 0`.
- Required field không được rỗng.

### Audit

- `create_input_batch`.

### Acceptance

- Lấy template được.
- Tạo batch draft được.
- Thiếu permission trả 403.
- Kỳ đã khóa trả 409.

---

## 5. Batch 3B - Backend update/list/detail/submit

### API

```http
GET /api/v1/quality/input/batches
GET /api/v1/quality/input/batches/{batch_id}
PUT /api/v1/quality/input/batches/{batch_id}
POST /api/v1/quality/input/batches/{batch_id}/submit
```

### Quy tắc status

```text
draft → submitted
```

Không cho:

- Sửa batch không phải draft.
- Submit batch có dòng error blocking.
- User ngoài scope xem/sửa batch.

### Audit

```text
update_input_batch
update_input_record
submit_input_batch
```

---

## 6. Batch 3C - Frontend `/reports/input`

### UI

- Filter: date, period, department, station, group.
- Load template.
- Render fields.
- Validate inline.
- Save draft.
- Submit.
- Hiển thị batch status.

### State

- Loading.
- Empty template.
- Validation errors.
- Period locked.
- Permission denied.
- Save success.

---

## 7. Batch 3D - Integration and tests

### Test thủ công

```text
[ ] Data entry vào /reports/input được
[ ] User thiếu quyền không thấy menu hoặc bị 403
[ ] Tạo draft batch được
[ ] Sửa draft được
[ ] Submit batch được
[ ] Submit batch thiếu required field bị chặn
[ ] Audit log có create/update/submit
```

---

## 8. Data flow

```text
User nhập form
→ validate frontend cơ bản
→ POST input batch
→ validate backend
→ quality_input_batches status=draft
→ quality_input_records
→ submit
→ status=submitted
→ tạo review task ở Phase 5 hoặc tạo ngay nếu đã có bảng review_tasks
```

---

## 9. Checklist nghiệm thu Phase 3

```text
[ ] Có API form-template
[ ] Có API create/list/detail/update/submit batch
[ ] Có permission guard
[ ] Có scope guard
[ ] Có period lock guard nếu bảng lock đã có
[ ] Có audit log
[ ] Có UI /reports/input
[ ] Có loading/error/empty state
[ ] Không làm Excel import
[ ] Không làm Agent-AI
```

---

## 10. Prompt Codex gợi ý

```text
Thực hiện Phase 3 - Manual Web Input MVP.
Tạo API form-template, create/list/detail/update/submit input batch. Áp dụng permission reports:input:view/create/update_own/update_department/submit, scope department/station, period lock guard. Ghi audit log khi tạo/sửa/submit.
Tạo frontend /reports/input với filter, form fields, validate, save draft, submit, loading/error/empty state.
Không làm Excel import, review approve/reject đầy đủ, calculation, dashboard, Agent-AI.
Sau khi xong chạy test/build phù hợp và báo cách kiểm thủ công.
```
