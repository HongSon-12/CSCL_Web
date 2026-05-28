import { NextRequest, NextResponse } from 'next/server';
import { query, isPeriodLocked } from '../../../../../../../../lib/db';
import { verifyToken, getUserSession, hasPermission, checkScope } from '../../../../../../../../lib/auth';

/**
 * [PHASE 6] API Nộp báo cáo gửi phê duyệt (Khóa lô và chuyển trạng thái)
 * POST /api/v1/quality/input/batches/[batch_id]/submit
 */
export async function POST(
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
    const hasSubmitPerm = hasPermission(session, 'reports:input:submit');
    if (!hasSubmitPerm) {
      return NextResponse.json({ success: false, detail: 'Missing permission: reports:input:submit', message: 'Missing permission: reports:input:submit' }, { status: 403 });
    }

    // 3. Lấy thông tin Lô báo cáo
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

    // Chặn nộp nếu trạng thái không hợp lệ
    if (!['draft', 'rejected'].includes(batch.status)) {
      return NextResponse.json({ success: false, detail: `Cannot submit batch in status '${batch.status}'.`, message: `Cannot submit batch in status '${batch.status}'.` }, { status: 400 });
    }

    // Kiểm tra Scope khoa phòng và kỳ sổ khóa
    const deptAllowed = checkScope(session, 'department', batch.department_code);
    const stationAllowed = checkScope(session, 'station', batch.station_code);
    if (!deptAllowed || !stationAllowed) {
      return NextResponse.json({ success: false, detail: `Missing scope access for department ${batch.department_code} / station ${batch.station_code}`, message: `Missing scope access for department ${batch.department_code} / station ${batch.station_code}` }, { status: 403 });
    }

    const isLocked = await isPeriodLocked(batch.report_date, batch.period_type, batch.department_code, batch.station_code);
    if (isLocked) {
      return NextResponse.json({ success: false, detail: 'Reporting period is locked.', message: 'Reporting period is locked.' }, { status: 409 });
    }

    // 4. [HARD STOP] Chặn nộp tuyệt đối nếu có bất kỳ dòng nào chứa lỗi dữ liệu (chưa sửa min/max hoặc required)
    const errRecordsRes = await query(
      `SELECT variable_code, error_message 
       FROM quality_input_records 
       WHERE batch_id = $1 AND row_status = 'error' LIMIT 1`,
      [batchId]
    );
    if (errRecordsRes.rowCount > 0) {
      const errRec = errRecordsRes.rows[0];
      return NextResponse.json({ 
        success: false, 
        detail: `Cannot submit batch because variable '${errRec.variable_code}' has validation errors: ${errRec.error_message}`,
        message: `Cannot submit batch because variable '${errRec.variable_code}' has validation errors: ${errRec.error_message}` 
      }, { status: 400 });
    }

    // Lấy dữ liệu trước khi nộp (before_data)
    const recordsRes = await query(
      `SELECT id, batch_id, report_date, period_type, department_code, station_code, 
              variable_code, indicator_code, value, text_value, unit, note, 
              row_status, error_code, error_message
       FROM quality_input_records WHERE batch_id = $1`,
      [batchId]
    );
    const beforeData = {
      ...batch,
      report_date: batch.report_date ? new Date(batch.report_date).toISOString().split('T')[0] : null,
      records: recordsRes.rows
    };

    // 5. Cập nhật trạng thái lô báo cáo sang submitted
    await query(
      `UPDATE quality_input_batches
       SET status = 'submitted', submitted_by = $1, submitted_at = NOW()
       WHERE id = $2`,
      [session.username, batchId]
    );

    // 6. Tạo hoặc Cập nhật Review Task tương ứng cho lô báo cáo này
    const taskRes = await query(
      `SELECT id FROM quality_review_tasks 
       WHERE target_id = $1 AND target_type = 'input_batch' LIMIT 1`,
      [batchId]
    );

    if (taskRes.rowCount > 0) {
      // Cập nhật lại Task hiện tại thành pending chờ duyệt
      await query(
        `UPDATE quality_review_tasks
         SET status = 'pending', requested_by = $1, requested_at = NOW(), 
             reviewed_by = NULL, reviewed_at = NULL, review_note = NULL
         WHERE target_id = $2 AND target_type = 'input_batch'`,
        [session.username, batchId]
      );
    } else {
      // Tạo mới Task hàng đợi duyệt
      await query(
        `INSERT INTO quality_review_tasks (
          target_type, target_id, status, requested_by, requested_at
        ) VALUES ('input_batch', $1, 'pending', $2, NOW())`,
        [batchId, session.username]
      );
    }

    // 7. Lấy dữ liệu sau khi sửa đổi (after_data) để phục vụ Audit Log
    const batchAfterRes = await query(
      `SELECT id, batch_code, report_date, period_type, department_code, station_code, 
              source_type, status, created_by, submitted_by, approved_by, rejected_by, locked_by,
              created_at, submitted_at, approved_at, rejected_at, locked_at, note, reject_reason
       FROM quality_input_batches WHERE id = $1 LIMIT 1`,
      [batchId]
    );
    const batchAfter = batchAfterRes.rows[0];
    const afterData = {
      ...batchAfter,
      report_date: batchAfter.report_date ? new Date(batchAfter.report_date).toISOString().split('T')[0] : null,
      records: recordsRes.rows
    };

    // Ghi Audit Log vào CSDL
    await query(
      `INSERT INTO quality_audit_logs (
        actor, action, target_table, target_id, before_data, after_data, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        session.username,
        'submit_input_batch',
        'quality_input_batches',
        String(batchId),
        JSON.stringify(beforeData),
        JSON.stringify(afterData),
        req.headers.get('x-forwarded-for') || null,
        req.headers.get('user-agent') || null
      ]
    );

    // 8. Kích hoạt tính toán nền ETL để cập nhật lại chỉ số tự động
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
      message: 'Nộp báo cáo gửi phê duyệt thành công!',
      data: {
        batch_id: batchId,
        batch_code: batchAfter.batch_code,
        status: 'submitted'
      }
    });
  } catch (err: any) {
    console.error('[API BATCH SUBMIT POST] Failed:', err);
    return NextResponse.json({ success: false, detail: err.message, message: err.message }, { status: 500 });
  }
}
