import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { verifyToken, getUserSession, hasPermission } from '../../../../../lib/auth';

/**
 * [PHASE 6] API Lấy danh sách lịch sử khóa sổ kỳ báo cáo
 * GET /api/v1/quality/period-locks
 */
export async function GET(req: NextRequest) {
  try {
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
    const hasViewPerm = hasPermission(session, 'reports:period_lock:view');
    if (!hasViewPerm) {
      return NextResponse.json({ success: false, detail: 'Missing permission: reports:period_lock:view', message: 'Missing permission: reports:period_lock:view' }, { status: 403 });
    }

    // 3. Đọc các bộ lọc từ Query Parameters
    const { searchParams } = new URL(req.url);
    const periodType = searchParams.get('period_type');

    // 4. Xây dựng câu truy vấn SQL Native có tham số hóa
    let sql = `
      SELECT id, period_type, report_date, department_code, station_code, is_locked, 
             locked_by, locked_at, unlock_reason, unlocked_by, unlocked_at
      FROM quality_period_locks
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (periodType) {
      sql += ` AND period_type = $${paramIndex++}`;
      params.push(periodType);
    }

    sql += ` ORDER BY report_date DESC, locked_at DESC`;

    const locksRes = await query(sql, params);
    
    const serializedLocks = locksRes.rows.map(lock => ({
      id: parseInt(lock.id),
      period_type: lock.period_type,
      report_date: lock.report_date ? new Date(lock.report_date).toISOString().split('T')[0] : null,
      department_code: lock.department_code,
      station_code: lock.station_code,
      is_locked: lock.is_locked,
      locked_by: lock.locked_by,
      locked_at: lock.locked_at ? lock.locked_at.toISOString() : null,
      unlock_reason: lock.unlock_reason,
      unlocked_by: lock.unlocked_by,
      unlocked_at: lock.unlocked_at ? lock.unlocked_at.toISOString() : null,
    }));

    return NextResponse.json({
      success: true,
      message: 'Lấy danh sách khóa kỳ báo cáo thành công!',
      data: serializedLocks
    });
  } catch (err: any) {
    console.error('[API PERIOD LOCKS GET] Failed:', err);
    return NextResponse.json({ success: false, detail: err.message, message: err.message }, { status: 500 });
  }
}

/**
 * [PHASE 6] API Thực hiện Khóa sổ kỳ báo cáo (lock)
 * POST /api/v1/quality/period-locks
 */
export async function POST(req: NextRequest) {
  try {
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
    const hasLockPerm = hasPermission(session, 'reports:period_lock:lock');
    if (!hasLockPerm) {
      return NextResponse.json({ success: false, detail: 'Missing permission: reports:period_lock:lock', message: 'Missing permission: reports:period_lock:lock' }, { status: 403 });
    }

    // 3. Đọc payload
    const payload = await req.json();
    const { report_date, period_type = 'daily', department_code = null, station_code = null, override_pending = false } = payload;

    if (!report_date) {
      return NextResponse.json({ success: false, detail: 'report_date is required', message: 'report_date is required' }, { status: 400 });
    }

    // 4. Kiểm tra an toàn: Xem còn lô số liệu nào chưa duyệt (Draft, Submitted, Rejected) trong kỳ báo cáo không
    if (!override_pending) {
      let pendingSql = `
        SELECT batch_code 
        FROM quality_input_batches
        WHERE report_date = $1 AND period_type = $2
          AND COALESCE(department_code, '') = COALESCE($3, '')
          AND COALESCE(station_code, '') = COALESCE($4, '')
          AND status IN ('draft', 'submitted', 'rejected')
      `;
      const pendingRes = await query(pendingSql, [report_date, period_type, department_code || '', station_code || '']);
      if (pendingRes.rowCount > 0) {
        const codes = pendingRes.rows.map(r => r.batch_code).join(', ');
        return NextResponse.json({
          success: false,
          detail: `Không thể khóa sổ! Còn ${pendingRes.rowCount} lô số liệu chưa được duyệt hoặc đã bị từ chối: ${codes}.`,
          message: `Không thể khóa sổ! Còn ${pendingRes.rowCount} lô số liệu chưa được duyệt hoặc đã bị từ chối: ${codes}.`
        }, { status: 400 });
      }
    }

    // 5. Tạo hoặc cập nhật bản ghi khóa sổ trong CSDL
    let lockId: number;
    const lockCheckRes = await query(
      `SELECT id FROM quality_period_locks
       WHERE period_type = $1
         AND report_date = $2
         AND COALESCE(department_code, '') = COALESCE($3, '')
         AND COALESCE(station_code, '') = COALESCE($4, '')
       LIMIT 1`,
      [period_type, report_date, department_code || '', station_code || '']
    );

    if (lockCheckRes.rowCount > 0) {
      lockId = parseInt(lockCheckRes.rows[0].id);
      await query(
        `UPDATE quality_period_locks
         SET is_locked = true, locked_by = $1, locked_at = NOW(), 
             unlock_reason = NULL, unlocked_by = NULL, unlocked_at = NULL
         WHERE id = $2`,
        [session.username, lockId]
      );
    } else {
      const insertLockRes = await query(
        `INSERT INTO quality_period_locks (
          period_type, report_date, department_code, station_code, is_locked, locked_by, locked_at
        ) VALUES ($1, $2, $3, $4, true, $5, NOW())
        RETURNING id`,
        [period_type, report_date, department_code, station_code, session.username]
      );
      lockId = parseInt(insertLockRes.rows[0].id);
    }

    // 6. Đồng thời cập nhật trạng thái của tất cả các lô báo cáo con tương ứng sang 'locked'
    await query(
      `UPDATE quality_input_batches
       SET status = 'locked', locked_by = $1, locked_at = NOW()
       WHERE report_date = $2 AND period_type = $3
         AND COALESCE(department_code, '') = COALESCE($4, '')
         AND COALESCE(station_code, '') = COALESCE($5, '')`,
      [session.username, report_date, period_type, department_code || '', station_code || '']
    );

    // 7. Ghi nhận Audit Log hành động khóa kỳ sổ
    const auditData = {
      period_type,
      report_date,
      department_code,
      station_code
    };

    await query(
      `INSERT INTO quality_audit_logs (
        actor, action, target_table, target_id, after_data, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        session.username,
        'lock_period',
        'quality_period_locks',
        String(lockId),
        JSON.stringify(auditData),
        req.headers.get('x-forwarded-for') || null,
        req.headers.get('user-agent') || null
      ]
    );

    // 8. Trả về kết quả thành công cho Client
    return NextResponse.json({
      success: true,
      message: 'Khóa sổ kỳ báo cáo thành công! Dữ liệu của kỳ đã được đóng băng.',
      data: {
        lock_id: lockId,
        is_locked: true
      }
    });
  } catch (err: any) {
    console.error('[API PERIOD LOCKS POST] Failed:', err);
    return NextResponse.json({ success: false, detail: err.message, message: err.message }, { status: 500 });
  }
}
