import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'

export function AccessDenied() {
  return (
    <Box bg="white" borderRadius="lg" borderWidth="1px" maxW="2xl" p={{ base: 5, md: 6 }}>
      <Stack spacing={3}>
        <Text color="brand.600" fontSize="xs" fontWeight="900" textTransform="uppercase">
          403
        </Text>
        <Heading size="md">Không có quyền truy cập</Heading>
        <Text color="gray.600">
          Tài khoản hiện tại chưa có permission cần thiết cho màn hình này.
        </Text>
        <Button as={Link} href="/" w={{ base: 'full', sm: 'fit-content' }}>
          Về tổng quan
        </Button>
      </Stack>
    </Box>
  )
}
