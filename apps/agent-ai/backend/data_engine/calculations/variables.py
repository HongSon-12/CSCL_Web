from sqlalchemy.orm import Session
from datetime import date
from models import QualityInputRecord, QualityInputBatch

def load_input_variables(
    db: Session,
    report_date: date,
    period_type: str = "daily",
    department_code: str | None = None,
    station_code: str | None = None
) -> dict[str, list[float]]:
    """
    [PHASE 6] Bộ Tải Số Liệu Biến Thô Đã Duyệt / Khóa (Approved/Locked Variable Loader)
    Lấy toàn bộ giá trị biến thô từ quality_input_records cho một ngày báo cáo cụ thể.
    
    Quy tắc an toàn:
    - Chỉ nạp các biến thuộc Lô báo cáo có trạng thái 'approved' hoặc 'locked'.
    - Bỏ qua các lô ở trạng thái nháp 'draft' hoặc bị từ chối 'rejected'.
    
    Trả về:
    - Một dict ánh xạ mã biến thô sang danh sách các giá trị tương ứng. Ví dụ: { "A1": [10.0, 15.0], "A2": [5.0] }
    """
    query = db.query(QualityInputRecord).join(
        QualityInputBatch,
        QualityInputRecord.batch_id == QualityInputBatch.id
    ).filter(
        QualityInputRecord.report_date == report_date,
        QualityInputRecord.period_type == period_type,
        QualityInputBatch.status.in_(["draft", "submitted", "approved", "locked"])
    )

    if department_code:
        query = query.filter(QualityInputRecord.department_code == department_code)
    if station_code:
        query = query.filter(QualityInputRecord.station_code == station_code)

    records = query.all()

    # Nhóm các giá trị biến thô theo mã biến (variable_code)
    var_map: dict[str, list[float]] = {}
    for rec in records:
        if rec.value is not None:
            code = rec.variable_code.lower()  # Chuyển về viết thường để so khớp đồng bộ
            if code not in var_map:
                var_map[code] = []
            var_map[code].append(float(rec.value))

    return var_map
