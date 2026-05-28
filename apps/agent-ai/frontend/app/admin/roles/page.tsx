'use client'

import {
  Box,
  Button,
  Card,
  CardBody,
  Checkbox,
  Grid,
  HStack,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState, LoginNotice, PageHeader, PageShell, StatusAlert } from '../../components/admin-ui'

type Permission = {
  id: string
  code: string
  description?: string
}

type Role = {
  id: string
  name: string
  description?: string
  permissions: Permission[]
}

const TOKEN_KEY = 'ai-chat-token'

function permissionModule(code: string) {
  return code.split(':')[0] || 'system'
}

export default function AdminRolesPage() {
  const [token, setToken] = useState('')
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [drafts, setDrafts] = useState<Record<string, string[]>>({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [savingRoleId, setSavingRoleId] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token],
  )

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>()
    for (const permission of permissions) {
      const key = permissionModule(permission.code)
      groups.set(key, [...(groups.get(key) || []), permission])
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [permissions])
  const matrixColumns = `minmax(260px, 1.4fr) repeat(${Math.max(roles.length, 1)}, minmax(140px, 0.6fr))`

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY) || '')
  }, [])

  useEffect(() => {
    if (!token) return
    void loadRoles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function request(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: {
        ...authHeaders,
        ...(init.headers || {}),
      },
    })
    if (response.status === 401 || response.status === 403) {
      throw new Error('Tài khoản không có quyền truy cập trang quản trị.')
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.detail || 'API quản trị đang lỗi.')
    }
    return response.json()
  }

  async function loadRoles() {
    setIsLoading(true)
    setError('')
    try {
      const data = await request('/api/v1/admin/roles')
      const nextRoles: Role[] = data.roles || []
      setRoles(nextRoles)
      setPermissions(data.permissions || [])
      setDrafts(
        Object.fromEntries(
          nextRoles.map((role) => [role.id, role.permissions.map((permission) => permission.id)]),
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được role.')
    } finally {
      setIsLoading(false)
    }
  }

  function togglePermission(roleId: string, permissionId: string) {
    setDrafts((current) => {
      const currentIds = current[roleId] || []
      return {
        ...current,
        [roleId]: currentIds.includes(permissionId)
          ? currentIds.filter((id) => id !== permissionId)
          : [...currentIds, permissionId],
      }
    })
  }

  async function saveRole(role: Role) {
    setSavingRoleId(role.id)
    setError('')
    setMessage('')
    try {
      await request(`/api/v1/admin/roles/${role.id}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ permission_ids: drafts[role.id] || [] }),
      })
      setMessage(`Đã lưu quyền cho ${role.name}.`)
      await loadRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được role.')
    } finally {
      setSavingRoleId('')
    }
  }

  if (!token) return <LoginNotice title="Role & permission" />

  return (
    <PageShell>
      <PageHeader
        description="Quản lý quyền theo từng vai trò."
        navItems={[
          { href: '/chat', label: 'Chat' },
          { href: '/admin/users', label: 'User list' },
          { href: '/chat', label: 'Chat' },
        ]}
        title="Role & permission"
      />
      <StatusAlert message={error} status="error" />
      <StatusAlert message={message} status="success" />

      <Card mb={4}>
        <CardBody>
          {isLoading ? (
            <HStack justify="center" py={10}><Spinner /></HStack>
          ) : groupedPermissions.length ? (
            <Box overflowX="auto">
              <Box borderColor="gray.200" borderRadius="lg" borderWidth="1px" minW="760px" overflow="hidden">
                <Grid bg="gray.50" color="gray.600" fontSize="xs" fontWeight="900" gap={2} gridTemplateColumns={matrixColumns} p={3} position="sticky" textTransform="uppercase" top={0} zIndex={1}>
                  <Text>Permission</Text>
                  {roles.map((role) => (
                    <Text key={role.id}>{role.name}</Text>
                  ))}
                </Grid>
                {groupedPermissions.map(([moduleName, items]) => (
                  <Box key={moduleName}>
                    <Text bg="brand.50" borderBottomWidth="1px" borderTopWidth="1px" color="brand.700" fontSize="xs" fontWeight="900" px={3} py={2} textTransform="uppercase">
                      {moduleName}
                    </Text>
                    {items.map((permission) => (
                      <Grid _hover={{ bg: 'gray.50' }} alignItems="center" borderBottomWidth="1px" gap={2} gridTemplateColumns={matrixColumns} key={permission.id} p={3}>
                        <Box title={permission.description || permission.code}>
                          <Text fontWeight="800">{permission.code}</Text>
                          <Text color="gray.600" fontSize="sm">{permission.description}</Text>
                        </Box>
                        {roles.map((role) => (
                          <HStack justify="center" key={role.id}>
                            <Checkbox
                              isChecked={(drafts[role.id] || []).includes(permission.id)}
                              onChange={() => togglePermission(role.id, permission.id)}
                            />
                          </HStack>
                        ))}
                      </Grid>
                    ))}
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <EmptyState>Chưa có dữ liệu quyền.</EmptyState>
          )}
        </CardBody>
      </Card>

      <Stack direction={{ base: 'column', md: 'row' }} spacing={3}>
        {roles.map((role) => (
          <Button colorScheme="brand" isLoading={savingRoleId === role.id} key={role.id} onClick={() => saveRole(role)}>
            Lưu {role.name}
          </Button>
        ))}
      </Stack>
    </PageShell>
  )
}
