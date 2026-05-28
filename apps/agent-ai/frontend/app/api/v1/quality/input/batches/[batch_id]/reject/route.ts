import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../../../../lib/db';
import { verifyToken, getUserSession, hasPermission, checkScope } from '../../../../../../../../lib/auth';

/**
 * [PHASE 6] API Từ chối duyệt lô báo cáo lâm sàng và trả lại cho nhân viên sửa đổi
 * POST /api/v1/quality/input/batches/[batch_id]/reject
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
    const hasRejectPerm = hasPermission(session, 'reports:review:reject');
    if (!hasRejectPerm) {
      return NextResponse.json({ success: false, detail: 'Missing permission: reports:review:reject', message: 'Missing permission: reports:review:reject' }, { status: 403 });
    }

    // 3. Đọc payload và bắt buộc phải cung cấp lý do từ chối
    const payload = await req.json().catch(() => ({}));
    const { review_note = null } = payload;

    if (!review_note || !review_note.trim()) {
      return NextResponse.json({ success: false, detail: 'Lý do từ chối phê duyệt là bắt buộc.', message: 'Lý do từ chối phê duyệt là bắt buộc.' }, { status: 400 });
    }

    // 4. Lấy thông tin Lô báo cáo
    const batchRes = await query(
      `SELECT id, batch_code, report_date, period_type, department_code, station_code, 
              source_type, status, created_by, submitted_by, approved_by, rejected_by, locked_by,
              created_at, submitted_at, approved_at, rejected_at, locked_at, note, reject_reason
       FROM quality_input_batches
       WHERE id = $1 LIMIT 1`,
      [batchId]
    );

    if (batchRes.rowCount === 0) {
      return NextResponse.json({ success: false, detail: 'Không tìm thấy lô báo cáo.', message: 'Không tìm thấy lô báo cáo.' }, { status: 404 });
    }

    const batch = batchRes.rows[0];

    // Chỉ cho phép từ chối phê duyệt đối với lô ở trạng thái submitted
    if (batch.status !== 'submitted') {
      return NextResponse.json({ success: false, detail: `Không thể từ chối lô báo cáo đang ở trạng thái '${batch.status}'.`, message: `Không thể từ chối lô báo cáo đang ở trạng thái '${batch.status}'.` }, { status: 400 });
    }

    // Kiểm tra scope của reviewer
    const deptAllowed = checkScope(session, 'department', batch.department_code);
    const stationAllowed = checkScope(session, 'station', batch.station_code);
    if (!deptAllowed || !stationAllowed) {
      return NextResponse.json({ success: false, detail: `Thiếu scope khoa phòng được gán để từ chối lô số liệu này.`, message: `Thiếu scope khoa phòng được gán để từ chối lô số liệu này.` }, { status: 403 });
    }

    // Nạp chi tiết records để ghi nhận đầy đủ before_data/after_data cho Audit Log
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

    // 5. Cập nhật trạng thái lô báo cáo sang rejected kèm lý do từ chối
    await query(
      `UPDATE quality_input_batches
       SET status = 'rejected', rejected_by = $1, rejected_at = NOW(), reject_reason = $2
       WHERE id = $3`,
      [session.username, review_note, batchId]
    );

    // 6. Cập nhật review task con tương ứng sang rejected
    await query(
      `UPDATE quality_review_tasks
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_note = $2
       WHERE target_id = $3 AND target_type = 'input_batch' AND status = 'pending'`,
      [session.username, review_note, batchId]
    );

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
        'reject_input_batch',
        'quality_input_batches',
        String(batchId),
        JSON.stringify(beforeData),
        JSON.stringify(afterData),
        req.headers.get('x-forwarded-for') || null,
        req.headers.get('user-agent') || null
      ]
    );

    // 8. Trả về kết quả thành công cho Client
    return NextResponse.json({
      success: true,
      message: 'Đã từ chối duyệt và trả lại lô báo cáo số liệu thành công!',
      data: {
        batch_id: batchId,
        batch_code: batchAfter.batch_code,
        status: batchAfter.status
      }
    });
  } catch (err: any) {
    console.error('[API BATCH REJECT POST] Failed:', err);
    return NextResponse.json({ success: false, detail: err.message, message: err.message }, { status: 500 });
  }
}
