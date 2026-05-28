import { NextRequest, NextResponse } from 'next/server';
import { query, isPeriodLocked } from '../../../../../../lib/db';
import { verifyToken, getUserSession, hasPermission, checkScope } from '../../../../../../lib/auth';

/**
 * [PHASE 6] API Lấy danh sách lô báo cáo nhập liệu của khoa/trạm
 * GET /api/v1/quality/input/batches
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
    const hasViewPerm = hasPermission(session, 'reports:input:view');
    if (!hasViewPerm) {
      return NextResponse.json({ success: false, detail: 'Missing permission: reports:input:view', message: 'Missing permission: reports:input:view' }, { status: 403 });
    }

    // 3. Đọc các bộ lọc từ Query Parameters
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD
    const statusParam = searchParams.get('status');
    const deptParam = searchParams.get('department_code');

    // 4. Xây dựng câu truy vấn SQL Native có tham số hóa
    let sql = `
      SELECT id, batch_code, report_date, period_type, department_code, station_code, 
             source_type, status, created_by, submitted_by, approved_by, rejected_by, locked_by,
             created_at, submitted_at, approved_at, rejected_at, locked_at, note, reject_reason
      FROM quality_input_batches
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (dateParam) {
      sql += ` AND report_date = $${paramIndex++}`;
      params.push(dateParam);
    }
    if (statusParam) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(statusParam);
    }
    if (deptParam) {
      sql += ` AND department_code = $${paramIndex++}`;
      params.push(deptParam);
    }

    sql += ` ORDER BY created_at DESC`;

    const batchesRes = await query(sql, params);
    const batches = batchesRes.rows;

    // 5. Kiểm tra quyền quản trị cao cấp để vượt qua scope lọc
    const isAdmin = session.roles.some(r => ['Admin', 'system_admin', 'quality_admin'].includes(r));
    let filteredBatches = batches;

    if (!isAdmin) {
      // Lọc thủ công dựa trên phạm vi Scope khoa/trạm được gán
      filteredBatches = batches.filter(b => {
        const deptAllowed = session.scopes.some(s => s.scope_type === 'department' && s.scope_code === b.department_code);
        const stationAllowed = !b.station_code || session.scopes.some(s => s.scope_type === 'station' && s.scope_code === b.station_code);
        return deptAllowed && stationAllowed;
      });
    }

    // 6. Nạp đầy đủ records chi tiết cho từng lô báo cáo để đồng bộ format với Python
    const serializedBatches = await Promise.all(
      filteredBatches.map(async (b) => {
        const recordsRes = await query(
          `SELECT id, batch_id, report_date, period_type, department_code, station_code, 
                  variable_code, indicator_code, value, text_value, unit, note, 
                  row_status, error_code, error_message
           FROM quality_input_records
           WHERE batch_id = $1`,
          [b.id]
        );

        return {
          id: parseInt(b.id),
          batch_code: b.batch_code,
          report_date: b.report_date ? new Date(b.report_date).toISOString().split('T')[0] : null,
          period_type: b.period_type,
          department_code: b.department_code,
          station_code: b.station_code,
          source_type: b.source_type,
          status: b.status,
          created_by: b.created_by,
          submitted_by: b.submitted_by,
          approved_by: b.approved_by,
          rejected_by: b.rejected_by,
          locked_by: b.locked_by,
          created_at: b.created_at ? b.created_at.toISOString() : null,
          submitted_at: b.submitted_at ? b.submitted_at.toISOString() : null,
          approved_at: b.approved_at ? b.approved_at.toISOString() : null,
          rejected_at: b.rejected_at ? b.rejected_at.toISOString() : null,
          locked_at: b.locked_at ? b.locked_at.toISOString() : null,
          note: b.note,
          reject_reason: b.reject_reason,
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
      })
    );

    return NextResponse.json({
      success: true,
      message: 'Lấy danh sách lô số liệu thành công!',
      data: serializedBatches
    });
  } catch (err: any) {
    console.error('[API BATCHES GET] Failed:', err);
    return NextResponse.json({ success: false, detail: err.message, message: err.message }, { status: 500 });
  }
}

/**
 * [PHASE 6] API Tạo mới lô báo cáo nhập liệu ở trạng thái nháp (draft)
 * POST /api/v1/quality/input/batches
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

    // 2. Phân quyền và Scope
    const hasCreatePerm = hasPermission(session, 'reports:input:create');
    if (!hasCreatePerm) {
      return NextResponse.json({ success: false, detail: 'Missing permission: reports:input:create', message: 'Missing permission: reports:input:create' }, { status: 403 });
    }

    const payload = await req.json();
    const { report_date, period_type = 'daily', department_code, station_code = null, note = null, records = [] } = payload;

    if (!report_date || !department_code) {
      return NextResponse.json({ success: false, detail: 'report_date and department_code are required', message: 'report_date and department_code are required' }, { status: 400 });
    }

    const deptAllowed = checkScope(session, 'department', department_code);
    const stationAllowed = checkScope(session, 'station', station_code);
    if (!deptAllowed || !stationAllowed) {
      return NextResponse.json({ success: false, detail: `Missing scope access for department ${department_code} / station ${station_code}`, message: `Missing scope access for department ${department_code} / station ${station_code}` }, { status: 403 });
    }

    // 3. Kiểm tra xem kỳ báo cáo có bị Khóa sổ (Locked) hay chưa
    const isLocked = await isPeriodLocked(report_date, period_type, department_code, station_code);
    if (isLocked) {
      return NextResponse.json({ success: false, detail: 'Reporting period is locked.', message: 'Reporting period is locked.' }, { status: 409 });
    }

    // 4. Tự động sinh mã lô tuần tự duy nhất theo ngày báo cáo (Format: INP-YYYYMMDD-XXXX)
    const formattedDateStr = report_date.replace(/-/g, ''); // Ví dụ: 2026-05-28 -> 20260528
    
    // Đếm số lô đã tạo trong ngày đó
    const countRes = await query(
      'SELECT COUNT(*) as count FROM quality_input_batches WHERE report_date = $1',
      [report_date]
    );
    let existingCount = parseInt(countRes.rows[0].count);
    let batchCode = `INP-${formattedDateStr}-${String(existingCount + 1).padStart(4, '0')}`;

    // Vòng lặp chống trùng lặp mã lô trong trường hợp trùng tiến trình ghi đồng thời
    while (true) {
      const dupCheck = await query('SELECT 1 FROM quality_input_batches WHERE batch_code = $1 LIMIT 1', [batchCode]);
      if (dupCheck.rowCount === 0) break;
      existingCount++;
      batchCode = `INP-${formattedDateStr}-${String(existingCount + 1).padStart(4, '0')}`;
    }

    // 5. Thêm mới lô báo cáo ở trạng thái draft (nháp)
    const insertBatchRes = await query(
      `INSERT INTO quality_input_batches (
        batch_code, report_date, period_type, department_code, station_code,
        source_type, status, created_by, note, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'web_form', 'draft', $6, $7, NOW())
      RETURNING id`,
      [batchCode, report_date, period_type, department_code, station_code, session.username, note]
    );
    const batchId = parseInt(insertBatchRes.rows[0].id);

    // 6. Ghi nhận và Validate chi tiết từng dòng dữ liệu chỉ số gửi lên
    for (const rec of records) {
      const varRes = await query(
        'SELECT variable_code, name, min_value, max_value, required, unit FROM quality_indicator_variables WHERE variable_code = $1 LIMIT 1',
        [rec.variable_code]
      );

      if (varRes.rowCount === 0) {
        // Dọn dẹp lô cha nếu gặp lỗi nghiêm trọng
        await query('DELETE FROM quality_input_batches WHERE id = $1', [batchId]);
        return NextResponse.json({ success: false, detail: `Variable code '${rec.variable_code}' does not exist in catalog.`, message: `Variable code '${rec.variable_code}' does not exist in catalog.` }, { status: 400 });
      }

      const varDef = varRes.rows[0];
      let rowStatus = 'valid';
      let errorCode = null;
      let errorMessage = null;

      // Validate biên thô: giá trị số
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

      // Tạo bản ghi dòng số liệu thô
      await query(
        `INSERT INTO quality_input_records (
          batch_id, report_date, period_type, department_code, station_code,
          variable_code, indicator_code, value, text_value, unit, note,
          row_status, error_code, error_message, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`,
        [
          batchId, report_date, period_type, department_code, station_code,
          rec.variable_code, rec.indicator_code || null, rec.value !== undefined ? rec.value : null,
          rec.text_value || null, varDef.unit || null, rec.note || null,
          rowStatus, errorCode, errorMessage, session.username
        ]
      );
    }

    // 7. Ghi Audit Log hành động để phục vụ giám sát và lưu lịch sử đổi
    const auditData = { batch_code: batchCode, status: 'draft' };
    await query(
      `INSERT INTO quality_audit_logs (
        actor, action, target_table, target_id, after_data, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        session.username,
        'create_input_batch',
        'quality_input_batches',
        String(batchId),
        JSON.stringify(auditData),
        req.headers.get('x-forwarded-for') || null,
        req.headers.get('user-agent') || null
      ]
    );

    // 8. Kích hoạt tính toán nền ETL qua cổng Python Backend siêu nhẹ
    try {
      fetch('http://backend:8000/api/v1/quality/calculate/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader, // Truyền kèm token để backend Python kiểm tra
        },
        body: JSON.stringify({
          report_date,
          period_type,
          department_code,
          station_code,
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
      message: 'Khởi tạo lô số liệu nháp thành công!',
      data: {
        batch_id: batchId,
        batch_code: batchCode,
        status: 'draft'
      }
    });
  } catch (err: any) {
    console.error('[API BATCHES POST] Failed:', err);
    return NextResponse.json({ success: false, detail: err.message, message: err.message }, { status: 500 });
  }
}
