'use client'

import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Checkbox,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Input,
  Select,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react'
import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { EmptyState, LoginNotice, PageHeader, PageShell, StatusAlert } from '../../components/admin-ui'

type Role = {
  id: string
  name: string
  description?: string
}

type User = {
  id: string
  username: string
  email?: string
  full_name?: string
  is_active: boolean
  roles: Role[]
}

const TOKEN_KEY = 'ai-chat-token'

function roleNames(user: User) {
  return user.roles.map((role) => role.name).join(', ') || 'Chưa gán'
}

export default function AdminUsersPage() {
  const [token, setToken] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role_ids: [] as string[],
  })

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token],
  )

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY) || ''
    setToken(savedToken)
  }, [])

  useEffect(() => {
    if (!token) return
    void Promise.all([loadUsers(), loadRoles()])
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

  async function loadUsers() {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (roleFilter) params.set('role', roleFilter)
      params.set('status_filter', statusFilter)
      const data = await request(`/api/v1/admin/users?${params.toString()}`)
      setUsers(data.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách user.')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadRoles() {
    const data = await request('/api/v1/admin/roles')
    setRoles(data.roles || [])
  }

  async function createUser(event: FormEvent) {
    event.preventDefault()
    setIsCreating(true)
    setError('')
    setMessage('')
    try {
      await request('/api/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          email: form.email || null,
          full_name: form.full_name || null,
          is_active: true,
        }),
      })
      setMessage('Đã tạo user.')
      setForm({ username: '', email: '', full_name: '', password: '', role_ids: [] })
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được user.')
    } finally {
      setIsCreating(false)
    }
  }

  async function toggleUser(user: User) {
    setError('')
    setMessage('')
    try {
      await request(`/api/v1/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !user.is_active }),
      })
      setMessage('Đã cập nhật trạng thái user.')
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không cập nhật được trạng thái user.')
    }
  }

  function toggleFormRole(roleId: string) {
    setForm((current) => ({
      ...current,
      role_ids: current.role_ids.includes(roleId)
        ? current.role_ids.filter((id) => id !== roleId)
        : [...current.role_ids, roleId],
    }))
  }

  if (!token) return <LoginNotice title="Quản lý người dùng" />

  return (
    <PageShell>
      <PageHeader
        description="Tạo tài khoản, trạng thái tài khoản."
        navItems={[
          { href: '/chat', label: 'Chat' },
          { href: '/admin/roles', label: 'Role & permission' },
        ]}
        title="Quản lý người dùng"
      />
      <StatusAlert message={error} status="error" />
      <StatusAlert message={message} status="success" />

      <Card mb={4}>
        <CardBody>
          <Grid gap={3} gridTemplateColumns={{ base: '1fr', lg: 'minmax(260px, 1fr) 180px 180px auto' }}>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm username, email, họ tên" />
            <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="">Tất cả role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="disabled">Đã tắt</option>
            </Select>
            <Button onClick={loadUsers}>Lọc</Button>
          </Grid>
        </CardBody>
      </Card>

      <Grid alignItems="start" gap={4} gridTemplateColumns={{ base: '1fr', xl: 'minmax(0, 1fr) 360px' }}>
        <Card>
          <CardBody>
            <Stack spacing={4}>
              <HStack justify="space-between">
                <Text fontSize="lg" fontWeight="800">Danh sách user</Text>
                <HStack color="gray.600">
                  {isLoading ? <Spinner size="sm" /> : null}
                  <Text fontWeight="700">{isLoading ? 'Đang tải...' : `${users.length} user`}</Text>
                </HStack>
              </HStack>
              {isLoading ? (
                <HStack justify="center" py={10}><Spinner /></HStack>
              ) : users.length ? (
                <Box overflowX="auto">
                  <Table minW="760px" size="sm" variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>User</Th>
                        <Th>Role</Th>
                        <Th>Trạng thái</Th>
                        <Th>Thao tác</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {users.map((user) => (
                        <Tr _hover={{ bg: 'gray.50' }} key={user.id}>
                          <Td>
                            <Text fontWeight="800">{user.username}</Text>
                            <Text color="gray.600" fontSize="sm">{user.full_name || user.email || 'Chưa có thông tin'}</Text>
                          </Td>
                          <Td>{roleNames(user)}</Td>
                          <Td>
                            <Badge colorScheme={user.is_active ? 'green' : 'red'}>{user.is_active ? 'Active' : 'Disabled'}</Badge>
                          </Td>
                          <Td>
                            <HStack flexWrap="wrap">
                              <Button as={Link} href={`/admin/users/${user.id}`} size="sm" variant="outline">Chi tiết</Button>
                              <Button colorScheme={user.is_active ? 'red' : 'green'} size="sm" variant="outline" onClick={() => toggleUser(user)}>
                                {user.is_active ? 'Tắt' : 'Bật'}
                              </Button>
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              ) : (
                <EmptyState>Không có user phù hợp.</EmptyState>
              )}
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stack as="form" onSubmit={createUser} spacing={4}>
              <Text fontSize="lg" fontWeight="800">Tạo user</Text>
              <FormControl isRequired>
                <FormLabel>Username</FormLabel>
                <Input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Mật khẩu</FormLabel>
                <Input minLength={6} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel>Họ tên</FormLabel>
                <Input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </FormControl>
              <Stack spacing={2}>
                {roles.map((role) => (
                  <Checkbox key={role.id} isChecked={form.role_ids.includes(role.id)} onChange={() => toggleFormRole(role.id)}>
                    {role.name}
                  </Checkbox>
                ))}
              </Stack>
              <Button colorScheme="brand" isLoading={isCreating} type="submit" w={{ base: 'full', sm: 'fit-content' }}>
                Tạo user
              </Button>
            </Stack>
          </CardBody>
        </Card>
      </Grid>
    </PageShell>
  )
}
