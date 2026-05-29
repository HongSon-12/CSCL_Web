# Thống Nhất Nghiệp Vụ & Quy Chuẩn Tính Toán (Phase 1 tới Phase 6)

Tài liệu này ghi nhận toàn bộ các nguyên tắc nghiệp vụ và thiết kế kỹ thuật đã được thống nhất giữa Người dùng và Antigravity AI thông qua quy trình thảo luận chuyên sâu `/grill-me`. Đây là cơ sở để thực thi điều chỉnh toàn diện hệ thống QLCL Web.

---

## 1. Phân Phối Luồng Nhập Liệu Đầu Vào

Hệ thống điều chỉnh cấu trúc dữ liệu đầu vào của QLCL Web để phản ánh chính xác nguồn gốc và tính chất dữ liệu thực tế:

### A. Excel Import (Dành riêng cho dữ liệu chi tiết Cấp cứu ngoài bệnh viện)
*   **Bảng dữ liệu đích**: `public.kccnbv` (SQLAlchemy model: `QualityKccnbv`).
*   **Cấu trúc dữ liệu**: Gồm **41 cột thô** nguyên bản từ file Excel (tương ứng `a1` đến `a41`), sau khi loại bỏ 3 dòng tiêu đề đầu tiên.
*   **Quy trình nghiệp vụ**:
    1.  Người dùng tải lên file Excel tại trang `/reports/import`.
    2.  Hệ thống chẩn đoán lỗi mốc thời gian/ngày tháng và kiểm tra tính hợp lệ.
    3.  Hiển thị bảng **Preview** chi tiết (các dòng lỗi được tô đỏ và cảnh báo chi tiết mã lỗi).
    4.  Khi người dùng bấm **Xác nhận nộp (Confirm)**:
        *   Áp dụng thuật toán **Ẩn danh hóa họ tên bệnh nhân (Anonymization)**: Viết tắt chữ cái đầu không dấu (ví dụ: `Nguyễn Văn Á` $\rightarrow$ `NVA`, `Lâm Thị Ngọc Bích` $\rightarrow$ `LTNB`).
        *   Ghi đè/Upsert dữ liệu sạch vào bảng `kccnbv` trong database (Bảo toàn tính khả trùng - Idempotency dựa trên khóa chính `so_benh_an`).
        *   Kích hoạt động cơ tính toán lâm sàng tự động chạy ngầm cập nhật các chỉ số từ `CS11` đến `CS26`.

### B. Web Form Nhập liệu (Dành riêng cho Chỉ số chất lượng Khoa/Phòng)
*   **Bảng dữ liệu đích**: `public.chi_so` (SQLAlchemy model: `QualityChiSo`).
*   **Cấu trúc dữ liệu**: Gồm các cột thông tin chung (`time`, `by`, `phone`, `datereport`, `room`) và các chỉ số chất lượng khoa phòng từ **`cs24` đến `cs53`** (và các biến thể hậu tố trạm vệ tinh như `cs24q8`, `cs24cg`, v.v.).
*   **Quy trình nghiệp vụ**:
    1.  Danh mục các chỉ số khoa phòng từ `cs24` đến `cs53` được khai báo trong bảng danh mục biến số của DB (`QUALITY_VARIABLES` với `source_type = 'manual'`).
    2.  Khi người dùng truy cập trang Nhập liệu thủ công trên Web (`/reports/input`), hệ thống sẽ **tải động danh mục** này từ database và tự động render thành form nhập liệu tương ứng kèm nhãn tiếng Việt chuẩn.
    3.  Khi đợt nhập liệu được **Phê duyệt (Approve)**:
        *   Hệ thống tự động tổng hợp dòng dữ liệu này và ghi đè/Upsert vào bảng `chi_so` (`public.chi_so`).

---

## 2. Quy Chuẩn Động Cơ Tính Toán Chỉ Số Tự Động (Phase 6)

Động cơ tính toán Python ETL chạy ngầm sẽ tự động tổng hợp dữ liệu thô trong database để tính toán 53 chỉ số:

### A. Chỉ số Điều hành `CS1` đến `CS10` (Tính từ dữ liệu cuộc gọi điều hành)
*   **Nguồn dữ liệu**: Bảng cuộc gọi `callcenterdata` và bảng điều phối địa bàn `handlebyarea` (được đồng bộ từ Directus API).
*   **Nguyên tắc tính toán**:
    *   `CS1` (Tổng số cuộc gọi): `SUM(totalcalls)`.
    *   `CS2` (Tỷ lệ tiếp nhận cuộc gọi): `(SUM(callsreceived) / SUM(totalcalls)) * 100`.
    *   `CS3` (Tỷ lệ cuộc gọi có nội dung): `(SUM(callswithcontent) / SUM(callsreceived)) * 100`.
    *   `CS4` (Tỷ lệ cuộc gọi có dấu hiệu cấp cứu): `(SUM(callswithemergencysignstotal) / SUM(callswithcontent)) * 100`.
    *   `CS5` (Tỷ lệ cấp cứu điều phối trạm vệ tinh): `(SUM(receivedbysatellite) / SUM(transfertosatellite)) * 100`.
    *   *Sử dụng hàm chia an toàn `safe_divide()` phòng tránh lỗi chia cho 0.*

### B. Chỉ số Lâm sàng `CS11` đến `CS26` (Tính từ dữ liệu chi tiết chuyến xe cấp cứu)
*   **Nguồn dữ liệu**: Bảng chi tiết chuyến xe cấp cứu ngoài bệnh viện `kccnbv` (import từ Excel).
*   **Nguyên tắc tính toán**:
    *   `CS11`: Thời gian tiếp nhận tạo phiếu trung bình (`AVERAGE(Tgtaophieu)`).
    *   `CS15`: Tỷ lệ trường hợp xuất xe = `B1_BB / A7_BB`.
    *   `CS16`: Tỷ lệ trường hợp có bệnh nhân = `DIVIDE(2B, 3B, 0)` (loại trừ các ca ngắt giữa chừng/tự túc, giới hạn tối đa là 1.0).
    *   `CS17`: Tỷ lệ trường hợp chuyển viện = `4B / 2B`.
    *   `CS18`: Tỷ lệ hồi sinh tim phổi thành công = `6B / 7B` (Trường hợp ngưng tim và có xử trí).
    *   `CS19`: Tổng số ca tử vong = `8B + 9B` (Ngưng tim lập biên bản tử vong).
    *   `CS22` đến `CS26`: Các chỉ số trung bình thời lượng kích hoạt, di chuyển, bàn giao bệnh, v.v.

---

## 3. Giao Diện Bảng Chỉ Số Toàn Diện (`/indicators`)

Trang danh mục chỉ số tại route `/indicators` (tương ứng `app/indicators/page.tsx`) được xây dựng chuyên nghiệp:
*   **Nội dung**: Hiển thị lưới các thẻ chỉ số (Index Cards) hoặc bảng phân trang thể hiện đầy đủ giá trị thực tế của cả **53 chỉ số (CS1 đến CS53)**.
*   **Trải nghiệm người dùng (UX Tooltip)**: Tích hợp **Chakra UI Tooltip** xuất hiện mượt mà khi di chuột (hover) vào tiêu đề của từng chỉ số, hiển thị chi tiết **công thức toán học và logic tính toán** tương ứng (ví dụ: đối với CS2, hiển thị: *"Công thức: (Tổng số cuộc gọi tiếp nhận A2 / Tổng số cuộc gọi A1) * 100"*).
