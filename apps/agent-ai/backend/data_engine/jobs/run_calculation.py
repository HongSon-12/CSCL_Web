from sqlalchemy.orm import Session
from datetime import datetime, date
import traceback

from models import QualityCalculationRun, QualityIndicatorResult, QualityIndicatorCatalog
from data_engine.calculations.variables import load_input_variables
from data_engine.calculations.indicators import INDICATOR_REGISTRY

def run_calculation_job(
    db: Session,
    run_id: int,
    report_date: date,
    period_type: str = "daily",
    department_code: str | None = None,
    station_code: str | None = None
) -> None:
    """
    [PHASE 6] Động Cơ Chạy Tính Toán Chỉ Số Chất Lượng (Calculation Engine Core Job)
    Tiến hành tính toán tất cả các chỉ số chất lượng lâm sàng trong catalog dựa trên biến số thô đã duyệt.
    """
    run_rec = db.query(QualityCalculationRun).filter(QualityCalculationRun.id == run_id).first()
    if not run_rec:
        return

    # Cập nhật trạng thái đang xử lý tính toán
    run_rec.status = "running"
    run_rec.started_at = datetime.utcnow()
    db.commit()

    log_buffer: list[str] = [
        f"--- STARTING CALCULATION ENGINE RUN ID: {run_id} ---",
        f"Target Date: {report_date.isoformat()}",
        f"Period Type: {period_type}",
        f"Filter Department: {department_code or 'ALL'}",
        f"Filter Station: {station_code or 'NONE'}",
        f"Time Started: {run_rec.started_at.isoformat()}"
    ]

    success_count = 0
    error_count = 0

    try:
        # 1. Tải toàn bộ biến thô từ CSDL đã duyệt/khóa
        log_buffer.append("\n[STEP 1] Loading approved/locked variables from database...")
        var_map = load_input_variables(
            db=db,
            report_date=report_date,
            period_type=period_type,
            department_code=department_code,
            station_code=station_code
        )
        
        variables_found = ", ".join([f"{k.upper()}({len(v)} dòng)" for k, v in var_map.items()])
        log_buffer.append(f"Loaded variables catalog: {variables_found if variables_found else 'Không có dữ liệu số liệu thô hợp lệ'}")

        # 2. Truy vấn danh sách chỉ số từ Catalog
        log_buffer.append("\n[STEP 2] Fetching active indicators from catalog...")
        indicators = db.query(QualityIndicatorCatalog).filter(QualityIndicatorCatalog.is_active.is_(True)).all()
        log_buffer.append(f"Active indicator catalog size: {len(indicators)} chỉ số.")

        # 3. Tiến hành tính toán cho từng chỉ số trong Catalog
        log_buffer.append("\n[STEP 3] Running calculations package...")
        for ind in indicators:
            python_key = ind.formula_python_key
            if not python_key:
                log_buffer.append(f"⚠️ Chỉ số {ind.code} bỏ qua: Không định dạng formula_python_key.")
                continue

            python_key_lower = python_key.lower()
            if python_key_lower not in INDICATOR_REGISTRY:
                log_buffer.append(f"⚠️ Chỉ số {ind.code} bỏ qua: Mã key '{python_key}' không có trong Python registry.")
                continue

            calc_fn = INDICATOR_REGISTRY[python_key_lower]
            try:
                # Thực thi tính toán chỉ số
                num, den, val = calc_fn(var_map)
                
                # Thực hiện UPSERT kết quả chỉ số vào CSDL
                existing_res = db.query(QualityIndicatorResult).filter(
                    QualityIndicatorResult.indicator_code == ind.code,
                    QualityIndicatorResult.period_type == period_type,
                    QualityIndicatorResult.report_date == report_date,
                    QualityIndicatorResult.department_code == department_code,
                    QualityIndicatorResult.station_code == station_code
                ).first()

                if existing_res:
                    existing_res.numerator_value = num
                    existing_res.denominator_value = den
                    existing_res.value = val
                    existing_res.calculated_at = datetime.utcnow()
                    existing_res.calculation_run_id = run_id
                else:
                    new_res = QualityIndicatorResult(
                        indicator_code=ind.code,
                        period_type=period_type,
                        report_date=report_date,
                        department_code=department_code,
                        station_code=station_code,
                        numerator_value=num,
                        denominator_value=den,
                        value=val,
                        calculated_at=datetime.utcnow(),
                        calculation_run_id=run_id
                    )
                    db.add(new_res)

                success_count += 1
                log_buffer.append(f"✅ CS{ind.code} - Tính thành công! Kết quả = {val:.2f} (Tử = {num}, Mẫu = {den if den is not None else 'N/A'})")
            except Exception as ex:
                error_count += 1
                err_trace = "".join(traceback.format_exception(type(ex), ex, ex.__traceback__))
                log_buffer.append(f"❌ CS{ind.code} - Lỗi tính toán! Chi tiết lỗi:\n{err_trace}")

        # 4. Lưu trạng thái lượt chạy dựa trên tỷ lệ lỗi
        run_rec.finished_at = datetime.utcnow()
        run_rec.success_count = success_count
        run_rec.error_count = error_count
        
        if error_count == 0:
            run_rec.status = "success"
        elif success_count == 0:
            run_rec.status = "failed"
        else:
            run_rec.status = "partial_success"
            
        log_buffer.append(f"\n[STEP 4] Run completed with status '{run_rec.status.upper()}'. Success={success_count}, Errors={error_count}")
        log_buffer.append(f"Time Completed: {run_rec.finished_at.isoformat()}")
        
    except Exception as job_ex:
        # Xử lý nếu tiến trình bị lỗi nghiêm trọng
        run_rec.finished_at = datetime.utcnow()
        run_rec.status = "failed"
        run_rec.error_count = error_count or 1
        
        err_trace = "".join(traceback.format_exception(type(job_ex), job_ex, job_ex.__traceback__))
        log_buffer.append(f"\n❌ CRITICAL SYSTEM ERROR IN JOB RUNNER:\n{err_trace}")
        
    finally:
        run_rec.logs = "\n".join(log_buffer)
        db.commit()
