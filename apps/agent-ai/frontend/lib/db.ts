import { Pool } from 'pg';

// Khởi tạo Connection Pool kết nối trực tiếp đến CSDL PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'chatbot',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Ttcc^115',
});

/**
 * [PHASE 6] Hàm truy vấn CSDL PostgreSQL đồng bộ thông qua Connection Pool.
 * Thực thi các câu lệnh SQL Native nguyên bản với hiệu năng và độ ổn định cao nhất.
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log(`[DB QUERY] Executed query in ${duration}ms: ${text.slice(0, 100)}...`);
  return res;
}

/**
 * [PHASE 6] Kiểm tra xem kỳ báo cáo đã bị Khóa sổ (Locked) hay chưa.
 * Đảm bảo tính nhất quán nghiệp vụ, ngăn chặn hành động sửa đổi dữ liệu đã khóa.
 */
export async function isPeriodLocked(
  reportDate: string | Date,
  periodType: string = 'daily',
  departmentCode: string | null = null,
  stationCode: string | null = null
): Promise<boolean> {
  try {
    const formattedDate = typeof reportDate === 'string' 
      ? reportDate 
      : reportDate.toISOString().split('T')[0];

    // 1. Kiểm tra xem bảng quality_period_locks có tồn tại hay không
    const tableCheck = await query(`
      SELECT to_regclass('public.quality_period_locks') as regclass
    `);
    if (!tableCheck.rows[0] || !tableCheck.rows[0].regclass) {
      return false; // Bảng chưa tồn tại -> xem như chưa khóa
    }

    // 2. So khớp dòng khóa đang kích hoạt
    const lockCheck = await query(`
      SELECT 1
      FROM quality_period_locks
      WHERE period_type = $1
        AND report_date = $2
        AND COALESCE(department_code, '') = COALESCE($3, '')
        AND COALESCE(station_code, '') = COALESCE($4, '')
        AND is_locked = true
      LIMIT 1
    `, [periodType, formattedDate, departmentCode || '', stationCode || '']);

    return lockCheck.rowCount > 0;
  } catch (err) {
    console.error('[DB] isPeriodLocked check failed:', err);
    return false;
  }
}
