# 16 - Phase 8: Export Reports

## 1. Mục tiêu

Cho phép xuất báo cáo từ dữ liệu đã tính/đã khóa, ưu tiên Excel MVP. PDF/Word template có thể làm sau.

---

## 2. Đầu ra chính

```text
/reports/export
GET /api/v1/quality/export/excel
GET /api/v1/quality/export/pdf       # optional/skeleton
GET /api/v1/quality/export/word      # optional/skeleton
```

---

## 3. Không làm trong phase này

- Không làm template hành chính quá phức tạp ngay.
- Không export dữ liệu chưa qua permission/scope.
- Không lưu file nhạy cảm vào public storage.
- Không Agent-AI.

---

## 4. Batch 8A - Excel export service

### Input

```http
GET /api/v1/quality/export/excel?period_type=monthly&month=2026-05&department_code=KDH
```

### Data source

- `quality_indicator_results`.
- `quality_indicator_catalog`.
- Có thể thêm audit/calc run metadata.

### Permission

```text
reports:export:excel
```

### Scope

- Export chỉ trong scope user.
- Không cho export toàn cục nếu user chỉ có department scope.

### Audit

```text
export_report
```

---

## 5. Batch 8B - Frontend export page

Route:

```text
/reports/export
```

UI:

- Chọn period/date/month.
- Chọn dashboard/report type.
- Chọn department/station theo scope.
- Button Export Excel.
- Download file.
- Loading/error state.

---

## 6. Batch 8C - PDF/Word plan or skeleton

Nếu cần:

- Tạo API skeleton trả 501/coming soon có permission guard.
- Hoặc tạo PDF đơn giản từ dashboard summary.
- Word template để phase sau.

---

## 7. Checklist nghiệm thu Phase 8

```text
[ ] Export Excel chạy được
[ ] Export kiểm permission
[ ] Export kiểm scope
[ ] File không lưu public nếu chứa dữ liệu nội bộ
[ ] Có audit log export_report
[ ] UI /reports/export dùng được
[ ] PDF/Word có skeleton hoặc deferred rõ
[ ] Không làm Agent-AI
```

---

## 8. Prompt Codex gợi ý

```text
Thực hiện Phase 8 - Export Reports.
Tạo Excel export API đọc từ quality_indicator_results/catalog, áp dụng permission reports:export:excel và scope guard, ghi audit export_report. Tạo UI /reports/export để chọn kỳ/phạm vi và download Excel. PDF/Word chỉ làm skeleton hoặc ghi rõ deferred nếu chưa đủ thời gian.
Không lưu file nhạy cảm public, không Agent-AI.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```
