from data_engine.calculations.safe_math import safe_divide

def calculate_cs1(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS1: Tổng số cuộc gọi. Kết quả = Tổng A1."""
    a1_vals = var_map.get("a1", [])
    num = sum(a1_vals)
    return num, None, num

def calculate_cs2(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS2: Tỷ lệ cuộc gọi được tiếp nhận. Kết quả = (Tổng A2 / Tổng A1) * 100."""
    a1_vals = var_map.get("a1", [])
    a2_vals = var_map.get("a2", [])
    num = sum(a2_vals)
    den = sum(a1_vals)
    val = safe_divide(num, den) * 100.0
    return num, den, val

def calculate_cs3(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS3: Tỷ lệ cuộc gọi có nội dung. Kết quả = (Tổng A3 / Tổng A1) * 100."""
    a1_vals = var_map.get("a1", [])
    a3_vals = var_map.get("a3", [])
    num = sum(a3_vals)
    den = sum(a1_vals)
    val = safe_divide(num, den) * 100.0
    return num, den, val

def calculate_cs4(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS4: Tỷ lệ cuộc gọi có dấu hiệu cấp cứu. Kết quả = (Tổng A4 / Tổng A1) * 100."""
    a1_vals = var_map.get("a1", [])
    a4_vals = var_map.get("a4", [])
    num = sum(a4_vals)
    den = sum(a1_vals)
    val = safe_divide(num, den) * 100.0
    return num, den, val

def calculate_cs5(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS5: Tỷ lệ trường hợp cấp cứu điều phối KCCNBV. Kết quả = (Tổng A5 / Tổng A4) * 100."""
    a4_vals = var_map.get("a4", [])
    a5_vals = var_map.get("a5", [])
    num = sum(a5_vals)
    den = sum(a4_vals)
    val = safe_divide(num, den) * 100.0
    return num, den, val

def calculate_cs6(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS6: Tổng số ca vận chuyển. Kết quả = Tổng B1."""
    b1_vals = var_map.get("b1", [])
    num = sum(b1_vals)
    return num, None, num

def calculate_cs7(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS7: Tỷ lệ vận chuyển có bệnh nhân cấp cứu. Kết quả = (Tổng B2 / Tổng B1) * 100."""
    b1_vals = var_map.get("b1", [])
    b2_vals = var_map.get("b2", [])
    num = sum(b2_vals)
    den = sum(b1_vals)
    val = safe_divide(num, den) * 100.0
    return num, den, val

def calculate_cs8(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS8: Tỷ lệ vận chuyển có can thiệp nâng cao. Kết quả = (Tổng B3 / Tổng B1) * 100."""
    b1_vals = var_map.get("b1", [])
    b3_vals = var_map.get("b3", [])
    num = sum(b3_vals)
    den = sum(b1_vals)
    val = safe_divide(num, den) * 100.0
    return num, den, val

def calculate_cs9(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS9: Tỷ lệ vận chuyển chuyển tuyến. Kết quả = (Tổng B4 / Tổng B1) * 100."""
    b1_vals = var_map.get("b1", [])
    b4_vals = var_map.get("b4", [])
    num = sum(b4_vals)
    den = sum(b1_vals)
    val = safe_divide(num, den) * 100.0
    return num, den, val

def calculate_cs10(var_map: dict[str, list[float]]) -> tuple[float, float | None, float]:
    """CS10: Tỷ lệ vận chuyển phản hồi trễ. Kết quả = (Tổng B5 / Tổng B4) * 100."""
    b4_vals = var_map.get("b4", [])
    b5_vals = var_map.get("b5", [])
    num = sum(b5_vals)
    den = sum(b4_vals)
    val = safe_divide(num, den) * 100.0
    return num, den, val


# Registry ánh xạ formula_python_key sang các hàm tính toán Python
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
}
