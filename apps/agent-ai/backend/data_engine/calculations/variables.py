# -*- coding: utf-8 -*-
"""
[PHASE 6] Bộ Tải Số Liệu Biến Thô Đa Nguồn (Multi-source Variable Loader)
Tải và tổng hợp dữ liệu từ:
1. callcenterdata & handlebyarea (Chỉ số điều hành CS1-CS10)
2. kccnbv (Chỉ số lâm sàng ngoài bệnh viện CS11-CS26)
3. chi_so (Chỉ số khoa phòng nhập tay CS27-CS53)
"""
from sqlalchemy.orm import Session
from datetime import date, datetime
from sqlalchemy import func

from models import (
    QualityCallCenterData,
    QualityHandleByArea,
    QualityKccnbv,
    QualityChiSo,
    QualityInputRecord,
    QualityInputBatch
)

def map_tram_to_station_code(tram_name: str) -> str:
    if not tram_name:
        return "TT115"
    t = str(tram_name).upper()
    if "TRUNG TÂM 115" in t or "TRUNG TAM 115" in t:
        return "TT115"
    elif "CẦN GIỜ" in t or "CAN GIO" in t:
        return "CG"
    elif "QUẬN 8" in t or "QUAN 8" in t or "BÌNH ĐÔNG" in t or "BINH DONG" in t:
        return "Q8"
    elif "UNG BƯỚU" in t or "UNG BUOU" in t:
        return "UB"
    elif "THỦ ĐỨC" in t or "THU DUC" in t:
        return "TD"
    elif "BÌNH TRƯNG" in t or "BINH TRUNG" in t or "LÊ VĂN THỊNH" in t or "LE VAN THINH" in t:
        return "BT"
    return "TT115"

def load_input_variables(
    db: Session,
    report_date: date,
    period_type: str = "daily",
    department_code: str | None = None,
    station_code: str | None = None
) -> dict[str, list[float]]:
    """
    Tổng hợp tất cả số liệu thô phục vụ động cơ tính toán 53 chỉ số.
    Trả về một dictionary var_map chứa danh sách các giá trị cho các key tương ứng.
    """
    var_map: dict[str, list[float]] = {}

    # --- 1. TẢI DỮ LIỆU ĐIỀU HÀNH TỔNG ĐÀI (callcenterdata) ---
    cc_records = db.query(QualityCallCenterData).filter(
        QualityCallCenterData.reportfordate == report_date
    ).all()
    
    totalcalls = sum([r.totalcalls for r in cc_records if r.totalcalls is not None])
    callsreceived = sum([r.callsreceived for r in cc_records if r.callsreceived is not None])
    callswithcontent = sum([r.callswithcontent for r in cc_records if r.callswithcontent is not None])
    callswithemergencysignstotal = sum([r.callswithemergencysignstotal for r in cc_records if r.callswithemergencysignstotal is not None])
    averagecallsperday = sum([float(r.averagecallsperday) for r in cc_records if r.averagecallsperday is not None]) / len([r for r in cc_records if r.averagecallsperday is not None]) if len([r for r in cc_records if r.averagecallsperday is not None]) > 0 else 0.0
    
    var_map["totalcalls"] = [float(totalcalls)]
    var_map["callsreceived"] = [float(callsreceived)]
    var_map["callswithcontent"] = [float(callswithcontent)]
    var_map["callswithemergencysignstotal"] = [float(callswithemergencysignstotal)]
    var_map["averagecallsperday"] = [float(averagecallsperday)]

    # --- 2. TẢI DỮ LIỆU ĐIỀU PHỐI ĐỊA BÀN (handlebyarea) ---
    hba_records = db.query(QualityHandleByArea).all()
    # Lọc thủ công bằng Python để tránh lỗi tương thích kiểu ngày của sqlite / postgres
    hba_filtered = []
    for r in hba_records:
        if r.date_created:
            if isinstance(r.date_created, datetime):
                r_date = r.date_created.date()
            else:
                r_date = r.date_created
            if r_date == report_date:
                hba_filtered.append(r)
                
    receivedbysatellite = sum([r.receivedbysatellite for r in hba_filtered if r.receivedbysatellite is not None])
    transfertosatellite = sum([r.transfertosatellite for r in hba_filtered if r.transfertosatellite is not None])
    nolongerneededcalls = sum([r.nolongerneededcalls for r in hba_filtered if r.nolongerneededcalls is not None])
    othertransfer = sum([r.othertransfer for r in hba_filtered if r.othertransfer is not None])
    transfertohospitalpatient = sum([r.transfertohospitalpatient for r in hba_filtered if r.transfertohospitalpatient is not None])
    tripwithpatient = sum([r.tripwithpatient for r in hba_filtered if r.tripwithpatient is not None])
    diedpatient = sum([r.diedpatient for r in hba_filtered if r.diedpatient is not None])

    var_map["receivedbysatellite"] = [float(receivedbysatellite)]
    var_map["transfertosatellite"] = [float(transfertosatellite)]
    var_map["nolongerneededcalls"] = [float(nolongerneededcalls)]
    var_map["othertransfer"] = [float(othertransfer)]
    var_map["transfertohospitalpatient"] = [float(transfertohospitalpatient)]
    var_map["tripwithpatient"] = [float(tripwithpatient)]
    var_map["diedpatient"] = [float(diedpatient)]

    # --- 3. TẢI DỮ LIỆU CHI TIẾT CHUYẾN XE CẤP CỨU (kccnbv) ---
    kcc_query = db.query(QualityKccnbv).filter(QualityKccnbv.ngay == report_date)
    kcc_records = kcc_query.all()
    
    # Lọc theo trạm vệ tinh nếu có
    if station_code:
        kcc_records = [r for r in kcc_records if map_tram_to_station_code(r.tram_xu_ly) == station_code]

    total_trips = len(kcc_records)
    activated_trips = sum([1 for r in kcc_records if r.thoi_luong_xuat_xe and r.thoi_luong_xuat_xe > 0])
    
    # Bệnh nhân thực tế: họ tên không rỗng và xử trí không phải hủy
    patient_trips = 0
    hospital_trips = 0
    cpr_cases = 0
    cpr_success = 0
    death_cases = 0
    emergency_cases = 0
    medical_intervention_cases = 0
    
    xu_ly_durations = []
    dieu_phoi_durations = []
    xuat_xe_durations = []
    toi_hien_truong_durations = []
    den_benh_vien_durations = []
    giao_benh_durations = []
    
    for r in kcc_records:
        # Check patient presence
        has_patient = False
        if r.ho_ten_benh_nhan and r.ho_ten_benh_nhan.strip() != "":
            xu_tri_str = str(r.xu_tri or "").lower()
            if "hủy" not in xu_tri_str and "không" not in xu_tri_str:
                patient_trips += 1
                has_patient = True
                
        # Hospital transfer
        if r.benh_vien_nhan and r.benh_vien_nhan.strip() != "":
            hospital_trips += 1
            
        # CPR
        xu_tri_str = str(r.xu_tri or "").lower()
        if "hồi sinh tim phổi" in xu_tri_str or "cấp cứu ngưng tuần hoàn" in xu_tri_str:
            cpr_cases += 1
            if "thành công" in xu_tri_str or "có tim lại" in xu_tri_str or "có tim" in xu_tri_str:
                cpr_success += 1
                
        # Death
        if "tử vong" in xu_tri_str or "tử vong" in str(r.ghi_chu_sau_xu_tri or "").lower():
            death_cases += 1
            
        # Emergency signs
        if (r.ly_do_cap_cuu and r.ly_do_cap_cuu.strip() != "") or (r.ma_benh and r.ma_benh.strip() != ""):
            emergency_cases += 1
            
        # Medical intervention
        if r.xu_tri and r.xu_tri.strip() != "" and "không" not in xu_tri_str:
            medical_intervention_cases += 1
            
        # Durations aggregation
        if r.thoi_luong_xu_ly is not None:
            xu_ly_durations.append(float(r.thoi_luong_xu_ly))
        if r.thoi_luong_dieu_phoi is not None:
            dieu_phoi_durations.append(float(r.thoi_luong_dieu_phoi))
        if r.thoi_luong_xuat_xe is not None:
            xuat_xe_durations.append(float(r.thoi_luong_xuat_xe))
        if r.thoi_luong_den_hien_truong is not None:
            toi_hien_truong_durations.append(float(r.thoi_luong_den_hien_truong))
        if r.thoi_luong_den_benh_vien is not None:
            den_benh_vien_durations.append(float(r.thoi_luong_den_benh_vien))
        if r.thoi_luong_hoan_tat_ban_giao is not None:
            giao_benh_durations.append(float(r.thoi_luong_hoan_tat_ban_giao))

    # Đưa các biến tổng hợp Kccnbv vào var_map
    var_map["total_trips"] = [float(total_trips)]
    var_map["activated_trips"] = [float(activated_trips)]
    var_map["patient_trips"] = [float(patient_trips)]
    var_map["hospital_trips"] = [float(hospital_trips)]
    var_map["cpr_cases"] = [float(cpr_cases)]
    var_map["cpr_success"] = [float(cpr_success)]
    var_map["death_cases"] = [float(death_cases)]
    var_map["emergency_cases"] = [float(emergency_cases)]
    var_map["medical_intervention_cases"] = [float(medical_intervention_cases)]
    
    # Durations averages
    var_map["thoi_luong_xu_ly"] = [sum(xu_ly_durations) / len(xu_ly_durations)] if xu_ly_durations else [0.0]
    var_map["thoi_luong_dieu_phoi"] = [sum(dieu_phoi_durations) / len(dieu_phoi_durations)] if dieu_phoi_durations else [0.0]
    var_map["thoi_luong_xuat_xe"] = [sum(xuat_xe_durations) / len(xuat_xe_durations)] if xuat_xe_durations else [0.0]
    var_map["thoi_luong_den_hien_truong"] = [sum(toi_hien_truong_durations) / len(toi_hien_truong_durations)] if toi_hien_truong_durations else [0.0]
    var_map["thoi_luong_den_benh_vien"] = [sum(den_benh_vien_durations) / len(den_benh_vien_durations)] if den_benh_vien_durations else [0.0]
    var_map["thoi_luong_hoan_tat_ban_giao"] = [sum(giao_benh_durations) / len(giao_benh_durations)] if giao_benh_durations else [0.0]

    # --- 4. TẢI DỮ LIỆU CHỈ SỐ KHOA PHÒNG NHẬP TAY (chi_so) ---
    cs_records = db.query(QualityChiSo).filter(QualityChiSo.datereport == report_date).all()
    input_records = db.query(QualityInputRecord).join(
        QualityInputBatch,
        QualityInputRecord.batch_id == QualityInputBatch.id
    ).filter(
        QualityInputRecord.report_date == report_date,
        QualityInputRecord.period_type == period_type,
        QualityInputBatch.status.in_(["draft", "submitted", "approved", "locked"])
    ).all()

    # Nạp từ chi_so trước
    for rec in cs_records:
        for c in range(24, 54):
            for suffix in ["", "cg", "q8", "td", "ub"]:
                field_name = f"cs{c}{suffix}"
                if hasattr(rec, field_name):
                    val = getattr(rec, field_name)
                    if val is not None:
                        var_map[field_name] = [float(val)]

    # Ghi đè/Nạp thêm từ input_records (những biến khoa phòng cs24-cs53)
    for rec in input_records:
        if rec.value is not None:
            code_lower = rec.variable_code.lower()
            if code_lower.startswith("cs") and code_lower[2:4].isdigit():
                var_map[code_lower] = [float(rec.value)]

    return var_map
