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
  FormErrorMessage,
  FormHelperText,
  FormLabel,
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
  Textarea,
  Th,
  Thead,
  Tr,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiDatabase,
  FiEdit,
  FiFileText,
  FiFilter,
  FiInfo,
  FiLock,
  FiSave,
  FiSend,
} from 'react-icons/fi'
import { useAuth } from '../../../components/auth/AuthProvider'
import { PortalLayout } from '../../../components/layout/PortalLayout'

type MasterItem = {
  id: number
  code: string
  name: string
}

type FormField = {
  variable_code: string
  indicator_code: string | null
  label: string
  data_type: string
  unit: string | null
  required: boolean
  min: number | null
  max: number | null
}

type FormTemplate = {
  report_date: string
  period_type: string
  department_code: string
  station_code: string | null
  fields: FormField[]
}

type InputRecord = {
  variable_code: string
  value: number | null
  text_value: string | null
  note: string | null
  row_status: string
  error_message: string | null
}

type InputBatch = {
  id: number
  batch_code: string
  report_date: string
  period_type: string
  department_code: string
  station_code: string | null
  status: string
  note: string | null
  reject_reason: string | null
  records: InputRecord[]
}

export default function ReportsInputPage() {
  const toast = useToast()
  const { currentUser, token } = useAuth()

  // Master lists
  const [departments, setDepartments] = useState<MasterItem[]>([])
  const [stations, setStations] = useState<MasterItem[]>([])
  const [loadingMaster, setLoadingMaster] = useState(true)

  // Filters
  const [reportDate, setReportDate] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [periodType, setPeriodType] = useState('daily')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedStation, setSelectedStation] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')

  // Data fetching
  const [template, setTemplate] = useState<FormTemplate | null>(null)
  const [existingBatch, setExistingBatch] = useState<InputBatch | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  // Form values
  const [formValues, setFormValues] = useState<
    Record<string, { value: string; note: string }>
  >({})
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({})
  const [batchNote, setBatchNote] = useState('')

  // Operation state
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 1. Fetch departments and stations on mount
  useEffect(() => {
    async function loadMaster() {
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [deptsRes, statsRes] = await Promise.all([
          fetch('/api/v1/quality/master/departments', { headers }),
          fetch('/api/v1/quality/master/stations', { headers }),
        ])

        if (deptsRes.ok && statsRes.ok) {
          const deptsData = await deptsRes.json()
          const statsData = await statsRes.json()

          setDepartments(deptsData.data || [])
          setStations(statsData.data || [])

          // Auto-select first department matching user's scopes if any, otherwise default
          const userDepts = currentUser?.scopes
            .filter((s) => s.scope_type === 'department')
            .map((s) => s.scope_code) || []

          if (userDepts.length > 0) {
            setSelectedDept(userDepts[0])
          } else if (deptsData.data?.length > 0) {
            setSelectedDept(deptsData.data[0].code)
          }
        }
      } catch {
        toast({
          title: 'Lỗi tải danh mục',
          description: 'Không tải được danh sách phòng ban và trạm vệ tinh.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        })
      } finally {
        setLoadingMaster(false)
      }
    }

    if (token) {
      void loadMaster()
    }
  }, [token, currentUser, toast])

  // 2. Fetch Form Template and Existing Batch when filters change
  const fetchData = useCallback(async () => {
    if (!selectedDept) return

    setLoadingData(true)
    setValidationErrors({})
    try {
      const headers = { Authorization: `Bearer ${token}` }

      // Fetch template
      const templateQuery = new URLSearchParams({
        report_date: reportDate,
        period_type: periodType,
        department_code: selectedDept,
      })
      if (selectedStation) templateQuery.set('station_code', selectedStation)
      if (selectedGroup) templateQuery.set('group', selectedGroup)

      const templateRes = await fetch(
        `/api/v1/quality/input/form-template?${templateQuery.toString()}`,
        { headers }
      )

      // Fetch existing batches for the day/dept/station to see if one matches
      const batchesQuery = new URLSearchParams({
        date: reportDate,
        department_code: selectedDept,
      })
      const batchesRes = await fetch(
        `/api/v1/quality/input/batches?${batchesQuery.toString()}`,
        { headers }
      )

      if (templateRes.ok && batchesRes.ok) {
        const templateData = await templateRes.json()
        const batchesData = await batchesRes.json()

        setTemplate(templateData.data)

        // Find if there is an exact batch matching date, period, department, station
        const matches: InputBatch[] = batchesData.data || []
        const exactMatch = matches.find(
          (b) =>
            b.period_type === periodType &&
            (b.station_code || '') === (selectedStation || '')
        )

        if (exactMatch) {
          // Fetch complete batch detail with records
          const detailRes = await fetch(
            `/api/v1/quality/input/batches/${exactMatch.id}`,
            { headers }
          )
          if (detailRes.ok) {
            const detailData = await detailRes.json()
            const fullBatch = detailData.data as InputBatch
            setExistingBatch(fullBatch)
            setBatchNote(fullBatch.note || '')

            // Pre-populate values
            const populatedValues: Record<string, { value: string; note: string }> = {}
            fullBatch.records.forEach((rec) => {
              populatedValues[rec.variable_code] = {
                value: rec.value !== null ? rec.value.toString() : '',
                note: rec.note || '',
              }
            })
            setFormValues(populatedValues)
          }
        } else {
          setExistingBatch(null)
          setBatchNote('')

          // Initialize empty values matching the template
          const initialValues: Record<string, { value: string; note: string }> = {}
          const fields: FormField[] = templateData.data.fields || []
          fields.forEach((f) => {
            initialValues[f.variable_code] = { value: '', note: '' }
          })
          setFormValues(initialValues)
        }
      }
    } catch {
      toast({
        title: 'Lỗi tải dữ liệu',
        description: 'Không lấy được biểu mẫu nhập liệu và lô số liệu.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    } finally {
      setLoadingData(false)
    }
  }, [
    token,
    reportDate,
    periodType,
    selectedDept,
    selectedStation,
    selectedGroup,
    toast,
  ])

  useEffect(() => {
    if (token && selectedDept) {
      void fetchData()
    }
  }, [fetchData, token, selectedDept])

  // 3. Handle input changes
  const handleValueChange = (varCode: string, val: string) => {
    setFormValues((prev) => ({
      ...prev,
      [varCode]: {
        ...prev[varCode],
        value: val,
      },
    }))

    // Clear specific validation error on type
    if (validationErrors[varCode]) {
      setValidationErrors((prev) => {
        const copy = { ...prev }
        delete copy[varCode]
        return copy
      })
    }
  }

  const handleNoteChange = (varCode: string, noteVal: string) => {
    setFormValues((prev) => ({
      ...prev,
      [varCode]: {
        ...prev[varCode],
        note: noteVal,
      },
    }))
  }

  // 4. Client-side Validation
  const validateForm = (): boolean => {
    if (!template) return false

    const errors: Record<string, string> = {}
    let isValid = true

    template.fields.forEach((field) => {
      const fieldVal = formValues[field.variable_code]?.value || ''

      if (field.required && fieldVal.trim() === '') {
        errors[field.variable_code] = 'Trường này là bắt buộc nhập'
        isValid = false
      } else if (fieldVal.trim() !== '') {
        const num = parseFloat(fieldVal)
        if (isNaN(num)) {
          errors[field.variable_code] = 'Phải nhập định dạng số hợp lệ'
          isValid = false
        } else {
          if (field.min !== null && num < field.min) {
            errors[
              field.variable_code
            ] = `Giá trị tối thiểu cho phép là ${field.min}`
            isValid = false
          }
          if (field.max !== null && num > field.max) {
            errors[
              field.variable_code
            ] = `Giá trị tối đa cho phép là ${field.max}`
            isValid = false
          }
        }
      }
    })

    setValidationErrors(errors)
    return isValid
  }

  // 5. Handle Save Draft
  const handleSaveDraft = async () => {
    if (!template) return
    if (!validateForm()) {
      toast({
        title: 'Lỗi nhập liệu',
        description: 'Vui lòng kiểm tra lại các trường báo đỏ.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setSaving(true)
    try {
      const recordsPayload = template.fields
        .map((field) => {
          const formVal = formValues[field.variable_code]
          const parsedVal =
            formVal?.value !== '' ? parseFloat(formVal.value) : null
          return {
            variable_code: field.variable_code,
            indicator_code: field.indicator_code,
            value: parsedVal,
            text_value: null,
            note: formVal?.note || '',
          }
        })
        .filter((r) => r.value !== null || r.note !== '') // Filter out empty records

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }

      let res: Response
      if (existingBatch) {
        // Update batch
        res = await fetch(`/api/v1/quality/input/batches/${existingBatch.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            note: batchNote,
            records: recordsPayload,
          }),
        })
      } else {
        // Create batch
        res = await fetch('/api/v1/quality/input/batches', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            report_date: reportDate,
            period_type: periodType,
            department_code: selectedDept,
            station_code: selectedStation || null,
            note: batchNote,
            records: recordsPayload,
          }),
        })
      }

      const resData = await res.json()
      if (res.ok && resData.success) {
        toast({
          title: 'Lưu nháp thành công',
          description: `Đã lưu lô số liệu thành công.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
        void fetchData()
      } else {
        throw new Error(resData.detail || 'Không lưu được dữ liệu nháp.')
      }
    } catch (err: any) {
      toast({
        title: 'Lỗi lưu dữ liệu',
        description: err.message || 'Có lỗi xảy ra khi gọi API lưu dữ liệu.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    } finally {
      setSaving(false)
    }
  }

  // 6. Handle Submit
  const handleSubmit = async () => {
    if (!existingBatch) {
      toast({
        title: 'Chưa có bản lưu nháp',
        description: 'Vui lòng bấm "Lưu nháp" trước khi gửi duyệt.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (!validateForm()) {
      toast({
        title: 'Lỗi nhập liệu',
        description: 'Vui lòng sửa các trường lỗi trước khi nộp báo cáo.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(
        `/api/v1/quality/input/batches/${existingBatch.id}/submit`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const resData = await res.json()
      if (res.ok && resData.success) {
        toast({
          title: 'Gửi duyệt thành công',
          description: 'Lô dữ liệu đã được khóa và chuyển sang trạng thái Submitted.',
          status: 'success',
          duration: 4000,
          isClosable: true,
        })
        void fetchData()
      } else {
        throw new Error(resData.detail || 'Không gửi duyệt được.')
      }
    } catch (err: any) {
      toast({
        title: 'Lỗi gửi duyệt',
        description: err.message || 'Có lỗi xảy ra khi nộp báo cáo.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const isReadOnly =
    existingBatch &&
    ['submitted', 'approved', 'locked'].includes(existingBatch.status)

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'yellow'
      case 'submitted':
        return 'blue'
      case 'approved':
        return 'green'
      case 'rejected':
        return 'red'
      case 'locked':
        return 'purple'
      default:
        return 'gray'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Bản nháp'
      case 'submitted':
        return 'Đã gửi duyệt'
      case 'approved':
        return 'Đã phê duyệt'
      case 'rejected':
        return 'Bị từ chối'
      case 'locked':
        return 'Đã khóa sổ'
      default:
        return status
    }
  }

  return (
    <PortalLayout requiredPermissions="reports:input:view" title="Nhập liệu báo cáo">
      <VStack align="stretch" spacing={6}>
        {/* Filters Card */}
        <Card>
          <CardBody p={5}>
            <Heading size="md" mb={4}>
              <Flex align="center" gap={2}>
                <Icon as={FiFilter} color="brand.500" />
                <Text>Bộ lọc biểu mẫu</Text>
              </Flex>
            </Heading>
            {loadingMaster ? (
              <Flex justify="center" p={4}>
                <Spinner color="brand.500" />
              </Flex>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 3, lg: 5 }} spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="700">Ngày báo cáo</FormLabel>
                  <Input
                    borderRadius="md"
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="700">Kỳ báo cáo</FormLabel>
                  <Select
                    borderRadius="md"
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value)}
                  >
                    <option value="daily">Hàng ngày (Daily)</option>
                    <option value="monthly">Hàng tháng (Monthly)</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="700">Phòng ban</FormLabel>
                  <Select
                    borderRadius="md"
                    value={selectedDept}
                    onChange={(e) => {
                      setSelectedDept(e.target.value)
                      setSelectedStation('') // Reset station on department change
                    }}
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.code}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl
                  isDisabled={selectedDept !== 'KCCNBV'}
                  opacity={selectedDept !== 'KCCNBV' ? 0.5 : 1}
                >
                  <FormLabel fontSize="sm" fontWeight="700">Trạm vệ tinh</FormLabel>
                  <Select
                    borderRadius="md"
                    value={selectedStation}
                    onChange={(e) => setSelectedStation(e.target.value)}
                    placeholder="Tất cả các trạm"
                  >
                    {stations.map((stat) => (
                      <option key={stat.id} value={stat.code}>
                        {stat.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="700">Nhóm biến số</FormLabel>
                  <Select
                    borderRadius="md"
                    value={selectedGroup}
                    placeholder="Tất cả các nhóm"
                    onChange={(e) => setSelectedGroup(e.target.value)}
                  >
                    <option value="A">Nhóm A</option>
                    <option value="B">Nhóm B</option>
                  </Select>
                </FormControl>
              </SimpleGrid>
            )}
          </CardBody>
        </Card>

        {/* Input Form Card */}
        {loadingData ? (
          <Card>
            <CardBody p={8}>
              <Stack align="center" py={12} spacing={4}>
                <Spinner color="brand.500" size="lg" thickness="3px" />
                <Text color="gray.600" fontWeight="600">
                  Đang tải dữ liệu biểu mẫu...
                </Text>
              </Stack>
            </CardBody>
          </Card>
        ) : template ? (
          <Card>
            <CardBody p={6}>
              {/* Header Info */}
              <Flex
                align={{ base: 'start', md: 'center' }}
                direction={{ base: 'column', md: 'row' }}
                justify="space-between"
                mb={6}
                gap={4}
              >
                <VStack align="stretch" spacing={1}>
                  <HStack spacing={2}>
                    <Icon as={FiFileText} color="brand.500" size="20px" />
                    <Heading size="md" color="gray.800">
                      Bảng nhập chỉ số lâm sàng
                    </Heading>
                  </HStack>
                  <Text color="gray.500" fontSize="sm">
                    Bộ phận: <b>{selectedDept}</b> {selectedStation && ` | Trạm: ${selectedStation}`} | Ngày:{' '}
                    <b>{reportDate}</b>
                  </Text>
                </VStack>

                <HStack spacing={3}>
                  {existingBatch ? (
                    <Stack align="end" spacing={1}>
                      <HStack>
                        <Text color="gray.500" fontSize="xs">
                          Mã lô: <b>{existingBatch.batch_code}</b>
                        </Text>
                        <Badge
                          colorScheme={getStatusBadgeColor(existingBatch.status)}
                          fontSize="xs"
                          px={2.5}
                          py={1}
                          borderRadius="md"
                        >
                          {getStatusText(existingBatch.status)}
                        </Badge>
                      </HStack>
                      {existingBatch.status === 'rejected' && existingBatch.reject_reason && (
                        <Text color="red.500" fontSize="xs" fontWeight="bold">
                          Lý do từ chối: {existingBatch.reject_reason}
                        </Text>
                      )}
                    </Stack>
                  ) : (
                    <Badge colorScheme="gray" fontSize="xs" px={2.5} py={1} borderRadius="md">
                      Chưa lưu nháp
                    </Badge>
                  )}
                </HStack>
              </Flex>

              <Divider mb={6} />

              {/* Status Banner */}
              {isReadOnly && (
                <Alert borderRadius="lg" mb={6} status="info" variant="left-accent">
                  <AlertIcon as={FiLock} />
                  <Box flex="1">
                    <Text fontWeight="bold">Lô báo cáo đang khóa</Text>
                    <Text fontSize="sm">
                      Lô số liệu này đã được gửi duyệt hoặc khóa sổ kỳ báo cáo. Bạn không thể sửa đổi số liệu ở trạng thái này.
                    </Text>
                  </Box>
                </Alert>
              )}

              {/* Fields Inputs */}
              {template.fields.length === 0 ? (
                <Stack align="center" py={12} spacing={3}>
                  <Icon as={FiDatabase} color="gray.400" size="48px" />
                  <Text color="gray.500" fontWeight="600">
                    Không tìm thấy biến số nào phù hợp với bộ lọc hiện tại.
                  </Text>
                </Stack>
              ) : (
                <VStack align="stretch" spacing={5}>
                  <Box overflowX="auto">
                    <Table size="md" variant="simple">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th w="80px">Mã</Th>
                          <Th minW="220px">Tên chỉ số / Biến số</Th>
                          <Th w="120px">Đơn vị</Th>
                          <Th w="200px">Giá trị số liệu</Th>
                          <Th minW="200px">Ghi chú dòng</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {template.fields.map((field) => {
                          const isErr = !!validationErrors[field.variable_code]
                          const recordVal = formValues[field.variable_code] || {
                            value: '',
                            note: '',
                          }

                          return (
                            <Tr key={field.variable_code}>
                              <Td fontWeight="bold" color="gray.600">
                                {field.variable_code}
                              </Td>
                              <Td>
                                <Text fontWeight="600" color="gray.800">
                                  {field.label}
                                </Text>
                                {field.required && (
                                  <Text as="span" color="red.500" fontSize="xs" ml={1}>
                                    (Bắt buộc *)
                                  </Text>
                                )}
                              </Td>
                              <Td color="gray.500">{field.unit || '-'}</Td>
                              <Td>
                                <FormControl isInvalid={isErr}>
                                  <Input
                                    borderRadius="md"
                                    type="number"
                                    isDisabled={isReadOnly}
                                    placeholder={field.required ? 'Nhập số liệu *' : 'Không có'}
                                    value={recordVal.value}
                                    onChange={(e) =>
                                      handleValueChange(
                                        field.variable_code,
                                        e.target.value
                                      )
                                    }
                                  />
                                  <FormErrorMessage fontSize="xs">
                                    {validationErrors[field.variable_code]}
                                  </FormErrorMessage>
                                </FormControl>
                              </Td>
                              <Td>
                                <Input
                                  borderRadius="md"
                                  isDisabled={isReadOnly}
                                  placeholder="Ghi chú thêm (nếu có)..."
                                  value={recordVal.note}
                                  onChange={(e) =>
                                    handleNoteChange(
                                      field.variable_code,
                                      e.target.value
                                    )
                                  }
                                />
                              </Td>
                            </Tr>
                          )
                        })}
                      </Tbody>
                    </Table>
                  </Box>

                  <Divider my={4} />

                  {/* Batch Note */}
                  <FormControl>
                    <FormLabel fontWeight="700">Ghi chú chung cho đợt báo cáo này</FormLabel>
                    <Textarea
                      borderRadius="md"
                      isDisabled={isReadOnly}
                      placeholder="Ý kiến nhận xét hoặc thông tin bổ sung cho toàn ca trực..."
                      value={batchNote}
                      onChange={(e) => setBatchNote(e.target.value)}
                    />
                  </FormControl>

                  {/* Action Buttons */}
                  <Flex justify="end" mt={6} gap={4}>
                    <Button
                      leftIcon={<FiSave />}
                      colorScheme="brand"
                      variant="outline"
                      isLoading={saving}
                      isDisabled={isReadOnly}
                      onClick={handleSaveDraft}
                    >
                      Lưu bản nháp (Save Draft)
                    </Button>
                    <Button
                      leftIcon={<FiSend />}
                      colorScheme="brand"
                      isLoading={submitting}
                      isDisabled={!existingBatch || isReadOnly}
                      onClick={handleSubmit}
                    >
                      Nộp báo cáo (Submit)
                    </Button>
                  </Flex>
                </VStack>
              )}
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody p={8}>
              <Stack align="center" py={12} spacing={3}>
                <Icon as={FiAlertTriangle} color="orange.400" size="48px" />
                <Text color="gray.600" fontWeight="600">
                  Vui lòng chọn phòng ban để bắt đầu hiển thị biểu mẫu.
                </Text>
              </Stack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </PortalLayout>
  )
}
