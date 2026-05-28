'use client'

import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Checkbox,
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
  FiAlertTriangle,
  FiCheckCircle,
  FiLock,
  FiClock,
  FiRefreshCw,
  FiUnlock,
  FiUsers,
} from 'react-icons/fi'
import { useAuth } from '../../../components/auth/AuthProvider'
import { PortalLayout } from '../../../components/layout/PortalLayout'

type PeriodLock = {
  id: number
  period_type: string
  report_date: string
  department_code: string | null
  station_code: string | null
  is_locked: boolean
  locked_by: string | null
  locked_at: string | null
  unlock_reason: string | null
  unlocked_by: string | null
  unlocked_at: string | null
}

type MasterItem = {
  id: number
  code: string
  name: string
}

export default function LockedPeriodsPage() {
  const toast = useToast()
  const { currentUser, token } = useAuth()
  const { isOpen, onOpen, onClose } = useDisclosure()

  // --- DANH SÁCH KHÓA SỔ ---
  const [locks, setLocks] = useState<PeriodLock[]>([])
  const [loadingLocks, setLoadingLocks] = useState(true)

  // --- THÔNG TIN BIỂU MẪU LẬP KHÓA (LOCK FORM STATE) ---
  const [reportDate, setReportDate] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [periodType, setPeriodType] = useState('daily')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedStation, setSelectedStation] = useState('')
  const [overridePending, setOverridePending] = useState(false)
  const [locking, setLocking] = useState(false)

  // --- CHI TIẾT ĐỂ MỞ KHÓA (UNLOCK STATE) ---
  const [lockToUnlock, setLockToUnlock] = useState<PeriodLock | null>(null)
  const [unlockReason, setUnlockReason] = useState('')
  const [unlocking, setUnlocking] = useState(false)

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
  // [BƯỚC 2] TẢI NHẬT KÝ KHÓA SỔ (LỊCH SỬ LOCKS)
  // ==========================================
  const loadLocks = useCallback(async () => {
    if (!token) return
    setLoadingLocks(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const res = await fetch('/api/v1/quality/period-locks', { headers })
      if (res.ok) {
        const data = await res.json()
        setLocks(data.data || [])
      } else {
        throw new Error('Lỗi fetch locks')
      }
    } catch {
      toast({
        title: 'Lỗi tải lịch sử khóa',
        description: 'Không tải được nhật ký khóa sổ kỳ báo cáo.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    } finally {
      setLoadingLocks(false)
    }
  }, [token, toast])

  useEffect(() => {
    void loadLocks()
  }, [loadLocks])

  // ==========================================
  // [BƯỚC 3] LẬP KHÓA SỔ KỲ MỚI (SUBMIT LOCK)
  // ==========================================
  const handleLockPeriod = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocking(true)

    try {
      const res = await fetch('/api/v1/quality/period-locks', {
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
          override_pending: overridePending,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: 'Khóa sổ thành công',
          description: `Đã đóng băng hoàn toàn dữ liệu của kỳ ngày ${reportDate}.`,
          status: 'success',
          duration: 4000,
          isClosable: true,
        })
        setOverridePending(false)
        void loadLocks()
      } else {
        // Nếu có cảnh báo lô chưa duyệt và user có quyền admin, gợi ý override
        const isUserAdmin = currentUser?.roles.includes('admin') || currentUser?.roles.includes('quality_manager')
        const message = data.detail || 'Có lỗi xảy ra khi thực hiện khóa.'
        
        toast({
          title: 'Chặn khóa sổ dữ liệu',
          description: message + (isUserAdmin ? ' Bạn có thể bật tùy chọn "Khóa đè" nếu muốn ép buộc khóa.' : ''),
          status: 'error',
          duration: 6000,
          isClosable: true,
        })
      }
    } catch {
      toast({
        title: 'Lỗi kết nối',
        description: 'Không thể kết nối đến API khóa sổ.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    } finally {
      setLocking(false)
    }
  }

  // ==========================================
  // [BƯỚC 4] MỞ KHÓA SỔ KỲ BÁO CÁO (UNLOCK ACTION)
  // ==========================================
  const handleOpenUnlockModal = (lock: PeriodLock) => {
    setLockToUnlock(lock)
    setUnlockReason('')
    onOpen()
  }

  const handleUnlockPeriod = async () => {
    if (!lockToUnlock) return

    if (!unlockReason.trim()) {
      toast({
        title: 'Lý do bắt buộc',
        description: 'Vui lòng cung cấp lý do mở khóa sổ báo cáo phục vụ thanh tra.',
        status: 'warning',
        duration: 3500,
        isClosable: true,
      })
      return
    }

    setUnlocking(true)
    try {
      const res = await fetch(`/api/v1/quality/period-locks/${lockToUnlock.id}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ unlock_reason: unlockReason }),
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: 'Mở khóa thành công',
          description: 'Kỳ báo cáo đã được mở trở lại cho phép operator cập nhật dữ liệu.',
          status: 'success',
          duration: 4000,
          isClosable: true,
        })
        onClose()
        void loadLocks()
      } else {
        toast({
          title: 'Mở khóa thất bại',
          description: data.detail || 'Có lỗi xảy ra khi thực hiện mở khóa.',
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
      setUnlocking(false)
    }
  }

  // Tổng quan số kỳ đang bị khóa
  const activeLocksCount = locks.filter((l) => l.is_locked).length

  return (
    <PortalLayout requiredPermissions="reports:period_lock:view" title="Quản lý Khóa sổ Kỳ báo cáo">
      <VStack spacing={6} align="stretch" w="full">
        {/* ==========================================
            KHU VỰC THỐNG KÊ TỔNG QUAN (METRIC CARDS)
            ========================================== */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Card
            bgGradient="linear(to-br, blue.500, brand.600)"
            color="white"
            borderRadius="2xl"
            boxShadow="lg"
            _hover={{ transform: 'translateY(-2px)', transition: '0.2s' }}
          >
            <CardBody>
              <Flex align="center" justify="between">
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" opacity={0.8}>KỲ BÁO CÁO ĐANG KHÓA (ĐÓNG BĂNG)</Text>
                  <Heading size="xl" mt={2} display="flex" alignItems="center" gap={2}>
                    <Icon as={FiLock} /> {activeLocksCount} kỳ
                  </Heading>
                </Box>
                <Icon as={FiLock} w={12} h={12} opacity={0.2} />
              </Flex>
            </CardBody>
          </Card>

          <Card
            bgGradient="linear(to-br, teal.400, green.500)"
            color="white"
            borderRadius="2xl"
            boxShadow="lg"
            _hover={{ transform: 'translateY(-2px)', transition: '0.2s' }}
          >
            <CardBody>
              <Flex align="center" justify="between">
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" opacity={0.8}>PHẠM VI ÁP DỤNG BẢO MẬT</Text>
                  <Heading size="lg" mt={3} fontWeight="bold">
                    Bệnh viện &amp; Khoa/Trạm
                  </Heading>
                </Box>
                <Icon as={FiUsers} w={12} h={12} opacity={0.2} />
              </Flex>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Alert status="info" borderRadius="2xl" variant="left-accent">
          <AlertIcon />
          <Box fontSize="sm" color="gray.700">
            <Text fontWeight="bold">Cơ chế Khóa sổ Tự động:</Text>
            Để đảm bảo tính toàn vẹn dữ liệu, các kỳ báo cáo sẽ **tự động khóa sổ** ngay khi Trưởng khoa/Reviewer phê duyệt (approve) đợt nhập số liệu. Nếu cần điều chỉnh hoặc nhập lại dữ liệu cũ, người quản trị có thể click nút **Mở khóa** bên dưới để đưa dữ liệu kỳ đó về trạng thái **Nháp (Draft)**.
          </Box>
        </Alert>

        <Box w="full">
          {/* ==========================================
              BẢNG NHẬT KÝ LỊCH SỬ KHÓA SỔ (RIGHT SIDE)
              ========================================== */}
          <Card borderRadius="2xl" border="1px" borderColor="gray.100" boxShadow="sm" overflow="hidden">
            <CardBody p={0}>
              <Flex px={6} py={4} justify="space-between" align="center" borderBottom="1px" borderColor="gray.50">
                <Heading size="md" color="gray.800" display="flex" alignItems="center" gap={2}>
                  <Icon as={FiClock} color="gray.400" /> Nhật ký Khóa / Mở khóa sổ
                </Heading>
                <Button
                  leftIcon={<FiRefreshCw />}
                  size="sm"
                  variant="outline"
                  onClick={() => void loadLocks()}
                  borderRadius="xl"
                >
                  Làm mới
                </Button>
              </Flex>

              {loadingLocks ? (
                <Flex py={24} align="center" justify="center" direction="column" gap={4}>
                  <Spinner size="lg" color="brand.500" />
                  <Text color="gray.500">Đang truy xuất lịch sử khóa sổ...</Text>
                </Flex>
              ) : locks.length === 0 ? (
                <Flex py={24} align="center" justify="center" direction="column" gap={3}>
                  <Icon as={FiUnlock} w={8} h={8} color="gray.300" />
                  <Text color="gray.500">Chưa ghi nhận kỳ báo cáo nào bị khóa.</Text>
                </Flex>
              ) : (
                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th py={3}>Ngày số liệu</Th>
                        <Th>Kỳ hạn</Th>
                        <Th>Khoa / Trạm</Th>
                        <Th>Trạng thái</Th>
                        <Th>Chi tiết khóa</Th>
                        <Th>Chi tiết mở khóa</Th>
                        <Th textAlign="right" pr={6}>Hành động</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {locks.map((lock) => (
                        <Tr key={lock.id} _hover={{ bg: 'gray.50/30' }}>
                          <Td py={3.5} fontWeight="bold" color="gray.700">{lock.report_date}</Td>
                          <Td>
                            <Badge colorScheme={lock.period_type === 'daily' ? 'blue' : 'purple'}>
                              {lock.period_type === 'daily' ? 'Ngày' : 'Tháng'}
                            </Badge>
                          </Td>
                          <Td fontSize="xs">
                            {lock.department_code ? (
                              <Text fontWeight="semibold">
                                {departmentsMap[lock.department_code] || lock.department_code}
                              </Text>
                            ) : (
                              <Text color="gray.400" fontStyle="italic">Toàn bệnh viện</Text>
                            )}
                            {lock.station_code && (
                              <Text fontSize="10px" color="gray.500">
                                Trạm: {stationsMap[lock.station_code] || lock.station_code}
                              </Text>
                            )}
                          </Td>
                          <Td>
                            {lock.is_locked ? (
                              <Badge colorScheme="red" variant="solid" px={2} py={0.5} borderRadius="md" display="inline-flex" alignItems="center" gap={1}>
                                <Icon as={FiLock} /> Đã khóa
                              </Badge>
                            ) : (
                              <Badge colorScheme="gray" px={2} py={0.5} borderRadius="md" display="inline-flex" alignItems="center" gap={1}>
                                <Icon as={FiUnlock} /> Mở khóa
                              </Badge>
                            )}
                          </Td>
                          <Td fontSize="11px" color="gray.600">
                            {lock.locked_by && (
                              <>
                                <Text fontWeight="medium">Bởi: {lock.locked_by}</Text>
                                <Text color="gray.400" fontSize="10px">
                                  {lock.locked_at ? new Date(lock.locked_at).toLocaleString('vi-VN') : ''}
                                </Text>
                              </>
                            )}
                          </Td>
                          <Td fontSize="11px" color="gray.600" maxW="200px">
                            {lock.unlocked_by ? (
                              <>
                                <Text fontWeight="medium" color="teal.600">Bởi: {lock.unlocked_by}</Text>
                                <Text noOfLines={2} fontStyle="italic" color="gray.500" title={lock.unlock_reason || ''}>
                                  Lý do: {lock.unlock_reason}
                                </Text>
                              </>
                            ) : (
                              <Text color="gray.400">-</Text>
                            )}
                          </Td>
                          <Td textAlign="right" pr={6}>
                            {lock.is_locked && (
                              <Button
                                size="xs"
                                colorScheme="teal"
                                leftIcon={<FiUnlock />}
                                onClick={() => handleOpenUnlockModal(lock)}
                                borderRadius="md"
                              >
                                Mở khóa
                              </Button>
                            )}
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
          MODAL YÊU CẦU LÝ DO MỞ KHÓA SỔ (AUDIT REASON)
          ========================================== */}
      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent borderRadius="2xl">
          <ModalHeader display="flex" alignItems="center" gap={2} borderBottom="1px" borderColor="gray.100" py={4}>
            <Icon as={FiUnlock} color="teal.500" />
            <Text fontSize="md" fontWeight="bold" color="gray.800">
              Yêu cầu Lý do mở khóa sổ kỳ báo cáo
            </Text>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody py={5}>
            <VStack spacing={4} align="stretch">
              <Alert status="warning" borderRadius="xl">
                <AlertIcon />
                <Box fontSize="xs">
                  <Text fontWeight="bold">Lưu ý bảo mật thanh tra (Audit Trail requirement):</Text>
                  Thao tác mở khóa sổ kỳ báo cáo cũ sẽ cho phép thay đổi dữ liệu lịch sử. Lý do mở khóa bắt buộc phải được khai báo và ghi lại trong hệ thống thanh tra.
                </Box>
              </Alert>

              {lockToUnlock && (
                <Box fontSize="xs" bg="gray.50" p={3} borderRadius="lg">
                  <Grid templateColumns="100px 1fr" gap={2}>
                    <Text color="gray.400">Kỳ khóa sổ:</Text>
                    <Text fontWeight="semibold" color="gray.700">Ngày {lockToUnlock.report_date}</Text>
                    
                    <Text color="gray.400">Phạm vi:</Text>
                    <Text fontWeight="semibold" color="gray.700">
                      {lockToUnlock.department_code ? departmentsMap[lockToUnlock.department_code] : 'Toàn bộ bệnh viện'}
                    </Text>
                  </Grid>
                </Box>
              )}

              <FormControl isRequired>
                <FormLabel fontSize="xs" fontWeight="semibold" color="gray.600">Lý do điều chỉnh số liệu</FormLabel>
                <Textarea
                  placeholder="Nhập lý do cụ thể (ví dụ: Khoa điều trị bổ sung số liệu ra viện trễ do sự cố mạng)..."
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  borderRadius="xl"
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter borderTopWidth="1px" borderColor="gray.100" gap={3}>
            <Button variant="ghost" onClick={onClose} borderRadius="xl">
              Hủy
            </Button>
            <Button
              colorScheme="teal"
              leftIcon={<FiUnlock />}
              onClick={handleUnlockPeriod}
              isLoading={unlocking}
              loadingText="Đang mở khóa..."
              borderRadius="xl"
            >
              Xác nhận Mở khóa
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </PortalLayout>
  )
}
