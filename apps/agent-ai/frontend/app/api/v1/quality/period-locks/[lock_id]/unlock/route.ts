import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../../../lib/db';
import { verifyToken, getUserSession, hasPermission } from '../../../../../../../lib/auth';

/**
 * [PHASE 6] API Thực hiện Mở khóa sổ kỳ báo cáo (unlock)
 * POST /api/v1/quality/period-locks/[lock_id]/unlock
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { lock_id: string } }
) {
  try {
    const lockId = parseInt(params.lock_id);

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
    const hasUnlockPerm = hasPermission(session, 'reports:period_lock:unlock');
    if (!hasUnlockPerm) {
      return NextResponse.json({ success: false, detail: 'Missing permission: reports:period_lock:unlock', message: 'Missing permission: reports:period_lock:unlock' }, { status: 403 });
    }

    // 3. Đọc payload mở khóa và bắt buộc cung cấp lý do mở khóa
    const payload = await req.json().catch(() => ({}));
    const { unlock_reason = null } = payload;

    if (!unlock_reason || !unlock_reason.trim()) {
      return NextResponse.json({ success: false, detail: 'Lý do mở khóa kỳ sổ là bắt buộc.', message: 'Lý do mở khóa kỳ sổ là bắt buộc.' }, { status: 400 });
    }

    // 4. Lấy thông tin bản ghi khóa sổ từ CSDL
    const lockRes = await query(
      `SELECT id, period_type, report_date, department_code, station_code, is_locked
       FROM quality_period_locks
       WHERE id = $1 LIMIT 1`,
      [lockId]
    );

    if (lockRes.rowCount === 0) {
      return NextResponse.json({ success: false, detail: 'Không tìm thấy bản ghi khóa sổ kỳ báo cáo.', message: 'Không tìm thấy bản ghi khóa sổ kỳ báo cáo.' }, { status: 404 });
    }

    const lockRec = lockRes.rows[0];

    // Nếu kỳ báo cáo này vốn dĩ đã được mở khóa sổ
    if (!lockRec.is_locked) {
      return NextResponse.json({
        success: true,
        message: 'Kỳ báo cáo này hiện đã ở trạng thái mở khóa sổ.',
        data: {
          lock_id: lockId,
          is_locked: false
        }
      });
    }

    // 5. Cập nhật bản ghi khóa sổ sang trạng thái mở khóa (is_locked = false)
    await query(
      `UPDATE quality_period_locks
       SET is_locked = false, unlock_reason = $1, unlocked_by = $2, unlocked_at = NOW()
       WHERE id = $3`,
      [unlock_reason, session.username, lockId]
    );

    // 6. Đồng thời cập nhật trạng thái của tất cả các lô báo cáo con tương ứng ngược về 'draft' để cho phép chỉnh sửa lại
    const formattedDate = lockRec.report_date ? new Date(lockRec.report_date).toISOString().split('T')[0] : null;
    await query(
      `UPDATE quality_input_batches
       SET status = 'draft'
       WHERE report_date = $1 AND period_type = $2
         AND COALESCE(department_code, '') = COALESCE($3, '')
         AND COALESCE(station_code, '') = COALESCE($4, '')`,
      [formattedDate, lockRec.period_type, lockRec.department_code || '', lockRec.station_code || '']
    );

    // 7. Ghi nhận Audit Log hành động mở khóa kỳ báo cáo
    const auditData = {
      lock_id: lockId,
      unlock_reason,
      unlocked_by: session.username
    };

    await query(
      `INSERT INTO quality_audit_logs (
        actor, action, target_table, target_id, after_data, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        session.username,
        'unlock_period',
        'quality_period_locks',
        String(lockId),
        JSON.stringify(auditData),
        req.headers.get('x-forwarded-for') || null,
        req.headers.get('user-agent') || null
      ]
    );

    // 8. Kích hoạt động cơ tính toán chỉ số tự động nền của Python
    try {
      fetch('http://backend:8000/api/v1/quality/calculate/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          report_date: formattedDate,
          period_type: lockRec.period_type,
          department_code: lockRec.department_code,
          station_code: lockRec.station_code,
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
      message: 'Mở khóa sổ kỳ báo cáo thành công! Đã khôi phục các lô báo cáo con về dạng Nháp.',
      data: {
        lock_id: lockId,
        is_locked: false
      }
    });
  } catch (err: any) {
    console.error('[API PERIOD UNLOCK POST] Failed:', err);
    return NextResponse.json({ success: false, detail: err.message, message: err.message }, { status: 500 });
  }
}
