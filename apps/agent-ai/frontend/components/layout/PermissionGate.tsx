'use client'

import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'

export function PermissionGate({
  children,
  fallback = null,
  permissions,
  requireAll = false,
}: {
  children: ReactNode
  fallback?: ReactNode
  permissions?: string | string[]
  requireAll?: boolean
}) {
  const { currentUser, status } = useAuth()
  const required = Array.isArray(permissions) ? permissions : permissions ? [permissions] : []

  if (!required.length) return <>{children}</>
  if (status !== 'authenticated' || !currentUser) return <>{fallback}</>

  const allowed = requireAll
    ? required.every((permission) => currentUser.permissions.includes(permission))
    : required.some((permission) => currentUser.permissions.includes(permission))

  return allowed ? <>{children}</> : <>{fallback}</>
}
