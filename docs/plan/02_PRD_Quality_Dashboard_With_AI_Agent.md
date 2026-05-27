# PRD - Product Requirements Document
## Dự án: Web quản lý chỉ số chất lượng tích hợp Agent-AI

**Phiên bản:** 1.0  
**Ngày lập:** 27/05/2026  
**Mục tiêu:** Xác định yêu cầu sản phẩm, module, lộ trình MVP và trải nghiệm người dùng

---

## 1. Tầm nhìn sản phẩm

Sản phẩm là một cổng web thống nhất phục vụ quản lý chỉ số chất lượng, dashboard điều hành, nhập liệu báo cáo, xuất báo cáo và tra cứu tài liệu bằng Agent-AI.

Định hướng sản phẩm:

```text
Một cổng web duy nhất
→ Quản lý dữ liệu
→ Tính toán chỉ số
→ Theo dõi dashboard
→ Xuất báo cáo
→ Hỏi đáp tài liệu/quy trình bằng Agent-AI
```

---

## 2. Kiến trúc sản phẩm mức cao

```text
Browser
  ↓
Nginx
  ↓
Next.js Frontend Portal
  ├── Dashboard Module
  ├── Report Input Module
  ├── Indicator Module
  ├── ETL Monitoring Module
  ├── Admin Module
  └── AI-Agent Module
        ↓
Backend APIs
  ├── Existing FastAPI AI/RAG APIs
  ├── Quality Dashboard APIs
  ├── ETL Job APIs
  └── Reporting APIs
        ↓
PostgreSQL
  ├── RAG schema/tables hiện tại
  └── Quality dashboard schema/tables mới
        ↓
Python Workers
  ├── Existing RAG indexing worker
  ├── ETL worker
  └── Calculation worker
```

---

## 3. Module sản phẩm

## 3.1 Portal Shell

### Mục tiêu

Tạo giao diện web lớn có sidebar/topbar để truy cập các module.

### Chức năng

- Trang chủ/cổng chính.
- Sidebar điều hướng.
- Topbar hiển thị user, role, trạng thái hệ thống.
- Module cards.
- Responsive cơ bản.
- Theme đồng bộ cho dashboard và Agent-AI.

### Route đề xuất

```text
/
/dashboard
/indicators
/reports
/etl
/ai-agent
/admin
```

### Acceptance criteria

- Vào `/` thấy trang tổng quan hệ thống.
- Truy cập được Agent-AI từ menu.
- Không làm mất route cũ `/chat`.
- Giao diện Agent-AI có thể được bọc trong layout mới.

---

## 3.2 AI-Agent Module

### Mục tiêu

Giữ lại chatbot/RAG hiện có, đưa vào portal lớn.

### Chức năng giữ nguyên

- Chat hỏi đáp tài liệu.
- Nguồn tham khảo.
- Tài liệu liên quan.
- Feedback.
- Lịch sử hội thoại nếu đã có.
- Auth/token hiện tại.

### Cải tiến UI cho phù hợp portal

- Đổi tên module thành “Trợ lý AI”.
- Route mới: `/ai-agent/chat`.
- Route cũ `/chat` vẫn hoạt động hoặc redirect.
- Sidebar bên trái của chat không xung đột với sidebar portal.

### Không làm trong phase đầu

- Không đổi RAG retrieval.
- Không đổi embedding.
- Không đổi LLM provider.
- Không re-index tài liệu trừ khi có yêu cầu riêng.

---

## 3.3 Dashboard Module

### Mục tiêu

Thay dần dashboard Power BI bằng dashboard web đọc dữ liệu từ PostgreSQL.

### Trang dashboard

| Route | Người dùng chính | Nội dung |
|---|---|---|
| `/dashboard/bgd` | Ban Giám đốc | Tổng quan hoạt động, cảnh báo, chỉ số chính |
| `/dashboard/kdh` | Khoa Điều hành | Cuộc gọi, tiếp nhận, điều phối, chuyển trạm |
| `/dashboard/kccnbv` | KCCNBV | Ca cấp cứu, thời gian xử lý, trạm, chuyển viện |
| `/dashboard/quality` | Quản lý chất lượng | CS1-CS53, xu hướng, đạt/không đạt |

### Loại biểu đồ MVP

- KPI Card.
- Line chart theo ngày/tháng.
- Bar chart theo trạm/khoa.
- Pie/donut cho cơ cấu.
- Table chỉ số.
- Badge cảnh báo vượt ngưỡng.

### Acceptance criteria

- Dashboard không tính nặng trực tiếp từ raw table trên frontend.
- API trả dữ liệu đã tổng hợp.
- Có bộ lọc ngày/tháng/khoa/trạm.
- Có trạng thái loading/error/empty.

---

## 3.4 Report Input Module

### Mục tiêu

Cho phép nhập liệu thủ công hoặc import dữ liệu phục vụ các chỉ số không tự động lấy được.

### Chức năng

- Form nhập dữ liệu chỉ số thủ công.
- Import Excel/CSV.
- Lưu nháp.
- Gửi duyệt.
- Duyệt/khóa kỳ báo cáo.
- Xem lịch sử chỉnh sửa.

### Route đề xuất

```text
/reports/input
/reports/import
/reports/review
/reports/locked-periods
```

### Workflow

```text
Nhập liệu/import
→ Lưu nháp
→ Kiểm tra validate
→ Gửi duyệt
→ Duyệt
→ Khóa kỳ
→ Python calculation chạy lại
→ Dashboard cập nhật
```

---

## 3.5 Indicator Module

### Mục tiêu

Quản lý danh mục 53 chỉ số, công thức, biến đầu vào, kết quả tính toán.

### Chức năng

- Danh sách CS1-CS53.
- Xem công thức nghiệp vụ.
- Xem công thức Python mapping.
- Xem biến A/B/C/D/E liên quan.
- Xem kết quả theo kỳ.
- Cấu hình ngưỡng cảnh báo.

### Route đề xuất

```text
/indicators
/indicators/catalog
/indicators/results
/indicators/thresholds
/indicators/mapping
```

---

## 3.6 ETL Monitoring Module

### Mục tiêu

Theo dõi pipeline lấy dữ liệu, làm sạch, tính toán.

### Chức năng

- Danh sách job ETL.
- Job status: pending/running/success/failed.
- Log lỗi.
- Thời điểm chạy gần nhất.
- Nút chạy lại job theo quyền.
- Chất lượng dữ liệu: dòng lỗi, dòng trùng, dòng thiếu.

### Route đề xuất

```text
/etl/jobs
/etl/logs
/etl/data-quality
/etl/run-history
```

---

## 3.7 Admin Module

### Mục tiêu

Quản trị user, role, phân quyền theo module.

### Chức năng

- User list.
- Role list.
- Permission matrix.
- Module access.
- Audit logs.
- System settings.

### Role đề xuất

| Role | Quyền |
|---|---|
| `system_admin` | Toàn quyền |
| `quality_admin` | Quản trị chỉ số, kỳ báo cáo, ngưỡng |
| `department_manager` | Xem/duyệt dữ liệu đơn vị |
| `data_entry` | Nhập/sửa dữ liệu chưa khóa |
| `dashboard_viewer` | Xem dashboard theo quyền |
| `ai_agent_user` | Dùng Agent-AI |

---

## 4. Product roadmap

## Phase 0 - Baseline an toàn

### Mục tiêu

Đóng băng trạng thái Agent-AI đang chạy và tạo nhánh phát triển mới.

### Đầu ra

- Backup database + storage + `.env`.
- Ghi nhận port/container hiện tại.
- Tạo branch Git mới.
- Tạo route alias `/ai-agent` không phá `/chat`.

---

## Phase 1 - Portal shell

### Mục tiêu

Tạo khung web lớn, đưa Agent-AI vào module phụ.

### Đầu ra

- Layout portal.
- Sidebar module.
- Dashboard placeholder.
- `/ai-agent/chat` chạy được.
- `/chat` vẫn hoạt động.

---

## Phase 2 - Database nghiệp vụ chỉ số

### Mục tiêu

Tạo schema riêng cho dữ liệu chỉ số.

### Đầu ra

- Bảng danh mục khoa/trạm/bệnh viện.
- Bảng raw/staging/fact/result.
- Bảng indicator catalog.
- Không đụng bảng `documents`, `document_chunks`, `document_embeddings` nếu không cần.

---

## Phase 3 - Python ETL & Calculation Engine

### Mục tiêu

Bổ sung worker hoặc service Python tính toán dữ liệu chỉ số.

### Đầu ra

- ETL job mẫu.
- Calculation job mẫu.
- Tính được nhóm chỉ số đầu tiên.
- Ghi kết quả vào `quality_indicator_results`.

---

## Phase 4 - Dashboard MVP

### Mục tiêu

Xây dashboard BGD, KĐH, KCCNBV bản đầu.

### Đầu ra

- API summary.
- Biểu đồ KPI/line/bar/table.
- Bộ lọc ngày/tháng/trạm/khoa.

---

## Phase 5 - Nhập liệu và xuất báo cáo

### Mục tiêu

Cho phép nhập chỉ số thủ công, import, duyệt, khóa kỳ, xuất báo cáo.

### Đầu ra

- Form nhập liệu.
- Import Excel.
- Review/approve.
- Export Excel/PDF.

---

## 5. MVP ưu tiên

### Must-have

- Portal shell.
- Agent-AI module hoạt động.
- Dashboard placeholder + dashboard BGD MVP.
- Database schema chỉ số tách riêng.
- Indicator catalog CS1-CS53.
- Python calculation cho 10-20 chỉ số quan trọng đầu tiên.
- API dashboard summary.
- RBAC module-level.

### Should-have

- ETL monitoring.
- Import Excel.
- Data quality log.
- Export Excel.
- Dashboard KĐH/KCCNBV.

### Could-have

- PDF report đẹp.
- AI giải thích biến động dashboard.
- Gợi ý cải tiến chất lượng tự động.

### Won't-have phase đầu

- SSO.
- Kubernetes.
- MinIO.
- Tách nhiều server.
- Rebuild RAG toàn bộ.

---

## 6. Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
|---|---|
| An toàn triển khai | Không làm chết Agent-AI hiện tại |
| Hiệu năng | Dashboard đọc summary, không query raw lớn trực tiếp |
| Bảo mật | Permission enforce backend |
| Dữ liệu | Có staging, validate, audit log |
| Vận hành | Docker Compose là nguồn chạy chính |
| Backup | Backup trước mỗi migration lớn |
| Tương thích | Giữ `/chat` hoặc redirect an toàn |

---

## 7. Kết luận PRD

Sản phẩm cần phát triển theo hướng mở rộng portal, không thay thế đột ngột. Agent-AI là module phụ nhưng vẫn giữ năng lực RAG hiện có. Dashboard/chỉ số được xây mới theo module riêng, ưu tiên dữ liệu chuẩn và calculation engine trước khi làm biểu đồ phức tạp.
