# 14 - Phase 6: Calculation Engine MVP

## 1. Mục tiêu

Tạo calculation engine bằng Python để tính nhóm chỉ số MVP từ dữ liệu đã nhập/import và đã duyệt/khóa. Phase này chưa cần tính đủ 53 chỉ số.

---

## 2. Đầu ra chính

```text
backend/data_engine/
backend/data_engine/calculations/safe_math.py
backend/data_engine/calculations/variables.py
backend/data_engine/calculations/indicators.py
backend/data_engine/jobs/run_calculation.py
POST /api/v1/quality/calculate/run
GET  /api/v1/quality/calculate/runs
GET  /api/v1/quality/calculate/runs/{run_id}
/etl/calculation-runs
```

---

## 3. Không làm trong phase này

- Không tính đủ CS1-CS53.
- Không làm dashboard phức tạp.
- Không export report.
- Không Agent-AI.

---

## 4. Nhóm chỉ số MVP đề xuất

Ưu tiên 10 chỉ số đầu dễ đối chiếu:

```text
CS1  - Tổng số cuộc gọi
CS2  - Tỷ lệ cuộc gọi được tiếp nhận
CS3  - Tỷ lệ cuộc gọi có nội dung
CS4  - Tỷ lệ cuộc gọi có dấu hiệu cấp cứu
CS5  - Tỷ lệ trường hợp cấp cứu điều phối KCCNBV
CS15 - Tỷ lệ trường hợp xuất xe
CS16 - Tỷ lệ trường hợp có bệnh nhân
CS17 - Tỷ lệ trường hợp chuyển viện
CS22 - Trung bình thời gian kích hoạt cấp cứu
CS23 - Trung bình thời gian tiếp cận bệnh nhân
```

Nếu chưa đủ nguồn dữ liệu, Phase 6 có thể chỉ tính CS1-CS5 trước và để placeholder registry cho các chỉ số còn lại.

---

## 5. Batch 6A - Calculation package skeleton

### Cấu trúc

```text
backend/data_engine/
├── calculations/
│   ├── __init__.py
│   ├── safe_math.py
│   ├── variables.py
│   └── indicators.py
├── jobs/
│   ├── __init__.py
│   └── run_calculation.py
└── common/
    ├── __init__.py
    ├── db.py
    └── logging.py
```

### Safe math

```python
def safe_divide(numerator, denominator, default=0):
    if denominator is None or denominator == 0:
        return default
    if numerator is None:
        return default
    return numerator / denominator
```

---

## 6. Batch 6B - Variable loader and indicator registry

### Variable loader

Đọc từ:

```text
quality_input_records
```

Điều kiện:

- Batch status `approved` hoặc kỳ đã `locked`.
- Theo `report_date`, `period_type`, `department_code`, `station_code`.

### Registry

```python
INDICATOR_REGISTRY = {
    "CS1": calc_cs1,
    "CS2": calc_cs2,
    "CS3": calc_cs3,
    "CS4": calc_cs4,
    "CS5": calc_cs5,
}
```

---

## 7. Batch 6C - Calculation run API and result upsert

### API

```http
POST /api/v1/quality/calculate/run
GET  /api/v1/quality/calculate/runs
GET  /api/v1/quality/calculate/runs/{run_id}
```

### Permission

```text
etl:run
etl:view
etl:view_logs
indicators:recalculate
```

### Run behavior

1. Tạo `quality_calculation_runs` status `pending`.
2. Chuyển `running`.
3. Load input variables.
4. Run registry.
5. Upsert vào `quality_indicator_results`.
6. Cập nhật success/error count.
7. Status `success`, `failed` hoặc `partial_success`.
8. Audit `run_calculation`.

---

## 8. Batch 6D - Frontend calculation runs

Route:

```text
/etl/calculation-runs
```

UI:

- Filter date/period/department/station/status.
- Button Run Calculation.
- Table runs.
- Detail errors.
- Link result.

---

## 9. Checklist nghiệm thu Phase 6

```text
[ ] Có data_engine package
[ ] Có safe_divide
[ ] Có variable loader
[ ] Có indicator registry
[ ] Có calculation run API
[ ] Có result upsert
[ ] Có run status success/failed/partial_success
[ ] Có audit log run_calculation
[ ] Có UI calculation-runs
[ ] Tính được ít nhất CS1-CS5 hoặc nhóm chỉ số MVP khả dụng
[ ] Không làm Agent-AI
```

---

## 10. Prompt Codex gợi ý

```text
Thực hiện Phase 6 - Calculation Engine MVP.
Tạo backend/data_engine với safe_math, variable loader, indicator registry và job run_calculation. Tạo API calculate/run, calculate/runs, calculate/runs/{id}. Calculation đọc input records đã approved/locked, ghi quality_calculation_runs và upsert quality_indicator_results. Tính tối thiểu nhóm chỉ số MVP khả dụng, ưu tiên CS1-CS5 nếu đủ dữ liệu. Tạo UI /etl/calculation-runs.
Không tính đủ 53 chỉ số, không làm dashboard phức tạp, không Agent-AI.
Sau khi xong chạy compile/test phù hợp và báo cách kiểm.
```
