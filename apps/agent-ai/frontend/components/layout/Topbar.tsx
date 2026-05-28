'use client'

import { Box, Button, Flex, HStack, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../auth/AuthProvider'
import { PageHeader } from './PageHeader'
import { isActivePath, portalNavItems } from './navigation'

export function Topbar({
  eyebrow,
  title,
}: {
  eyebrow?: string
  title: string
}) {
  const pathname = usePathname()
  const { currentUser, hasPermission, logout } = useAuth()

  return (
    <Box bg="white" borderBottomWidth="1px" flexShrink={0} px={{ base: 4, md: 6 }} py={4}>
      <Flex align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3} justify="space-between">
        <PageHeader eyebrow={eyebrow} title={title} />

        <HStack align="center" justify={{ base: 'space-between', md: 'flex-end' }} spacing={3}>
          <Stack display={{ base: 'none', md: 'flex' }} lineHeight="1.2" spacing={0} textAlign="right">
            <Text color="gray.900" fontSize="sm" fontWeight="800">
              {currentUser?.full_name || currentUser?.username}
            </Text>
            <Text color="gray.500" fontSize="xs">
              {currentUser?.roles.join(', ') || 'Chưa có role'}
            </Text>
          </Stack>
          <Button onClick={logout} size="sm" variant="outline">
            Đăng xuất
          </Button>
        </HStack>
      </Flex>

      <HStack display={{ base: 'flex', lg: 'none' }} mt={3} overflowX="auto" pb={1} spacing={2}>
        {portalNavItems
          .filter((item) => hasPermission(item.permissions))
          .map((item) => (
            <Button
              as={Link}
              colorScheme={isActivePath(pathname, item.href) ? 'brand' : 'gray'}
              flexShrink={0}
              href={item.href}
              key={item.href}
              size="sm"
              variant={isActivePath(pathname, item.href) ? 'solid' : 'outline'}
            >
              {item.label}
            </Button>
          ))}
      </HStack>
    </Box>
  )
}
