'use client'

import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../auth/AuthProvider'
import { isActivePath, portalNavItems } from './navigation'

export function Sidebar() {
  const pathname = usePathname()
  const { hasPermission } = useAuth()

  // Lọc các mục người dùng được phép xem dựa trên Permission Gate
  const allowedItems = portalNavItems.filter((item) => hasPermission(item.permissions))
  
  // Trích xuất danh sách các nhóm chức năng duy nhất theo thứ tự khai báo
  const groups = Array.from(new Set(allowedItems.map((item) => item.group)))

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
        <Stack spacing={6} overflow="hidden">
          {/* Header liên kết thương hiệu */}
          <Box pl={2}>
            <Text color="brand.600" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
              Trung tâm Cấp cứu 115
            </Text>
            <Heading color="gray.800" size="md" mt={1}>
              Quản lý chất lượng
            </Heading>
          </Box>

          {/* Phân nhóm Menu thông minh dạng danh mục */}
          <Stack spacing={4} overflowY="auto" maxH="calc(100vh - 200px)" pr={1} className="sidebar-scroll">
            {groups.map((group) => (
              <Stack key={group} spacing={1}>
                {/* Nhãn nhóm nhỏ, viết hoa, tinh tế */}
                <Text
                  color="gray.400"
                  fontSize="10px"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  pl={3}
                  mb={1}
                >
                  {group}
                </Text>
                
                {/* Các nút liên kết con thuộc nhóm */}
                {allowedItems
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const active = isActivePath(pathname, item.href)
                    return (
                      <Button
                        as={Link}
                        bg={active ? 'brand.50' : 'transparent'}
                        color={active ? 'brand.700' : 'gray.600'}
                        _hover={{ bg: 'gray.50', color: 'gray.800' }}
                        href={item.href}
                        justifyContent="flex-start"
                        key={item.href}
                        variant="ghost"
                        size="sm"
                        borderRadius="xl"
                        fontWeight="bold"
                        fontSize="xs"
                        py={4}
                        pl={3}
                      >
                        {item.label}
                      </Button>
                    )
                  })}
              </Stack>
            ))}
          </Stack>
        </Stack>

        {/* Chú thích trạng thái phiên bản */}
        <Stack borderTopWidth="1px" color="gray.500" fontSize="10px" pt={4} spacing={1} pl={2}>
          <Text fontWeight="800" color="gray.600">QLCL Web Portal V2</Text>
          <Text>Duyệt số liệu &amp; Khóa kỳ báo cáo</Text>
        </Stack>
      </Stack>
    </Box>
  )
}
