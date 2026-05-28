'use client'

import { Box, Flex, Spinner, Stack, Text } from '@chakra-ui/react'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { AccessDenied } from './AccessDenied'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { getRoutePermissions } from './navigation'

function LoadingScreen({ message }: { message: string }) {
  return (
    <Flex align="center" bg="gray.50" justify="center" minH="100vh" px={4}>
      <Stack align="center" spacing={3}>
        <Spinner color="brand.600" />
        <Text color="gray.600" fontWeight="700">
          {message}
        </Text>
      </Stack>
    </Flex>
  )
}

export function PortalLayout({
  children,
  title,
  eyebrow = 'CSCL Web',
  flush = false,
  requiredPermissions,
}: {
  children: ReactNode
  title: string
  eyebrow?: string
  flush?: boolean
  requiredPermissions?: string | string[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, hasPermission, status } = useAuth()

  const routePermissions = requiredPermissions
    ? Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions]
    : getRoutePermissions(pathname)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [pathname, router, status])

  if (status === 'loading') {
    return <LoadingScreen message="Đang kiểm tra phiên đăng nhập..." />
  }

  if (status === 'unauthenticated' || !currentUser) {
    return <LoadingScreen message="Đang chuyển đến trang đăng nhập..." />
  }

  const canAccess = hasPermission(routePermissions)

  return (
    <Flex bg="gray.50" minH="100vh">
      <Sidebar />

      <Flex direction="column" flex="1" minH="100vh" minW={0}>
        <Topbar eyebrow={eyebrow} title={title} />
        <Box flex="1" minH={0} overflow={flush ? 'hidden' : 'auto'} p={flush ? 0 : { base: 4, md: 6 }}>
          {canAccess ? children : <AccessDenied />}
        </Box>
      </Flex>
    </Flex>
  )
}
