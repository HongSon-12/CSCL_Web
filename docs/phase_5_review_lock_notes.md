# Tài Liệu Tích Hợp - Phase 5: Review, Approval & Period Lock (QLCL Web Portal)

Tài liệu này ghi nhận chi tiết kiến trúc cơ sở dữ liệu, các điểm API backend, giao diện frontend và cơ chế bảo mật ba lớp được xây dựng cho **Phase 5: Duyệt báo cáo & Khóa sổ kỳ báo cáo**.

---

## 1. Vị Trí Các File Đã Xây Dựng & Các Chú Thích (Code Annotations)

Để bạn dễ dàng đọc hiểu và tinh chỉnh nghiệp vụ, tôi đã viết **chú thích chi tiết bằng tiếng Việt** trực tiếp vào các file mã nguồn sau:

1. **Database Schema:** [backend/models.py](file:///home/sonnguyen/CSCL_Web/CSCL_Web/apps/agent-ai/backend/models.py#L469-L510)
   * Chú thích rõ vai trò nghiệp vụ lâm sàng của bảng `quality_review_tasks` (hàng đợi duyệt số liệu) và `quality_period_locks` (khóa sổ bảo vệ dữ liệu).
2. **API Backend:** [backend/main.py](file:///home/sonnguyen/CSCL_Web/CSCL_Web/apps/agent-ai/backend/main.py#L1739-L2149)
   * Giải thích logic xử lý cho 6 endpoint mới: bảo mật phân vùng scope của người duyệt, logic ngăn chặn tự duyệt (Self-Approval Gate), kiểm tra chặn khóa sổ nếu còn lô nháp và lưu vết lý do mở khóa sổ (Audit Trail).
3. **Giao Diện Duyệt Báo Cáo:** [frontend/app/reports/review/page.tsx](file:///home/sonnguyen/CSCL_Web/CSCL_Web/apps/agent-ai/frontend/app/reports/review/page.tsx)
   * Chú thích chi tiết cấu trúc Drawer hiển thị số liệu lâm sàng thô, bộ kiểm tra và disable nút phê duyệt nếu phát hiện hành vi tự duyệt của nhân viên nhập liệu.
4. **Giao Diện Khóa Sổ:** [frontend/app/reports/locked-periods/page.tsx](file:///home/sonnguyen/CSCL_Web/CSCL_Web/apps/agent-ai/frontend/app/reports/locked-periods/page.tsx)
   * Giải thích các State React điều khiển biểu mẫu khóa sổ, tùy chọn override (khóa đè) và modal yêu cầu nhập lý do bắt buộc khi mở khóa sổ kỳ báo cáo cũ.
5. **Kịch Bản Kiểm Thử Tích Hợp:** [scripts/test_phase5_apis.py](file:///home/sonnguyen/CSCL_Web/CSCL_Web/apps/agent-ai/scripts/test_phase5_apis.py)
   * Kịch bản tự động hóa 10 bước kiểm thử API từ đầu đến cuối phục vụ kiểm nghiệm tính năng.

---

## 2. Thiết Kế Cơ Sở Dữ Liệu (Database Models)

Hai bảng mới đã được khởi tạo trong Postgres thông qua SQLAlchemy:

### A. Bảng Hàng Đợi Duyệt (`quality_review_tasks`)
* Quản lý trạng thái và luồng duyệt báo cáo.
```python
class QualityReviewTask(Base):
    __tablename__ = "quality_review_tasks"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    target_type = Column(Text, nullable=False, default="input_batch")  # Đối tượng duyệt
    target_id = Column(BigInteger, nullable=False)                     # ID Lô số liệu (input_batch)
    status = Column(Text, default="pending")                           # pending / approved / rejected
    assigned_to = Column(Text)                                         # Người được gán xử lý
    requested_by = Column(Text, nullable=False)                        # Người gửi yêu cầu duyệt
    reviewed_by = Column(Text)                                         # Người phê duyệt/từ chối
    requested_at = Column(DateTime, default=datetime.utcnow)           # Thời điểm gửi duyệt
    reviewed_at = Column(DateTime)                                     # Thời điểm xử lý duyệt
    review_note = Column(Text)                                         # Ý kiến duyệt hoặc Lý do từ chối
```

### B. Bảng Nhật Ký Khóa Sổ (`quality_period_locks`)
* Đóng băng dữ liệu của kỳ để tránh sửa đổi ngoài ý muốn.
```python
class QualityPeriodLock(Base):
    __tablename__ = "quality_period_locks"
    __table_args__ = (
        UniqueConstraint("period_type", "report_date", "department_code", "station_code", name="uq_period_lock_scope"),
    )
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    period_type = Column(Text, nullable=False, default="daily")         # Tần suất khóa: daily / monthly
    report_date = Column(Date, nullable=False)                          # Ngày báo cáo được khóa
    department_code = Column(Text)                                      # Khoa phòng được khóa (để trống nếu khóa toàn viện)
    station_code = Column(Text)                                         # Trạm vệ tinh được khóa (nếu có)
    is_locked = Column(Boolean, default=True)                           # Trạng thái: True (Đã khóa) / False (Mở khóa)
    locked_by = Column(Text)                                            # Username người thực hiện khóa
    locked_at = Column(DateTime, default=datetime.utcnow)               # Thời điểm khóa
    unlock_reason = Column(Text)                                        # Lý do mở khóa (bắt buộc)
    unlocked_by = Column(Text)                                          # Username người mở khóa
    unlocked_at = Column(DateTime)                                      # Thời điểm mở khóa
```

---

## 3. Các Điểm API Backend & Logic Bảo Vệ 3 Lớp

### 3.1 Quy trình Duyệt & Từ chối
* **`GET /api/v1/quality/review/tasks`**:
  * Trả về danh sách nhiệm vụ duyệt.
  * *Bảo mật:* Lọc dữ liệu thông minh chỉ hiển thị các đợt số liệu nằm trong phạm vi Scope quản lý của người dùng gán tại `quality_user_scopes`. Đặc cách: Admin và Quality Manager được phép xem toàn viện.
* **`POST /api/v1/quality/input/batches/{batch_id}/approve`**:
  * Phê duyệt lô số liệu, cập nhật task tương ứng sang `approved`.
  * *Cổng an toàn:* **Chặn đứng tuyệt đối (Hard Block) hành vi tự duyệt**. Nhân viên nhập liệu không thể tự phê duyệt lô do chính mình lập (`batch.created_by == current_user.username`), trừ trường hợp đặc biệt là quản trị viên hệ thống để tiện kiểm thử.
* **`POST /api/v1/quality/input/batches/{batch_id}/reject`**:
  * Từ chối duyệt lô báo cáo, trả ngược trạng thái về `rejected` để operator sửa.
  * *Quy tắc:* **Bắt buộc cung cấp Lý do từ chối** (`review_note`), nếu không điền hệ thống trả lỗi `400 Bad Request`.

### 3.2 Quy trình Khóa sổ & Bảo vệ lịch sử (Period Lock)
* **`POST /api/v1/quality/period-locks` (Khóa kỳ):**
  * *Cổng an toàn:* Hệ thống tự động quét tất cả các lô dữ liệu con trong kỳ đó. Nếu phát hiện **bất kỳ lô nào ở trạng thái Draft hoặc Chờ duyệt**, hệ thống sẽ chặn đứng không cho phép khóa sổ.
  * *Bypass:* Quản trị viên (Admin/Manager) có quyền gán cờ `override_pending: true` để ép buộc khóa sổ trong trường hợp khẩn cấp.
  * Khi khóa thành công, toàn bộ trạng thái lô con tự động chuyển sang `locked`.
* **`POST /api/v1/quality/period-locks/{lock_id}/unlock` (Mở khóa kỳ):**
  * *Audit Trail:* **Bắt buộc điền lý do mở khóa sổ** (`unlock_reason`) để phục vụ công tác thanh tra/giám sát lịch sử sửa đổi dữ liệu lâm sàng.
  * Khi mở khóa, trạng thái các lô con tự động phục hồi về `approved` để cho phép chỉnh sửa lại.
* **Kiểm tra trạng thái Khóa (Lock Guard):**
  * Đã tích hợp `require_period_not_locked` vào API tạo mới, chỉnh sửa nháp (`PUT /batches/{id}`) và nộp báo cáo Excel (`POST /import/confirm`). Trả lỗi `400 Bad Request` ngay lập tức nếu kỳ hạn đó đã bị đóng băng.

---

## 4. Hướng Dẫn Tự Kiểm Thử Nghiệm Thu Trên Giao Diện

Bạn có thể dễ dàng kiểm tra các tính năng này trực tiếp trên trình duyệt:

### Kịch bản A: Quy trình Duyệt & Trả lại báo cáo
1. Mở trang **Nhập số liệu** (`/reports/input`) -> Nhập bộ dữ liệu và nhấn **Gửi duyệt (Submit)**. Lô số liệu chuyển sang màu vàng Chờ duyệt.
2. Mở trang **Duyệt báo cáo** (`/reports/review`) -> Click **Xem & Duyệt** trên hàng đợi duyệt.
3. Một **Drawer** sẽ trượt ra hiển thị bảng số liệu lâm sàng thô cực kỳ trực quan.
4. **Kiểm tra tự duyệt:** Nếu bạn là người tạo ra lô này, hệ thống sẽ hiển thị cảnh báo bảo mật màu đỏ và vô hiệu hóa nút **Phê duyệt**.
5. **Kiểm tra từ chối:** Hãy thử nhấn nút **Từ chối** khi chưa nhập nhận xét (hệ thống sẽ báo lỗi). Nhập lý do (Ví dụ: *"Kiểm tra lại số ca phẫu thuật"*) và bấm từ chối.
6. Quay lại trang nhập liệu, lô số liệu chuyển thành màu đỏ **Bị từ chối (Rejected)** kèm lý do chi tiết từ người duyệt để bạn chỉnh sửa nộp lại.

### Kịch bản B: Khóa sổ kỳ báo cáo (Period Lock)
1. Mở trang **Khóa kỳ báo cáo** (`/reports/locked-periods`).
2. Chọn ngày báo cáo, tần suất và bấm **Kích hoạt Khóa sổ** (đảm bảo tắt "Ép buộc khóa sổ").
   - Hệ thống sẽ trả lỗi đỏ từ chối khóa do còn các lô dữ liệu nháp/chưa duyệt.
3. Kích hoạt Checkbox **Ép buộc khóa sổ (Override)** và nhấn **Kích hoạt Khóa sổ**.
   - Kỳ báo cáo chuyển sang trạng thái màu đỏ **Đã khóa (Locked)**.
4. Quay lại trang Nhập số liệu (`/reports/input`) hoặc Nhập Excel (`/reports/import`) cho ngày vừa khóa.
   - Toàn bộ giao diện chuyển sang **Chỉ đọc (Read-only)**, các nút lưu nháp, nạp Excel và nộp đều bị ẩn kèm cảnh báo kỳ dữ liệu đã bị đóng băng.
5. Quay lại trang `/reports/locked-periods`, nhấp nút **Mở khóa**.
   - Một Modal hiện ra yêu cầu bắt buộc nhập Lý do điều chỉnh dữ liệu.
   - Điền lý do và xác nhận mở khóa thành công, trang nhập liệu hoạt động trở lại bình thường.

---
*Tài liệu này được biên soạn để hỗ trợ bạn theo dõi và dễ dàng bảo trì mã nguồn dự án.*
