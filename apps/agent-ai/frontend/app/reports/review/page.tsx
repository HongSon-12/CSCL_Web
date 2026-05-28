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
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import {
  FiAlertCircle,
  FiCheckCircle,
  FiEye,
  FiFileText,
  FiFilter,
  FiInfo,
  FiSend,
  FiXCircle,
} from 'react-icons/fi'
import { useAuth } from '../../../components/auth/AuthProvider'
import { PortalLayout } from '../../../components/layout/PortalLayout'

type ReviewTask = {
  id: number
  target_type: string
  target_id: number
  status: string
  assigned_to: string | null
  requested_by: string
  reviewed_by: string | null
  requested_at: string | null
  reviewed_at: string | null
  review_note: string | null
  batch: {
    id: number
    batch_code: string
    report_date: string
    period_type: string
    department_code: string
    station_code: string | null
    status: string
    note: string | null
    created_by: string
    created_at: string | null
  }
}

type VariableItem = {
  variable_code: string
  name: string
  unit: string | null
}

type DepartmentItem = {
  code: string
  name: string
}

type BatchRecord = {
  variable_code: string
  value: number | null
  text_value: string | null
  note: string | null
  row_status: string
  error_message: string | null
}

type BatchDetail = {
  id: number
  batch_code: string
  report_date: string
  period_type: string
  department_code: string
  station_code: string | null
  status: string
  note: string | null
  created_by: string
  created_at: string
  approved_by: string | null
  approved_at: string | null
  reject_reason: string | null
  records: BatchRecord[]
}

export default function ReportsReviewPage() {
  const toast = useToast()
  const { currentUser, token } = useAuth()
  const { isOpen, onOpen, onClose } = useDisclosure()

  // --- TRẠNG THÁI DANH SÁCH ---
  const [tasks, setTasks] = useState<ReviewTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [selectedDept, setSelectedDept] = useState('')

  // --- METRIC TỔNG QUAN ---
  const [metrics, setMetrics] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  })

  // --- DANH MỤC MASTER DATA ---
  const [variablesMap, setVariablesMap] = useState<Record<string, VariableItem>>({})
  const [departmentsMap, setDepartmentsMap] = useState<Record<string, string>>({})
  const [departmentsList, setDepartmentsList] = useState<DepartmentItem[]>([])

  // --- CHI TIẾT BATCH ĐANG XEM ---
  const [selectedTask, setSelectedTask] = useState<ReviewTask | null>(null)
  const [batchDetail, setBatchDetail] = useState<BatchDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [reviewNote, setReviewNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ==========================================
  // [BƯỚC 1] TẢI MASTER DATA ĐỂ HIỂN THỊ TÊN ĐẸP
  // ==========================================
  useEffect(() => {
    async function loadMaster() {
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [deptsRes, varsRes] = await Promise.all([
          fetch('/api/v1/quality/master/departments', { headers }),
          fetch('/api/v1/quality/indicators/variables', { headers }),
        ])

        if (deptsRes.ok) {
          const deptsData = await deptsRes.json()
          const list = deptsData.data || []
          setDepartmentsList(list)
          const map: Record<string, string> = {}
          list.forEach((d: DepartmentItem) => {
            map[d.code] = d.name
          })
          setDepartmentsMap(map)
        }

        if (varsRes.ok) {
          const varsData = await varsRes.json()
          const map: Record<string, VariableItem> = {}
          ;(varsData.data || []).forEach((v: VariableItem) => {
            map[v.variable_code] = v
          })
          setVariablesMap(map)
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
  // [BƯỚC 2] TẢI DANH SÁCH REVIEW TASKS & ĐẾM METRICS
  // ==========================================
  const loadTasks = useCallback(async () => {
    if (!token) return
    setLoadingTasks(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      
      // Tải song song cả 3 loại trạng thái để tính toán chỉ số nhanh
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch('/api/v1/quality/review/tasks?status=pending', { headers }),
        fetch('/api/v1/quality/review/tasks?status=approved', { headers }),
        fetch('/api/v1/quality/review/tasks?status=rejected', { headers }),
      ])

      let pData: ReviewTask[] = []
      let aData: ReviewTask[] = []
      let rData: ReviewTask[] = []

      if (pendingRes.ok) pData = (await pendingRes.json()).data || []
      if (approvedRes.ok) aData = (await approvedRes.json()).data || []
      if (rejectedRes.ok) rData = (await rejectedRes.json()).data || []

      setMetrics({
        pending: pData.length,
        approved: aData.length,
        rejected: rData.length,
      })

      // Đổ dữ liệu theo tab đang chọn
      if (filterStatus === 'pending') {
        setTasks(pData)
      } else if (filterStatus === 'approved') {
        setTasks(aData)
      } else {
        setTasks(rData)
      }
    } catch {
      toast({
        title: 'Lỗi tải danh sách',
        description: 'Không tải được danh sách nhiệm vụ phê duyệt.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    } finally {
      setLoadingTasks(false)
    }
  }, [token, filterStatus, toast])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  // ==========================================
  // [BƯỚC 3] XEM CHI TIẾT BATCH LÂM SÀNG
  // ==========================================
  const handleViewDetail = async (task: ReviewTask) => {
    setSelectedTask(task)
    setReviewNote('')
    setBatchDetail(null)
    setLoadingDetail(true)
    onOpen()

    try {
      const headers = { Authorization: `Bearer ${token}` }
      const res = await fetch(`/api/v1/quality/input/batches/${task.target_id}`, { headers })
      if (res.ok) {
        const detailData = await res.json()
        setBatchDetail(detailData.data)
      } else {
        throw new Error('Lỗi fetch detail')
      }
    } catch {
      toast({
        title: 'Lỗi tải chi tiết',
        description: 'Không tải được thông tin chi tiết lô số liệu.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
      onClose()
    } finally {
      setLoadingDetail(false)
    }
  }

  // ==========================================
  // [BƯỚC 4] PHÊ DUYỆT BÁO CÁO (APPROVE)
  // ==========================================
  const handleApprove = async () => {
    if (!batchDetail || !selectedTask) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/quality/input/batches/${batchDetail.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ review_note: reviewNote }),
      })

      const data = await res.json()
      if (res.ok) {
        toast({
          title: 'Phê duyệt thành công',
          description: `Đã phê duyệt lô số liệu ${batchDetail.batch_code}.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
        onClose()
        void loadTasks()
      } else {
        toast({
          title: 'Phê duyệt thất bại',
          description: data.detail || 'Có lỗi xảy ra trong quá trình xử lý.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        })
      }
    } catch {
      toast({
        title: 'Lỗi kết nối',
        description: 'Không kết nối được tới máy chủ.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    } finally {
      setSubmitting(false)
    }
  }

  // ==========================================
  // [BƯỚC 5] TỪ CHỐI DUYỆT BÁO CÁO (REJECT)
  // ==========================================
  const handleReject = async () => {
    if (!batchDetail || !selectedTask) return

    if (!reviewNote.trim()) {
      toast({
        title: 'Lưu ý bắt buộc',
        description: 'Vui lòng nhập lý do từ chối phê duyệt lô số liệu này.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/quality/input/batches/${batchDetail.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ review_note: reviewNote }),
      })

      const data = await res.json()
      if (res.ok) {
        toast({
          title: 'Từ chối thành công',
          description: `Đã trả lại lô số liệu ${batchDetail.batch_code} cho nhân viên sửa.`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        })
        onClose()
        void loadTasks()
      } else {
        toast({
          title: 'Thực hiện thất bại',
          description: data.detail || 'Có lỗi xảy ra trong quá trình xử lý.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        })
      }
    } catch {
      toast({
        title: 'Lỗi kết nối',
        description: 'Không kết nối được tới máy chủ.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Lọc danh sách theo khoa/phòng chọn ở bộ lọc UI
  const filteredTasks = tasks.filter((t) => {
    if (!selectedDept) return true
    return t.batch.department_code === selectedDept
  })

  // Định dạng hiển thị Badge cho Trạng thái
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge colorScheme="green" px={2} py={1} borderRadius="md">Đã phê duyệt</Badge>
      case 'rejected':
        return <Badge colorScheme="red" px={2} py={1} borderRadius="md">Từ chối duyệt</Badge>
      case 'pending':
      default:
        return <Badge colorScheme="yellow" px={2} py={1} borderRadius="md">Chờ phê duyệt</Badge>
    }
  }

  // Kiểm tra quy tắc tự duyệt bảo mật
  // Chặn tự duyệt lô do chính mình lập, trừ khi có vai trò Admin hoặc Quality Manager
  const isSelfBatch = batchDetail?.created_by === currentUser?.username
  const isUserAdmin = currentUser?.roles.includes('admin') || currentUser?.roles.includes('quality_manager')
  const isApproveDisabled = isSelfBatch && !isUserAdmin

  return (
    <PortalLayout requiredPermissions="reports:review:view" title="Quy trình Phê duyệt số liệu">
      <VStack spacing={6} align="stretch" w="full">
        {/* ==========================================
            KHU VỰC THỐNG KÊ (METRIC CARDS)
            ========================================== */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Card
            bgGradient="linear(to-br, orange.400, red.500)"
            color="white"
            borderRadius="2xl"
            boxShadow="xl"
            _hover={{ transform: 'translateY(-4px)', transition: '0.3s' }}
          >
            <CardBody>
              <Flex align="center" justify="between">
                <Box>
                  <Text fontSize="sm" fontWeight="medium" opacity={0.8}>HÀNG ĐỢI CHỜ DUYỆT</Text>
                  <Heading size="2xl" mt={2}>{metrics.pending}</Heading>
                </Box>
                <Icon as={FiSend} w={12} h={12} opacity={0.3} />
              </Flex>
            </CardBody>
          </Card>

          <Card
            bgGradient="linear(to-br, green.400, teal.500)"
            color="white"
            borderRadius="2xl"
            boxShadow="xl"
            _hover={{ transform: 'translateY(-4px)', transition: '0.3s' }}
          >
            <CardBody>
              <Flex align="center" justify="between">
                <Box>
                  <Text fontSize="sm" fontWeight="medium" opacity={0.8}>ĐÃ PHÊ DUYỆT (KỲ NÀY)</Text>
                  <Heading size="2xl" mt={2}>{metrics.approved}</Heading>
                </Box>
                <Icon as={FiCheckCircle} w={12} h={12} opacity={0.3} />
              </Flex>
            </CardBody>
          </Card>

          <Card
            bgGradient="linear(to-br, red.400, pink.500)"
            color="white"
            borderRadius="2xl"
            boxShadow="xl"
            _hover={{ transform: 'translateY(-4px)', transition: '0.3s' }}
          >
            <CardBody>
              <Flex align="center" justify="between">
                <Box>
                  <Text fontSize="sm" fontWeight="medium" opacity={0.8}>ĐÃ TỪ CHỐI / TRẢ LẠI</Text>
                  <Heading size="2xl" mt={2}>{metrics.rejected}</Heading>
                </Box>
                <Icon as={FiXCircle} w={12} h={12} opacity={0.3} />
              </Flex>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* ==========================================
            BỘ LỌC DỮ LIỆU & TAB TRẠNG THÁI
            ========================================== */}
        <Card borderRadius="2xl" border="1px" borderColor="gray.100" boxShadow="sm">
          <CardBody>
            <Stack direction={{ base: 'column', md: 'row' }} spacing={6} justify="space-between" align="center">
              {/* Tabs Trạng thái */}
              <HStack spacing={2} bg="gray.50" p={1.5} borderRadius="xl" border="1px" borderColor="gray.100">
                <Button
                  size="md"
                  colorScheme={filterStatus === 'pending' ? 'orange' : 'gray'}
                  variant={filterStatus === 'pending' ? 'solid' : 'ghost'}
                  onClick={() => setFilterStatus('pending')}
                  borderRadius="lg"
                >
                  Chờ duyệt ({metrics.pending})
                </Button>
                <Button
                  size="md"
                  colorScheme={filterStatus === 'approved' ? 'green' : 'gray'}
                  variant={filterStatus === 'approved' ? 'solid' : 'ghost'}
                  onClick={() => setFilterStatus('approved')}
                  borderRadius="lg"
                >
                  Đã duyệt ({metrics.approved})
                </Button>
                <Button
                  size="md"
                  colorScheme={filterStatus === 'rejected' ? 'red' : 'gray'}
                  variant={filterStatus === 'rejected' ? 'solid' : 'ghost'}
                  onClick={() => setFilterStatus('rejected')}
                  borderRadius="lg"
                >
                  Từ chối ({metrics.rejected})
                </Button>
              </HStack>

              {/* Bộ lọc Khoa Phòng */}
              <HStack w={{ base: 'full', md: '320px' }}>
                <Icon as={FiFilter} color="gray.400" />
                <Select
                  placeholder="Lọc theo khoa phòng..."
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  borderRadius="xl"
                  bg="white"
                >
                  {departmentsList.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </HStack>
            </Stack>
          </CardBody>
        </Card>

        {/* ==========================================
            BẢNG HÀNG ĐỢI NHIỆM VỤ PHÊ DUYỆT (TABLE)
            ========================================== */}
        <Card borderRadius="2xl" border="1px" borderColor="gray.100" boxShadow="sm" overflow="hidden">
          <CardBody p={0}>
            {loadingTasks ? (
              <Flex py={20} align="center" justify="center" direction="column" gap={4}>
                <Spinner size="xl" color="brand.500" thickness="4px" />
                <Text color="gray.500">Đang tải danh sách nhiệm vụ duyệt...</Text>
              </Flex>
            ) : filteredTasks.length === 0 ? (
              <Flex py={20} align="center" justify="center" direction="column" gap={3}>
                <Icon as={FiInfo} w={10} h={10} color="gray.300" />
                <Text color="gray.500">Không tìm thấy nhiệm vụ phê duyệt nào khớp bộ lọc.</Text>
              </Flex>
            ) : (
              <Box overflowX="auto">
                <Table variant="simple" size="md">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th borderBottomWidth="1px" borderColor="gray.100" py={4}>Mã lô số liệu</Th>
                      <Th borderBottomWidth="1px" borderColor="gray.100">Khoa / Phòng</Th>
                      <Th borderBottomWidth="1px" borderColor="gray.100">Ngày số liệu</Th>
                      <Th borderBottomWidth="1px" borderColor="gray.100">Kỳ báo cáo</Th>
                      <Th borderBottomWidth="1px" borderColor="gray.100">Người nộp</Th>
                      <Th borderBottomWidth="1px" borderColor="gray.100">Thời gian nộp</Th>
                      <Th borderBottomWidth="1px" borderColor="gray.100">Trạng thái</Th>
                      <Th borderBottomWidth="1px" borderColor="gray.100" textAlign="right" pr={6}>Hành động</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredTasks.map((task) => (
                      <Tr key={task.id} _hover={{ bg: 'gray.50/50' }}>
                        <Td py={4} fontWeight="semibold" color="gray.700">
                          {task.batch.batch_code}
                        </Td>
                        <Td>
                          {departmentsMap[task.batch.department_code] || task.batch.department_code}
                        </Td>
                        <Td>{task.batch.report_date}</Td>
                        <Td>
                          <Badge size="sm" colorScheme={task.batch.period_type === 'daily' ? 'blue' : 'purple'}>
                            {task.batch.period_type === 'daily' ? 'Ngày' : 'Tháng'}
                          </Badge>
                        </Td>
                        <Td>{task.requested_by}</Td>
                        <Td fontSize="sm" color="gray.500">
                          {task.requested_at ? new Date(task.requested_at).toLocaleString('vi-VN') : '-'}
                        </Td>
                        <Td>{renderStatusBadge(task.status)}</Td>
                        <Td textAlign="right" pr={6}>
                          <Button
                            leftIcon={<FiEye />}
                            size="sm"
                            colorScheme="brand"
                            variant="ghost"
                            onClick={() => void handleViewDetail(task)}
                            borderRadius="lg"
                          >
                            Xem &amp; Duyệt
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
      </VStack>

      {/* ==========================================
          DRAWER CHI TIẾT SỐ LIỆU & PANEL DUYỆT
          ========================================== */}
      <Drawer isOpen={isOpen} placement="right" size="lg" onClose={onClose}>
        <DrawerOverlay backdropFilter="blur(4px)" />
        <DrawerContent borderLeftRadius="2xl">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor="gray.100" py={5}>
            <Heading size="md" color="gray.800">
              Chi tiết lô: {batchDetail?.batch_code || 'Đang tải...'}
            </Heading>
          </DrawerHeader>

          <DrawerBody py={6}>
            {loadingDetail ? (
              <Flex h="full" align="center" justify="center" direction="column" gap={3}>
                <Spinner size="lg" color="brand.500" />
                <Text color="gray.500">Đang truy xuất số liệu thô...</Text>
              </Flex>
            ) : batchDetail ? (
              <VStack spacing={6} align="stretch">
                {/* Thông tin metadata lô */}
                <Card variant="outline" p={4} borderRadius="xl" bg="gray.50" border="none">
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <Box>
                      <Text fontSize="xs" color="gray.400" fontWeight="medium">KHOA PHÒNG BÁO CÁO</Text>
                      <Text fontSize="sm" fontWeight="bold" color="gray.700" mt={0.5}>
                        {departmentsMap[batchDetail.department_code] || batchDetail.department_code}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="gray.400" fontWeight="medium">NGÀY BÁO CÁO</Text>
                      <Text fontSize="sm" fontWeight="bold" color="gray.700" mt={0.5}>
                        {batchDetail.report_date}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="gray.400" fontWeight="medium">NGƯỜI LẬP BÁO CÁO</Text>
                      <Text fontSize="sm" fontWeight="bold" color="gray.700" mt={0.5}>
                        {batchDetail.created_by}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="gray.400" fontWeight="medium">TRẠNG THÁI LÔ HIỆN TẠI</Text>
                      <Box mt={1}>{renderStatusBadge(batchDetail.status)}</Box>
                    </Box>
                  </Grid>
                  {batchDetail.note && (
                    <Box mt={4} pt={3} borderTop="1px" borderColor="gray.200/60">
                      <Text fontSize="xs" color="gray.400" fontWeight="medium">GHI CHÚ BAN ĐẦU CỦA OPERATOR</Text>
                      <Text fontSize="sm" color="gray.600" mt={0.5} whiteSpace="pre-line">
                        {batchDetail.note}
                      </Text>
                    </Box>
                  )}
                </Card>

                {/* Bảng số liệu biến thô */}
                <Box>
                  <Text fontSize="sm" fontWeight="bold" color="gray.800" mb={3}>
                    BẢNG SỐ LIỆU CHỈ SỐ CHI TIẾT
                  </Text>
                  <Box border="1px" borderColor="gray.100" borderRadius="xl" overflow="hidden">
                    <Table size="sm" variant="simple">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th py={3}>Mã biến</Th>
                          <Th>Tên biến số lâm sàng</Th>
                          <Th textAlign="right">Giá trị</Th>
                          <Th>Đơn vị</Th>
                          <Th>Ghi chú</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {batchDetail.records.map((rec) => {
                          const varInfo = variablesMap[rec.variable_code]
                          return (
                            <Tr key={rec.variable_code}>
                              <Td py={3} fontWeight="semibold" color="gray.600">{rec.variable_code}</Td>
                              <Td maxW="200px" isTruncated title={varInfo?.name || rec.variable_code}>
                                {varInfo?.name || 'Biến chưa định dạng'}
                              </Td>
                              <Td textAlign="right" fontWeight="bold" color="brand.600">
                                {rec.value !== null ? rec.value : '-'}
                              </Td>
                              <Td fontSize="xs" color="gray.500">{varInfo?.unit || '-'}</Td>
                              <Td fontSize="xs" maxW="120px" isTruncated title={rec.note || ''}>
                                {rec.note || '-'}
                              </Td>
                            </Tr>
                          )
                        })}
                      </Tbody>
                    </Table>
                  </Box>
                </Box>

                {/* Phân hệ duyệt (Approve/Reject actions) */}
                {selectedTask?.status === 'pending' && (
                  <VStack spacing={4} align="stretch" pt={4} borderTop="1px" borderColor="gray.100">
                    <Box>
                      <Text fontSize="sm" fontWeight="bold" color="gray.800" mb={2}>
                        Ý KIẾN / NHẬN XÉT CỦA NGƯỜI DUYỆT
                      </Text>
                      <Textarea
                        placeholder="Nhập ghi chú phê duyệt hoặc lý do từ chối (bắt buộc khi từ chối)..."
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        borderRadius="xl"
                        rows={3}
                      />
                    </Box>

                    {/* Cảnh báo tự duyệt bảo mật */}
                    {isSelfBatch && (
                      <Alert status="error" borderRadius="xl" variant="left-accent">
                        <AlertIcon />
                        <Box fontSize="sm">
                          <Text fontWeight="bold">Phát hiện tự duyệt (Self-Approval Check)</Text>
                          {isApproveDisabled ? (
                            <Text>
                              Bạn là người tạo ra lô báo cáo này. Quy tắc an toàn hệ thống **chặn đứng** hành vi tự duyệt. Vui lòng chuyển cho quản lý khoa hoặc admin phê duyệt.
                            </Text>
                          ) : (
                            <Text>
                              Bạn là người lập lô báo cáo này. Tuy nhiên, do bạn có quyền **Admin**, bạn được phép override quy tắc này để duyệt nhanh phục vụ kiểm thử.
                            </Text>
                          )}
                        </Box>
                      </Alert>
                    )}
                  </VStack>
                )}

                {/* Nếu task đã được xử lý xong, hiển thị kết quả ý kiến duyệt */}
                {selectedTask?.status !== 'pending' && (
                  <Card variant="outline" p={4} borderRadius="xl" bg="gray.50" border="none">
                    <Text fontSize="xs" color="gray.400" fontWeight="medium">Ý KIẾN / LÝ DO DUYỆT TRƯỚC ĐÂY</Text>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700" mt={1}>
                      {selectedTask?.review_note || '(Không ghi chú ý kiến)'}
                    </Text>
                    <Text fontSize="xs" color="gray.400" mt={3}>
                      Được xử lý bởi **{selectedTask?.reviewed_by}** lúc {selectedTask?.reviewed_at ? new Date(selectedTask.reviewed_at).toLocaleString('vi-VN') : ''}
                    </Text>
                  </Card>
                )}
              </VStack>
            ) : null}
          </DrawerBody>

          {/* Nút hành động */}
          {selectedTask?.status === 'pending' && (
            <DrawerFooter borderTopWidth="1px" borderColor="gray.100" gap={3}>
              <Button variant="outline" onClick={onClose} borderRadius="xl" size="lg">
                Đóng
              </Button>
              <Button
                colorScheme="red"
                leftIcon={<FiXCircle />}
                onClick={handleReject}
                isLoading={submitting}
                borderRadius="xl"
                size="lg"
              >
                Từ chối duyệt
              </Button>
              <Button
                colorScheme="green"
                leftIcon={<FiCheckCircle />}
                onClick={handleApprove}
                isLoading={submitting}
                isDisabled={isApproveDisabled}
                borderRadius="xl"
                size="lg"
              >
                Phê duyệt
              </Button>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    </PortalLayout>
  )
}
