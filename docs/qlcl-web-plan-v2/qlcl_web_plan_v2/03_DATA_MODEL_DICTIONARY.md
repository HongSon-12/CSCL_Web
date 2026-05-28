# 03 - Data Model & Dictionary

## 1. Nguyên tắc dữ liệu

1. Dùng prefix `quality_*` để tránh phụ thuộc schema riêng và dễ triển khai trong repo hiện có.
2. Không dùng chung bảng với RAG/Agent-AI.
3. Không ghi upload Excel thẳng vào bảng kết quả.
4. Mọi dữ liệu nhập/import phải qua batch, validate, workflow duyệt/khóa.
5. Kết quả dashboard đọc từ bảng result/summary đã tính toán.
6. Mọi thay đổi quan trọng phải có audit log.
7. Thiết kế bảng có thể chạy idempotent hoặc migration versioned.
8. Database phải tách rõ:
   - `POSTGRES_*`: database Agent-AI/RAG local trên server hiện tại, không lưu dữ liệu QLCL Web.
   - `QUALITY_POSTGRES_*`: database QLCL Web tại `172.16.20.17`, là nơi lưu toàn bộ bảng `quality_*`.
   - Không tạo, seed, import, tính toán hoặc audit dữ liệu QLCL vào database Agent-AI local.

---

## 2. Nhóm bảng

| Nhóm | Bảng | Phase |
|---|---|---:|
| Master data | `quality_departments`, `quality_stations`, `quality_hospitals` | 2 |
| Indicator metadata | `quality_indicator_catalog`, `quality_indicator_variables`, `quality_indicator_thresholds` | 2 |
| RBAC | `quality_roles`, `quality_permissions`, `quality_role_permissions`, `quality_user_roles`, `quality_user_scopes` | 2 |
| Manual input | `quality_input_batches`, `quality_input_records` | 3 |
| Import | `quality_import_batches`, `quality_import_rows` | 4 |
| Review/lock | `quality_review_tasks`, `quality_period_locks` | 5 |
| Calculation | `quality_calculation_runs`, `quality_indicator_results` | 6 |
| Dashboard/export | `quality_dashboard_snapshots` hoặc view/API summary | 7-8 |
| Logs | `quality_audit_logs`, `quality_data_quality_logs` | 2-9 |

---

## 3. Master data

### 3.1 `quality_departments`

Dùng để quản lý khoa/phòng/đơn vị.

```sql
CREATE TABLE IF NOT EXISTS quality_departments (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT,
    parent_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

Ví dụ code:

```text
BGD
KDH
KCCNBV
QLCL
HCQT
```

### 3.2 `quality_stations`

Dùng cho trạm/cơ sở vệ tinh.

```sql
CREATE TABLE IF NOT EXISTS quality_stations (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department_code TEXT,
    is_satellite BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

### 3.3 `quality_hospitals`

Dùng cho bệnh viện nhận/chuyển viện.

```sql
CREATE TABLE IF NOT EXISTS quality_hospitals (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    api_id TEXT,
    excel_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

---

## 4. Indicator metadata

### 4.1 `quality_indicator_catalog`

Danh mục chỉ số CS1-CS53.

```sql
CREATE TABLE IF NOT EXISTS quality_indicator_catalog (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    group_code TEXT,
    formula_text TEXT,
    formula_python_key TEXT,
    unit TEXT,
    frequency TEXT DEFAULT 'daily',
    source_type TEXT DEFAULT 'mixed',
    owner_department_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

Trường quan trọng:

| Field | Ý nghĩa |
|---|---|
| `code` | Mã CS1..CS53 |
| `formula_text` | Công thức nghiệp vụ dễ đọc |
| `formula_python_key` | Key map sang function Python |
| `source_type` | `manual`, `auto`, `import`, `mixed` |
| `frequency` | `daily`, `monthly`, `quarterly`, `yearly` |

### 4.2 `quality_indicator_variables`

Danh mục biến đầu vào A/B/C/D/E hoặc biến nghiệp vụ.

```sql
CREATE TABLE IF NOT EXISTS quality_indicator_variables (
    id BIGSERIAL PRIMARY KEY,
    variable_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    group_code TEXT,
    data_type TEXT DEFAULT 'number',
    unit TEXT,
    source_type TEXT DEFAULT 'manual',
    source_table TEXT,
    source_column TEXT,
    required BOOLEAN DEFAULT false,
    min_value NUMERIC,
    max_value NUMERIC,
    calculation_note TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

### 4.3 `quality_indicator_thresholds`

Ngưỡng cảnh báo cho dashboard.

```sql
CREATE TABLE IF NOT EXISTS quality_indicator_thresholds (
    id BIGSERIAL PRIMARY KEY,
    indicator_code TEXT NOT NULL,
    department_code TEXT,
    station_code TEXT,
    period_type TEXT DEFAULT 'daily',
    warning_min NUMERIC,
    warning_max NUMERIC,
    critical_min NUMERIC,
    critical_max NUMERIC,
    target_value NUMERIC,
    comparison_direction TEXT DEFAULT 'higher_is_better',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(indicator_code, department_code, station_code, period_type)
);
```

---

## 5. RBAC tables

### 5.1 `quality_roles`

```sql
CREATE TABLE IF NOT EXISTS quality_roles (
    id BIGSERIAL PRIMARY KEY,
    role_code TEXT UNIQUE NOT NULL,
    role_name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

### 5.2 `quality_permissions`

```sql
CREATE TABLE IF NOT EXISTS quality_permissions (
    id BIGSERIAL PRIMARY KEY,
    permission_code TEXT UNIQUE NOT NULL,
    permission_name TEXT NOT NULL,
    module_code TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT now()
);
```

### 5.3 `quality_role_permissions`

```sql
CREATE TABLE IF NOT EXISTS quality_role_permissions (
    role_id BIGINT REFERENCES quality_roles(id) ON DELETE CASCADE,
    permission_id BIGINT REFERENCES quality_permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
```

### 5.4 `quality_user_roles`

```sql
CREATE TABLE IF NOT EXISTS quality_user_roles (
    user_id TEXT NOT NULL,
    role_id BIGINT REFERENCES quality_roles(id) ON DELETE CASCADE,
    assigned_by TEXT,
    assigned_at TIMESTAMP DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);
```

### 5.5 `quality_user_scopes`

```sql
CREATE TABLE IF NOT EXISTS quality_user_scopes (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    scope_type TEXT NOT NULL,
    scope_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(user_id, scope_type, scope_code)
);
```

`scope_type`:

```text
department
station
dashboard
indicator_group
```

---

## 6. Manual input tables

### 6.1 `quality_input_batches`

```sql
CREATE TABLE IF NOT EXISTS quality_input_batches (
    id BIGSERIAL PRIMARY KEY,
    batch_code TEXT UNIQUE NOT NULL,
    report_date DATE NOT NULL,
    period_type TEXT DEFAULT 'daily',
    department_code TEXT,
    station_code TEXT,
    source_type TEXT DEFAULT 'web_form',
    status TEXT DEFAULT 'draft',
    created_by TEXT,
    submitted_by TEXT,
    approved_by TEXT,
    rejected_by TEXT,
    locked_by TEXT,
    created_at TIMESTAMP DEFAULT now(),
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    locked_at TIMESTAMP,
    note TEXT,
    reject_reason TEXT
);
```

Trạng thái:

```text
draft
submitted
approved
rejected
locked
cancelled
```

### 6.2 `quality_input_records`

```sql
CREATE TABLE IF NOT EXISTS quality_input_records (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT REFERENCES quality_input_batches(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    period_type TEXT DEFAULT 'daily',
    department_code TEXT,
    station_code TEXT,
    variable_code TEXT,
    indicator_code TEXT,
    value NUMERIC,
    text_value TEXT,
    unit TEXT,
    note TEXT,
    row_status TEXT DEFAULT 'valid',
    error_code TEXT,
    error_message TEXT,
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

---

## 7. Import tables

### 7.1 `quality_import_batches`

```sql
CREATE TABLE IF NOT EXISTS quality_import_batches (
    id BIGSERIAL PRIMARY KEY,
    import_code TEXT UNIQUE NOT NULL,
    original_filename TEXT NOT NULL,
    stored_filename TEXT,
    file_hash TEXT,
    file_size BIGINT,
    report_date DATE,
    period_type TEXT DEFAULT 'daily',
    import_type TEXT NOT NULL,
    department_code TEXT,
    station_code TEXT,
    status TEXT DEFAULT 'uploaded',
    total_rows INT DEFAULT 0,
    valid_rows INT DEFAULT 0,
    warning_rows INT DEFAULT 0,
    error_rows INT DEFAULT 0,
    created_by TEXT,
    confirmed_by TEXT,
    cancelled_by TEXT,
    created_at TIMESTAMP DEFAULT now(),
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    note TEXT
);
```

Trạng thái:

```text
uploaded
validated
has_errors
confirmed
cancelled
processed
```

### 7.2 `quality_import_rows`

```sql
CREATE TABLE IF NOT EXISTS quality_import_rows (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT REFERENCES quality_import_batches(id) ON DELETE CASCADE,
    row_number INT NOT NULL,
    raw_payload JSONB NOT NULL,
    normalized_payload JSONB,
    row_status TEXT DEFAULT 'pending',
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT now()
);
```

Dòng import:

```text
pending
valid
warning
error
ignored
```

---

## 8. Review and period lock

### 8.1 `quality_review_tasks`

```sql
CREATE TABLE IF NOT EXISTS quality_review_tasks (
    id BIGSERIAL PRIMARY KEY,
    target_type TEXT NOT NULL,
    target_id BIGINT NOT NULL,
    status TEXT DEFAULT 'pending',
    assigned_to TEXT,
    requested_by TEXT,
    reviewed_by TEXT,
    requested_at TIMESTAMP DEFAULT now(),
    reviewed_at TIMESTAMP,
    review_note TEXT
);
```

`target_type`:

```text
input_batch
import_batch
calculation_run
period_lock
```

### 8.2 `quality_period_locks`

```sql
CREATE TABLE IF NOT EXISTS quality_period_locks (
    id BIGSERIAL PRIMARY KEY,
    period_type TEXT NOT NULL,
    report_date DATE NOT NULL,
    department_code TEXT,
    station_code TEXT,
    is_locked BOOLEAN DEFAULT false,
    locked_by TEXT,
    locked_at TIMESTAMP,
    unlock_reason TEXT,
    unlocked_by TEXT,
    unlocked_at TIMESTAMP,
    UNIQUE(period_type, report_date, department_code, station_code)
);
```

---

## 9. Calculation and results

### 9.1 `quality_calculation_runs`

```sql
CREATE TABLE IF NOT EXISTS quality_calculation_runs (
    id BIGSERIAL PRIMARY KEY,
    run_code TEXT UNIQUE NOT NULL,
    report_date DATE NOT NULL,
    period_type TEXT DEFAULT 'daily',
    department_code TEXT,
    station_code TEXT,
    status TEXT DEFAULT 'pending',
    started_by TEXT,
    started_at TIMESTAMP DEFAULT now(),
    finished_at TIMESTAMP,
    total_indicators INT DEFAULT 0,
    success_indicators INT DEFAULT 0,
    error_indicators INT DEFAULT 0,
    error_message TEXT,
    calculation_version TEXT,
    metadata JSONB
);
```

Trạng thái:

```text
pending
running
success
failed
partial_success
cancelled
```

### 9.2 `quality_indicator_results`

```sql
CREATE TABLE IF NOT EXISTS quality_indicator_results (
    id BIGSERIAL PRIMARY KEY,
    indicator_code TEXT NOT NULL,
    report_date DATE NOT NULL,
    period_type TEXT DEFAULT 'daily',
    department_code TEXT,
    station_code TEXT,
    value NUMERIC,
    numerator NUMERIC,
    denominator NUMERIC,
    unit TEXT,
    status TEXT,
    source_run_id BIGINT,
    calculated_at TIMESTAMP DEFAULT now(),
    calculation_version TEXT,
    UNIQUE(indicator_code, report_date, period_type, department_code, station_code)
);
```

`status`:

```text
good
warning
critical
no_data
error
```

---

## 10. Logs

### 10.1 `quality_audit_logs`

```sql
CREATE TABLE IF NOT EXISTS quality_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor TEXT,
    action TEXT NOT NULL,
    target_table TEXT,
    target_id TEXT,
    before_data JSONB,
    after_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT now()
);
```

Bắt buộc audit các action:

```text
login_success
login_failed
create_input_batch
update_input_record
delete_input_record
submit_input_batch
approve_input_batch
reject_input_batch
upload_import_file
confirm_import_batch
cancel_import_batch
run_calculation
lock_period
unlock_period
change_role
change_permission
change_scope
export_report
```

### 10.2 `quality_data_quality_logs`

```sql
CREATE TABLE IF NOT EXISTS quality_data_quality_logs (
    id BIGSERIAL PRIMARY KEY,
    source_type TEXT,
    batch_id BIGINT,
    table_name TEXT,
    row_identifier TEXT,
    severity TEXT DEFAULT 'error',
    error_code TEXT,
    error_message TEXT,
    raw_payload JSONB,
    created_at TIMESTAMP DEFAULT now()
);
```

---

## 11. Index đề xuất

```sql
CREATE INDEX IF NOT EXISTS idx_quality_input_batches_date_status
    ON quality_input_batches(report_date, status);

CREATE INDEX IF NOT EXISTS idx_quality_input_records_batch
    ON quality_input_records(batch_id);

CREATE INDEX IF NOT EXISTS idx_quality_input_records_date_var
    ON quality_input_records(report_date, variable_code);

CREATE INDEX IF NOT EXISTS idx_quality_import_rows_batch
    ON quality_import_rows(batch_id);

CREATE INDEX IF NOT EXISTS idx_quality_results_date_code
    ON quality_indicator_results(report_date, indicator_code);

CREATE INDEX IF NOT EXISTS idx_quality_results_scope
    ON quality_indicator_results(department_code, station_code);

CREATE INDEX IF NOT EXISTS idx_quality_audit_target
    ON quality_audit_logs(target_table, target_id);

CREATE INDEX IF NOT EXISTS idx_quality_audit_actor_time
    ON quality_audit_logs(actor, created_at);

CREATE INDEX IF NOT EXISTS idx_quality_user_scopes_user
    ON quality_user_scopes(user_id);
```

---

## 12. Data lineage

```text
Manual input:
/reports/input
→ quality_input_batches
→ quality_input_records
→ review/approve
→ period lock
→ calculation run
→ quality_indicator_results
→ dashboard/export

Excel import:
/reports/import
→ private file storage
→ quality_import_batches
→ quality_import_rows
→ preview/validate
→ confirm
→ quality_input_records hoặc fact table
→ review/approve
→ period lock
→ calculation run
→ quality_indicator_results
→ dashboard/export
```

---

## 13. Quy tắc dữ liệu đã khóa

Khi kỳ đã khóa:

- Không được sửa `quality_input_records` trong kỳ đó.
- Không được confirm import mới vào kỳ đó.
- Không được xóa batch đã approved/locked.
- Chỉ `quality_admin` hoặc `system_admin` có quyền unlock.
- Unlock phải có `unlock_reason` và audit log.
