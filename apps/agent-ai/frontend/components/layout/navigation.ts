export type PortalNavItem = {
  href: string
  label: string
  permissions: string[]
}

export const portalNavItems: PortalNavItem[] = [
  { href: '/', label: 'Tổng quan', permissions: ['portal:view'] },
  { href: '/dashboard', label: 'Dashboard', permissions: ['dashboard:view'] },
  { href: '/indicators', label: 'Chỉ số', permissions: ['indicators:view'] },
  {
    href: '/reports',
    label: 'Báo cáo',
    permissions: [
      'reports:input:view',
      'reports:import:view',
      'reports:review:view',
      'reports:period_lock:view',
    ],
  },
  { href: '/etl', label: 'ETL', permissions: ['etl:view'] },
  { href: '/ai-agent/chat', label: 'Agent-AI', permissions: ['ai_agent:use'] },
  { href: '/admin', label: 'Quản trị', permissions: ['admin:view'] },
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
