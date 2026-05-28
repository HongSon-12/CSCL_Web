# 15 - Phase 7: Dashboard MVP

## 1. Mục tiêu

Tạo dashboard MVP đọc từ dữ liệu đã tính trong `quality_indicator_results`, không đọc raw/import/input trực tiếp từ frontend.

---

## 2. Đầu ra chính

```text
/dashboard/bgd
/dashboard/kdh
/dashboard/kccnbv
/dashboard/quality
GET /api/v1/quality/dashboard/summary
GET /api/v1/quality/dashboard/trend
GET /api/v1/quality/dashboard/station-compare
GET /api/v1/quality/indicators/results
```

---

## 3. Không làm trong phase này

- Không xây BI phức tạp như Power BI ngay.
- Không làm tất cả biểu đồ nâng cao.
- Không export PDF phức tạp.
- Không Agent-AI.

---

## 4. Batch 7A - Dashboard APIs

### APIs

```http
GET /api/v1/quality/dashboard/summary
GET /api/v1/quality/dashboard/trend
GET /api/v1/quality/dashboard/station-compare
GET /api/v1/quality/indicators/results
```

### Permission

```text
dashboard:view
dashboard:view_bgd
dashboard:view_kdh
dashboard:view_kccnbv
dashboard:view_quality
indicators:view_results
```

### Scope

- BGD có thể xem toàn cục nếu được cấp.
- KĐH chỉ xem department/station thuộc scope nếu không có quyền toàn cục.
- KCCNBV tương tự.

---

## 5. Batch 7B - Dashboard components

```text
components/dashboard/DashboardFilters.tsx
components/dashboard/KpiCard.tsx
components/dashboard/TrendChart.tsx
components/dashboard/BarCompareChart.tsx
components/dashboard/IndicatorTable.tsx
components/dashboard/StatusBadge.tsx
components/dashboard/LastCalculated.tsx
```

Chart MVP:

- KPI cards.
- Line trend.
- Bar compare.
- Indicator status table.

---

## 6. Batch 7C - BGD dashboard MVP

Route:

```text
/dashboard/bgd
```

Hiển thị:

- Tổng quan các KPI trọng yếu.
- Cảnh báo chỉ số warning/critical.
- Xu hướng theo ngày/tháng.
- Bảng chỉ số.

---

## 7. Batch 7D - KĐH/KCCNBV/Quality dashboards

Routes:

```text
/dashboard/kdh
/dashboard/kccnbv
/dashboard/quality
```

MVP có thể dùng chung component và khác filter/default indicator groups.

---

## 8. UI state bắt buộc

- Loading.
- Error.
- Empty data.
- Permission denied.
- Last calculated timestamp.
- Warning nếu chưa có calculation run mới nhất.

---

## 9. Checklist nghiệm thu Phase 7

```text
[ ] Dashboard API đọc quality_indicator_results
[ ] Frontend không query raw/import/input trực tiếp
[ ] Có dashboard BGD MVP
[ ] Có KĐH/KCCNBV/Quality pages hoặc placeholders có dữ liệu khi có result
[ ] Có filter date/period/department/station
[ ] Có KPI card/table/chart MVP
[ ] Có permission/scope guard
[ ] Có loading/error/empty state
[ ] Không làm Agent-AI
```

---

## 10. Prompt Codex gợi ý

```text
Thực hiện Phase 7 - Dashboard MVP.
Tạo API dashboard summary, trend, station-compare và indicators/results đọc từ quality_indicator_results, áp dụng permission/scope guard. Tạo components dashboard và các route /dashboard/bgd, /dashboard/kdh, /dashboard/kccnbv, /dashboard/quality với filters, KPI cards, chart/table MVP, loading/error/empty states.
Không query raw/import/input trực tiếp từ frontend. Không làm export PDF phức tạp, không Agent-AI.
Sau khi xong chạy build/test phù hợp và báo cách kiểm.
```
