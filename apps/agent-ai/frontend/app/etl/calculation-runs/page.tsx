'use client'

import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiCode,
  FiDatabase,
  FiInfo,
  FiPlay,
  FiRefreshCw,
  FiXCircle,
} from 'react-icons/fi'
import { useAuth } from '../../../components/auth/AuthProvider'
import { PortalLayout } from '../../../components/layout/PortalLayout'

type CalculationRun = {
  id: number
  status: string
  period_type: string
  report_date: string | null
  department_code: string | null
  station_code: string | null
  run_type: string
  created_by: string
  started_at: string | null
  finished_at: string | null
  success_count: number
  error_count: number
  logs?: string | null
}

type MasterItem = {
  id: number
  code: string
  name: string
}

export default function CalculationRunsPage() {
  const toast = useToast()
  const { token } = useAuth()
  const { isOpen, onOpen, onClose } = useDisclosure()

  // --- TRẠNG THÁI DANH SÁCH ---
  const [runs, setRuns] = useState<CalculationRun[]>([])
  const [loadingRuns, setLoadingRuns] = useState(true)

  // --- TRẠNG THÁI FORM LẬP LƯỢT CHẠY ---
  const [reportDate, setReportDate] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [periodType, setPeriodType] = useState('daily')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedStation, setSelectedStation] = useState('')
  const [runningJob, setRunningJob] = useState(false)

  // --- CHI TIẾT LOG ĐỂ XEM (MODAL LOG STATE) ---
  const [selectedRun, setSelectedRun] = useState<CalculationRun | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [runLogs, setRunLogs] = useState('')

  // --- DANH MỤC MASTER DATA ---
  const [departments, setDepartments] = useState<MasterItem[]>([])
  const [stations, setStations] = useState<MasterItem[]>([])
  const [departmentsMap, setDepartmentsMap] = useState<Record<string, string>>({})
  const [stationsMap, setStationsMap] = useState<Record<string, string>>({})

  // ==========================================
  // [BƯỚC 1] TẢI DANH MỤC MASTER DATA
  // ==========================================
  useEffect(() => {
    async function loadMaster() {
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [deptsRes, statsRes] = await Promise.all([
          fetch('/api/v1/quality/master/departments', { headers }),
          fetch('/api/v1/quality/master/stations', { headers }),
        ])

        if (deptsRes.ok) {
          const deptsData = await deptsRes.json()
          const list = deptsData.data || []
          setDepartments(list)
          const map: Record<string, string> = {}
          list.forEach((d: MasterItem) => {
            map[d.code] = d.name
          })
          setDepartmentsMap(map)
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          const list = statsData.data || []
          setStations(list)
          const map: Record<string, string> = {}
          list.forEach((s: MasterItem) => {
            map[s.code] = s.name
          })
          setStationsMap(map)
        }
      } catch (err) {
        console.error('Lỗi tải danh mục master data', err)
      }
    }

    if (token) {
      void loadMaster()
    }
  }, [token])

  // ==========================================
  // [BƯỚC 2] TẢI LỊCH SỬ CÁC LƯỢT CHẠY TÍNH TOÁN
  // ==========================================
  const loadRuns = useCallback(async () => {
    if (!token) return
    setLoadingRuns(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const res = await fetch('/api/v1/quality/calculate/runs', { headers })
      if (res.ok) {
        const data = await res.json()
        setRuns(data.data || [])
      } else {
        throw new Error('Lỗi fetch runs')
      }
    } catch {
      toast({
        title: 'Lỗi tải lịch sử',
        description: 'Không lấy được danh sách lịch sử lượt chạy tính toán.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    } finally {
      setLoadingRuns(false)
    }
  }, [token, toast])

  useEffect(() => {
    void loadRuns()
  }, [loadRuns])

  // ==========================================
  // [BƯỚC 3] KÍCH HOẠT LƯỢT CHẠY TÍNH TOÁN MỚI
  // ==========================================
  const handleTriggerRun = async (e: React.FormEvent) => {
    e.preventDefault()
    setRunningJob(true)

    try {
      const res = await fetch('/api/v1/quality/calculate/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          period_type: periodType,
          report_date: reportDate,
          department_code: selectedDept || null,
          station_code: selectedStation || null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: 'Đã kích hoạt tính toán',
          description: 'Động cơ tính toán chỉ số đang chạy ở nền. Vui lòng làm mới danh sách sau vài giây.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        })
        // Chờ 1 giây để job khởi động rồi làm mới danh sách
        setTimeout(() => {
          void loadRuns()
        }, 1000)
      } else {
        toast({
          title: 'Kích hoạt thất bại',
          description: data.detail || 'Có lỗi xảy ra khi kích hoạt động cơ.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        })
      }
    } catch {
      toast({
        title: 'Lỗi kết nối',
        description: 'Không kết nối được tới API tính toán.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    } finally {
      setRunningJob(false)
    }
  }

  // ==========================================
  // [BƯỚC 4] XEM LOG CHI TIẾT CỦA MỘT LƯỢT CHẠY
  // ==========================================
  const handleViewLogs = async (run: CalculationRun) => {
    setSelectedRun(run)
    setRunLogs('')
    setLoadingDetail(true)
    onOpen()

    try {
      const headers = { Authorization: `Bearer ${token}` }
      const res = await fetch(`/api/v1/quality/calculate/runs/${run.id}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setRunLogs(data.data.logs || 'Lượt chạy này không ghi nhận logs chi tiết.')
      } else {
        throw new Error('Lỗi fetch detail')
      }
    } catch {
      toast({
        title: 'Lỗi tải chi tiết',
        description: 'Không lấy được nhật ký log của lượt chạy này.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
      onClose()
    } finally {
      setLoadingDetail(false)
    }
  }

  // Thống kê tổng số lượt chạy, thành công và thất bại
  const totalRuns = runs.length
  const successRuns = runs.filter((r) => r.status === 'success').length
  const failedRuns = runs.filter((r) => r.status === 'failed').length
  const partialRuns = runs.filter((r) => r.status === 'partial_success').length

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge colorScheme="green" variant="solid" px={2.5} py={0.5} borderRadius="md" display="inline-flex" alignItems="center" gap={1}>
            <Icon as={FiCheckCircle} /> Thành công
          </Badge>
        )
      case 'failed':
        return (
          <Badge colorScheme="red" variant="solid" px={2.5} py={0.5} borderRadius="md" display="inline-flex" alignItems="center" gap={1}>
            <Icon as={FiXCircle} /> Thất bại
          </Badge>
        )
      case 'partial_success':
        return (
          <Badge colorScheme="yellow" variant="solid" px={2.5} py={0.5} borderRadius="md" display="inline-flex" alignItems="center" gap={1}>
            <Icon as={FiAlertTriangle} /> Thành công một phần
          </Badge>
        )
      case 'running':
        return (
          <Badge colorScheme="blue" variant="solid" px={2.5} py={0.5} borderRadius="md" display="inline-flex" alignItems="center" gap={1}>
            <Spinner size="xs" color="white" /> Đang chạy...
          </Badge>
        )
      case 'pending':
      default:
        return (
          <Badge colorScheme="gray" px={2.5} py={0.5} borderRadius="md" display="inline-flex" alignItems="center" gap={1}>
            <Icon as={FiClock} /> Chờ xử lý
          </Badge>
        )
    }
  }

  return (
    <PortalLayout requiredPermissions="etl:view" title="Động cơ Tính toán Chỉ số (ETL Engine)">
      <VStack spacing={6} align="stretch" w="full">
        {/* ==========================================
            KHU VỰC THỐNG KÊ LƯỢT CHẠY (METRICS)
            ========================================== */}
        <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={6}>
          <Card borderRadius="2xl" border="1px" borderColor="gray.100" boxShadow="sm">
            <CardBody py={4}>
              <Text fontSize="xs" fontWeight="bold" color="gray.400" textTransform="uppercase">TỔNG SỐ LƯỢT CHẠY</Text>
              <Heading size="lg" mt={2} color="gray.700">{totalRuns}</Heading>
            </CardBody>
          </Card>
          <Card borderRadius="2xl" border="1px" borderColor="gray.100" boxShadow="sm">
            <CardBody py={4}>
              <Text fontSize="xs" fontWeight="bold" color="green.500" textTransform="uppercase">CHẠY THÀNH CÔNG</Text>
              <Heading size="lg" mt={2} color="green.600">{successRuns}</Heading>
            </CardBody>
          </Card>
          <Card borderRadius="2xl" border="1px" borderColor="gray.100" boxShadow="sm">
            <CardBody py={4}>
              <Text fontSize="xs" fontWeight="bold" color="yellow.500" textTransform="uppercase">CHẠY THÀNH CÔNG MỘT PHẦN</Text>
              <Heading size="lg" mt={2} color="yellow.600">{partialRuns}</Heading>
            </CardBody>
          </Card>
          <Card borderRadius="2xl" border="1px" borderColor="gray.100" boxShadow="sm">
            <CardBody py={4}>
              <Text fontSize="xs" fontWeight="bold" color="red.500" textTransform="uppercase">CHẠY THẤT BẠI</Text>
              <Heading size="lg" mt={2} color="red.600">{failedRuns}</Heading>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Alert status="info" borderRadius="2xl" variant="left-accent">
          <AlertIcon />
          <Box fontSize="sm" color="gray.700">
            <Text fontWeight="bold">Nguyên lý hoạt động tự động thời gian thực:</Text>
            Động cơ tính toán chỉ số (ETL Engine) được **tự động kích hoạt ở nền** bất cứ khi nào có hành động:
            **Lưu nháp**, **Cập nhật số liệu**, **Nộp báo cáo**, **Phê duyệt (Khóa sổ)** hoặc **Mở khóa**. Hệ thống sẽ tự động tổng hợp số liệu thô lâm sàng và cập nhật ngay lập tức kết quả của 10 chỉ số chất lượng lâm sàng (CS1 - CS10) trên Dashboard.
          </Box>
        </Alert>

        <Box w="full">
          {/* ==========================================
              BẢNG NHẬT KÝ LƯỢT CHẠY TÍNH TOÁN (RIGHT LIST)
              ========================================== */}
          <Card borderRadius="2xl" border="1px" borderColor="gray.100" boxShadow="sm" overflow="hidden">
            <CardBody p={0}>
              <Flex px={6} py={4} justify="space-between" align="center" borderBottom="1px" borderColor="gray.50">
                <Heading size="md" color="gray.800" display="flex" alignItems="center" gap={2}>
                  <Icon as={FiDatabase} color="gray.400" /> Nhật ký chạy động cơ tính toán
                </Heading>
                <Button
                  leftIcon={<FiRefreshCw />}
                  size="sm"
                  variant="outline"
                  onClick={() => void loadRuns()}
                  borderRadius="xl"
                >
                  Làm mới
                </Button>
              </Flex>

              {loadingRuns ? (
                <Flex py={24} align="center" justify="center" direction="column" gap={4}>
                  <Spinner size="lg" color="brand.500" />
                  <Text color="gray.500">Đang tải lịch sử các lượt chạy tính toán...</Text>
                </Flex>
              ) : runs.length === 0 ? (
                <Flex py={24} align="center" justify="center" direction="column" gap={3}>
                  <Icon as={FiInfo} w={8} h={8} color="gray.300" />
                  <Text color="gray.500">Chưa ghi nhận lượt chạy tính toán chỉ số nào.</Text>
                </Flex>
              ) : (
                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th py={3.5}>Lượt chạy</Th>
                        <Th>Ngày số liệu</Th>
                        <Th>Kỳ hạn</Th>
                        <Th>Phạm vi khoa phòng</Th>
                        <Th>Trạng thái</Th>
                        <Th>Người tạo</Th>
                        <Th>Kết quả tính</Th>
                        <Th textAlign="right" pr={6}>Hành động</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {runs.map((run) => (
                        <Tr key={run.id} _hover={{ bg: 'gray.50/30' }}>
                          <Td py={3.5} fontWeight="bold" color="gray.700">#{run.id}</Td>
                          <Td>{run.report_date || '-'}</Td>
                          <Td>
                            <Badge colorScheme={run.period_type === 'daily' ? 'blue' : 'purple'}>
                              {run.period_type === 'daily' ? 'Ngày' : 'Tháng'}
                            </Badge>
                          </Td>
                          <Td fontSize="xs" fontWeight="semibold">
                            {run.department_code ? (
                              <Text>{departmentsMap[run.department_code] || run.department_code}</Text>
                            ) : (
                              <Text color="gray.400" fontStyle="italic">Toàn bệnh viện</Text>
                            )}
                            {run.station_code && (
                              <Text fontSize="10px" color="gray.400">
                                Trạm: {stationsMap[run.station_code] || run.station_code}
                              </Text>
                            )}
                          </Td>
                          <Td>{renderStatusBadge(run.status)}</Td>
                          <Td fontSize="xs" color="gray.600">{run.created_by}</Td>
                          <Td fontSize="xs">
                            <Text color="green.600" fontWeight="bold">Duyệt: {run.success_count}</Text>
                            <Text color="red.500" fontWeight="bold">Lỗi: {run.error_count}</Text>
                          </Td>
                          <Td textAlign="right" pr={6}>
                            <Button
                              size="xs"
                              colorScheme="brand"
                              variant="outline"
                              leftIcon={<FiCode />}
                              onClick={() => void handleViewLogs(run)}
                              borderRadius="md"
                            >
                              Xem Logs
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </CardBody>
          </Card>
        </Box>
      </VStack>

      {/* ==========================================
          MODAL XEM LOGS CHI TIẾT CỦA ENGINE (LOG VIEWER)
          ========================================== */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent borderRadius="2xl" maxW="800px">
          <ModalHeader borderBottomWidth="1px" borderColor="gray.100" py={4} display="flex" alignItems="center" gap={2}>
            <Icon as={FiCode} color="brand.500" />
            <Text fontSize="md" fontWeight="bold" color="gray.800">
              Nhật ký xử lý chi tiết Lượt chạy #{selectedRun?.id}
            </Text>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody py={5} bg="gray.950" color="green.400">
            {loadingDetail ? (
              <Flex h="300px" align="center" justify="center" direction="column" gap={3}>
                <Spinner size="lg" color="green.400" />
                <Text color="green.400" fontSize="sm">Đang trích xuất log từ CSDL...</Text>
              </Flex>
            ) : (
              <Box
                as="pre"
                fontFamily="mono"
                fontSize="xs"
                whiteSpace="pre-wrap"
                overflowY="auto"
                h="400px"
                lineHeight="tall"
                pr={2}
              >
                {runLogs}
              </Box>
            )}
          </ModalBody>

          <ModalFooter borderTopWidth="1px" borderColor="gray.100" py={3}>
            <Button colorScheme="brand" onClick={onClose} borderRadius="xl">
              Đóng Log
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PortalLayout>
  )
}
