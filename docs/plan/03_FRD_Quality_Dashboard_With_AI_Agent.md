# FRD - Functional Requirements Document
## Dự án: Web quản lý chỉ số chất lượng tích hợp Agent-AI

**Phiên bản:** 1.0  
**Ngày lập:** 27/05/2026  
**Mục tiêu:** Đặc tả chức năng chi tiết để đội phát triển/Codex triển khai theo module

---

## 1. Quy ước mã chức năng

| Prefix | Nhóm chức năng |
|---|---|
| F-BASE | Baseline, backup, không ảnh hưởng hệ thống cũ |
| F-PORTAL | Portal layout và điều hướng |
| F-AI | Agent-AI module |
| F-AUTH | Auth/RBAC/module permission |
| F-QUALITY-DB | Database nghiệp vụ chỉ số |
| F-ETL | Python ETL |
| F-CALC | Python Calculation Engine |
| F-DASH | Dashboard web |
| F-INPUT | Nhập liệu/import/duyệt dữ liệu |
| F-EXPORT | Xuất báo cáo |
| F-OPS | Vận hành, log, backup |

---

## 2. F-BASE - Baseline an toàn

### F-BASE-01: Ghi nhận trạng thái hệ thống hiện tại

Trước khi sửa code, cần ghi nhận:

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
```

Kiểm tra:

```bash
curl -i http://localhost:8000/api/v1/health
curl -i http://localhost/api/v1/health
curl -i http://localhost:3000/chat
```

### F-BASE-02: Backup trước migration

Tạo script hoặc lệnh backup:

```bash
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
pg_dump "$DATABASE_URL" > backups/$(date +%Y%m%d_%H%M%S)/db.sql

tar -czf backups/$(date +%Y%m%d_%H%M%S)/storage.tar.gz storage/
cp .env backups/$(date +%Y%m%d_%H%M%S)/env.backup
```

### F-BASE-03: Không sửa các thành phần RAG nếu không cần

Không thay đổi các file liên quan nếu nhiệm vụ chỉ là thêm dashboard:

```text
backend/rag.py
backend/pipeline.py
backend/worker.py
backend/metadata_utils.py
models liên quan document/chunk/embedding
```

Trừ khi chỉ thêm route/module import không gây ảnh hưởng.

---

## 3. F-PORTAL - Portal layout

### F-PORTAL-01: Tạo layout chính

Frontend cần có layout chính:

```text
components/layout/PortalLayout.tsx
components/layout/Sidebar.tsx
components/layout/Topbar.tsx
components/layout/ModuleCard.tsx
```

Menu tối thiểu:

```text
Tổng quan
Dashboard
Chỉ số chất lượng
Nhập liệu báo cáo
ETL & Dữ liệu
Trợ lý AI
Quản trị
```

### F-PORTAL-02: Route chính

Yêu cầu route:

```text
/
/dashboard
/dashboard/bgd
/dashboard/kdh
/dashboard/kccnbv
/dashboard/quality
/indicators
/reports
/etl
/ai-agent
/ai-agent/chat
/admin
```

### F-PORTAL-03: Không phá route `/chat`

Một trong hai cách:

Cách 1 - giữ nguyên:

```text
/chat vẫn render chat UI cũ
/ai-agent/chat dùng chung component chat
```

Cách 2 - redirect:

```text
/chat → /ai-agent/chat
```

Chỉ dùng redirect sau khi đã test.

---

## 4. F-AI - Agent-AI module

### F-AI-01: Bọc chat UI vào portal

Chat component hiện tại phải có thể render trong:

```text
/ai-agent/chat
```

Nếu chat hiện tại có sidebar riêng, cần tránh xung đột với portal sidebar:

- Portal sidebar cố định bên ngoài.
- Chat conversation sidebar nằm trong content area.
- Không dùng `100vw` gây tràn layout.

### F-AI-02: Giữ API hiện tại

Không đổi endpoint:

```http
POST /api/v1/chat/query
POST /api/v1/messages/{message_id}/feedback
GET /api/v1/documents/{document_version_id}/download
```

### F-AI-03: Tên module

UI hiển thị:

```text
Trợ lý AI nội bộ
```

Không hiển thị thuật ngữ kỹ thuật RAG/LLM cho người dùng phổ thông.

---

## 5. F-AUTH - Auth/RBAC/module permission

### F-AUTH-01: Quyền module

Thêm permission nếu chưa có:

```text
portal:view
ai_agent:use
dashboard:view
dashboard:view_bgd
dashboard:view_kdh
dashboard:view_kccnbv
indicators:view
indicators:manage
reports:input
reports:review
reports:export
etl:view
etl:run
admin:manage_users
```

### F-AUTH-02: Middleware kiểm tra quyền

Backend phải kiểm tra permission. Frontend chỉ ẩn/hiện menu.

### F-AUTH-03: Role seed

Role đề xuất:

```text
system_admin
quality_admin
department_manager
data_entry
dashboard_viewer
ai_agent_user
```

---

## 6. F-QUALITY-DB - Database nghiệp vụ chỉ số

### F-QUALITY-DB-01: Quy ước bảng

Không dùng chung bảng RAG. Bảng mới nên có prefix hoặc schema riêng.

Khuyến nghị schema riêng:

```sql
CREATE SCHEMA IF NOT EXISTS quality;
```

Nếu app hiện tại chưa hỗ trợ schema riêng, dùng prefix:

```text
quality_departments
quality_stations
quality_hospitals
quality_indicator_catalog
quality_indicator_inputs
quality_indicator_results
quality_etl_jobs
quality_data_change_logs
```

### F-QUALITY-DB-02: Bảng danh mục

```sql
CREATE TABLE IF NOT EXISTS quality_departments (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quality_stations (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department_code TEXT,
    is_satellite BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quality_hospitals (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    api_id TEXT,
    excel_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);
```

### F-QUALITY-DB-03: Indicator catalog

```sql
CREATE TABLE IF NOT EXISTS quality_indicator_catalog (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,          -- CS1..CS53
    name TEXT NOT NULL,
    description TEXT,
    group_code TEXT,                    -- A/B/C/D/E hoặc nhóm nghiệp vụ
    formula_text TEXT,
    formula_python_key TEXT,
    unit TEXT,
    frequency TEXT DEFAULT 'daily',
    source_type TEXT DEFAULT 'mixed',   -- auto/manual/mixed
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

### F-QUALITY-DB-04: Input variables

```sql
CREATE TABLE IF NOT EXISTS quality_indicator_variables (
    id SERIAL PRIMARY KEY,
    variable_code TEXT UNIQUE NOT NULL, -- A1..A21, B1..B19, C1..C10, D1..D13, E1..E14
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT,
    source_table TEXT,
    source_column TEXT,
    calculation_note TEXT,
    is_active BOOLEAN DEFAULT true
);
```

### F-QUALITY-DB-05: Results

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
    status TEXT, -- good/warning/critical/no_data
    calculated_at TIMESTAMP DEFAULT now(),
    calculation_version TEXT,
    UNIQUE(indicator_code, report_date, period_type, department_code, station_code)
);
```

### F-QUALITY-DB-06: Raw/Staging/Fact

Bảng cần có theo nhóm:

```text
quality_raw_callcenterdata
quality_stg_callcenterdata
quality_fact_callcenter_daily

quality_raw_kccnbv
quality_stg_kccnbv
quality_fact_kccnbv_case

quality_raw_chi_so
quality_stg_chi_so
quality_fact_indicator_manual_input

quality_raw_suco
quality_fact_incident

quality_fact_receiving_hospital
quality_fact_transfer_satellite
```

---

## 7. F-ETL - Python ETL

### F-ETL-01: Cấu trúc thư mục

```text
data_engine/
├── etl/
│   ├── callcenter_etl.py
│   ├── kccnbv_etl.py
│   ├── chi_so_etl.py
│   ├── suco_etl.py
│   ├── receiving_hospital_etl.py
│   └── transfer_satellite_etl.py
├── calculations/
│   ├── variables.py
│   ├── indicators.py
│   └── safe_math.py
├── jobs/
│   ├── run_daily_etl.py
│   └── run_calculation.py
└── common/
    ├── db.py
    ├── logging.py
    └── validators.py
```

### F-ETL-02: ETL job table

```sql
CREATE TABLE IF NOT EXISTS quality_etl_jobs (
    id BIGSERIAL PRIMARY KEY,
    job_name TEXT NOT NULL,
    source_type TEXT,
    status TEXT DEFAULT 'pending',
    report_date DATE,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    total_rows INT DEFAULT 0,
    success_rows INT DEFAULT 0,
    error_rows INT DEFAULT 0,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT now()
);
```

### F-ETL-03: Data quality log

```sql
CREATE TABLE IF NOT EXISTS quality_data_quality_logs (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT,
    table_name TEXT,
    row_identifier TEXT,
    severity TEXT,
    error_code TEXT,
    error_message TEXT,
    raw_payload JSONB,
    created_at TIMESTAMP DEFAULT now()
);
```

### F-ETL-04: ETL rules

- Không ghi thẳng raw vào fact.
- Luôn qua staging.
- Validate kiểu dữ liệu.
- Chuẩn hóa ngày/tháng.
- Chuẩn hóa tên trạm/khoa.
- Deduplicate.
- Log dòng lỗi, không dừng toàn bộ job nếu lỗi dòng đơn lẻ.

---

## 8. F-CALC - Calculation Engine

### F-CALC-01: Hàm chia an toàn

```python
def safe_divide(numerator, denominator, default=0):
    if denominator is None or denominator == 0:
        return default
    if numerator is None:
        return default
    return numerator / denominator
```

### F-CALC-02: Tính biến A/B/C/D/E

Calculation Engine cần tính trước các biến:

```text
A1-A21: nhóm Khoa Điều hành/tổng đài
B1-B19: nhóm KCCNBV
C1-C10: thiết bị, vật tư, an toàn
D1-D13: sự hài lòng, CCHC, nhân sự, sự cố
E1-E14: chất lượng, trạm vệ tinh, đào tạo, thu phí
```

### F-CALC-03: Tính CS1-CS53

Tạo registry:

```python
INDICATOR_REGISTRY = {
    "CS1": calc_cs1,
    "CS2": calc_cs2,
    "CS3": calc_cs3,
    # ...
    "CS53": calc_cs53,
}
```

### F-CALC-04: Ghi kết quả

Mỗi lần tính ghi vào:

```text
quality_indicator_results
```

Có `calculation_version` để audit khi công thức thay đổi.

---

## 9. F-DASH - Dashboard APIs và UI

### F-DASH-01: API summary

```http
GET /api/v1/quality/dashboard/summary?date=YYYY-MM-DD&department=&station=
```

Response:

```json
{
  "report_date": "2026-05-27",
  "kpis": [
    {"code": "CS1", "name": "Tổng số cuộc gọi", "value": 1234, "unit": "cuộc", "status": "good"}
  ],
  "charts": {
    "daily_trend": [],
    "station_compare": [],
    "indicator_status": []
  }
}
```

### F-DASH-02: Dashboard routes

```text
/dashboard/bgd
/dashboard/kdh
/dashboard/kccnbv
/dashboard/quality
```

### F-DASH-03: Dashboard không gọi raw table trực tiếp

Frontend chỉ gọi API summary hoặc API chart đã được backend chuẩn bị.

---

## 10. F-INPUT - Nhập liệu/import/duyệt

### F-INPUT-01: Form nhập liệu thủ công

Route:

```text
/reports/input
```

Trường chung:

```text
report_date
department_code
station_code
indicator/input variable
value
note
```

### F-INPUT-02: Import Excel

Route:

```text
/reports/import
```

Yêu cầu:

- Upload file.
- Preview dữ liệu.
- Validate cột.
- Ghi staging.
- Trả danh sách lỗi.

### F-INPUT-03: Review/approve

Route:

```text
/reports/review
```

Workflow:

```text
draft → submitted → approved → locked
```

---

## 11. F-EXPORT - Xuất báo cáo

### F-EXPORT-01: Excel

```http
GET /api/v1/quality/export/excel?period=month&month=2026-05
```

### F-EXPORT-02: PDF

```http
GET /api/v1/quality/export/pdf?dashboard=bgd&date=2026-05-27
```

### F-EXPORT-03: Word/PDF mẫu hành chính

Phase sau có thể dùng template.

---

## 12. F-OPS - Vận hành

### F-OPS-01: Health check tổng

```http
GET /api/v1/system/health
```

Trả:

```json
{
  "status": "ok",
  "modules": {
    "ai_agent": "ok",
    "quality_dashboard": "ok",
    "database": "ok",
    "etl": "ok"
  }
}
```

### F-OPS-02: Không conflict port

Giữ các port hiện có nếu đang chạy:

```text
frontend: 3000
backend: 8000
nginx: 80
postgres: 5432
```

Không mở thêm service dùng cùng port.

### F-OPS-03: Docker Compose

Docker Compose là nguồn chạy chính. Không chạy song song `npm run dev` và Docker frontend trên cùng port 3000.

---

## 13. Tiêu chí nghiệm thu chức năng

| Nhóm | Tiêu chí |
|---|---|
| Baseline | Backup xong, Agent-AI vẫn chạy |
| Portal | Có layout lớn, route `/ai-agent/chat` hoạt động |
| Database | Bảng quality tách khỏi bảng RAG |
| ETL | Có job mẫu, log được status |
| Calculation | Tính được nhóm chỉ số MVP và ghi result |
| Dashboard | BGD/KĐH/KCCNBV có dữ liệu từ API |
| Input | Nhập/import dữ liệu không lỗi cơ bản |
| Export | Xuất được Excel MVP |
| Security | Menu/API theo quyền |
