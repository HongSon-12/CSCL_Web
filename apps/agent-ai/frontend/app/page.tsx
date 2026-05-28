import { Box, Card, CardBody, Grid, Heading, Stack, Text } from '@chakra-ui/react'
import { PortalLayout } from '../components/layout/PortalLayout'
import { PermissionGate } from '../components/layout/PermissionGate'

const modules = [
  { name: 'Dashboard', href: '/dashboard', status: 'Shell', detail: 'BGD, KĐH, KCCNBV, chất lượng tổng hợp', permissions: ['dashboard:view'] },
  { name: 'Chỉ số', href: '/indicators', status: 'Catalog', detail: 'Khung CS1-CS53 và biến A/B/C/D/E', permissions: ['indicators:view'] },
  { name: 'Báo cáo', href: '/reports', status: 'Input', detail: 'Nhập liệu, import và xuất báo cáo', permissions: ['reports:input:view', 'reports:import:view', 'reports:review:view', 'reports:period_lock:view'] },
  { name: 'ETL', href: '/etl', status: 'Queue', detail: 'Theo dõi job làm sạch và chuẩn hóa dữ liệu', permissions: ['etl:view'] },
  { name: 'Agent-AI', href: '/ai-agent/chat', status: 'Live', detail: 'Route mới cho chatbot nội bộ', permissions: ['ai_agent:use'] },
  { name: 'Quản trị', href: '/admin', status: 'RBAC', detail: 'Người dùng, vai trò và quyền truy cập', permissions: ['admin:view'] },
]

export default function Home() {
  return (
    <PortalLayout title="Tổng quan hệ thống">
      <Stack spacing={5}>
        <Grid gap={4} templateColumns={{ base: '1fr', md: 'repeat(3, minmax(0, 1fr))' }}>
          <Card>
            <CardBody>
              <Text color="gray.600" fontWeight="800">Agent-AI</Text>
              <Heading size="lg">Đang chạy</Heading>
              <Text color="gray.600" mt={2}>/chat được giữ nguyên, /ai-agent/chat đã mở.</Text>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Text color="gray.600" fontWeight="800">Portal shell</Text>
              <Heading size="lg">Phase 1</Heading>
              <Text color="gray.600" mt={2}>Các module chính đã có route nền.</Text>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Text color="gray.600" fontWeight="800">Database quality</Text>
              <Heading size="lg">Chưa chạm</Heading>
              <Text color="gray.600" mt={2}>Schema quality_* dành cho phase sau.</Text>
            </CardBody>
          </Card>
        </Grid>

        <Grid gap={4} templateColumns={{ base: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }}>
          {modules.map((module) => (
            <PermissionGate key={module.href} permissions={module.permissions}>
              <Card as="a" href={module.href}>
                <CardBody>
                  <Stack spacing={2}>
                    <Box>
                      <Text color="brand.600" fontSize="xs" fontWeight="900" textTransform="uppercase">
                        {module.status}
                      </Text>
                      <Heading size="md">{module.name}</Heading>
                    </Box>
                    <Text color="gray.600">{module.detail}</Text>
                  </Stack>
                </CardBody>
              </Card>
            </PermissionGate>
          ))}
        </Grid>
      </Stack>
    </PortalLayout>
  )
}
