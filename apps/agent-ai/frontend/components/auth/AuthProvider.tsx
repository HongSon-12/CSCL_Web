'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export const TOKEN_KEY = 'ai-chat-token'

export type CurrentUser = {
  id: string
  username: string
  email?: string | null
  full_name?: string | null
  is_active: boolean
  roles: string[]
  permissions: string[]
  scopes: string[]
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  currentUser: CurrentUser | null
  token: string
  status: AuthStatus
  login: (username: string, password: string) => Promise<{ ok: boolean; message?: string }>
  logout: () => void
  refreshCurrentUser: () => Promise<void>
  hasPermission: (permissions?: string | string[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchCurrentUser(token: string) {
  const response = await fetch('/api/v1/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Phiên đăng nhập không hợp lệ.')
  }

  return response.json() as Promise<CurrentUser>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState('')
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const applyToken = useCallback(async (nextToken: string) => {
    setToken(nextToken)
    localStorage.setItem(TOKEN_KEY, nextToken)
    const user = await fetchCurrentUser(nextToken)
    setCurrentUser(user)
    setStatus('authenticated')
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setCurrentUser(null)
    setStatus('unauthenticated')
  }, [])

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY) || ''

    if (!savedToken) {
      setStatus('unauthenticated')
      return
    }

    void applyToken(savedToken).catch(clearSession)
  }, [applyToken, clearSession])

  const login = useCallback(
    async (username: string, password: string) => {
      const body = new URLSearchParams()
      body.set('username', username)
      body.set('password', password)

      try {
        const response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        })

        if (!response.ok) {
          return {
            ok: false,
            message: 'Đăng nhập không thành công. Kiểm tra lại tài khoản hoặc mật khẩu.',
          }
        }

        const data = await response.json()
        await applyToken(data.access_token)
        return { ok: true }
      } catch {
        return {
          ok: false,
          message: 'Không kết nối được API đăng nhập. Kiểm tra backend hoặc proxy /api/v1.',
        }
      }
    },
    [applyToken],
  )

  const refreshCurrentUser = useCallback(async () => {
    if (!token) return

    try {
      const user = await fetchCurrentUser(token)
      setCurrentUser(user)
      setStatus('authenticated')
    } catch {
      clearSession()
    }
  }, [clearSession, token])

  const hasPermission = useCallback(
    (permissions?: string | string[]) => {
      const required = Array.isArray(permissions) ? permissions : permissions ? [permissions] : []
      if (!required.length) return true
      if (!currentUser) return false

      return required.some((permission) => currentUser.permissions.includes(permission))
    },
    [currentUser],
  )

  const value = useMemo(
    () => ({
      currentUser,
      token,
      status,
      login,
      logout: clearSession,
      refreshCurrentUser,
      hasPermission,
    }),
    [clearSession, currentUser, hasPermission, login, refreshCurrentUser, status, token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
