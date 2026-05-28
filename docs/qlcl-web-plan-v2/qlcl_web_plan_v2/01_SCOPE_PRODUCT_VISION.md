# 01 - Scope & Product Vision V2

## 1. Tầm nhìn sản phẩm

Xây dựng một **Web quản lý chất lượng (QLCL Web)** dùng nội bộ cho Trung tâm Cấp cứu 115 TP.HCM. Hệ thống là nơi tập trung cho:

```text
Đăng nhập và phân quyền
→ Nhập liệu trực tiếp trên web
→ Upload Excel nội bộ
→ Validate và chuẩn hóa dữ liệu
→ Duyệt và khóa kỳ báo cáo
→ Tính toán chỉ số chất lượng
→ Dashboard theo vai trò/phạm vi
→ Xuất báo cáo
→ Audit và giám sát vận hành
→ Tích hợp Agent-AI sau cùng như module phụ
```

V2 xem QLCL Web là sản phẩm chính. Agent-AI chỉ là một module được đưa vào sau, không còn là ràng buộc ưu tiên trong MVP.

---

## 2. Mục tiêu kinh doanh

| Mã | Mục tiêu | Kết quả kỳ vọng |
|---|---|---|
| OBJ-01 | Tạo cổng QLCL Web nội bộ | Người dùng truy cập một web thống nhất |
| OBJ-02 | Có đăng nhập và phân quyền | Dữ liệu và chức năng theo đúng vai trò |
| OBJ-03 | Chuẩn hóa nhập liệu | Giảm phụ thuộc Google Sheet/Drive/Excel rời rạc |
| OBJ-04 | Quản lý workflow báo cáo | Có nháp, gửi duyệt, duyệt, khóa kỳ |
| OBJ-05 | Có audit log | Biết ai làm gì, lúc nào, trên dữ liệu nào |
| OBJ-06 | Tính toán chỉ số bằng Python | Dễ kiểm thử, audit, thay thế dần DAX/Power BI |
| OBJ-07 | Dashboard theo phạm vi | Ban giám đốc/khoa/trạm xem đúng dữ liệu |
| OBJ-08 | Xuất báo cáo | Excel/PDF phục vụ họp, báo cáo tháng/quý/năm |
| OBJ-09 | Tích hợp AI sau | Agent-AI dùng giao diện và permission của QLCL Web |

---

## 3. Module sản phẩm

| Module | Ưu tiên | Mô tả |
|---|---:|---|
| Auth/Login | Rất cao | Đăng nhập, session/token, `/login`, `/logout`, `/me` |
| Portal Shell | Rất cao | Layout chung, sidebar, topbar, route guard |
| RBAC/Admin | Rất cao | Role, permission, scope dữ liệu, admin cơ bản |
| Master Data | Cao | Khoa, trạm, bệnh viện, danh mục chỉ số, biến đầu vào |
| Manual Input | Cao | Nhập liệu trực tiếp trên web |
| Excel Import | Cao | Upload Excel/CSV, preview, validate, confirm |
| Review & Period Lock | Cao | Gửi duyệt, duyệt/từ chối, khóa/mở khóa kỳ |
| Calculation Engine | Cao | Python tính biến/chỉ số, ghi result |
| Dashboard | Cao | Dashboard BGD/KĐH/KCCNBV/QLCL |
| Export Reports | Trung bình | Excel trước, PDF/Word sau |
| Audit/Monitoring | Trung bình-cao | Log thao tác, log dữ liệu lỗi, calculation run |
| Agent-AI Module | Sau MVP | Tích hợp giao diện/permission, không ưu tiên phase đầu |

---

## 4. Vai trò người dùng nghiệp vụ

| Vai trò nghiệp vụ | Nhu cầu chính |
|---|---|
| Ban Giám đốc | Xem dashboard tổng quan, cảnh báo, tải báo cáo |
| Lãnh đạo khoa/phòng | Xem và duyệt dữ liệu thuộc phạm vi quản lý |
| Nhân sự nhập liệu | Nhập dữ liệu, upload file, sửa nháp, gửi duyệt |
| Nhân sự QLCL | Quản lý chỉ số, review số liệu, khóa kỳ, đối chiếu |
| Nhân sự ETL/dữ liệu | Chạy calculation, kiểm log lỗi, backfill |
| Admin hệ thống | Quản lý user, role, permission, scope, cấu hình |
| Auditor | Xem audit log, dữ liệu đã khóa, lịch sử thay đổi |
| Người dùng Agent-AI | Dùng trợ lý AI sau khi module được tích hợp |

---

## 5. Phạm vi MVP

### Must-have MVP

- Trang `/login` hoặc cơ chế đăng nhập rõ ràng.
- Portal shell có protected routes.
- RBAC cơ bản với role/permission/scope.
- Master data tối thiểu: khoa, trạm, bệnh viện, indicator catalog, variables.
- Nhập liệu thủ công: tạo batch, nhập record, lưu nháp, gửi duyệt.
- Upload Excel/CSV: private storage, parse, preview, validate, cancel/confirm.
- Review workflow: approve/reject batch.
- Period lock: khóa kỳ, chặn sửa dữ liệu đã khóa.
- Calculation run skeleton và tính nhóm chỉ số MVP.
- Dashboard MVP đọc từ `quality_indicator_results`, không đọc raw/import trực tiếp.
- Audit log cho hành động thay đổi dữ liệu.

### Should-have MVP+

- Dashboard theo khoa/trạm.
- Export Excel theo kỳ.
- Data quality log UI.
- Admin role/permission UI hoàn chỉnh.
- Calculation rerun theo quyền.

### Could-have sau MVP

- PDF/Word report theo template hành chính.
- AI giải thích biến động dashboard.
- Tích hợp Agent-AI vào portal.
- Gợi ý cải tiến chất lượng tự động.
- SSO.

### Won't-have phase đầu

- Rebuild Agent-AI.
- Kubernetes.
- Multi-server phức tạp.
- Tính đủ 53 chỉ số ngay từ lượt đầu.
- Xóa Power BI/Dagster ngay lập tức.

---

## 6. Định hướng Agent-AI trong V2

Agent-AI được chuyển thành **Phase 10 - Later integration**.

Nguyên tắc:

- Không dùng Agent-AI làm điều kiện hoàn thành MVP QLCL Web.
- Khi tích hợp, Agent-AI phải dùng layout, login và permission của QLCL Web.
- Permission chính: `ai_agent:use`.
- Route đề xuất: `/ai-agent` và `/ai-agent/chat`.
- Người không có `ai_agent:use` không thấy menu AI và không gọi được API AI.
- Không cần đổi RAG/embedding/LLM ở phase tích hợp đầu tiên, trừ khi có yêu cầu riêng.

---

## 7. Tiêu chí thành công cấp sản phẩm

| Nhóm | Tiêu chí |
|---|---|
| Auth | User chưa đăng nhập không vào được route nội bộ |
| RBAC | Backend từ chối request không có permission/scope |
| Input | Người nhập tạo nháp và gửi duyệt được |
| Import | Upload Excel có preview, dòng lỗi rõ ràng |
| Review | Manager/QLCL duyệt/từ chối theo quyền được |
| Lock | Dữ liệu kỳ đã khóa không bị sửa trái phép |
| Calculation | Tính được nhóm chỉ số MVP và ghi result |
| Dashboard | Dashboard đọc result/summary đã tính sẵn |
| Audit | Tác vụ quan trọng có audit log |
| Operate | Có backup, rollback, runbook |
