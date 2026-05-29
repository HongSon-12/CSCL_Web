# Quy Chuẩn Làm Sạch & Chuẩn Hóa Dữ Liệu

Dữ liệu đầu vào từ các nguồn thủ công (nhập tay trên Google Sheets, Excel xuất ra từ các hệ thống cũ) thường không đồng nhất, chứa nhiều ký tự đặc biệt, dòng trống hoặc định dạng ngày tháng không chuẩn. Tài liệu này ghi nhận chi tiết các quy chuẩn làm sạch và ánh xạ Schema dữ liệu của hệ thống.

---

## 1. Xử Lý Dữ Liệu Trống & Dòng Trống (Null/NaN)

Để đảm bảo chất lượng dữ liệu trước khi nạp vào database, hệ thống áp dụng các nguyên tắc xử lý nghiêm ngặt đối với giá trị trống:

- **Loại bỏ dòng trống hoàn toàn**: Sử dụng `dropna(how='all')` để quét và xóa toàn bộ các dòng không chứa bất kỳ dữ liệu nào (thường xuất hiện ở cuối Google Sheets do định dạng thừa).
- **Điền giá trị mặc định theo Kiểu Dữ Liệu**:
  - **Kiểu Số nguyên (Integer)**: Chuyển đổi giá trị lỗi/trống thành `0` hoặc sử dụng kiểu `Int64` (nullable của Pandas) để tránh bị ép kiểu thành Float khi có giá trị Null.
  - **Kiểu Số thực (Float)**: Chuyển đổi thành `0.0` hoặc sử dụng kiểu `Float64` của Pandas.
  - **Kiểu Ngày tháng (Date)**: Mặc định điền ngày gốc khởi tạo hệ thống Unix `1970-01-01` nếu trường ngày bắt buộc bị trống.
  - **Kiểu Giờ giấc (Time)**: Điền mặc định `00:00:00` nếu thiếu giờ.
  - **Kiểu Chuỗi (String)**: Điền mặc định `"N/A"` đối với các trường thông tin chữ bị bỏ trống.

---

## 2. Chuẩn Hóa Chuỗi Văn Bản & Loại Bỏ Dấu Tiếng Việt

Khi so khớp dữ liệu (như so khớp tên bệnh viện hoặc tên trạm vệ tinh), sự khác biệt về viết hoa/thường, dấu cách hoặc dấu tiếng Việt sẽ làm lệch kết quả. Hệ thống sử dụng một bộ lọc chuẩn hóa chuỗi văn bản nâng cao:

### Thuật toán loại bỏ dấu tiếng Việt (`remove_vietnamese_diacritics`)
Hệ thống sử dụng biểu thức chính quy (Regex) để chuyển đổi có hệ thống toàn bộ các ký tự có dấu sang không dấu:
```python
patterns = {
    '[àáảãạăằắẳẵặâầấẩẫậ]': 'a',
    '[đ]': 'd', '[Đ]': 'D',
    '[èéẻẽẹêềếểễệ]': 'e',
    '[ìíỉĩị]': 'i',
    '[òóỏõọôồốổỗộơờớởỡợ]': 'o',
    '[ùúủũụưừứửữự]': 'u',
    '[ỳýỷỹỵ]': 'y'
}
```

### Quy chuẩn rút gọn văn bản phục vụ so khớp (`norm`)
Hành trình làm sạch một chuỗi văn bản để so sánh:
1. Chuẩn hóa phân rã Unicode (`unicodedata.normalize("NFKD")`) và loại bỏ dấu tiếng Việt.
2. Viết thường toàn bộ chuỗi (`.lower()`).
3. Loại bỏ toàn bộ các dấu câu và ký tự đặc biệt như: `:`, `.`, `,`, `-`, `–`, `—`, `(`, `)`, `[`, `]`, `/` bằng dấu cách.
4. Thu gọn nhiều khoảng trắng liên tiếp thành một dấu cách duy nhất và cắt bỏ khoảng trắng thừa ở hai đầu (`.strip()`).

---

## 3. Quy Tắc Ẩn Danh Bệnh Nhân (Anonymization)

> [!WARNING]
> Để tuân thủ Luật An toàn thông tin và bảo vệ quyền riêng tư cá nhân của người bệnh, toàn bộ thông tin cột họ tên bệnh nhân (`ho_ten_benh_nhan`) trong bảng `public.kccnbv` bắt buộc phải được viết tắt (ẩn danh hóa) ngay trong giai đoạn Transform, trước khi lưu trữ vào PostgreSQL.

### Thuật toán viết tắt tên (`abbreviate_name`)
Quy trình biến đổi họ tên bệnh nhân diễn ra như sau:
1. Kiểm tra nếu giá trị là trống, "không rõ", hoặc "N/A" $\rightarrow$ Gán giá trị mặc định `"N/A"`.
2. Loại bỏ toàn bộ dấu tiếng Việt của tên bệnh nhân.
3. Tách chuỗi họ tên thành các từ đơn bằng dấu cách.
4. Lấy chữ cái đầu tiên của từng từ đơn, viết hoa toàn bộ và nối lại thành một chuỗi viết tắt duy nhất.

*Ví dụ minh họa quy trình:*
$$\text{Nguyễn Văn Á} \xrightarrow{\text{Bỏ dấu}} \text{Nguyen Van A} \xrightarrow{\text{Tách từ}} [\text{"Nguyen"}, \text{"Van"}, \text{"A"}] \xrightarrow{\text{Lấy chữ cái đầu}} \text{NVA}$$
$$\text{Lâm Thị Ngọc Bích} \rightarrow \text{Lam Thi Ngoc Bich} \rightarrow [\text{"Lam"}, \text{"Thi"}, \text{"Ngoc"}, \text{"Bich"}] \rightarrow \text{LTNB}$$

---

## 4. Đặc Tả Schema & Cột Dữ Liệu Từng Bảng

Dưới đây là chi tiết ánh xạ cột từ nguồn gốc sang cấu trúc bảng database của các luồng dữ liệu chính:

### A. Bảng Dữ Liệu Chi Tiết Cấp Cứu Ngoài Bệnh Viện (`public.kccnbv`)
Dữ liệu được nạp từ Excel 41 cột nguyên bản (tương ứng `a1` đến `a41`), sau khi loại bỏ 3 dòng tiêu đề đầu tiên, được đổi tên và ép kiểu như sau:

| Tên Cột DB | Kiểu Dữ Liệu | Cột Excel gốc | Mô Tả Nghiệp Vụ | Quy Tắc Làm Sạch Đặc Biệt |
| :--- | :--- | :--- | :--- | :--- |
| `stt` | `int` | `a1` | Số thứ tự của bản ghi trong file Excel | Ép số nguyên, mặc định `0` |
| `so_benh_an` | `int` | `a2` | **Số bệnh án cấp cứu (Khóa chính)** | Giá trị định danh bắt buộc, dùng để khử trùng |
| `ngay` | `date` | `a3` | Ngày tiếp nhận cuộc gọi cấp cứu | Định dạng `dd/mm/yyyy`, mặc định `1970-01-01` |
| `xu_ly_boi` | `string` | `a4` | Tên nhân viên/điều phối viên tiếp nhận | Chuỗi văn bản, mặc định `"N/A"` |
| `tram_duoc_thong_bao` | `string` | `a5` | Trạm vệ tinh được tổng đài chỉ định | Chuỗi văn bản, mặc định `"N/A"` |
| `tram_xu_ly` | `string` | `a6` | Trạm vệ tinh thực tế điều động xe xử lý | Chuỗi văn bản, mặc định `"N/A"` |
| `ho_ten_benh_nhan` | `string` | `a7` | Họ và tên bệnh nhân | **Bắt buộc áp dụng ẩn danh bằng chữ cái đầu (NVA)** |
| `gioi_tinh` | `string` | `a8` | Giới tính bệnh nhân | Chuỗi văn bản, mặc định `"N/A"` |
| `sinh_nam` | `int` | `a9` | Năm sinh của bệnh nhân | Ép số nguyên |
| `dia_chi_cap_cuu` | `string` | `a10` | Địa chỉ hiện trường phát sinh sự việc | Chuỗi văn bản |
| `goi_cap_cuu` | `time` | `a11` | Thời điểm khách hàng gọi cấp cứu | Định dạng thời gian, dùng để tính ca trực |
| `thoi_gian_tao_phieu_tiep_nhan`| `time`| `a12` | Thời điểm tạo phiếu tiếp nhận | Định dạng thời gian |
| `thoi_gian_nhan_dien_thoai`| `time`| `a13` | Thời điểm điều phối viên nhận đt | Định dạng thời gian |
| `thoi_gian_xuat_xe` | `time` | `a14` | Thời điểm xe cứu thương xuất phát | Định dạng thời gian |
| `thoi_gian_den_hien_truong`| `time`| `a15` | Thời điểm xe đến hiện trường cấp cứu | Định dạng thời gian |
| `thoi_gian_den_benh_vien`| `time`| `a16` | Thời điểm xe đưa bệnh nhân đến BV | Định dạng thời gian |
| `thoi_gian_hoan_tat` | `time` | `a17` | Thời điểm xe hoàn thành ca trực | Định dạng thời gian |
| `thoi_luong_xu_ly` | `int` | `a18` | Tổng thời lượng xử lý (phút) | Ép số nguyên |
| `thoi_luong_dieu_phoi` | `int` | `a19` | Thời lượng điều phối cuộc gọi | Ép số nguyên |
| `thoi_luong_xuat_xe` | `int` | `a20` | Thời lượng từ lúc nhận ca đến lúc xuất xe| Ép số nguyên |
| `thoi_luong_den_hien_truong`| `int`| `a21` | Thời lượng di chuyển đến hiện trường | Ép số nguyên |
| `thoi_luong_den_benh_vien`| `int`| `a22` | Thời lượng di chuyển từ hiện trường đến BV| Ép số nguyên |
| `thoi_luong_hoan_tat_ban_giao`| `int`| `a23` | Thời lượng bàn giao bệnh nhân tại BV | Ép số nguyên |
| `ly_do_goi_den_cap_cuu` | `string` | `a24` | Lý do ban đầu gọi cấp cứu | Chuỗi văn bản |
| `huyet_ap` | `string` | `a25` | Huyết áp đo lần 1 | Chuỗi văn bản |
| `mach` | `string` | `a26` | Mạch đo lần 1 | Chuỗi văn bản |
| `nhiet_do` | `string` | `a27` | Nhiệt độ đo lần 1 | Chuỗi văn bản |
| `nhip_tho` | `string` | `a28` | Nhịp thở đo lần 1 | Chuỗi văn bản |
| `spo2` | `string` | `a29` | Chỉ số SpO2 đo lần 1 | Chuỗi văn bản |
| `ly_do_cap_cuu` | `string` | `a30` | Lý do y khoa xác định tại hiện trường | Chuỗi văn bản |
| `ma_benh` | `string` | `a31` | Mã phân loại bệnh (ICD-10) | Chuỗi văn bản |
| `chan_doan_theo_icd` | `string` | `a32` | Chẩn đoán chi tiết theo mã ICD-10 | Chuỗi văn bản |
| `chan_doan_so_bo` | `string` | `a33` | Chẩn đoán sơ bộ ban đầu của y bác sĩ | Chuỗi văn bản |
| `benh_vien_nhan` | `string` | `a34` | Bệnh viện tiếp nhận bệnh nhân | Chuỗi văn bản (dùng để so khớp danh mục) |
| `xu_tri` | `string` | `a35` | Biện pháp sơ cấp cứu đã thực hiện | Chuỗi văn bản |
| `ghi_chu_sau_xu_tri` | `string` | `a36` | Các ghi chú lâm sàng bổ sung | Chuỗi văn bản |
| `huyet_ap_2` | `string` | `a37` | Huyết áp đo lần 2 | Chuỗi văn bản |
| `mach_2` | `string` | `a38` | Mạch đo lần 2 | Chuỗi văn bản |
| `nhiet_do_2` | `string` | `a39` | Nhiệt độ đo lần 2 | Chuỗi văn bản |
| `nhip_tho_2` | `string` | `a40` | Nhịp thở đo lần 2 | Chuỗi văn bản |
| `spo2_2` | `string` | `a41` | Chỉ số SpO2 đo lần 2 | Chuỗi văn bản |

---

### B. Bảng Sự Cố Y Khoa (`public.suco`)
Dữ liệu lấy từ biểu mẫu Google Sheets, ánh xạ từ cột `a1` đến `a37` sang tiếng Việt chuẩn hóa, các cột trống được điền mặc định `None` để nạp vào DB:

| Tên Cột DB | Mô Tả Nghiệp Vụ |
| :--- | :--- |
| `Dấu_thời_gian` | Thời điểm bản ghi được tạo (Khóa chính kết hợp) |
| `Ngày_báo_cáo` | Ngày tạo báo cáo sự cố (Khóa chính kết hợp) |
| `Công_tác_tại_khoa` | Khoa/phòng xảy ra hoặc báo cáo sự cố |
| **Nhóm Sự cố KDH** | *Gồm 16 cột phục vụ khoa Cấp cứu ngoài viện (KDH):* Loại sự cố, tên cụ thể, đánh giá diễn biến, cấp độ nguy cơ, ngày/thời điểm xảy ra, nơi xảy ra, mô tả, nguyên nhân chính, giải pháp tức thì, đề xuất phòng ngừa, phòng ban xử lý, người xử trí, thời điểm hoàn tất, báo cáo lãnh đạo, cờ phân loại báo cáo KDH. |
| **Nhóm Sự cố KCCNBV** | *Gồm 15 cột phục vụ khoa Cấp cứu ngoài bệnh viện (KCCNBV):* Tương tự nhóm KDH nhưng dành cho trạm vệ tinh và hoạt động ngoài bệnh viện (ngày/giờ/nơi xảy ra, mô tả, nguyên nhân, giải pháp tức thì, đề xuất ngừa, phòng xử lý, thời gian hoàn thành, báo cáo lãnh đạo). |
| **Thông tin thêm** | *Gồm 3 cột:* Họ tên người gây ra sự cố, Số điện thoại người gây sự cố, và các văn bản đính kèm bắt buộc. |

---

### C. Bảng Chỉ Số Chất Lượng Khoa Phòng (`public.chi_so`)
Ánh xạ đặc biệt chuyển đổi tiêu đề câu hỏi dài của Google Sheets thành các trường viết tắt `cs24` đến `cs53`:

| Mã Cột DB | Tiêu Đề Google Sheets Gốc | Kiểu Dữ Liệu |
| :--- | :--- | :--- |
| `time` | Dấu thời gian | `datetime` |
| `by` | Họ và tên người nhập | `string` |
| `phone` | Số điện thoại của anh/chị | `string` |
| `datereport` | Anh/Chị báo cáo cho số liệu ngày nào? | `date` |
| `room` | Anh/Chị đang công tác khoa/phòng nào? | `string` |
| `cs24` | Chỉ số 24: Trung bình thời gian tại hiện trường | `float` |
| `cs25` | Chỉ số 25: Trung bình thời gian chuyển đến bệnh viện | `float` |
| `cs28` | Chỉ số 28: Tỷ lệ thiết bị y tế tại Khoa CCNBV được bảo trì, bảo dưỡng theo quy định | `float` |
| `cs29` | Chỉ số 29: Tỷ lệ hoàn tất công tác kiểm định, hiệu chuẩn thiết bị y tế | `float` |
| `cs30` | Chỉ số 30: Tỷ lệ cung ứng đủ số lượng VTYT, thuốc và đảm bảo chất lượng... | `float` |
| `cs31` | Chỉ số 31: Tỷ lệ tai nạn thương tích do vật sắc nhọn | `float` |
| `cs32` | Chỉ số 32: Tỷ lệ tuân thủ vệ sinh tay | `float` |
| `cs33` | Chỉ số 33: Sự hài lòng chung về Trung tâm | `float` |
| `cs34` | Chỉ số 34: Điểm tiêu chí cải cách hành chính | `string` (tiêu chí điểm chữ) |
| `cs35` | Chỉ số 35: Điểm tiêu chí cơ sở xanh-sạch-đẹp | `float` |
| `cs36` | Chỉ số 36: Sự cố ngoài y khoa nghiêm trọng | `float` |
| `cs37` | Chỉ số 37: Tỷ lệ xe cứu thương được kết nối định vị, giám sát và điều phối... | `float` |
| `cs38` | Chỉ số 38: Hiệu suất sử dụng xe cứu thương | `float` |
| `cs39` | Chỉ số 39: Tỷ lệ nhân viên được tuyển dụng nhân sự theo đề án vị trí việc làm | `float` |
| `cs40` | Chỉ số 40: Số sự cố y khoa bắt buộc báo cáo | `float` |
| `cs41` | Chỉ số 41: Tỷ lệ hài lòng của người dân sử dụng dịch vụ cấp cứu ngoài BV | `float` |
| `cs42` | Chỉ số 42: Điểm tiêu chí chất lượng Trung tâm | `float` |
| `cs43` | Chỉ số 43: Điểm tiêu chí chất lượng Trạm vệ tinh cấp cứu 115 | `float` |
| `cs44` | Chỉ số 44: Tổng số Trạm vệ tinh Cấp cứu 115 tại Thành phố Hồ Chí Minh | `float` |
| `cs45` | Chỉ số 45: Tỷ lệ Trạm vệ tinh được kết nối và điều hành qua hệ thống thông minh | `float` |
| `cs46` | Chỉ số 46: Tỷ lệ nhân viên y tế tại khoa Cấp cứu TVT được đào tạo liên tục... | `float` |
| `cs47` | Chỉ số 47: Số công tác phục vụ sự kiện văn hóa, chính trị, xã hội | `float` |
| `cs48` | Chỉ số 48: Số cơ sở y tế được Trung tâm Cấp cứu hỗ trợ chuyên môn | `float` |
| `cs49` | Chỉ số 49: Số lớp đào tạo liên tục cho nhân viên y tế | `float` |
| `cs50` | Chỉ số 50: Số lớp đào tạo cho cộng đồng | `float` |
| `cs51` | Chỉ số 51: Tổng số biên lai/phiên trực | `float` |
| `cs52` | Chỉ số 52: Trung bình số tiền/Biên lai có thu được tiền | `float` |
| `cs53` | Chỉ số 53: Số tiền thu được/phiên trực | `float` |

*Lưu ý: Đối với các trạm vệ tinh cụ thể (Quận 8, Cần Giờ, Ung Bướu, Thủ Đức, Bình Trưng), Google Sheet có các cột chỉ số riêng biệt được ký hiệu bằng hậu tố tương ứng phía sau (ví dụ: `cs24q8` cho Quận 8, `cs24cg` cho Cần Giờ, `cs24ub` cho Ung Bướu, `cs24td` cho Thủ Đức, `cs24bt` cho Bình Trưng và nhóm chỉ số thu tiền biên lai tương tự).*
