# -*- coding: utf-8 -*-
"""
[PHASE 6] Công thức tính toán 53 Chỉ số chất lượng lâm sàng & khoa phòng
Chứa toàn bộ logic toán học và nghiệp vụ y tế để tổng hợp các chỉ số tự động.
"""
from data_engine.calculations.safe_math import safe_divide

def get_first_value(var_map: dict[str, list[float]], key: str, default: float = 0.0) -> float:
    vals = var_map.get(key, [])
    if vals:
        return vals[0]
    return default

# ==========================================
# I. CHỈ SỐ ĐIỀU HÀNH TỔNG ĐÀI (CS1 - CS10)
# ==========================================

def calculate_cs1(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS1: Tổng số cuộc gọi tiếp nhận. Kết quả = Tổng cuộc gọi (totalcalls)."""
    totalcalls = get_first_value(var_map, "totalcalls")
    return totalcalls, None, totalcalls

def calculate_cs2(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS2: Tỷ lệ tiếp nhận cuộc gọi. Kết quả = (callsreceived / totalcalls) * 100."""
    callsreceived = get_first_value(var_map, "callsreceived")
    totalcalls = get_first_value(var_map, "totalcalls")
    val = safe_divide(callsreceived, totalcalls) * 100.0
    return callsreceived, totalcalls, val

def calculate_cs3(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS3: Tỷ lệ cuộc gọi có nội dung. Kết quả = (callswithcontent / callsreceived) * 100."""
    callswithcontent = get_first_value(var_map, "callswithcontent")
    callsreceived = get_first_value(var_map, "callsreceived")
    val = safe_divide(callswithcontent, callsreceived) * 100.0
    return callswithcontent, callsreceived, val

def calculate_cs4(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS4: Tỷ lệ cuộc gọi có dấu hiệu cấp cứu. Kết quả = (callswithemergencysignstotal / callswithcontent) * 100."""
    callswithemergencysignstotal = get_first_value(var_map, "callswithemergencysignstotal")
    callswithcontent = get_first_value(var_map, "callswithcontent")
    val = safe_divide(callswithemergencysignstotal, callswithcontent) * 100.0
    return callswithemergencysignstotal, callswithcontent, val

def calculate_cs5(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS5: Tỷ lệ cấp cứu điều phối trạm vệ tinh. Kết quả = (receivedbysatellite / transfertosatellite) * 100."""
    receivedbysatellite = get_first_value(var_map, "receivedbysatellite")
    transfertosatellite = get_first_value(var_map, "transfertosatellite")
    val = safe_divide(receivedbysatellite, transfertosatellite) * 100.0
    return receivedbysatellite, transfertosatellite, val

def calculate_cs6(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS6: Tổng số ca vận chuyển. Kết quả = Ca có bệnh nhân (tripwithpatient)."""
    tripwithpatient = get_first_value(var_map, "tripwithpatient")
    return tripwithpatient, None, tripwithpatient

def calculate_cs7(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS7: Tỷ lệ vận chuyển trạm vệ tinh nhận. Kết quả = (receivedbysatellite / transfertosatellite) * 100."""
    receivedbysatellite = get_first_value(var_map, "receivedbysatellite")
    transfertosatellite = get_first_value(var_map, "transfertosatellite")
    val = safe_divide(receivedbysatellite, transfertosatellite) * 100.0
    return receivedbysatellite, transfertosatellite, val

def calculate_cs8(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS8: Tỷ lệ cuộc gọi không cần thiết. Kết quả = (nolongerneededcalls / callswithemergencysignstotal) * 100."""
    nolongerneededcalls = get_first_value(var_map, "nolongerneededcalls")
    callswithemergencysignstotal = get_first_value(var_map, "callswithemergencysignstotal")
    val = safe_divide(nolongerneededcalls, callswithemergencysignstotal) * 100.0
    return nolongerneededcalls, callswithemergencysignstotal, val

def calculate_cs9(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS9: Tỷ lệ điều phối khác. Kết quả = (othertransfer / callswithemergencysignstotal) * 100."""
    othertransfer = get_first_value(var_map, "othertransfer")
    callswithemergencysignstotal = get_first_value(var_map, "callswithemergencysignstotal")
    val = safe_divide(othertransfer, callswithemergencysignstotal) * 100.0
    return othertransfer, callswithemergencysignstotal, val

def calculate_cs10(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS10: Tỷ lệ tử vong trong chuyến xe cấp cứu. Kết quả = (diedpatient / tripwithpatient) * 100."""
    diedpatient = get_first_value(var_map, "diedpatient")
    tripwithpatient = get_first_value(var_map, "tripwithpatient")
    val = safe_divide(diedpatient, tripwithpatient) * 100.0
    return diedpatient, tripwithpatient, val


# ==========================================
# II. CHỈ SỐ LÂM SÀNG EXCEL (CS11 - CS26)
# ==========================================

def calculate_cs11(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS11: Thời gian tiếp nhận tạo phiếu trung bình (phút)."""
    val = get_first_value(var_map, "thoi_luong_xu_ly")
    return val, None, val

def calculate_cs12(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS12: Thời gian tiếp nhận cuộc gọi trung bình (phút)."""
    val = get_first_value(var_map, "thoi_luong_dieu_phoi")
    return val, None, val

def calculate_cs13(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS13: Tổng số giờ đàm thoại điều phối tổng đài."""
    # (Tổng thời gian đàm thoại / 2) / 6 (theo Power BI Dax)
    total_trips = get_first_value(var_map, "total_trips")
    thoi_luong_dieu_phoi = get_first_value(var_map, "thoi_luong_dieu_phoi")
    sum_dieu_phoi = thoi_luong_dieu_phoi * total_trips
    val = safe_divide(sum_dieu_phoi, 2.0) / 6.0
    return sum_dieu_phoi, 12.0, val

def calculate_cs14(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS14: Trung bình thời gian tới hiện trường (phút)."""
    val = get_first_value(var_map, "thoi_luong_den_hien_truong")
    return val, None, val

def calculate_cs15(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS15: Tỷ lệ xuất xe cứu thương. Kết quả = (activated_trips / total_trips) * 100."""
    activated_trips = get_first_value(var_map, "activated_trips")
    total_trips = get_first_value(var_map, "total_trips")
    val = safe_divide(activated_trips, total_trips) * 100.0
    return activated_trips, total_trips, val

def calculate_cs16(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS16: Tỷ lệ chuyến xe có bệnh nhân. Kết quả = (patient_trips / activated_trips) * 100 (tối đa 100)."""
    patient_trips = get_first_value(var_map, "patient_trips")
    activated_trips = get_first_value(var_map, "activated_trips")
    ratio = safe_divide(patient_trips, activated_trips)
    if ratio > 1.0:
        ratio = 1.0
    val = ratio * 100.0
    return patient_trips, activated_trips, val

def calculate_cs17(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS17: Tỷ lệ trường hợp chuyển viện thành công. Kết quả = (hospital_trips / patient_trips) * 100."""
    hospital_trips = get_first_value(var_map, "hospital_trips")
    patient_trips = get_first_value(var_map, "patient_trips")
    val = safe_divide(hospital_trips, patient_trips) * 100.0
    return hospital_trips, patient_trips, val

def calculate_cs18(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS18: Tỷ lệ hồi sinh tim phổi thành công. Kết quả = (cpr_success / cpr_cases) * 100."""
    cpr_success = get_first_value(var_map, "cpr_success")
    cpr_cases = get_first_value(var_map, "cpr_cases")
    val = safe_divide(cpr_success, cpr_cases) * 100.0
    return cpr_success, cpr_cases, val

def calculate_cs19(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS19: Tổng số ca tử vong ngoại viện."""
    death_cases = get_first_value(var_map, "death_cases")
    return death_cases, None, death_cases

def calculate_cs20(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS20: Tỷ lệ trường hợp có dấu hiệu cấp cứu rõ rệt. Kết quả = (emergency_cases / total_trips) * 100."""
    emergency_cases = get_first_value(var_map, "emergency_cases")
    total_trips = get_first_value(var_map, "total_trips")
    val = safe_divide(emergency_cases, total_trips) * 100.0
    return emergency_cases, total_trips, val

def calculate_cs21(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS21: Tỷ lệ trường hợp có can thiệp y khoa. Kết quả = (medical_intervention_cases / patient_trips) * 100."""
    medical_intervention_cases = get_first_value(var_map, "medical_intervention_cases")
    patient_trips = get_first_value(var_map, "patient_trips")
    val = safe_divide(medical_intervention_cases, patient_trips) * 100.0
    return medical_intervention_cases, patient_trips, val

def calculate_cs22(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS22: Trung bình thời gian kích hoạt xuất xe (phút)."""
    val = get_first_value(var_map, "thoi_luong_xuat_xe")
    return val, None, val

def calculate_cs23(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS23: Trung bình thời gian tiếp cận bệnh nhân (phút)."""
    val = get_first_value(var_map, "thoi_luong_den_hien_truong")
    return val, None, val

# CS24 và CS25 là các chỉ số đặc thù được nhập thủ công hoặc tính toán tùy thuộc vào nguồn
def calculate_cs24(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS24: Trung bình thời gian tại hiện trường (phút)."""
    val = get_first_value(var_map, "cs24")
    return val, None, val

def calculate_cs25(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS25: Trung bình thời gian chuyển đến bệnh viện (phút)."""
    val = get_first_value(var_map, "cs25")
    if not val:
        val = get_first_value(var_map, "thoi_luong_den_benh_vien")
    return val, None, val

def calculate_cs26(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS26: Trung bình thời gian giao bệnh viện (phút)."""
    val = get_first_value(var_map, "thoi_luong_hoan_tat_ban_giao")
    return val, None, val


# ==========================================
# III. CHỈ SỐ KHOA PHÒNG NHẬP TAY (CS27 - CS53)
# ==========================================

def create_manual_calculator(index: int):
    def calculate(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
        val = get_first_value(var_map, f"cs{index}")
        # Một số chỉ số tỷ lệ % trong Power BI DAX cần chia cho 100
        if index in [30, 32, 33, 35, 36, 37, 38, 39, 41, 45, 46]:
            val = val / 100.0 if val else 0.0
        return val, None, val
    calculate.__doc__ = f"CS{index}: Chỉ số khoa phòng nhập liệu thủ công CS{index}."
    return calculate

# Tạo registry ánh xạ tự động
INDICATOR_REGISTRY = {
    "cs1": calculate_cs1,
    "cs2": calculate_cs2,
    "cs3": calculate_cs3,
    "cs4": calculate_cs4,
    "cs5": calculate_cs5,
    "cs6": calculate_cs6,
    "cs7": calculate_cs7,
    "cs8": calculate_cs8,
    "cs9": calculate_cs9,
    "cs10": calculate_cs10,
    "cs11": calculate_cs11,
    "cs12": calculate_cs12,
    "cs13": calculate_cs13,
    "cs14": calculate_cs14,
    "cs15": calculate_cs15,
    "cs16": calculate_cs16,
    "cs17": calculate_cs17,
    "cs18": calculate_cs18,
    "cs19": calculate_cs19,
    "cs20": calculate_cs20,
    "cs21": calculate_cs21,
    "cs22": calculate_cs22,
    "cs23": calculate_cs23,
    "cs24": calculate_cs24,
    "cs25": calculate_cs25,
    "cs26": calculate_cs26,
}

# Đăng ký tự động cho các chỉ số từ CS27 đến CS53
for i in range(27, 54):
    INDICATOR_REGISTRY[f"cs{i}"] = create_manual_calculator(i)
