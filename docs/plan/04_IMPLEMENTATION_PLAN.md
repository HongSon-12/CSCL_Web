# Kế hoạch triển khai chi tiết
## Chuyển Agent-AI thành module phụ trong Web quản lý chỉ số chất lượng

**Phiên bản:** 1.0  
**Ngày lập:** 27/05/2026  
**Tổng thời gian đề xuất:** 16 tuần cho MVP mở rộng an toàn  
**Nguyên tắc:** Không làm gián đoạn Agent-AI hiện tại

---

## 1. Tổng quan kế hoạch

Lộ trình ưu tiên mở rộng từ hệ thống đang chạy:

```text
Giai đoạn 0: Backup và baseline
Giai đoạn 1: Portal shell + route Agent-AI phụ
Giai đoạn 2: Database nghiệp vụ chỉ số
Giai đoạn 3: Python ETL + Calculation Engine
Giai đoạn 4: Dashboard MVP
Giai đoạn 5: Nhập liệu/import/xuất báo cáo
Giai đoạn 6: Kiểm thử, chạy song song, nghiệm thu
```

---

## 2. Timeline đề xuất

Nếu bắt đầu từ **01/06/2026**, timeline đề xuất:

| Giai đoạn | Thời gian | Nội dung chính | Đầu ra |
|---|---|---|---|
| GĐ0 | 01/06 - 03/06 | Backup, baseline, tạo branch | Hệ thống cũ an toàn |
| GĐ1 | 04/06 - 14/06 | Portal shell, đưa Agent-AI vào module phụ | `/ai-agent/chat`, `/chat` vẫn chạy |
| GĐ2 | 15/06 - 28/06 | Database schema quality, indicator catalog | Bảng quality riêng |
| GĐ3 | 29/06 - 19/07 | Python ETL và calculation engine MVP | Tính nhóm chỉ số đầu tiên |
| GĐ4 | 20/07 - 09/08 | Dashboard BGD, KĐH, KCCNBV MVP | Dashboard đọc summary API |
| GĐ5 | 10/08 - 23/08 | Nhập liệu/import/export Excel | Quy trình nhập và xuất báo cáo MVP |
| GĐ6 | 24/08 - 20/09 | Kiểm thử, đối chiếu Power BI, fix lỗi | Go-live nội bộ giai đoạn 1 |

Tổng: khoảng **16 tuần**.

---

## 3. Giai đoạn 0 - Backup và baseline

### Mục tiêu

Đảm bảo có thể quay lại trạng thái cũ nếu triển khai lỗi.

### Việc cần làm

- Ghi nhận container, port, image, branch hiện tại.
- Backup database.
- Backup storage.
- Backup `.env`.
- Kiểm tra endpoint health.
- Kiểm tra chat hiện tại.
- Tạo Git branch mới.

### Lệnh gợi ý

```bash
git status
git branch
git checkout -b feature/quality-dashboard-portal

docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'

curl -i http://localhost:8000/api/v1/health
curl -i http://localhost/api/v1/health
```

### Tiêu chí hoàn thành

- Có thư mục backup.
- Agent-AI hoạt động trước khi sửa.
- Có branch riêng.

---

## 4. Giai đoạn 1 - Portal shell và Agent-AI module

### Mục tiêu

Biến app hiện tại thành portal lớn nhưng giữ module chat.

### Việc cần làm

- Tạo layout portal.
- Tạo sidebar module.
- Tạo route `/ai-agent/chat`.
- Giữ route `/chat`.
- Tạo các route placeholder: dashboard, reports, etl, indicators, admin.
- Điều chỉnh CSS để chat không tràn layout.

### Đầu ra

```text
/
/ai-agent/chat
/chat
/dashboard
/indicators
/reports
/etl
/admin
```

### Tiêu chí hoàn thành

- Người dùng vào `/chat` vẫn dùng được.
- Người dùng vào `/ai-agent/chat` cũng dùng được.
- Portal hiển thị module mới.

---

## 5. Giai đoạn 2 - Database nghiệp vụ chỉ số

### Mục tiêu

Tạo nền dữ liệu cho chỉ số chất lượng mà không ảnh hưởng bảng RAG.

### Việc cần làm

- Tạo migration quality tables.
- Seed departments/stations/hospitals.
- Seed indicator catalog CS1-CS53.
- Seed variable catalog A/B/C/D/E.
- Tạo bảng raw/staging/fact/results.
- Tạo audit/data quality logs.

### Đầu ra

- Migration SQL hoặc Alembic.
- Seed script.
- Data dictionary bản đầu.

### Tiêu chí hoàn thành

- Bảng RAG không bị thay đổi ngoài ý muốn.
- Chạy migration thành công.
- Có thể query indicator catalog.

---

## 6. Giai đoạn 3 - Python ETL và Calculation Engine MVP

### Mục tiêu

Python bắt đầu thay phần DAX/Power BI bằng calculation engine.

### Phạm vi MVP

Tập trung nhóm chỉ số dễ và quan trọng trước:

```text
CS1 - Tổng số cuộc gọi
CS2 - Tỷ lệ cuộc gọi được tiếp nhận
CS3 - Tỷ lệ cuộc gọi có nội dung
CS4 - Tỷ lệ cuộc gọi có dấu hiệu cấp cứu
CS5 - Tỷ lệ trường hợp cấp cứu điều phối KCCNBV
CS15 - Tỷ lệ trường hợp xuất xe
CS16 - Tỷ lệ trường hợp có bệnh nhân
CS17 - Tỷ lệ trường hợp chuyển viện
CS22 - Trung bình thời gian kích hoạt cấp cứu
CS23 - Trung bình thời gian tiếp cận bệnh nhân
```

### Việc cần làm

- Tạo `data_engine`.
- Tạo DB connector.
- Tạo `safe_divide`.
- Tạo ETL mẫu cho callcenterdata và kccnbv.
- Tính biến A/B và chỉ số MVP.
- Ghi `quality_indicator_results`.
- Tạo log calculation.

### Tiêu chí hoàn thành

- Chạy script tính được chỉ số theo ngày.
- Kết quả lưu database.
- Có thể so sánh với Power BI bằng file export.

---

## 7. Giai đoạn 4 - Dashboard MVP

### Mục tiêu

Hiển thị dữ liệu từ calculation engine.

### Trang ưu tiên

1. `/dashboard/bgd`
2. `/dashboard/kdh`
3. `/dashboard/kccnbv`
4. `/dashboard/quality`

### Việc cần làm

- API summary.
- API trend.
- API compare by station/department.
- KPI cards.
- Line chart.
- Bar chart.
- Table chỉ số.
- Filter date/month/station.

### Tiêu chí hoàn thành

- Dashboard không phụ thuộc Power BI.
- Load dữ liệu từ PostgreSQL.
- Có trạng thái cảnh báo.

---

## 8. Giai đoạn 5 - Nhập liệu/import/export

### Mục tiêu

Cho người dùng đưa dữ liệu vào hệ thống mới.

### Việc cần làm

- Form nhập chỉ số thủ công.
- Import Excel.
- Preview và validate.
- Gửi duyệt.
- Duyệt/khóa kỳ.
- Export Excel tổng hợp.

### Tiêu chí hoàn thành

- Nhập dữ liệu không cần sửa DB trực tiếp.
- Import lỗi có log rõ ràng.
- Xuất Excel được theo ngày/tháng.

---

## 9. Giai đoạn 6 - Kiểm thử và nghiệm thu

### Mục tiêu

Đảm bảo hệ thống mới đúng, không ảnh hưởng cũ.

### Nhóm kiểm thử

| Nhóm | Nội dung |
|---|---|
| Regression Agent-AI | `/chat`, `/ai-agent/chat`, chat API, source citation |
| Data correctness | So sánh chỉ số Python với Power BI |
| Permission | User theo role chỉ xem đúng module |
| ETL | Lỗi nguồn, dữ liệu thiếu, trùng, sai kiểu |
| Dashboard | Filter, chart, tải trang, empty state |
| Export | Excel đúng số liệu |

### Tiêu chí nghiệm thu

- Agent-AI vẫn chạy.
- Dashboard MVP chạy.
- Chỉ số MVP khớp Power BI hoặc có giải thích chênh lệch.
- Có hướng dẫn vận hành.

---

## 10. Chiến lược go-live

### Khuyến nghị

Không tắt Power BI ngay. Chạy song song:

```text
Tuần 1-2 sau go-live: Web mới chạy thử nội bộ
Tuần 3-4: Đối chiếu số liệu với Power BI
Sau 1-2 kỳ báo cáo: Chốt nhóm dashboard nào thay thế Power BI
```

### Rollback

Nếu lỗi:

- Giữ Power BI là báo cáo chính.
- Tắt menu dashboard mới bằng permission/feature flag.
- Giữ Agent-AI không bị ảnh hưởng.

---

## 11. Phân công đề xuất

| Nhóm | Nhiệm vụ |
|---|---|
| Kỹ thuật web | Portal, frontend, API, dashboard |
| Kỹ thuật dữ liệu | ETL, calculation, đối chiếu Power BI |
| Nghiệp vụ | Xác nhận công thức, chỉ số, ngưỡng |
| Admin hệ thống | Backup, deploy, giám sát Docker |
| Người dùng thử | Test dashboard, nhập liệu, xuất báo cáo |
