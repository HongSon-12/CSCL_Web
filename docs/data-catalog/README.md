# Data Catalog

Catalog này là đầu vào để thiết kế schema `quality_*`, ETL và calculation engine.

| File | Mục đích |
|---|---|
| `table_summary.csv` | Tổng quan bảng, số cột, số measure, ghi chú bảng auto date |
| `column_catalog.csv` | Danh sách cột, kiểu dữ liệu, format và trạng thái hidden |
| `measure_catalog.csv` | Measure/DAX hiện có, dùng để chuyển sang Python calculation functions |

## Ghi chú triển khai

- Không migrate các bảng auto date của Power BI như `LocalDateTable_*`.
- Ưu tiên các bảng nghiệp vụ: `callcenterdata`, `callcenterdata_stationtransfer`, `handlebyarea`, `KCCNBV`, `chi_so`, `outofhospitalreport`, `receiving_hospital`, `tranfer_satellite`.
- Các measure có `needs_review` như `unsafe_division_check`, `filter_context_logic`, `multiline_export` cần được kiểm thử riêng khi chuyển sang Python.
- Dùng `safe_divide()` cho mọi chỉ số tỷ lệ.

