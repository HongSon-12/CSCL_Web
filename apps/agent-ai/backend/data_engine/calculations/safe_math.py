def safe_divide(numerator, denominator, default=0.0):
    """
    [PHASE 6] Bộ Chia An Toàn (Safe Division)
    Tránh lỗi ZeroDivisionError khi tính tỷ lệ chỉ số trong trường hợp mẫu số bằng 0 hoặc trống.
    Supports float and decimal casting safely.
    """
    try:
        if denominator is None:
            return default
        den_float = float(denominator)
        if den_float == 0.0:
            return default
        if numerator is None:
            return default
        num_float = float(numerator)
        return num_float / den_float
    except (ValueError, TypeError):
        return default
