# 12 - Phase 4: Excel Import, Preview & Validation

## 1. Mục tiêu

Cho phép upload Excel/CSV trực tiếp trên web nội bộ, lưu file vào private storage, parse thành raw rows, validate và hiển thị preview trước khi confirm.

---

## 2. Đầu ra chính

```text
/reports/import
POST /api/v1/quality/import/upload
GET  /api/v1/quality/import/batches
GET  /api/v1/quality/import/batches/{batch_id}/preview
POST /api/v1/quality/import/batches/{batch_id}/confirm
POST /api/v1/quality/import/batches/{batch_id}/cancel
```

---

## 3. Không làm trong phase này

- Không parse mọi loại Excel phức tạp ngay.
- Không làm mapping tự động quá nhiều template.
- Không tính chỉ số.
- Không dashboard.
- Không Agent-AI.

---

## 4. Batch 4A - Upload and private storage

### Backend rules

- Extension cho phép: `.xlsx`, `.xls`, `.csv`.
- Max size từ env, ví dụ `QUALITY_IMPORT_MAX_MB`.
- Lưu vào private folder, ví dụ `storage/private/quality_imports/`.
- Không trả đường dẫn file thật ra frontend.
- Tính hash file.
- Tạo `quality_import_batches`.

### Permission

```text
reports:import:upload
```

### Acceptance

- Upload file hợp lệ tạo import batch.
- File sai extension bị từ chối.
- File quá dung lượng bị từ chối.
- File không nằm public storage.

---

## 5. Batch 4B - Parse rows and validation

### Parser

- CSV: dùng parser chuẩn.
- XLSX: dùng thư viện Python phù hợp như `openpyxl` nếu backend Python.
- Không đọc macro.
- Chỉ đọc sheet đầu tiên trong MVP, hoặc sheet theo `import_type`.

### Ghi DB

- Mỗi dòng thành `quality_import_rows.raw_payload`.
- Normalize vào `normalized_payload` nếu mapping được.
- Validate row status: `valid`, `warning`, `error`.
- Update `total_rows`, `valid_rows`, `warning_rows`, `error_rows`.

### Validation cơ bản

- Có ngày báo cáo.
- Có mã khoa/trạm nếu loại import yêu cầu.
- Cột bắt buộc không thiếu.
- Giá trị số không âm nếu quy định.
- Date parse được.
- Variable/indicator code tồn tại nếu import dạng chỉ số.

---

## 6. Batch 4C - Preview, confirm, cancel APIs

### Preview

```http
GET /api/v1/quality/import/batches/{batch_id}/preview
```

Trả:

- Summary.
- Columns.
- Rows phân trang.
- Errors.

### Confirm

```http
POST /api/v1/quality/import/batches/{batch_id}/confirm
```

Quy tắc:

- Chỉ confirm batch chưa processed/cancelled.
- Không confirm nếu có error blocking.
- Không confirm kỳ đã khóa.
- Chuyển rows valid sang `quality_input_records` hoặc tạo input batch import.
- Audit `confirm_import_batch`.

### Cancel

```http
POST /api/v1/quality/import/batches/{batch_id}/cancel
```

Audit `cancel_import_batch`.

---

## 7. Batch 4D - Frontend `/reports/import`

### UI

- Upload area.
- Select import type.
- Date/period/department/station.
- Upload progress.
- Preview table.
- Error row highlight.
- Confirm/cancel buttons.

### State

- Loading upload.
- Parsing/validating.
- Preview empty.
- Has errors.
- Confirm success.
- Permission denied.

---

## 8. Data flow

```text
User upload Excel
→ backend validate file
→ private storage
→ quality_import_batches
→ parse rows
→ quality_import_rows
→ preview
→ confirm
→ quality_input_batches/source_type=import
→ quality_input_records
→ review/lock/calc ở phase sau
```

---

## 9. Checklist nghiệm thu Phase 4

```text
[ ] Upload xlsx/csv được
[ ] File sai loại bị chặn
[ ] File quá dung lượng bị chặn
[ ] File lưu private
[ ] Có import batch
[ ] Có import rows
[ ] Có preview
[ ] Có valid/error count
[ ] Confirm import ghi sang input records hoặc input batch
[ ] Cancel import được
[ ] Permission/scope/lock guard đúng
[ ] Audit log có upload/confirm/cancel
[ ] UI /reports/import dùng được
[ ] Không làm Agent-AI
```

---

## 10. Prompt Codex gợi ý

```text
Thực hiện Phase 4 - Excel Import, Preview & Validation.
Tạo upload API nhận xlsx/xls/csv, kiểm extension/dung lượng, lưu private storage, tính hash, tạo import batch. Parse rows, ghi quality_import_rows, validate row và trả preview. Tạo confirm/cancel API với permission/scope/period lock guard và audit log. Tạo UI /reports/import.
Không làm calculation, dashboard, Agent-AI, không đưa file vào public storage.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```
