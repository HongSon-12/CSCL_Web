# Tài liệu Nguyên lý Tính toán & Công thức 53 Chỉ số Chất lượng (CSCL)

Tài liệu này trình bày chi tiết toán học, CSDL nguồn, bộ lọc điều kiện và thuật toán được cài đặt trong động cơ tính toán lâm sàng (`indicators.py` & `variables.py`) nhằm phục vụ công tác kiểm toán (audit) của Ban giám đốc và Phòng Quản lý Chất lượng.

---

## I. TỔNG QUAN HỆ THỐNG DỮ LIỆU ĐẦU VÀO
Động cơ tính toán thu thập dữ liệu thô từ 4 bảng CSDL thực tế trong hệ thống:
1. **`callcenterdata` (SQLAlchemy: `QualityCallCenterData`)**: Chứa số liệu điều phối cuộc gọi của tổng đài 115 theo từng ngày.
2. **`handlebyarea` (SQLAlchemy: `QualityHandleByArea`)**: Chứa số liệu phân bổ chuyến xe theo địa bàn/trạm vệ tinh.
3. **`kccnbv` (SQLAlchemy: `QualityKccnbv`)**: Chứa **41 cột chi tiết** của từng chuyến xe cấp cứu lâm sàng (nhập khẩu từ tệp Excel Bệnh án ngoại viện).
4. **`chi_so` / `quality_input_records` (SQLAlchemy: `QualityChiSo` / `QualityInputRecord`)**: Chứa các biến số khoa phòng nhập tay trực tiếp từ biểu mẫu Web Form (`cs24` - `cs53`).

Để đảm bảo an toàn số liệu, toàn bộ phép chia trong hệ thống đều đi qua hàm kiểm tra mẫu số an toàn `safe_divide(a, b)`:
$$\text{safe\_divide}(a, b) = \begin{cases} \frac{a}{b} & \text{nếu } b \neq 0 \\ 0.0 & \text{nếu } b = 0 \end{cases}$$

---

## II. CHI TIẾT CÔNG THỨC 53 CHỈ SỐ CHẤT LƯỢNG (CS1 - CS53)

### NHÓM 1: CHỈ SỐ ĐIỀU HÀNH TỔNG ĐÀI (CS1 - CS10)
*Nguồn dữ liệu: Tổng hợp từ bảng `callcenterdata` và `handlebyarea` theo ngày báo cáo (`report_date`).*

| Mã Chỉ Số | Tên Chỉ Số | Công Thức Toán Học / Logic | Các Biến Thô Đầu Vào (Database Columns) |
| :--- | :--- | :--- | :--- |
| **CS1** | Tổng số cuộc gọi tiếp nhận | $$\text{Kết quả} = \text{totalcalls}$$ | `callcenterdata.totalcalls`: Tổng cuộc gọi vào tổng đài. |
| **CS2** | Tỷ lệ tiếp nhận cuộc gọi (%) | $$\text{Tỷ lệ} = \frac{\text{callsreceived}}{\text{totalcalls}} \times 100$$ | `callcenterdata.callsreceived`: Số cuộc gọi được điện thoại viên nhấc máy.<br>`callcenterdata.totalcalls`: Tổng cuộc gọi đổ chuông. |
| **CS3** | Tỷ lệ cuộc gọi có nội dung (%) | $$\text{Tỷ lệ} = \frac{\text{callswithcontent}}{\text{callsreceived}} \times 100$$ | `callcenterdata.callswithcontent`: Cuộc gọi yêu cầu hỗ trợ y tế thực tế.<br>`callcenterdata.callsreceived`: Cuộc gọi tiếp nhận thành công. |
| **CS4** | Tỷ lệ cuộc gọi có dấu hiệu cấp cứu (%) | $$\text{Tỷ lệ} = \frac{\text{callswithemergencysignstotal}}{\text{callswithcontent}} \times 100$$ | `callcenterdata.callswithemergencysignstotal`: Cuộc gọi có dấu hiệu đe dọa sinh mạng.<br>`callcenterdata.callswithcontent`: Cuộc gọi có nội dung. |
| **CS5** | Tỷ lệ cấp cứu điều phối trạm vệ tinh (%) | $$\text{Tỷ lệ} = \frac{\text{receivedbysatellite}}{\text{transfertosatellite}} \times 100$$ | `handlebyarea.receivedbysatellite`: Ca trạm vệ tinh phản hồi xác nhận.<br>`handlebyarea.transfertosatellite`: Ca tổng đài điều phối sang trạm. |
| **CS6** | Tổng số ca vận chuyển | $$\text{Kết quả} = \text{tripwithpatient}$$ | `handlebyarea.tripwithpatient`: Tổng số ca xe chạy có chở bệnh nhân thực tế. |
| **CS7** | Tỷ lệ vận chuyển trạm vệ tinh nhận (%) | $$\text{Tỷ lệ} = \frac{\text{receivedbysatellite}}{\text{transfertosatellite}} \times 100$$ | *Tương tự CS5, đo lường hiệu suất tiếp nhận chuyến xe của trạm.* |
| **CS8** | Tỷ lệ cuộc gọi không cần thiết (%) | $$\text{Tỷ lệ} = \frac{\text{nolongerneededcalls}}{\text{callswithemergencysignstotal}} \times 100$$ | `handlebyarea.nolongerneededcalls`: Cuộc gọi báo hủy ca, gọi đùa, không gặp BN.<br>`callcenterdata.callswithemergencysignstotal`: Cuộc gọi có dấu hiệu cấp cứu. |
| **CS9** | Tỷ lệ điều phối khác (%) | $$\text{Tỷ lệ} = \frac{\text{othertransfer}}{\text{callswithemergencysignstotal}} \times 100$$ | `handlebyarea.othertransfer`: Ca chuyển hướng hỗ trợ ngoài danh mục.<br>`callcenterdata.callswithemergencysignstotal`: Cuộc gọi có dấu hiệu cấp cứu. |
| **CS10** | Tỷ lệ tử vong trong chuyến xe cấp cứu (%) | $$\text{Tỷ lệ} = \frac{\text{diedpatient}}{\text{tripwithpatient}} \times 100$$ | `handlebyarea.diedpatient`: Số ca bệnh nhân ngưng tim tử vong trên xe.<br>`handlebyarea.tripwithpatient`: Số ca xe chạy có chở bệnh nhân. |

---

### NHÓM 2: CHỈ SỐ LÂM SÀNG CẤP CỨU NGOẠI VIỆN (CS11 - CS26)
*Nguồn dữ liệu: Tự động phân tích, bóc tách và tính toán từ bảng chi tiết chuyến xe `kccnbv` (41 cột từ Excel). Lọc theo ngày báo cáo (`ngay`) và trạm vệ tinh xử lý (`tram_xu_ly`).*

#### 1. Định nghĩa các Biến Số Trung Gian (Aggregate Variables) từ bảng `kccnbv`:
* **`total_trips`**: Tổng số chuyến xe cấp cứu được ghi nhận trong ngày.
  $$\text{total\_trips} = \text{COUNT}(\text{kccnbv.id})$$
* **`activated_trips`**: Số chuyến xe có lăn bánh xuất phát.
  $$\text{activated\_trips} = \text{COUNT}(\text{kccnbv.thoi\_luong\_xuat\_xe} > 0)$$
* **`patient_trips`**: Chuyến xe tiếp cận bệnh nhân thực tế (không bị hủy).
  $$\text{patient\_trips} = \text{COUNT}\left( \text{ho\_ten\_benh\_nhan} \neq \text{empty} \ \mathbf{AND} \ \text{LOWER}(\text{xu\_tri}) \text{ không chứa 'hủy' hoặc 'không'} \right)$$
* **`hospital_trips`**: Số ca bàn giao thành công tại bệnh viện nhận.
  $$\text{hospital\_trips} = \text{COUNT}(\text{benh\_vien\_nhan} \neq \text{empty})$$
* **`cpr_cases`**: Số ca tiến hành hồi sinh tim phổi (ngưng tuần hoàn).
  $$\text{cpr\_cases} = \text{COUNT}\left( \text{LOWER}(\text{xu\_tri}) \text{ chứa 'hồi sinh tim phổi' hoặc 'cấp cứu ngưng tuần hoàn'} \right)$$
* **`cpr_success`**: Số ca hồi sinh tim phổi thành công (có mạch/tim trở lại).
  $$\text{cpr\_success} = \text{COUNT}\left( \text{cpr\_cases} \ \mathbf{AND} \ \text{LOWER}(\text{xu\_tri}) \text{ chứa 'thành công', 'có tim lại', hoặc 'có tim'} \right)$$
* **`death_cases`**: Tổng số ca tử vong ngoại viện hoặc tử vong trước/trong khi cấp cứu.
  $$\text{death\_cases} = \text{COUNT}\left( \text{LOWER}(\text{xu\_tri}) \text{ hoặc } \text{LOWER}(\text{ghi\_chu\_sau\_xu\_tri}) \text{ chứa 'tử vong'} \right)$$
* **`emergency_cases`**: Số ca có bệnh lý hoặc dấu hiệu cấp cứu lâm sàng rõ rệt.
  $$\text{emergency\_cases} = \text{COUNT}(\text{ly\_do\_cap\_cuu} \neq \text{empty} \ \mathbf{OR} \ \text{ma\_benh} \neq \text{empty})$$
* **`medical_intervention_cases`**: Chuyến xe có can thiệp thuốc, thủ thuật y tế hoặc xử trí chuyên môn.
  $$\text{medical\_intervention\_cases} = \text{COUNT}(\text{xu\_tri} \neq \text{empty} \ \mathbf{AND} \ \text{LOWER}(\text{xu\_tri}) \text{ không chứa 'không'})$$

#### 2. Công thức tính toán chi tiết từng chỉ số CS11 - CS26:

| Mã Chỉ Số | Tên Chỉ Số | Công Thức Tính Toán | Cột Dữ Liệu Excel / CSDL Gốc |
| :--- | :--- | :--- | :--- |
| **CS11** | Thời gian tiếp nhận tạo phiếu trung bình (phút) | $$\text{Kết quả} = \text{AVG}(\text{thoi\_luong\_xu\_ly})$$ | Cột `thoi_luong_xu_ly` (Thời gian tạo phiếu tiếp nhận - Nhận điện thoại) |
| **CS12** | Thời gian tiếp nhận cuộc gọi trung bình (phút) | $$\text{Kết quả} = \text{AVG}(\text{thoi\_luong\_dieu\_phoi})$$ | Cột `thoi_luong_dieu_phoi` (Thời gian xuất xe - Nhận điện thoại) |
| **CS13** | Tổng số giờ đàm thoại điều phối tổng đài (giờ) | $$\text{Kết quả} = \frac{\text{SUM}(\text{thoi\_luong\_dieu\_phoi})}{2} \div 6$$ | *Dựa theo công thức đặc thù Power BI DAX:*<br>Tổng thời lượng đàm thoại chia đôi và quy đổi theo đơn vị trực. |
| **CS14** | Trung bình thời gian tới hiện trường (phút) | $$\text{Kết quả} = \text{AVG}(\text{thoi\_luong\_den\_hien\_truong})$$ | Cột `thoi_luong_den_hien_truong` (Thời gian đến hiện trường - Xuất xe) |
| **CS15** | Tỷ lệ xuất xe cứu thương (%) | $$\text{Tỷ lệ} = \frac{\text{activated\_trips}}{\text{total\_trips}} \times 100$$ | activated_trips: Chuyến xe có thời lượng xuất xe > 0.<br>total_trips: Tổng chuyến xe trong kỳ báo cáo. |
| **CS16** | Tỷ lệ chuyến xe có bệnh nhân (%) | $$\text{Tỷ lệ} = \text{MIN}\left(\frac{\text{patient\_trips}}{\text{activated\_trips}} \times 100, \ 100\right)$$ | patient_trips: Số ca tiếp cận bệnh nhân thật.<br>activated_trips: Số ca chuyến xe lăn bánh thực tế. |
| **CS17** | Tỷ lệ trường hợp chuyển viện thành công (%) | $$\text{Tỷ lệ} = \frac{\text{hospital\_trips}}{\text{patient\_trips}} \times 100$$ | hospital_trips: Ca chuyển đến bệnh viện tiếp nhận.<br>patient_trips: Ca chuyến xe có bệnh nhân. |
| **CS18** | Tỷ lệ hồi sinh tim phổi thành công (%) | $$\text{Tỷ lệ} = \frac{\text{cpr\_success}}{\text{cpr\_cases}} \times 100$$ | cpr_success: Ca CPR thành công ghi nhận tim đập lại.<br>cpr_cases: Tổng ca ngưng tim ngưng thở được ép tim. |
| **CS19** | Tổng số ca tử vong ngoại viện | $$\text{Kết quả} = \text{death\_cases}$$ | *Đếm tổng số ca ghi nhận tử vong trong CSDL thô.* |
| **CS20** | Tỷ lệ trường hợp có dấu hiệu cấp cứu rõ rệt (%) | $$\text{Tỷ lệ} = \frac{\text{emergency\_cases}}{\text{total\_trips}} \times 100$$ | emergency_cases: Bệnh nhân có chẩn đoán ICD hoặc lý do.<br>total_trips: Tổng chuyến xe cấp cứu. |
| **CS21** | Tỷ lệ trường hợp có can thiệp y khoa (%) | $$\text{Tỷ lệ} = \frac{\text{medical\_intervention\_cases}}{\text{patient\_trips}} \times 100$$ | medical_intervention_cases: Chuyến xe có xử trí thực tế.<br>patient_trips: Chuyến xe có bệnh nhân. |
| **CS22** | Trung bình thời gian kích hoạt xuất xe (phút) | $$\text{Kết quả} = \text{AVG}(\text{thoi\_luong\_xuat\_xe})$$ | Cột `thoi_luong_xuat_xe` (Thời gian xuất xe - Nhận điện thoại) |
| **CS23** | Trung bình thời gian tiếp cận bệnh nhân (phút) | $$\text{Kết quả} = \text{AVG}(\text{thoi\_luong\_den\_hien\_truong})$$ | Cột `thoi_luong_den_hien_truong` (Thời gian đến hiện trường - Xuất xe) |
| **CS24** | Trung bình thời gian tại hiện trường (phút) | $$\text{Kết quả} = \text{AVG}(\text{cs24})$$ | Biến số `cs24` được nhập thủ công từ các trạm vệ tinh qua form hoặc bóc tách từ trường dữ liệu bệnh án. |
| **CS25** | Trung bình thời gian chuyển đến bệnh viện (phút) | $$\text{Kết quả} = \text{AVG}(\text{cs25} \text{ hoặc } \text{thoi\_luong\_den\_benh\_vien})$$ | Cột `thoi_luong_den_benh_vien` (Thời gian đến bệnh viện - Đến hiện trường) hoặc nhập thủ công `cs25`. |
| **CS26** | Trung bình thời gian giao bệnh viện (phút) | $$\text{Kết quả} = \text{AVG}(\text{thoi\_luong\_hoan\_tat\_ban\_giao})$$ | Cột `thoi_luong_hoan_tat_ban_giao` (Thời gian hoàn tất - Đến bệnh viện) |

---

### NHÓM 3: CHỈ SỐ CHẤT LƯỢNG KHOA PHÒNG NHẬP THỦ CÔNG (CS27 - CS53)
*Nguồn dữ liệu: Người dùng thuộc các phòng ban tương ứng trực tiếp nhập liệu qua Web Form. Dữ liệu được lấy từ các biến số có mã tương ứng trong bảng `quality_input_records` và ghi đè vào bảng `chi_so` sau khi phê duyệt.*

* **Tự động quy đổi tỷ lệ % (Decimal mapping)**:
  Để tương thích tuyệt đối với bộ hiển thị trực quan hóa của Power BI (Power BI DAX mong muốn tỷ lệ dạng số thập phân từ `0.0` đến `1.0`), các chỉ số biểu diễn dưới dạng tỷ lệ phần trăm (%) sau khi nhập liệu (ví dụ nhập `95.0` cho 95%) sẽ được động cơ tính toán tự động chia cho 100 để trả về giá trị thập phân `0.95`.
  Các chỉ số áp dụng quy tắc quy đổi thập phân này bao gồm:
  $$\text{CS30, CS32, CS33, CS35, CS36, CS37, CS38, CS39, CS41, CS45, CS46}$$

* **Phân bổ phân quyền khoa phòng chịu trách nhiệm nhập**:

#### A. Phòng Tổ chức - Hành chính (PTCHC)
* **CS34**: Điểm tiêu chí cải cách hành chính (Đọc giá trị chữ: A/B/C/D).
* **CS35**: Điểm tiêu chí cơ sở y tế xanh - sạch - đẹp (%).
* **CS36**: Tỷ lệ sự cố ngoài y khoa nghiêm trọng (%).
* **CS37**: Tỷ lệ xe cứu thương kết nối định vị GPS (%).
* **CS38**: Hiệu suất sử dụng xe cứu thương (%).
* **CS39**: Tỷ lệ nhân viên tuyển dụng theo đề án vị trí việc làm (%).

#### B. Phòng Vật tư trang thiết bị y tế - Dược (P.VTTTBYT-D)
* **CS28**: Tỷ lệ thiết bị y tế được bảo trì định kỳ đúng hạn (%).
* **CS29**: Tỷ lệ hoàn tất kiểm định thiết bị y tế bắt buộc (%).
* **CS30**: Tỷ lệ cung ứng đủ số lượng vật tư trang thiết bị y tế theo danh mục (%).
* **CS31**: Tỷ lệ tai nạn thương tích do vật sắc nhọn ở nhân viên y tế (%).
* **CS32**: Tỷ lệ tuân thủ vệ sinh tay của nhân viên y tế (%).

#### C. Phòng Kế hoạch - Tài chính (PKHTC)
* **CS40**: Số sự cố y khoa bắt buộc báo cáo (Số lượng tuyệt đối).
* **CS41**: Tỷ lệ hài lòng của người dân đối với dịch vụ cấp cứu (%).
* **CS42**: Điểm tiêu chí chất lượng Trung tâm Cấp cứu 115.
* **CS43**: Điểm tiêu chí chất lượng áp dụng cho các Trạm vệ tinh.
* **CS44**: Tổng số Trạm vệ tinh Cấp cứu 115 đang hoạt động.
* **CS45**: Tỷ lệ Trạm vệ tinh kết nối mạng lưới điều hành thông minh (%).
* **CS46**: Tỷ lệ nhân viên y tế được đào tạo liên tục chuyên môn cấp cứu (%).
* **CS47**: Số công tác phục vụ sự kiện chính trị, xã hội lớn.
* **CS48**: Số cơ sở y tế được hỗ trợ chuyên môn cấp cứu ngoại viện.
* **CS49**: Số lớp đào tạo liên tục chuyên môn tổ chức cho nhân viên y tế.
* **CS50**: Số lớp đào tạo sơ cấp cứu tổ chức cho cộng đồng.
* **CS51 / cs51cg / cs51q8 / cs51td / cs51ub**: Tổng số biên lai/phiên trực (Trung tâm & 4 Trạm vệ tinh).
* **CS52 / cs52cg / cs52q8 / cs52td / cs52ub**: Trung bình số tiền thu được trên mỗi biên lai (Trung tâm & 4 Trạm vệ tinh).
* **CS53 / cs53cg / cs53q8 / cs53td / cs53ub**: Tổng số tiền thu được trên mỗi phiên trực (Trung tâm & 4 Trạm vệ tinh).

#### D. Khoa Cấp cứu ngoài bệnh viện (KCCNBV) & Các Trạm Vệ tinh
* **CS24 / cs24cg / cs24q8 / cs24td / cs24ub**: Trung bình thời gian tại hiện trường (phút).
* **CS25 / cs25cg / cs25q8 / cs25td / cs25ub**: Trung bình thời gian vận chuyển đến bệnh viện (phút).

---

## III. QUY TRÌNH HƯỚNG DẪN KIỂM TOÁN SỐ LIỆU (AUDITING STEPS)
Để kiểm tra chéo tính chính xác của động cơ tính toán tự động so với số liệu Excel thô của bạn:

1. **Kiểm tra ca có bệnh nhân (CS16)**:
   * Mở file Excel bệnh án của bạn.
   * Lọc cột `ho_ten_benh_nhan` (phải khác rỗng).
   * Lọc cột `xu_tri` (loại bỏ các hàng chứa chữ "hủy", "huy", "không nhận", "khong nhan").
   * Đếm số dòng còn lại -> Con số này phải bằng biến số `patient_trips` trong DB và làm mẫu số cho `CS16`.
2. **Kiểm tra ca hồi sinh tim phổi thành công (CS18)**:
   * Lọc cột `xu_tri` chứa từ khóa "hồi sinh tim phổi" hoặc "cấp cứu ngưng tuần hoàn" để tìm tổng số ca (`cpr_cases`).
   * Trong các dòng đó, đếm xem có bao nhiêu ca chứa từ "thành công", "có tim lại", "có tim" -> Đây là ca thành công (`cpr_success`).
   * Thực hiện phép tính: $\frac{\text{cpr\_success}}{\text{cpr\_cases}} \times 100$ và đối chiếu với chỉ số **CS18** hiển thị trên trang `/indicators`.
3. **Kiểm tra thời gian trung bình (CS11, CS12, CS14, CS22, CS23, CS26)**:
   * Lấy trung bình cộng (hàm `=AVERAGE()`) của các cột thời lượng tương ứng trong Excel.
   * So sánh giá trị trung bình này với kết quả hiển thị của các chỉ số thời gian tương ứng. Lưu ý: Động cơ sử dụng độ chính xác dấu phẩy động kép (double precision).
