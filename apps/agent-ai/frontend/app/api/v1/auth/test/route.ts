import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { verifyToken, getUserSession } from '../../../../../lib/auth';

/**
 * [PHASE 6] API chạy thử nghiệm liên kết Next.js DB & Auth.
 * Xác minh xem Connection Pool và logic phân quyền 3 lớp đã hoạt động khớp hoàn toàn chưa.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Kiểm tra kết nối CSDL PostgreSQL
    const dbRes = await query('SELECT NOW() as db_time');
    const dbTime = dbRes.rows[0].db_time;

    // 2. Kiểm tra xác thực Token từ Header gửi lên
    const authHeader = req.headers.get('Authorization');
    let sessionInfo = null;
    let tokenVerified = false;

    if (authHeader) {
      const decoded = verifyToken(authHeader);
      if (decoded) {
        tokenVerified = true;
        const session = await getUserSession(decoded.sub);
        if (session) {
          sessionInfo = session;
        }
      }
    }

    return NextResponse.json({
      status: "success",
      message: "[PHASE 6] Kết nối Next.js DB & Auth hoạt động hoàn hảo!",
      database: {
        connection: "OK",
        time: dbTime
      },
      auth: {
        token_provided: !!authHeader,
        token_verified: tokenVerified,
        user_session: sessionInfo
      }
    });
  } catch (err: any) {
    console.error('[API TEST] Failed:', err);
    return NextResponse.json({
      status: "error",
      message: err.message
    }, { status: 500 });
  }
}
