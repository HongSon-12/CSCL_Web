# BRD - Business Requirements Document
## Dự án: Web quản lý chỉ số chất lượng tích hợp Agent-AI

**Phiên bản:** 1.0  
**Ngày lập:** 27/05/2026  
**Môi trường mục tiêu:** Máy chủ ảo Debian hiện có, Docker Compose, PostgreSQL, Python ETL, Next.js/React, FastAPI hiện hữu cho Agent-AI  
**Định hướng:** Agent-AI hiện tại trở thành module phụ trong web lớn quản lý chỉ số chất lượng

---

## 1. Tóm tắt dự án

Dự án nhằm mở rộng máy chủ Debian đang chạy hệ thống Agent-AI/RAG nội bộ thành một nền tảng web lớn phục vụ quản lý chỉ số chất lượng của Trung tâm Cấp cứu 115 TP.HCM.

Hệ thống mới không chỉ hiển thị dashboard mà còn quản lý toàn bộ vòng đời dữ liệu:

```text
Nguồn dữ liệu
→ ETL Python
→ PostgreSQL
→ Calculation Engine Python
→ Dashboard Web
→ Xuất báo cáo
→ Agent-AI hỗ trợ tra cứu, giải thích dữ liệu, tài liệu và quy trình
```

Agent-AI hiện có không bị xóa bỏ. Module này được đưa vào cấu trúc web mới như một nhánh chức năng:

```text
/ai-agent
```

hoặc giữ tương thích đường dẫn cũ:

```text
/chat → redirect hoặc alias sang /ai-agent/chat
```

---

## 2. Bối cảnh hiện tại

### 2.1 Hệ thống Agent-AI hiện có

Máy chủ đang chạy một hệ thống chatbot nội bộ sử dụng RAG trên tài liệu. Kiến trúc hiện có gồm:

- Backend FastAPI/Python.
- Frontend Next.js/React/TypeScript.
- PostgreSQL 16 + pgvector.
- Docker Compose.
- Nginx reverse proxy.
- Local storage.
- Worker xử lý indexing/background jobs.
- Embedding local 1024 chiều.
- Gemini LLM với fallback.

### 2.2 Hệ thống dashboard hiện tại

Hệ thống dashboard chỉ số chất lượng hiện đang dựa nhiều vào Power BI. Đã có hồ sơ thiết kế ban đầu về:

- Python ETL.
- PostgreSQL.
- Dagster quản lý ETL.
- Nguồn dữ liệu từ API, Google Drive, Excel, Google Sheet.
- 53 chỉ số chất lượng.
- Các bảng dữ liệu chính: `callcenterdata`, `handlebyarea`, `kccnbv`, `chi_so`, `suco`, `receiving_hospital`, `tranfer_satellite`.

### 2.3 Vấn đề cần giải quyết

| Vấn đề | Tác động |
|---|---|
| Power BI tiện nhưng chia sẻ cho người không có tài khoản còn bất tiện | Khó phổ biến dữ liệu rộng rãi |
| Publish dashboard public có rủi ro kiểm soát truy cập | Dữ liệu nhạy cảm có thể bị xem ngoài phạm vi |
| Công thức DAX nằm trong Power BI | Khó kiểm soát, khó kiểm thử và khó tái sử dụng |
| Chưa có web nhập liệu/quy trình duyệt/khóa số liệu đầy đủ | Dữ liệu dễ phân tán và thiếu chuẩn hóa |
| Agent-AI đang là app riêng | Chưa gắn với hệ sinh thái quản lý chất lượng |

---

## 3. Mục tiêu kinh doanh

| Mã | Mục tiêu | Kết quả kỳ vọng |
|---|---|---|
| OBJ-01 | Tạo web quản lý chỉ số chất lượng tập trung | Một cổng web duy nhất thay dần các dashboard rời rạc |
| OBJ-02 | Không làm gián đoạn Agent-AI hiện tại | Chatbot vẫn hoạt động trong quá trình mở rộng |
| OBJ-03 | Chuyển logic tính toán từ Power BI/DAX sang Python | Công thức có thể kiểm thử, audit, chạy tự động |
| OBJ-04 | Cho phép nhập liệu và import dữ liệu báo cáo | Giảm phụ thuộc Excel thủ công |
| OBJ-05 | Hiển thị dashboard theo khoa/phòng/vai trò | BGD, KĐH, KCCNBV, chỉ số chất lượng |
| OBJ-06 | Xuất báo cáo Excel/PDF/Word theo kỳ | Phục vụ họp giao ban, báo cáo tháng/quý/năm |
| OBJ-07 | Tích hợp Agent-AI vào web lớn | Người dùng hỏi đáp tài liệu và sau này hỏi đáp dữ liệu/chỉ số |
| OBJ-08 | Bảo vệ dữ liệu và phân quyền truy cập | Không để public nhầm dữ liệu nội bộ |

---

## 4. Phạm vi dự án

### 4.1 Trong phạm vi giai đoạn 1

- Giữ hệ thống Agent-AI hiện tại hoạt động.
- Tái cấu trúc giao diện thành portal lớn.
- Thêm module Dashboard chỉ số chất lượng.
- Thêm module nhập liệu/import dữ liệu.
- Thêm module danh mục chỉ số CS1-CS53.
- Thêm module Python ETL/Calculation Engine.
- Tạo các bảng PostgreSQL nghiệp vụ chỉ số tách biệt với bảng RAG.
- Tạo API dashboard đọc từ bảng kết quả đã tính sẵn.
- Tạo phân quyền module cơ bản.
- Tạo note triển khai cho Codex.

### 4.2 Ngoài phạm vi giai đoạn 1

- Bỏ Power BI ngay lập tức.
- Tích hợp SSO phức tạp.
- Chạy local LLM production thay Gemini.
- Tự động sinh phân tích AI nâng cao từ dữ liệu dashboard.
- Rebuild toàn bộ RAG/Agent-AI nếu không cần.
- Kubernetes hoặc tách microservice phức tạp.

---

## 5. Người dùng và vai trò

| Vai trò | Nhu cầu chính |
|---|---|
| Ban Giám đốc | Xem dashboard tổng quan, cảnh báo chỉ số, tải báo cáo |
| Lãnh đạo Khoa Điều hành | Xem số liệu tiếp nhận, điều phối, cuộc gọi, hiệu suất tổng đài |
| Lãnh đạo KCCNBV | Xem số ca cấp cứu, thời gian xử lý, trạm, chuyển viện, tử vong |
| Nhân sự nhập liệu | Nhập/chỉnh sửa dữ liệu chưa khóa, import file |
| Nhân sự quản lý chất lượng | Quản lý bộ chỉ số, đối chiếu, xuất báo cáo |
| Admin hệ thống | Quản lý user, role, cấu hình, vận hành job |
| Người dùng Agent-AI | Hỏi đáp tài liệu, quy trình, hướng dẫn nội bộ |

---

## 6. Nguyên tắc kinh doanh quan trọng

### 6.1 Không phá vỡ Agent-AI hiện có

Agent-AI hiện đang có giá trị sử dụng riêng. Do đó:

- Không đổi route `/chat` nếu chưa có alias/redirect an toàn.
- Không đổi bảng RAG nếu không cần.
- Không đổi embedding model hoặc RAG pipeline trong phase dashboard.
- Không đổi LLM provider khi đang triển khai module chỉ số.

### 6.2 Web lớn là portal chính

Mục tiêu cuối cùng:

```text
/                  → Trang tổng quan/cổng chính
/dashboard         → Dashboard quản lý chất lượng
/dashboard/bgd     → Ban Giám đốc
/dashboard/kdh     → Khoa Điều hành
/dashboard/kccnbv  → Khoa Cấp cứu ngoài bệnh viện
/indicators        → Danh mục và kết quả chỉ số
/reports           → Xuất báo cáo
/etl               → Theo dõi job ETL
/ai-agent          → Agent-AI/RAG hiện tại
/admin             → Quản trị hệ thống
```

### 6.3 Python là lõi dữ liệu

Python phụ trách:

- ETL.
- Chuẩn hóa dữ liệu.
- Deduplicate.
- Tính biến A/B/C/D/E.
- Tính CS1-CS53.
- Đối chiếu với Power BI.
- Export nâng cao nếu cần.

### 6.4 JavaScript/TypeScript là lớp ứng dụng

JavaScript/TypeScript phụ trách:

- Layout web.
- Dashboard.
- Form nhập liệu.
- Quản trị người dùng.
- Điều hướng module.
- Hiển thị dữ liệu từ API.

---

## 7. Thành công dự án

| Nhóm | Chỉ số thành công |
|---|---|
| Vận hành | Agent-AI vẫn dùng được sau khi thêm module mới |
| Dữ liệu | Tính được tối thiểu nhóm chỉ số MVP khớp Power BI |
| Dashboard | Có dashboard BGD, KĐH, KCCNBV bản đầu |
| Nhập liệu | Có thể nhập/import ít nhất dữ liệu chỉ số thủ công |
| Bảo mật | Người dùng chỉ thấy module/dữ liệu theo quyền |
| Hiệu năng | Dashboard đọc bảng summary tải nhanh, không tính nặng trên UI |
| Quản trị | Có log ETL, log thay đổi dữ liệu, log lỗi calculation |

---

## 8. Rủi ro và biện pháp kiểm soát

| Rủi ro | Ảnh hưởng | Kiểm soát |
|---|---|---|
| Đụng logic Agent-AI hiện tại | Chatbot lỗi khi triển khai dashboard | Tách route, tách module, không sửa RAG nếu không cần |
| Trùng port/container | Service không chạy | Giữ Docker Compose là nguồn chạy chính, kiểm tra port |
| Lẫn schema RAG và schema chỉ số | Khó bảo trì, lỗi migration | Tạo bảng nghiệp vụ có prefix/module rõ ràng |
| DAX chuyển sang Python sai | Dashboard lệch Power BI | Đối chiếu từng chỉ số, chạy song song 1-2 kỳ |
| ETL lỗi làm dashboard sai | Số liệu không tin cậy | Staging table, data quality log, job status |
| Dữ liệu nhạy cảm bị public | Rủi ro bảo mật | RBAC, route guard, tách public/internal |

---

## 9. Kết luận BRD

Dự án nên triển khai theo hướng mở rộng hệ thống hiện có, không viết lại toàn bộ. Agent-AI trở thành một module phụ trong web lớn. Phần dashboard/chỉ số được xây mới bằng module tách biệt, sử dụng Python cho ETL và tính toán, JavaScript/TypeScript cho giao diện và API ứng dụng.
