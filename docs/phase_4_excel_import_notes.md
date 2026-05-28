# Tài Liệu Tích Hợp - Phase 4: Excel/CSV Import, Preview & Validation (QLCL Web Portal)

Tài liệu này ghi nhận chi tiết kiến trúc, cơ chế tải lên, phân tích cú pháp, xác thực quy luật nghiệp vụ và lưu trữ chính thức từ tệp tin Excel/CSV được phát triển cho **Phase 4: Nhập số liệu tự động**.

---

## 1. Vị Trí Các File Đã Xây Dựng & Các Chú Thích (Code Annotations)

Để bạn dễ dàng đọc hiểu và tùy chỉnh quy luật nghiệp vụ khi thay đổi cấu trúc file Excel, tôi đã gán **chú thích chi tiết bằng tiếng Việt** trực tiếp vào các file mã nguồn sau:

1. **Database Models:** [backend/models.py](file:///home/sonnguyen/CSCL_Web/CSCL_Web/apps/agent-ai/backend/models.py#L423-L468)
   * Chú thích bảng metadata `quality_import_batches` (quản lý đợt upload, mã SHA256 chống trùng lặp, thống kê dòng lỗi) và bảng staging `quality_import_rows` (lưu đệm dòng Excel thô phục vụ preview).
2. **API Backend:** [backend/main.py](file:///home/sonnguyen/CSCL_Web/CSCL_Web/apps/agent-ai/backend/main.py#L1027-L1735)
   * Giải thích logic xử lý 5 endpoint phục vụ import: đọc tệp tin bằng `pandas`/`openpyxl`, kiểm tra phân quyền và khóa sổ, validate luật nghiệp vụ lâm sàng trên từng dòng (required, min/max, khoa phòng tồn tại), gom nhóm dữ liệu tự động theo Khoa + Ngày và phân bổ về các lô chính thức.
3. **Giao Diện Nhập Excel:** [frontend/app/reports/import/page.tsx](file:///home/sonnguyen/CSCL_Web/CSCL_Web/apps/agent-ai/frontend/app/reports/import/page.tsx)
   * Chú thích State quản lý tải tệp kéo thả, bảng preview các dòng thô được highlight màu đỏ nhạt trực quan kèm Tooltip mô tả lỗi tiếng Việt cụ thể, cơ chế vô hiệu hóa nút "Xác nhận nạp" nếu phát hiện lỗi nghiệp vụ nghiêm trọng.

---

## 2. Thiết Kế Cơ Sở Dữ Liệu Staging Area (Database Models)

Để tránh nạp rác vào cơ sở dữ liệu chính thức, Phase 4 thiết kế kiến trúc qua một vùng đệm (Staging area):

### A. Bảng Quản Lý Đợt Import (`quality_import_batches`)
* Lưu trữ metadata của tệp Excel được tải lên.
```python
class QualityImportBatch(Base):
    __tablename__ = "quality_import_batches"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    batch_code = Column(Text, unique=True, nullable=False)      # Mã đợt (Ví dụ: IMP-YYYYMMDD-XXXX)
    file_name = Column(Text, nullable=False)                    # Tên tệp tin gốc
    file_path = Column(Text, nullable=False)                    # Đường dẫn private lưu trữ tệp vật lý
    file_hash = Column(Text, nullable=False)                    # Mã SHA256 chống tải trùng lặp tệp
    status = Column(Text, default="uploaded")                   # uploaded / validated / confirmed / cancelled
    total_rows = Column(Integer, default=0)                     # Tổng số dòng dữ liệu
    valid_rows = Column(Integer, default=0)                     # Số dòng hợp lệ
    warning_rows = Column(Integer, default=0)                   # Số dòng có cảnh báo nhẹ
    error_rows = Column(Integer, default=0)                     # Số dòng bị lỗi nghiêm trọng (chặn nạp)
    created_by = Column(Text, nullable=False)                   # Tài khoản upload
    created_at = Column(DateTime, default=datetime.utcnow)      # Thời điểm upload
```

### B. Bảng Lưu Trữ Dòng Đệm Excel (`quality_import_rows`)
* Lưu trữ tạm thời từng dòng đã phân tách trước khi xác nhận lưu chính thức.
```python
class QualityImportRow(Base):
    __tablename__ = "quality_import_rows"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    import_batch_id = Column(BigInteger, ForeignKey("quality_import_batches.id", ondelete="CASCADE"), nullable=False)
    row_index = Column(Integer, nullable=False)                 # Số thứ tự dòng trong file Excel gốc
    raw_payload = Column(JSONB, nullable=False)                 # Bản lưu thô nguyên bản JSON
    normalized_payload = Column(JSONB)                          # Bản chuẩn hóa dữ liệu chỉ số
    row_status = Column(Text, default="valid")                  # valid / warning / error
    error_message = Column(Text)                                # Mô tả chi tiết lỗi phát sinh
```

---

## 3. Quy Trình Xác Thực & Gom Nhóm Tự Động (API Backend)

### 3.1 Giai đoạn Upload & Phân tích cú pháp (`POST /api/v1/quality/import/upload`)
* Backend tiếp nhận file Excel, tính toán SHA256 để chống upload trùng lặp tệp.
* Sử dụng `pandas` để đọc biểu mẫu dữ liệu. Quá trình xác thực chi tiết được thực hiện trên từng dòng:
  1. **Kiểm tra Khoa Phòng:** Kiểm tra cột khoa phòng báo cáo xem có tồn tại trong catalog `quality_departments` không.
  2. **Kiểm tra Biến Số:** Kiểm tra xem các cột biến số tương ứng (A1-A5, B1-B5...) có tồn tại trong catalog chỉ số hay không.
  3. **Kiểm tra Ngưỡng Giá Trị:** So khớp giá trị nhập vào với cận dưới (`min_value`) và cận trên (`max_value`) được cấu hình.
  4. **Kiểm tra Trường Bắt Buộc:** Xác định các biến bắt buộc nhập của khoa đó có bị bỏ trống không.
* Dữ liệu và kết quả xác thực từng dòng được ghi vào bảng tạm `quality_import_rows`.

### 3.2 Giai đoạn Xem trước (Preview)
* Trang giao diện hiển thị bảng phân tích.
* Nếu có bất kỳ dòng nào có trạng thái `row_status == 'error'`, hệ thống sẽ kích hoạt **Cổng chặn cứng (Hard Stop Gate)**: Vô hiệu hóa nút *"Xác nhận nạp dữ liệu"* để bảo vệ CSDL.

### 3.3 Giai đoạn Xác nhận nạp dữ liệu chính thức (`POST /batches/{batch_id}/confirm`)
* Khi người dùng bấm **Xác nhận**:
  * Kiểm tra an toàn: Đảm bảo đợt import không chứa dòng lỗi nghiêm trọng và kỳ hạn báo cáo chưa bị khóa sổ.
  * **Gom nhóm tự động (Auto-Grouping):** Gom toàn bộ các dòng đơn lẻ trong tệp Excel theo cặp khóa duy nhất `(department_code, report_date, period_type, station_code)`.
  * Tự động sinh ra các lô báo cáo chính thức `QualityInputBatch` ở trạng thái **Nháp (Draft)**.
  * Phân bổ các dòng số liệu lâm sàng tương ứng về bảng chính thức `QualityInputRecord`.
  * Xóa dữ liệu tạm thời trong bảng đệm staging và dọn dẹp file vật lý.

---

## 4. Tệp Tin Kiểm Thử Có Sẵn (Plug-and-Play Test Files)

Để hỗ trợ bạn kiểm thử nhanh chóng mà không cần soạn thảo số liệu, tôi đã gán sẵn **2 tệp tin mẫu chuẩn** trong thư mục private storage:
`\\wsl.localhost\Debian\home\sonnguyen\CSCL_Web\CSCL_Web\apps\agent-ai\storage\`

1. **`test_import_with_errors.xlsx` (File Chứa Lỗi Nghiệp Vụ):**
   * *Mục tiêu:* Kiểm thử cổng chặn cứng dữ liệu lỗi.
   * *Nội dung:* Chứa dòng 3 có giá trị `-5` (nhỏ hơn min cho phép là 0), dòng 4 có mã khoa phòng sai `KHOA_SAI` và dòng 5 thiếu trường bắt buộc.
2. **`test_import_perfect_valid.xlsx` (File 100% Hợp Lệ):**
   * *Mục tiêu:* Kiểm thử luồng nạp tự động thành công và cơ chế gom nhóm dữ liệu.
   * *Nội dung:* Chứa 5 dòng số liệu hợp lệ của khoa QLCL và KDH.

---

## 5. Hướng Dẫn Các Bước Trải Nghiệm Kiểm Thử Nhập Excel

1. Truy cập trang **Nhập Excel** tại địa chỉ: `http://localhost:3000/reports/import`.
2. **Kiểm thử Luồng Lỗi (Hard Stop):**
   * Kéo thả tệp tin [test_import_with_errors.xlsx](file:///wsl.localhost/Debian/home/sonnguyen/CSCL_Web/CSCL_Web/apps/agent-ai/storage/test_import_with_errors.xlsx) vào vùng tải lên và bấm **Phân tích**.
   * *Kỳ vọng:* Thống kê báo 3 dòng lỗi. Bảng xem trước làm nổi bật màu đỏ các dòng lỗi kèm Tooltip tiếng Việt giải thích nguyên nhân lỗi. Nút **Xác nhận nạp** bị vô hiệu hóa hoàn toàn.
3. **Kiểm thử Luồng Chuẩn (Auto-Grouping):**
   * Bấm Hủy đợt lỗi. Chọn tải lên tệp tin chuẩn [test_import_perfect_valid.xlsx](file:///wsl.localhost/Debian/home/sonnguyen/CSCL_Web/CSCL_Web/apps/agent-ai/storage/test_import_perfect_valid.xlsx) và bấm **Phân tích**.
   * *Kỳ vọng:* Thống kê báo 5 dòng hợp lệ, nút **Xác nhận nạp** sáng màu xanh.
   * Bấm **Xác nhận nạp** -> Toast thông báo thành công. Hệ thống tự động gom nhóm 5 dòng thành 2 lô dữ liệu chính thức cho khoa QLCL và KDH. Bạn có thể sang trang Nhập báo cáo để xem và quản lý 2 lô này ở trạng thái Draft.
   * Lịch sử đợt nhập của bạn hiển thị công khai ở bảng bên dưới trang.

---
*Tài liệu này được biên soạn để bạn dễ dàng theo dõi và chỉnh sửa nghiệp vụ lâm sàng Phase 4.*
