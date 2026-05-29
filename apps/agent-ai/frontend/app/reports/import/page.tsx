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
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  Input,
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
  useToast,
  VStack,
  Progress,
  Tooltip,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState, useRef } from 'react'
import {
  FiUploadCloud,
  FiFile,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiDatabase,
  FiTrash2,
  FiArrowRight,
  FiArrowLeft,
  FiRefreshCw,
} from 'react-icons/fi'
import { useAuth } from '../../../components/auth/AuthProvider'
import { PortalLayout } from '../../../components/layout/PortalLayout'

type ImportBatchSummary = {
  id: number
  batch_code: string
  file_name: string
  status: string
  total_rows: number
  valid_rows: number
  warning_rows: number
  error_rows: number
  created_by: string
  created_at: string
}

type ImportRow = {
  id: number
  row_index: number
  raw_payload: any
  normalized_payload: any
  row_status: 'valid' | 'warning' | 'error'
  error_message: string | null
}

export default function ReportsImportPage() {
  const { currentUser, token } = useAuth()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State quản lý upload & preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  
  const [currentBatch, setCurrentBatch] = useState<ImportBatchSummary | null>(null)
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([])
  
  // State phân trang và lọc
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false)

  // State xác nhận nạp giao dịch
  const [isConfirming, setIsConfirming] = useState<boolean>(false)
  const [isCancelling, setIsCancelling] = useState<boolean>(false)
  
  // Danh sách các đợt import cũ để đối chiếu
  const [historyBatches, setHistoryBatches] = useState<ImportBatchSummary[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)

  // Tải lịch sử import
  const fetchImportHistory = useCallback(async () => {
    if (!token) return
    setIsLoadingHistory(true)
    try {
      const res = await fetch('/api/v1/quality/import/batches', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setHistoryBatches(json.data)
        }
      }
    } catch (error) {
      console.error('Error fetching import history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [token])

  useEffect(() => {
    fetchImportHistory()
  }, [fetchImportHistory])

  // Lấy chi tiết preview khi thay đổi trang hoặc bộ lọc
  const fetchPreview = useCallback(async (batchId: number, page: number, status: string) => {
    if (!token) return
    setIsLoadingPreview(true)
    try {
      let url = `/api/v1/quality/import/batches/${batchId}/preview?page=${page}&limit=10`
      if (status) {
        url += `&status_filter=${status}`
      }
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setCurrentBatch(json.data.batch)
          setPreviewRows(json.data.rows)
          setCurrentPage(json.data.pagination.page)
          setTotalPages(json.data.pagination.total_pages)
        }
      } else {
        const err = await res.json()
        toast({
          title: 'Lỗi tải thông tin xem trước',
          description: err.detail || 'Không thể lấy dữ liệu phân tích.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        })
      }
    } catch (error) {
      console.error('Error fetching preview:', error)
    } finally {
      setIsLoadingPreview(false)
    }
  }, [token, toast])

  // Xử lý kéo thả tệp
  const [dragOver, setDragOver] = useState<boolean>(false)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }
  const handleDragLeave = () => {
    setDragOver(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      validateAndSetFile(file)
    }
  }

  const validateAndSetFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      toast({
        title: 'Tệp không được hỗ trợ',
        description: 'Vui lòng chỉ chọn tệp Excel (.xlsx, .xls) hoặc CSV (.csv).',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Tệp quá lớn',
        description: 'Dung lượng tệp tối đa cho phép là 10MB.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }
    setSelectedFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  // Thực hiện tải file lên backend để phân tách và validate nghiệp vụ
  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setUploadProgress(20)
    
    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      setUploadProgress(50)
      const res = await fetch('/api/v1/quality/import/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
      })

      setUploadProgress(90)
      const json = await res.json()
      
      if (res.ok && json.success) {
        toast({
          title: 'Tải lên hoàn tất',
          description: 'Hệ thống đã phân tích và kiểm tra nghiệp vụ toàn bộ các dòng số liệu.',
          status: 'success',
          duration: 4000,
          isClosable: true,
        })
        const batchId = json.data.batch_id
        fetchPreview(batchId, 1, '')
        fetchImportHistory()
      } else {
        toast({
          title: 'Tải tệp thất bại',
          description: json.detail || json.message || 'Lỗi phân tách cấu trúc biểu mẫu.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        setSelectedFile(null)
      }
    } catch (error) {
      toast({
        title: 'Lỗi đường truyền',
        description: 'Không thể kết nối đến máy chủ API.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
      setSelectedFile(null)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Xác nhận nạp dữ liệu chính thức
  const handleConfirm = async () => {
    if (!currentBatch) return
    setIsConfirming(true)
    try {
      const res = await fetch(`/api/v1/quality/import/batches/${currentBatch.id}/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast({
          title: 'Nạp dữ liệu thành công!',
          description: json.message || 'Số liệu hợp lệ đã được lưu trữ chính thức.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        })
        // Reset form
        setSelectedFile(null)
        setCurrentBatch(null)
        setPreviewRows([])
        fetchImportHistory()
      } else {
        toast({
          title: 'Xác nhận thất bại',
          description: json.detail || 'Kỳ sổ đã bị khóa hoặc có lỗi dữ liệu bị chặn.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    } catch (error) {
      toast({
        title: 'Lỗi hệ thống',
        description: 'Không thể thực hiện giao dịch nạp dữ liệu.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    } finally {
      setIsConfirming(false)
    }
  }

  // Hủy đợt import tạm thời
  const handleCancel = async () => {
    if (!currentBatch) return
    setIsCancelling(true)
    try {
      const res = await fetch(`/api/v1/quality/import/batches/${currentBatch.id}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (res.ok) {
        toast({
          title: 'Đã hủy bỏ đợt nhập',
          description: 'Hồ sơ nháp và tệp Excel tạm thời đã được xóa sạch bảo mật.',
          status: 'info',
          duration: 3000,
          isClosable: true,
        })
        setSelectedFile(null)
        setCurrentBatch(null)
        setPreviewRows([])
        fetchImportHistory()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <PortalLayout requiredPermissions="reports:import:view" title="Nhập Số Liệu Excel">
      <VStack align="stretch" spacing={6} w="full">
        {/* Tiêu đề & Giới thiệu */}
        <Box
          p={6}
          bgGradient="linear(to-r, teal.500, blue.600)"
          borderRadius="2xl"
          color="white"
          shadow="lg"
        >
          <Heading size="lg" mb={2}>Phân Hệ Tự Động Hóa Nhập Dữ Liệu Excel / CSV</Heading>
          <Text fontSize="md" opacity={0.9}>
            Đăng tải các biểu mẫu báo cáo thô. Hệ thống tự động bóc tách dòng, kiểm tra tính hợp lệ
            của khoa phòng, scope dữ liệu người dùng, biến số và cảnh báo lỗi thực tế trước khi phê duyệt lưu kho chính thức.
          </Text>
        </Box>

        {/* Khung chức năng Upload file */}
        {!currentBatch ? (
          <Grid templateColumns={{ base: '1fr', lg: '3fr 1fr' }} gap={6}>
            {/* Vùng Dropzone */}
            <GridItem>
              <Card borderRadius="2xl" shadow="md" border="1px" borderColor="gray.100">
                <CardBody>
                  <VStack spacing={4}>
                    <Box
                      w="full"
                      h="240px"
                      border="2px dashed"
                      borderColor={dragOver ? 'teal.500' : 'gray.200'}
                      bg={dragOver ? 'teal.50' : 'gray.50'}
                      borderRadius="xl"
                      transition="all 0.2s"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      cursor="pointer"
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".xlsx,.xls,.csv"
                        style={{ display: 'none' }}
                      />
                      <Icon as={FiUploadCloud} w={12} h={12} color="teal.500" mb={4} />
                      <Heading size="md" mb={2} color="gray.700">
                        Kéo thả file báo cáo vào đây
                      </Heading>
                      <Text fontSize="sm" color="gray.500" px={8} textAlign="center">
                        Hoặc bấm vào để chọn từ thiết bị của bạn. Chỉ chấp nhận các định dạng tệp .xlsx, .xls, .csv với dung lượng nhỏ hơn 10MB.
                      </Text>
                    </Box>

                    {selectedFile && (
                      <Flex
                        w="full"
                        p={4}
                        bg="teal.50"
                        borderRadius="xl"
                        align="center"
                        justify="space-between"
                      >
                        <HStack spacing={3}>
                          <Icon as={FiFile} w={6} h={6} color="teal.600" />
                          <VStack align="stretch" spacing={0}>
                            <Text fontWeight="semibold" color="teal.900" isTruncated maxW="300px">
                              {selectedFile.name}
                            </Text>
                            <Text fontSize="xs" color="teal.700">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </Text>
                          </VStack>
                        </HStack>

                        <HStack spacing={2}>
                          <Button
                            leftIcon={<FiTrash2 />}
                            colorScheme="red"
                            variant="ghost"
                            size="sm"
                            borderRadius="lg"
                            onClick={() => setSelectedFile(null)}
                            disabled={isUploading}
                          >
                            Xóa
                          </Button>
                          <Button
                            leftIcon={<FiArrowRight />}
                            colorScheme="teal"
                            size="sm"
                            borderRadius="lg"
                            isLoading={isUploading}
                            onClick={handleUpload}
                          >
                            Phân tích dữ liệu
                          </Button>
                        </HStack>
                      </Flex>
                    )}

                    {isUploading && (
                      <Box w="full" px={2}>
                        <Text size="xs" color="gray.500" mb={1} textAlign="right">
                          Đang tải lên và phân tích... {uploadProgress}%
                        </Text>
                        <Progress colorScheme="teal" size="sm" value={uploadProgress} isAnimated borderRadius="full" />
                      </Box>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>

            {/* Điều kiện chấp thuận dữ liệu */}
            <GridItem>
              <Card borderRadius="2xl" shadow="md" border="1px" borderColor="gray.100" h="full" bg="white">
                <CardBody p={5}>
                  <Heading size="xs" textTransform="uppercase" color="teal.600" letterSpacing="wider" mb={4} fontWeight="700">
                    Điều kiện chấp thuận dữ liệu
                  </Heading>
                  <VStack align="stretch" spacing={3} fontSize="xs" color="gray.600">
                    <Text mb={1} color="gray.500" fontWeight="500">
                      Tệp tải lên cần đáp ứng đầy đủ các điều kiện kiểm tra nghiệp vụ nghiêm ngặt sau:
                    </Text>
                    
                    <Box p={3} bg="teal.50" borderRadius="xl" border="1px" borderColor="teal.100">
                      <Text fontWeight="bold" color="teal.900">1. Nhận diện tệp bệnh án (KCCNBV)</Text>
                      <Text color="teal.700" mt={0.5}>
                        Phải có cột tiêu đề <strong>"SỐ BỆNH ÁN"</strong> trong 5 dòng đầu tiên để kích hoạt luồng xử lý 41 cột lâm sàng thô.
                      </Text>
                    </Box>

                    <Box p={3} bg="gray.50" borderRadius="xl" border="1px" borderColor="gray.200">
                      <Text fontWeight="bold" color="gray.800">2. Khóa chính & Ghi đè (Upsert)</Text>
                      <Text color="gray.500" mt={0.5}>
                        Trường <strong>Số bệnh án</strong> bắt buộc phải có giá trị, dùng để cập nhật đè dữ liệu nếu trùng lặp ca cũ.
                      </Text>
                    </Box>

                    <Box p={3} bg="gray.50" borderRadius="xl" border="1px" borderColor="gray.200">
                      <Text fontWeight="bold" color="gray.800">3. Chuẩn hóa ngày tháng</Text>
                      <Text color="gray.500" mt={0.5}>
                        Trường <strong>Ngày</strong> phải đúng định dạng ngày tháng hợp lệ (<code>YYYY-MM-DD</code> hoặc <code>DD/MM/YYYY</code>).
                      </Text>
                    </Box>

                    <Box p={3} bg="gray.50" borderRadius="xl" border="1px" borderColor="gray.200">
                      <Text fontWeight="bold" color="gray.800">4. Ẩn danh bảo mật y tế</Text>
                      <Text color="gray.500" mt={0.5}>
                        Họ tên bệnh nhân tự động viết tắt in hoa không dấu (ví dụ: <code>Nguyễn Văn Á</code> → <code>NVA</code>) khi lưu trữ.
                      </Text>
                    </Box>

                    <Box p={3} bg="gray.50" borderRadius="xl" border="1px" borderColor="gray.200">
                      <Text fontWeight="bold" color="gray.800">5. Đối chiếu danh mục</Text>
                      <Text color="gray.500" mt={0.5}>
                        Mã khoa/trạm và mã biến (nếu dùng tệp chuẩn) bắt buộc phải khớp chính xác danh mục hệ thống.
                      </Text>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        ) : (
          /* Màn hình Preview & Validate khi đã tải tệp lên */
          <VStack align="stretch" spacing={6}>
            {/* Các thẻ thông số tóm tắt đợt Import */}
            <SimpleGrid columns={{ base: 1, md: 4 }} gap={4}>
              <Card borderRadius="xl" shadow="sm" border="1px" borderColor="gray.100">
                <CardBody p={4}>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase">
                    Đợt Import
                  </Text>
                  <Heading size="md" mt={1} color="teal.700">
                    {currentBatch.batch_code}
                  </Heading>
                  <Text fontSize="xs" mt={1} color="gray.400" isTruncated>
                    {currentBatch.file_name}
                  </Text>
                </CardBody>
              </Card>

              <Card borderRadius="xl" shadow="sm" border="1px" borderColor="gray.100" bg="purple.50">
                <CardBody p={4}>
                  <Text fontSize="xs" fontWeight="semibold" color="purple.700" textTransform="uppercase">
                    Tổng số dòng
                  </Text>
                  <Heading size="lg" mt={1} color="purple.900">
                    {currentBatch.total_rows}
                  </Heading>
                  <Text fontSize="xs" mt={1} color="purple.600">
                    dòng số liệu được parse
                  </Text>
                </CardBody>
              </Card>

              <Card borderRadius="xl" shadow="sm" border="1px" borderColor="gray.100" bg="green.50">
                <CardBody p={4}>
                  <Text fontSize="xs" fontWeight="semibold" color="green.700" textTransform="uppercase">
                    Hợp lệ
                  </Text>
                  <Heading size="lg" mt={1} color="green.900">
                    {currentBatch.valid_rows}
                  </Heading>
                  <Text fontSize="xs" mt={1} color="green.600">
                    sẵn sàng nạp chính thức
                  </Text>
                </CardBody>
              </Card>

              <Card borderRadius="xl" shadow="sm" border="1px" borderColor="gray.100" bg={currentBatch.error_rows > 0 ? 'red.50' : 'gray.50'}>
                <CardBody p={4}>
                  <Text fontSize="xs" fontWeight="semibold" color={currentBatch.error_rows > 0 ? 'red.700' : 'gray.600'} textTransform="uppercase">
                    Bị lỗi nghiêm trọng
                  </Text>
                  <Heading size="lg" mt={1} color={currentBatch.error_rows > 0 ? 'red.900' : 'gray.800'}>
                    {currentBatch.error_rows}
                  </Heading>
                  <Text fontSize="xs" mt={1} color={currentBatch.error_rows > 0 ? 'red.600' : 'gray.500'}>
                    dòng cần sửa/sửa lại tệp
                  </Text>
                </CardBody>
              </Card>
            </SimpleGrid>

            {/* Thông báo chặn giao dịch nếu có lỗi */}
            {currentBatch.error_rows > 0 && (
              <Alert status="error" borderRadius="xl">
                <AlertIcon />
                <Box>
                  <Text fontWeight="semibold">Cảnh Báo Chặn Dữ Liệu Đầu Vào (Hard Stop Gate)</Text>
                  <Text fontSize="sm">
                    Tệp tin chứa {currentBatch.error_rows} dòng dữ liệu vi phạm điều kiện nghiệp vụ (lỗi ngày, sai khoa phòng, ngoài min/max hoặc rỗng trường bắt buộc). 
                    Nút <strong>Xác nhận nhập liệu</strong> đã bị khóa. Vui lòng tải file sửa đổi hoặc hủy đợt này.
                  </Text>
                </Box>
              </Alert>
            )}

            {/* Bảng Preview dữ liệu phân trang */}
            <Card borderRadius="2xl" shadow="md" border="1px" borderColor="gray.100">
              <CardBody>
                <Flex justify="space-between" align="center" mb={4}>
                  <HStack spacing={4}>
                    <Heading size="sm">Xem Trước Số Liệu Phân Tách</Heading>
                    {isLoadingPreview && <Spinner size="sm" color="teal.500" />}
                  </HStack>

                  {/* Lọc trạng thái */}
                  <HStack spacing={2}>
                    <Text fontSize="xs" color="gray.500">Lọc dòng:</Text>
                    <Select
                      size="sm"
                      borderRadius="lg"
                      w="160px"
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value)
                        fetchPreview(currentBatch.id, 1, e.target.value)
                      }}
                    >
                      <option value="">Tất cả</option>
                      <option value="valid">Hợp lệ</option>
                      <option value="error">Bị lỗi</option>
                    </Select>
                  </HStack>
                </Flex>

                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th w="60px" textAlign="center">Dòng</Th>
                        <Th>Ngày báo cáo</Th>
                        <Th>Mã Khoa/Trạm</Th>
                        <Th>Biến Số</Th>
                        <Th textAlign="right">Giá Trị Số</Th>
                        <Th>Giá Trị Chữ</Th>
                        <Th>Trạng thái</Th>
                        <Th>Ghi chú / Chi tiết lỗi</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {previewRows.map((row) => (
                        <Tr
                          key={row.id}
                          bg={row.row_status === 'error' ? 'red.50' : undefined}
                          transition="all 0.2s"
                        >
                          <Td textAlign="center" fontWeight="bold" color="gray.500">
                            {row.row_index}
                          </Td>
                          <Td>{row.normalized_payload?.report_date || row.raw_payload?.report_date}</Td>
                          <Td>
                            <Badge colorScheme="purple">
                              {row.normalized_payload?.department_code || row.raw_payload?.dept_station}
                            </Badge>
                            {row.normalized_payload?.station_code && (
                              <Badge colorScheme="blue" ml={1}>
                                {row.normalized_payload.station_code}
                              </Badge>
                            )}
                          </Td>
                          <Td fontWeight="semibold">{row.normalized_payload?.variable_code || row.raw_payload?.variable_code}</Td>
                          <Td textAlign="right" fontWeight="bold">
                            {row.normalized_payload?.value !== null ? row.normalized_payload?.value : '-'}
                          </Td>
                          <Td>{row.normalized_payload?.text_value || '-'}</Td>
                          <Td>
                            {row.row_status === 'valid' ? (
                              <Badge colorScheme="green" variant="solid" borderRadius="full" px={2}>
                                Hợp lệ
                              </Badge>
                            ) : (
                              <Badge colorScheme="red" variant="solid" borderRadius="full" px={2}>
                                Lỗi chặn
                              </Badge>
                            )}
                          </Td>
                          <Td maxW="300px" isTruncated>
                            {row.row_status === 'error' ? (
                              <Tooltip label={row.error_message} placement="top">
                                <HStack spacing={1} color="red.600" cursor="help">
                                  <Icon as={FiAlertTriangle} />
                                  <Text fontSize="xs" fontWeight="semibold" isTruncated>
                                    {row.error_message}
                                  </Text>
                                </HStack>
                              </Tooltip>
                            ) : (
                              <Text fontSize="xs" color="gray.500">
                                {row.normalized_payload?.note || '-'}
                              </Text>
                            )}
                          </Td>
                        </Tr>
                      ))}

                      {previewRows.length === 0 && (
                        <Tr>
                          <Td colSpan={8} textAlign="center" py={8} color="gray.400">
                            Không có dòng dữ liệu nào khớp bộ lọc.
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </Box>

                {/* Điều khiển phân trang */}
                {totalPages > 1 && (
                  <Flex justify="space-between" align="center" mt={4}>
                    <Text fontSize="xs" color="gray.500">
                      Trang {currentPage} / {totalPages}
                    </Text>
                    <HStack spacing={2}>
                      <Button
                        leftIcon={<FiArrowLeft />}
                        size="xs"
                        borderRadius="md"
                        onClick={() => fetchPreview(currentBatch.id, currentPage - 1, statusFilter)}
                        disabled={currentPage === 1}
                      >
                        Trang trước
                      </Button>
                      <Button
                        rightIcon={<FiArrowRight />}
                        size="xs"
                        borderRadius="md"
                        onClick={() => fetchPreview(currentBatch.id, currentPage + 1, statusFilter)}
                        disabled={currentPage === totalPages}
                      >
                        Trang sau
                      </Button>
                    </HStack>
                  </Flex>
                )}

                <Divider my={6} />

                {/* Nhóm điều khiển Xác nhận & Hủy bỏ */}
                <Flex justify="space-between" align="center">
                  <Button
                    leftIcon={<FiTrash2 />}
                    colorScheme="red"
                    variant="outline"
                    borderRadius="xl"
                    onClick={handleCancel}
                    isLoading={isCancelling}
                  >
                    Hủy đợt nhập nháp này
                  </Button>

                  <HStack spacing={3}>
                    <Button
                      variant="ghost"
                      borderRadius="xl"
                      onClick={() => {
                        setSelectedFile(null)
                        setCurrentBatch(null)
                        setPreviewRows([])
                      }}
                      disabled={isConfirming}
                    >
                      Quay lại
                    </Button>
                    <Button
                      leftIcon={<FiCheckCircle />}
                      colorScheme="teal"
                      borderRadius="xl"
                      onClick={handleConfirm}
                      isLoading={isConfirming}
                      disabled={currentBatch.error_rows > 0}
                      shadow="md"
                    >
                      Xác nhận nạp dữ liệu chính thức
                    </Button>
                  </HStack>
                </Flex>
              </CardBody>
            </Card>
          </VStack>
        )}

        {/* Lịch sử Đăng tải Tệp tin */}
        <Card borderRadius="2xl" shadow="md" border="1px" borderColor="gray.100">
          <CardBody>
            <Heading size="sm" mb={4} display="flex" alignItems="center">
              <Icon as={FiDatabase} mr={2} color="teal.500" />
              Lịch Sử Đăng Tải Và Nhập Excel Gần Đây
            </Heading>

            {isLoadingHistory ? (
              <Flex justify="center" py={6}>
                <Spinner color="teal.500" />
              </Flex>
            ) : (
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Mã đợt import</Th>
                      <Th>Tên tệp tin gốc</Th>
                      <Th textAlign="center">Dòng tổng</Th>
                      <Th textAlign="center">Hợp lệ</Th>
                      <Th textAlign="center">Lỗi</Th>
                      <Th>Trạng thái</Th>
                      <Th>Người tạo</Th>
                      <Th>Thời điểm tạo</Th>
                      <Th>Hành động</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {historyBatches.map((b) => (
                      <Tr key={b.id} _hover={{ bg: 'gray.50' }}>
                        <Td fontWeight="bold" color="teal.600">{b.batch_code}</Td>
                        <Td isTruncated maxW="200px">{b.file_name}</Td>
                        <Td textAlign="center">{b.total_rows}</Td>
                        <Td textAlign="center" color="green.600" fontWeight="semibold">{b.valid_rows}</Td>
                        <Td textAlign="center" color={b.error_rows > 0 ? 'red.600' : 'gray.400'} fontWeight="semibold">
                          {b.error_rows}
                        </Td>
                        <Td>
                          {b.status === 'confirmed' && (
                            <Badge colorScheme="green" variant="solid" borderRadius="full">
                              Đã nạp chính thức
                            </Badge>
                          )}
                          {b.status === 'validated' && (
                            <Badge colorScheme="teal" variant="outline" borderRadius="full">
                              Đã kiểm tra (hợp lệ)
                            </Badge>
                          )}
                          {b.status === 'uploaded' && (
                            <Badge colorScheme="orange" variant="outline" borderRadius="full">
                              Chờ xử lý (có lỗi)
                            </Badge>
                          )}
                          {b.status === 'cancelled' && (
                            <Badge colorScheme="gray" variant="solid" borderRadius="full">
                              Đã hủy bỏ
                            </Badge>
                          )}
                        </Td>
                        <Td fontSize="xs" fontWeight="semibold" color="gray.500">{b.created_by}</Td>
                        <Td fontSize="xs" color="gray.400">{new Date(b.created_at).toLocaleString('vi-VN')}</Td>
                        <Td>
                          {(b.status === 'uploaded' || b.status === 'validated') && (
                            <Button
                              size="xs"
                              colorScheme="teal"
                              variant="ghost"
                              borderRadius="md"
                              onClick={() => {
                                setSelectedFile(new File([], b.file_name)) // Đánh dấu file giả
                                fetchPreview(b.id, 1, '')
                              }}
                            >
                              Xem tiếp
                            </Button>
                          )}
                          {b.status === 'confirmed' && (
                            <Badge colorScheme="green" size="xs">
                              Xong
                            </Badge>
                          )}
                          {b.status === 'cancelled' && (
                            <Text fontSize="xs" color="gray.400">
                              Đã xóa
                            </Text>
                          )}
                        </Td>
                      </Tr>
                    ))}

                    {historyBatches.length === 0 && (
                      <Tr>
                        <Td colSpan={9} textAlign="center" py={6} color="gray.400">
                          Chưa có lịch sử nhập dữ liệu bằng file.
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
              </Box>
            )}
          </CardBody>
        </Card>
      </VStack>
    </PortalLayout>
  )
}

