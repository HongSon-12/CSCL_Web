import openpyxl

def create_files():
    # 1. Tạo file chứa lỗi để test cổng chặn (Hard Stop)
    wb_err = openpyxl.Workbook()
    ws_err = wb_err.active
    ws_err.title = "Bao cao loi"
    ws_err.append(["Ngày báo cáo", "Mã khoa/trạm", "Mã biến số", "Giá trị", "Ghi chú"])
    ws_err.append(["2026-05-28", "QLCL", "A1", "15", "Dòng hợp lệ A1"])
    ws_err.append(["2026-05-28", "QLCL", "A2", "-5", "Lỗi: Giá trị nhỏ hơn 0"])
    ws_err.append(["2026-05-28", "KHOA_SAI", "A3", "10", "Lỗi: Khoa phòng không tồn tại"])
    ws_err.append(["2026-05-28", "KDH", "A4", "", "Lỗi: Rỗng biến số bắt buộc A4"])
    ws_err.append(["2026-05-28", "KDH", "B1", "30", "Dòng hợp lệ B1 (không bắt buộc)"])
    wb_err.save("storage/test_import_with_errors.xlsx")
    print("Created 'storage/test_import_with_errors.xlsx' successfully.")

    # 2. Tạo file 100% hợp lệ để test nạp giao dịch thành công (Confirm)
    wb_ok = openpyxl.Workbook()
    ws_ok = wb_ok.active
    ws_ok.title = "Bao cao chuan"
    ws_ok.append(["Ngày báo cáo", "Mã khoa/trạm", "Mã biến số", "Giá trị", "Ghi chú"])
    ws_ok.append(["2026-05-28", "QLCL", "A1", "12", "Hợp lệ A1"])
    ws_ok.append(["2026-05-28", "QLCL", "A2", "8", "Hợp lệ A2"])
    ws_ok.append(["2026-05-28", "KDH", "A3", "20", "Hợp lệ A3"])
    ws_ok.append(["2026-05-28", "KDH", "A4", "5", "Hợp lệ A4"])
    ws_ok.append(["2026-05-28", "KDH", "B1", "50", "Hợp lệ B1"])
    wb_ok.save("storage/test_import_perfect_valid.xlsx")
    print("Created 'storage/test_import_perfect_valid.xlsx' successfully.")

if __name__ == "__main__":
    create_files()
