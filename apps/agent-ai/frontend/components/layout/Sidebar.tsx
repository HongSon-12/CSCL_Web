'use client'

import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../auth/AuthProvider'
import { isActivePath, portalNavItems } from './navigation'

export function Sidebar() {
  const pathname = usePathname()
  const { hasPermission } = useAuth()

  return (
    <Box
      as="aside"
      bg="white"
      borderRightWidth="1px"
      display={{ base: 'none', lg: 'block' }}
      flexShrink={0}
      px={4}
      py={5}
      w="280px"
    >
      <Stack h="full" justify="space-between" spacing={6}>
        <Stack spacing={6}>
          <Box>
            <Text color="brand.600" fontSize="xs" fontWeight="900" textTransform="uppercase">
              Trung tâm Cấp cứu 115
            </Text>
            <Heading color="gray.900" size="md">
              Quản lý chất lượng
            </Heading>
          </Box>

          <Stack spacing={2}>
            {portalNavItems
              .filter((item) => hasPermission(item.permissions))
              .map((item) => {
                const active = isActivePath(pathname, item.href)
                return (
                  <Button
                    as={Link}
                    bg={active ? 'brand.50' : 'transparent'}
                    color={active ? 'brand.700' : 'gray.700'}
                    href={item.href}
                    justifyContent="flex-start"
                    key={item.href}
                    variant="ghost"
                  >
                    {item.label}
                  </Button>
                )
              })}
          </Stack>
        </Stack>

        <Stack borderTopWidth="1px" color="gray.600" fontSize="sm" pt={4} spacing={1}>
          <Text fontWeight="800">Phase 1 portal</Text>
          <Text>Auth, layout và route guard</Text>
        </Stack>
      </Stack>
    </Box>
  )
}
