import { NextRequest, NextResponse } from 'next/server';
import { query, isPeriodLocked } from '../../../../../../../lib/db';
import { verifyToken, getUserSession, hasPermission, checkScope } from '../../../../../../../lib/auth';

/**
 * [PHASE 6] API Lấy thông tin chi tiết một lô báo cáo cùng các records bên trong
 * GET /api/v1/quality/input/batches/[batch_id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { batch_id: string } }
) {
  try {
    const batchId = parseInt(params.batch_id);

    // 1. Xác thực người dùng thông qua JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, detail: 'Missing Authorization header', message: 'Missing Authorization header' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader);
    if (!decoded) {
      return NextResponse.json({ success: false, detail: 'Invalid or expired token', message: 'Invalid or expired token' }, { status: 401 });
    }

    const session = await getUserSession(decoded.sub);
    if (!session) {
      return NextResponse.json({ success: false, detail: 'User session not found or inactive', message: 'User session not found or inactive' }, { status: 401 });
    }

    // 2. Kiểm tra phân quyền truy cập hệ thống
    const hasViewPerm = hasPermission(session, 'reports:input:view');
    if (!hasViewPerm) {
      return NextResponse.json({ success: false, detail: 'Missing permission: reports:input:view', message: 'Missing permission: reports:input:view' }, { status: 403 });
    }

    // 3. Lấy thông tin Lô báo cáo từ CSDL
    const batchRes = await query(
      `SELECT id, batch_code, report_date, period_type, department_code, station_code, 
              source_type, status, created_by, submitted_by, approved_by, rejected_by, locked_by,
              created_at, submitted_at, approved_at, rejected_at, locked_at, note, reject_reason
       FROM quality_input_batches
       WHERE id = $1 LIMIT 1`,
      [batchId]
    );

    if (batchRes.rowCount === 0) {
      return NextResponse.json({ success: false, detail: `Batch ${batchId} not found.`, message: `Batch ${batchId} not found.` }, { status: 404 });
    }

    const batch = batchRes.rows[0];

    // 4. Bảo vệ phạm vi dữ liệu theo Scope khoa/trạm được giao
    const deptAllowed = checkScope(session, 'department', batch.department_code);
    const stationAllowed = checkScope(session, 'station', batch.station_code);
    if (!deptAllowed || !stationAllowed) {
      return NextResponse.json({ success: false, detail: `Missing scope access for department ${batch.department_code} / station ${batch.station_code}`, message: `Missing scope access for department ${batch.department_code} / station ${batch.station_code}` }, { status: 403 });
    }

    // 5. Query toàn bộ records chi tiết chỉ số của lô này
    const recordsRes = await query(
      `SELECT id, batch_id, report_date, period_type, department_code, station_code, 
              variable_code, indicator_code, value, text_value, unit, note, 
              row_status, error_code, error_message
       FROM quality_input_records
       WHERE batch_id = $1`,
      [batchId]
    );

    const serializedBatch = {
      id: parseInt(batch.id),
      batch_code: batch.batch_code,
      report_date: batch.report_date ? new Date(batch.report_date).toISOString().split('T')[0] : null,
      period_type: batch.period_type,
      department_code: batch.department_code,
      station_code: batch.station_code,
      source_type: batch.source_type,
      status: batch.status,
      created_by: batch.created_by,
      submitted_by: batch.submitted_by,
      approved_by: batch.approved_by,
      rejected_by: batch.rejected_by,
      locked_by: batch.locked_by,
      created_at: batch.created_at ? batch.created_at.toISOString() : null,
      submitted_at: batch.submitted_at ? batch.submitted_at.toISOString() : null,
      approved_at: batch.approved_at ? batch.approved_at.toISOString() : null,
      rejected_at: batch.rejected_at ? batch.rejected_at.toISOString() : null,
      locked_at: batch.locked_at ? batch.locked_at.toISOString() : null,
      note: batch.note,
      reject_reason: batch.reject_reason,
      records: recordsRes.rows.map(r => ({
        id: parseInt(r.id),
        batch_id: parseInt(r.batch_id),
        report_date: r.report_date ? new Date(r.report_date).toISOString().split('T')[0] : null,
        period_type: r.period_type,
        department_code: r.department_code,
        station_code: r.station_code,
        variable_code: r.variable_code,
        indicator_code: r.indicator_code,
        value: r.value !== null ? parseFloat(r.value) : null,
        text_value: r.text_value,
        unit: r.unit,
        note: r.note,
        row_status: r.row_status,
        error_code: r.error_code,
        error_message: r.error_message,
      })),
    };

    return NextResponse.json({
      success: true,
      message: 'Lấy thông tin chi tiết lô báo cáo thành công!',
      data: serializedBatch
    });
  } catch (err: any) {
    console.error('[API BATCH DETAIL GET] Failed:', err);
    return NextResponse.json({ success: false, detail: err.message, message: err.message }, { status: 500 });
  }
}

/**
 * [PHASE 6] API Cập nhật lô báo cáo đang ở trạng thái Nháp hoặc Bị từ chối
 * PUT /api/v1/quality/input/batches/[batch_id]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { batch_id: string } }
) {
  try {
    const batchId = parseInt(params.batch_id);

    // 1. Xác thực người dùng thông qua JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, detail: 'Missing Authorization header', message: 'Missing Authorization header' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader);
    if (!decoded) {
      return NextResponse.json({ success: false, detail: 'Invalid or expired token', message: 'Invalid or expired token' }, { status: 401 });
    }

    const session = await getUserSession(decoded.sub);
    if (!session) {
      return NextResponse.json({ success: false, detail: 'User session not found or inactive', message: 'User session not found or inactive' }, { status: 401 });
    }

    // 2. Kiểm tra phân quyền truy cập hệ thống
    const hasCreatePerm = hasPermission(session, 'reports:input:create');
    if (!hasCreatePerm) {
      return NextResponse.json({ success: false, detail: 'Missing permission: reports:input:create', message: 'Missing permission: reports:input:create' }, { status: 403 });
    }

    // 3. Lấy thông tin lô số liệu hiện tại
    const batchRes = await query(
      `SELECT id, batch_code, report_date, period_type, department_code, station_code, 
              source_type, status, created_by, submitted_by, approved_by, rejected_by, locked_by,
              created_at, submitted_at, approved_at, rejected_at, locked_at, note, reject_reason
       FROM quality_input_batches
       WHERE id = $1 LIMIT 1`,
      [batchId]
    );

    if (batchRes.rowCount === 0) {
      return NextResponse.json({ success: false, detail: `Batch ${batchId} not found.`, message: `Batch ${batchId} not found.` }, { status: 404 });
    }

    const batch = batchRes.rows[0];

    // Chặn sửa đổi nếu trạng thái không phải nháp hoặc bị từ chối
    if (!['draft', 'rejected'].includes(batch.status)) {
      return NextResponse.json({ success: false, detail: `Cannot edit batch in status '${batch.status}'. Only draft or rejected batches can be edited.`, message: `Cannot edit batch in status '${batch.status}'. Only draft or rejected batches can be edited.` }, { status: 400 });
    }

    // Kiểm tra giới hạn quyền khoa phòng và kỳ sổ khóa
    const deptAllowed = checkScope(session, 'department', batch.department_code);
    const stationAllowed = checkScope(session, 'station', batch.station_code);
    if (!deptAllowed || !stationAllowed) {
      return NextResponse.json({ success: false, detail: `Missing scope access for department ${batch.department_code} / station ${batch.station_code}`, message: `Missing scope access for department ${batch.department_code} / station ${batch.station_code}` }, { status: 403 });
    }

    const isLocked = await isPeriodLocked(batch.report_date, batch.period_type, batch.department_code, batch.station_code);
    if (isLocked) {
      return NextResponse.json({ success: false, detail: 'Reporting period is locked.', message: 'Reporting period is locked.' }, { status: 409 });
    }

    // 4. Lấy dữ liệu trước khi thay đổi (before_data) để phục vụ Audit Log
    const recordsBeforeRes = await query(
      `SELECT id, batch_id, report_date, period_type, department_code, station_code, 
              variable_code, indicator_code, value, text_value, unit, note, 
              row_status, error_code, error_message
       FROM quality_input_records
       WHERE batch_id = $1`,
      [batchId]
    );

    const beforeData = {
      ...batch,
      report_date: batch.report_date ? new Date(batch.report_date).toISOString().split('T')[0] : null,
      records: recordsBeforeRes.rows
    };

    // 5. Đọc payload cập nhật số liệu
    const payload = await req.json();
    const { note = null, records = [] } = payload;

    // Cập nhật ghi chú chung của lô
    if (note !== null) {
      await query(
        'UPDATE quality_input_batches SET note = $1 WHERE id = $2',
        [note, batchId]
      );
    }

    // Lấy danh sách records hiện tại để ánh xạ đè hoặc thêm mới
    const existingRecordsMap = new Map();
    recordsBeforeRes.rows.forEach(r => {
      existingRecordsMap.set(r.variable_code, r.id);
    });

    // 6. Cập nhật / Thêm mới từng biến số lâm sàng thô
    for (const rec of records) {
      const varRes = await query(
        'SELECT variable_code, name, min_value, max_value, required, unit FROM quality_indicator_variables WHERE variable_code = $1 LIMIT 1',
        [rec.variable_code]
      );

      if (varRes.rowCount === 0) {
        return NextResponse.json({ success: false, detail: `Variable code '${rec.variable_code}' does not exist in catalog.`, message: `Variable code '${rec.variable_code}' does not exist in catalog.` }, { status: 400 });
      }

      const varDef = varRes.rows[0];
      let rowStatus = 'valid';
      let errorCode = null;
      let errorMessage = null;

      // Validate cận giá trị số thực
      if (rec.value !== undefined && rec.value !== null) {
        const val = parseFloat(rec.value);
        if (varDef.min_value !== null && val < parseFloat(varDef.min_value)) {
          rowStatus = 'error';
          errorCode = 'OUT_OF_BOUNDS_MIN';
          errorMessage = `Value ${val} is below minimum allowed (${varDef.min_value}).`;
        } else if (varDef.max_value !== null && val > parseFloat(varDef.max_value)) {
          rowStatus = 'error';
          errorCode = 'OUT_OF_BOUNDS_MAX';
          errorMessage = `Value ${val} is above maximum allowed (${varDef.max_value}).`;
        }
      }

      // Kiểm tra trường bắt buộc nhập
      if (varDef.required && (rec.value === undefined || rec.value === null) && !rec.text_value) {
        rowStatus = 'error';
        errorCode = 'REQUIRED_FIELD_MISSING';
        errorMessage = `Required field '${varDef.name}' is missing.`;
      }

      if (existingRecordsMap.has(rec.variable_code)) {
        // Cập nhật đè dòng cũ
        const recordId = existingRecordsMap.get(rec.variable_code);
        await query(
          `UPDATE quality_input_records
           SET value = $1, text_value = $2, note = $3, row_status = $4, error_code = $5, error_message = $6, updated_by = $7, updated_at = NOW()
           WHERE id = $8`,
          [
            rec.value !== undefined ? rec.value : null, rec.text_value || null, rec.note || null,
            rowStatus, errorCode, errorMessage, session.username, recordId
          ]
        );
      } else {
        // Chèn thêm record mới bổ sung
        await query(
          `INSERT INTO quality_input_records (
            batch_id, report_date, period_type, department_code, station_code,
            variable_code, indicator_code, value, text_value, unit, note,
            row_status, error_code, error_message, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`,
          [
            batchId, batch.report_date, batch.period_type, batch.department_code, batch.station_code,
            rec.variable_code, rec.indicator_code || null, rec.value !== undefined ? rec.value : null,
            rec.text_value || null, varDef.unit || null, rec.note || null,
            rowStatus, errorCode, errorMessage, session.username
          ]
        );
      }
    }

    // 7. Lấy dữ liệu sau khi sửa đổi (after_data) để phục vụ Audit Log và Response
    const batchAfterRes = await query(
      `SELECT id, batch_code, report_date, period_type, department_code, station_code, 
              source_type, status, created_by, submitted_by, approved_by, rejected_by, locked_by,
              created_at, submitted_at, approved_at, rejected_at, locked_at, note, reject_reason
       FROM quality_input_batches WHERE id = $1 LIMIT 1`,
      [batchId]
    );
    const recordsAfterRes = await query(
      `SELECT id, batch_id, report_date, period_type, department_code, station_code, 
              variable_code, indicator_code, value, text_value, unit, note, 
              row_status, error_code, error_message
       FROM quality_input_records WHERE batch_id = $1`,
      [batchId]
    );

    const batchAfter = batchAfterRes.rows[0];
    const afterData = {
      ...batchAfter,
      report_date: batchAfter.report_date ? new Date(batchAfter.report_date).toISOString().split('T')[0] : null,
      records: recordsAfterRes.rows
    };

    // Ghi Audit Log vào CSDL
    await query(
      `INSERT INTO quality_audit_logs (
        actor, action, target_table, target_id, before_data, after_data, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        session.username,
        'update_input_batch',
        'quality_input_batches',
        String(batchId),
        JSON.stringify(beforeData),
        JSON.stringify(afterData),
        req.headers.get('x-forwarded-for') || null,
        req.headers.get('user-agent') || null
      ]
    );

    // 8. Kích hoạt tính toán tự động nền thông qua REST API Python microservice
    try {
      fetch('http://backend:8000/api/v1/quality/calculate/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          report_date: batchAfter.report_date ? new Date(batchAfter.report_date).toISOString().split('T')[0] : null,
          period_type: batchAfter.period_type,
          department_code: batchAfter.department_code,
          station_code: batchAfter.station_code,
          username: session.username,
          run_type: 'auto'
        })
      }).catch(err => console.error('[ETL RUN FETCH ERROR]', err));
    } catch (err) {
      console.error('[TRIGGER CALCULATE FAILED]', err);
    }

    // 9. Trả về thông báo thành công cho Client
    return NextResponse.json({
      success: true,
      message: 'Cập nhật lô số liệu lâm sàng thành công!',
      data: {
        batch_id: batchId,
        batch_code: batchAfter.batch_code,
        status: batchAfter.status
      }
    });
  } catch (err: any) {
    console.error('[API BATCH PUT] Failed:', err);
    return NextResponse.json({ success: false, detail: err.message, message: err.message }, { status: 500 });
  }
}
