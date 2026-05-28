import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../../../../lib/db';
import { verifyToken, getUserSession, hasPermission, checkScope } from '../../../../../../../../lib/auth';

/**
 * [PHASE 6] API Phê duyệt lô báo cáo lâm sàng và tự động khóa sổ kỳ báo cáo
 * POST /api/v1/quality/input/batches/[batch_id]/approve
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
    const hasApprovePerm = hasPermission(session, 'reports:review:approve');
    if (!hasApprovePerm) {
      return NextResponse.json({ success: false, detail: 'Missing permission: reports:review:approve', message: 'Missing permission: reports:review:approve' }, { status: 403 });
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
      return NextResponse.json({ success: false, detail: 'Không tìm thấy lô báo cáo.', message: 'Không tìm thấy lô báo cáo.' }, { status: 404 });
    }

    const batch = batchRes.rows[0];

    // Chỉ cho phép duyệt lô đang ở trạng thái submitted
    if (batch.status !== 'submitted') {
      return NextResponse.json({ success: false, detail: `Không thể phê duyệt lô báo cáo đang ở trạng thái '${batch.status}'.`, message: `Không thể phê duyệt lô báo cáo đang ở trạng thái '${batch.status}'.` }, { status: 400 });
    }

    // Kiểm tra phân vùng scope của reviewer
    const deptAllowed = checkScope(session, 'department', batch.department_code);
    const stationAllowed = checkScope(session, 'station', batch.station_code);
    if (!deptAllowed || !stationAllowed) {
      return NextResponse.json({ success: false, detail: `Thiếu scope khoa phòng được gán để duyệt lô số liệu này.`, message: `Thiếu scope khoa phòng được gán để duyệt lô số liệu này.` }, { status: 403 });
    }

    // Chặn hành động tự duyệt lô báo cáo của chính mình (Self-Approve Bypass dành riêng cho Admin/Manager)
    const isAdminOrManager = session.roles.some(r => 
      ['Admin', 'admin', 'system_admin', 'quality_admin', 'quality_manager'].includes(r)
    );
    if (batch.created_by === session.username && !isAdminOrManager) {
      return NextResponse.json({ success: false, detail: 'Không được phép tự phê duyệt lô số liệu do chính mình nhập liệu.', message: 'Không được phép tự phê duyệt lô số liệu do chính mình nhập liệu.' }, { status: 400 });
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

    const payload = await req.json().catch(() => ({}));
    const { review_note = null } = payload;

    // 4. Thực hiện cập nhật trạng thái lô báo cáo chính sang locked (Khóa trực tiếp)
    let updatedNote = batch.note || '';
    if (review_note) {
      updatedNote += `\n[Duyệt bởi ${session.username}]: ${review_note}`;
    }

    await query(
      `UPDATE quality_input_batches
       SET status = 'locked', approved_by = $1, approved_at = NOW(), 
           locked_by = $1, locked_at = NOW(), note = $2
       WHERE id = $3`,
      [session.username, updatedNote, batchId]
    );

    // 5. Tự động tạo hoặc cập nhật bản ghi khóa sổ cho kỳ báo cáo tương ứng
    const formattedDate = batch.report_date ? new Date(batch.report_date).toISOString().split('T')[0] : null;
    const lockCheckRes = await query(
      `SELECT id FROM quality_period_locks
       WHERE period_type = $1
         AND report_date = $2
         AND COALESCE(department_code, '') = COALESCE($3, '')
         AND COALESCE(station_code, '') = COALESCE($4, '')
       LIMIT 1`,
      [batch.period_type, formattedDate, batch.department_code || '', batch.station_code || '']
    );

    if (lockCheckRes.rowCount > 0) {
      // Đã có bản ghi -> chuyển trạng thái khóa thành True
      await query(
        `UPDATE quality_period_locks
         SET is_locked = true, locked_by = $1, locked_at = NOW(), 
             unlock_reason = NULL, unlocked_by = NULL, unlocked_at = NULL
         WHERE id = $2`,
        [session.username, lockCheckRes.rows[0].id]
      );
    } else {
      // Chưa có -> tạo mới bản ghi khóa sổ
      await query(
        `INSERT INTO quality_period_locks (
          period_type, report_date, department_code, station_code, is_locked, locked_by, locked_at
        ) VALUES ($1, $2, $3, $4, true, $5, NOW())`,
        [batch.period_type, formattedDate, batch.department_code, batch.station_code, session.username]
      );
    }

    // 6. Cập nhật review task con tương ứng sang approved
    await query(
      `UPDATE quality_review_tasks
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_note = $2
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
        'approve_input_batch',
        'quality_input_batches',
        String(batchId),
        JSON.stringify(beforeData),
        JSON.stringify(afterData),
        req.headers.get('x-forwarded-for') || null,
        req.headers.get('user-agent') || null
      ]
    );

    // 8. Kích hoạt động cơ tính toán chỉ số chất lượng lâm sàng tự động nền của Python
    try {
      fetch('http://backend:8000/api/v1/quality/calculate/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          report_date: formattedDate,
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

    // 9. Trả về kết quả thành công cho Client
    return NextResponse.json({
      success: true,
      message: 'Phê duyệt và tự động khóa sổ lô số liệu thành công!',
      data: {
        batch_id: batchId,
        batch_code: batchAfter.batch_code,
        status: batchAfter.status
      }
    });
  } catch (err: any) {
    console.error('[API BATCH APPROVE POST] Failed:', err);
    return NextResponse.json({ success: false, detail: err.message, message: err.message }, { status: 500 });
  }
}
