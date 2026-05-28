export type PortalNavItem = {
  href: string
  label: string
  permissions: string[]
  group: string // Nhóm chức năng hợp lệ để chia mục lục trên Sidebar
}

export const portalNavItems: PortalNavItem[] = [
  { href: '/', label: 'Tổng quan hệ thống', permissions: ['portal:view'], group: 'Hệ thống' },
  
  { href: '/reports/input', label: 'Nhập số liệu thủ công', permissions: ['reports:input:view'], group: 'Nhập liệu lâm sàng' },
  { href: '/reports/import', label: 'Nhập từ Excel/CSV', permissions: ['reports:import:view'], group: 'Nhập liệu lâm sàng' },
  
  { href: '/reports/review', label: 'Phê duyệt số liệu waiting', permissions: ['reports:review:view'], group: 'Kiểm soát chất lượng' },
  { href: '/reports/locked-periods', label: 'Khóa kỳ báo cáo', permissions: ['reports:period_lock:view'], group: 'Kiểm soát chất lượng' },
  
  { href: '/etl/calculation-runs', label: 'Kích hoạt tính toán', permissions: ['etl:view'], group: 'Động cơ tính toán' },
  
  { href: '/dashboard', label: 'Dashboard chỉ số', permissions: ['dashboard:view'], group: 'Phân tích & Thống kê' },
  { href: '/indicators', label: 'Danh mục chỉ số', permissions: ['indicators:view'], group: 'Phân tích & Thống kê' },
  
  { href: '/ai-agent/chat', label: 'Trợ lý Agent-AI', permissions: ['ai_agent:use'], group: 'Tiện ích thông minh' },
  { href: '/admin', label: 'Quản trị hệ thống', permissions: ['admin:view'], group: 'Hệ thống' },
]

export function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function getRoutePermissions(pathname: string) {
  const matchingItem = [...portalNavItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isActivePath(pathname, item.href))

  return matchingItem?.permissions || ['portal:view']
}
