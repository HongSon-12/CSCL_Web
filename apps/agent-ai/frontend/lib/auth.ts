import jwt from 'jsonwebtoken';
import { query } from './db';

const SECRET_KEY = process.env.JWT_SECRET_KEY || "a_very_secret_key_change_me_in_production";

const PHASE1_PORTAL_PERMISSIONS = new Set([
  "portal:view",
  "dashboard:view",
  "reports:input:view",
  "reports:import:view",
  "reports:review:view",
  "reports:period_lock:view",
  "etl:view",
  "indicators:view",
  "admin:view",
  "ai_agent:use",
]);

const LEGACY_PERMISSION_ALIASES: Record<string, string[]> = {
  "chat:use": ["ai_agent:use", "portal:view"],
  "users:read": ["admin:view"],
  "users:manage": ["admin:view"],
  "roles:manage": ["admin:view"],
};

export interface UserSession {
  username: string;
  userId: string;
  roles: string[];
  permissions: string[];
  scopes: { scope_type: string; scope_code: string }[];
}

/**
 * [PHASE 6] Xác thực JWT token từ Header và giải mã.
 * Tương thích hoàn toàn với thuật toán HS256 và khóa bảo mật dùng chung.
 */
export function verifyToken(token: string): { sub: string } | null {
  try {
    const cleanedToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.verify(cleanedToken, SECRET_KEY, { algorithms: ['HS256'] }) as { sub: string };
    return decoded;
  } catch (err) {
    console.error('[AUTH] Token verification failed:', err);
    return null;
  }
}

/**
 * [PHASE 6] Tổng hợp toàn bộ quyền (Permissions) và phạm vi dữ liệu (Scopes) của user từ DB.
 * Giữ nguyên 100% logic phân quyền 3 lớp nghiệp vụ cũ và mới.
 */
export async function getUserSession(username: string): Promise<UserSession | null> {
  try {
    // 1. Lấy thông tin user cơ bản
    const userRes = await query('SELECT id, is_active FROM users WHERE username = $1 LIMIT 1', [username]);
    if (userRes.rowCount === 0) return null;
    const user = userRes.rows[0];
    if (!user.is_active) return null;

    const userIdStr = String(user.id);
    const idList = [userIdStr, username];

    // 2. Lấy vai trò cũ từ hệ thống cũ (Legacy roles)
    const legacyRolesRes = await query(
      'SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1',
      [userIdStr]
    );
    const legacyRoleNames = new Set(legacyRolesRes.rows.map((r: any) => r.name));

    // 3. Lấy vai trò nghiệp vụ chất lượng mới (Quality roles)
    const qualityRolesRes = await query(
      'SELECT DISTINCT qr.role_code FROM quality_roles qr JOIN quality_user_roles qur ON qr.id = qur.role_id WHERE qur.user_id = $1 OR qur.user_id = $2',
      idList
    );
    const qualityRoleNames = new Set(qualityRolesRes.rows.map((r: any) => r.role_code));
    const allRoles = Array.from(legacyRoleNames).concat(Array.from(qualityRoleNames));

    // 4. Tổng hợp quyền (Permissions)
    const permissions = new Set<string>();

    // 4.1. Lấy quyền từ vai trò cũ + ánh xạ tương thích ngược
    const legacyPermsRes = await query(
      'SELECT DISTINCT p.code FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id JOIN user_roles ur ON rp.role_id = ur.role_id WHERE ur.user_id = $1',
      [userIdStr]
    );
    legacyPermsRes.rows.forEach((p: any) => {
      permissions.add(p.code);
      if (LEGACY_PERMISSION_ALIASES[p.code]) {
        LEGACY_PERMISSION_ALIASES[p.code].forEach(alias => permissions.add(alias));
      }
    });

    // 4.2. Lấy quyền chất lượng mới của QLCL Web
    const qualityPermsRes = await query(
      'SELECT DISTINCT qp.permission_code FROM quality_permissions qp JOIN quality_role_permissions qrp ON qp.id = qrp.permission_id JOIN quality_user_roles qur ON qrp.role_id = qur.role_id WHERE qur.user_id = $1 OR qur.user_id = $2',
      idList
    );
    qualityPermsRes.rows.forEach((p: any) => {
      permissions.add(p.permission_code);
    });

    // 4.3. Đặc cách đặc quyền Admin hệ thống (được cấp tất cả quyền của Portal)
    if (legacyRoleNames.has('Admin')) {
      PHASE1_PORTAL_PERMISSIONS.forEach(p => permissions.add(p));
    }

    // 5. Thu thập phạm vi dữ liệu (Scopes) khoa phòng/trạm vệ tinh
    const scopesRes = await query(
      'SELECT scope_type, scope_code FROM quality_user_scopes WHERE user_id = $1 OR user_id = $2',
      idList
    );
    const scopes = scopesRes.rows.map((s: any) => ({
      scope_type: s.scope_type,
      scope_code: s.scope_code,
    }));

    return {
      username,
      userId: userIdStr,
      roles: allRoles,
      permissions: Array.from(permissions),
      scopes,
    };
  } catch (err) {
    console.error('[AUTH] Failed to build user session:', err);
    return null;
  }
}

/**
 * [PHASE 6] Middleware kiểm tra quyền hạn và scope dữ liệu
 */
export function hasPermission(session: UserSession, requiredPermission: string): boolean {
  return session.permissions.includes(requiredPermission) || session.permissions.includes('admin:view');
}

export function hasAnyPermission(session: UserSession, requiredPermissions: string[]): boolean {
  return requiredPermissions.some(p => session.permissions.includes(p)) || session.permissions.includes('admin:view');
}

export function checkScope(session: UserSession, scopeType: string, scopeCode: string | null): boolean {
  if (!scopeCode) return true;
  
  // Quyền Admin cao cấp vượt qua toàn bộ kiểm tra Scope khoa phòng
  const isAdmin = session.roles.some(r => ['Admin', 'system_admin', 'quality_admin'].includes(r));
  if (isAdmin) return true;

  return session.scopes.some(s => s.scope_type === scopeType && s.scope_code === scopeCode);
}
