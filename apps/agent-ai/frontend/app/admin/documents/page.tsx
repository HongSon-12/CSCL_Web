'use client'

import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Checkbox,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Input,
  Select,
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
} from '@chakra-ui/react'
import Link from 'next/link'
import { Fragment } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState, LoginNotice, PageHeader, PageShell, StatusAlert } from '../../components/admin-ui'

type Version = {
  id: string
  version_number: number
  file_name: string
  status: string
  indexing_job_status?: string | null
  indexing_error_message?: string | null
  indexed_at?: string
}

type DocumentItem = {
  id: string
  title: string
  document_type?: string
  display_category?: string
  department?: string
  description?: string
  import_category?: string
  status: string
  current_version?: Version | null
  versions: Version[]
}

type MetadataSuggestions = {
  document_types: string[]
  import_categories: string[]
  departments: string[]
}

type SuggestionField = keyof MetadataSuggestions

type SuggestionStore = {
  custom: MetadataSuggestions
  hidden: MetadataSuggestions
}

type EditForm = {
  title: string
  document_type: string
  import_category: string
  department: string
  description: string
}

const TOKEN_KEY = 'ai-chat-token'
const CUSTOM_SUGGESTIONS_KEY = 'document-metadata-custom-suggestions'

const FALLBACK_SUGGESTIONS: MetadataSuggestions = {
  document_types: ['Quy định', 'Quy trình', 'Hướng dẫn', 'Biểu mẫu', 'Chính sách', 'Thông báo'],
  import_categories: ['Quy định', 'Quy trình nội bộ', 'Hướng dẫn nghiệp vụ', 'Biểu mẫu', 'Văn bản pháp lý'],
  departments: [
    'Phòng Kế hoạch - Tài chính',
    'Phòng Tổ chức - Hành chính',
    'Phòng Vật tư trang thiết bị y tế - Dược',
    'Khoa Điều hành',
    'Khoa Cấp cứu ngoài bệnh viện',
  ],
}

const EMPTY_SUGGESTIONS: MetadataSuggestions = {
  document_types: [],
  import_categories: [],
  departments: [],
}

const EMPTY_SUGGESTION_STORE: SuggestionStore = {
  custom: EMPTY_SUGGESTIONS,
  hidden: EMPTY_SUGGESTIONS,
}

const FIELD_LABELS: Record<SuggestionField, string> = {
  document_types: 'loại tài liệu',
  import_categories: 'nhóm tài liệu',
  departments: 'phòng ban',
}

const VIETNAMESE_CATEGORY_LABELS: Record<string, string> = {
  'quy trinh ky thuat': 'Quy trình kỹ thuật',
  'tai lieu tham khao': 'Tài liệu tham khảo',
  'quan ly chat luong': 'Quản lý chất lượng',
  'nghien cuu khoa hoc': 'Nghiên cứu khoa học',
  'mau phieu': 'Mẫu phiếu',
  'mau the thuc van ban': 'Mẫu thể thức văn bản',
  luat: 'Luật',
  'huong dan dieu tri': 'Hướng dẫn điều trị',
  'quy che': 'Quy chế',
  'chuong trinh dao tao cho nhan vien cap chung chi': 'Chương trình đào tạo cho nhân viên cấp chứng chỉ',
  'bieu mau xin phep di nuoc ngoai': 'Biểu mẫu xin phép đi nước ngoài',
  'huong dan su dung': 'Hướng dẫn sử dụng',
  'quy trinh quan ly': 'Quy trình quản lý',
  'quy dinh': 'Quy định',
  'tai lieu, van ban dang': 'Tài liệu, văn bản Đảng',
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

function formatCategoryLabel(value?: string | null) {
  if (!value?.trim()) return ''
  return value
    .split('/')
    .map((part) => {
      const label = part.trim().replace(/^\d+\s*[\.)-]\s*/, '').trim()
      return VIETNAMESE_CATEGORY_LABELS[normalizeText(label)] || label
    })
    .filter(Boolean)
    .join(' / ')
}

function mergeSuggestions(apiValues: string[] = [], fallbackValues: string[], customValues: string[] = []) {
  return Array.from(new Set([...apiValues, ...fallbackValues, ...customValues].map((value) => formatCategoryLabel(value)).filter(Boolean)))
}

function withoutHidden(values: string[], hiddenValues: string[]) {
  const hidden = new Set(hiddenValues.map((value) => formatCategoryLabel(value)))
  return values.filter((value) => !hidden.has(formatCategoryLabel(value)))
}

function buildSuggestions(apiSuggestions: MetadataSuggestions, customSuggestions: MetadataSuggestions, hiddenSuggestions: MetadataSuggestions) {
  const documentTypeSuggestions = mergeSuggestions(
    [...apiSuggestions.document_types, ...apiSuggestions.import_categories],
    [...FALLBACK_SUGGESTIONS.document_types, ...FALLBACK_SUGGESTIONS.import_categories],
    [...customSuggestions.document_types, ...customSuggestions.import_categories],
  )
  const hiddenDocumentTypeSuggestions = [...hiddenSuggestions.document_types, ...hiddenSuggestions.import_categories]

  return {
    document_types: withoutHidden(documentTypeSuggestions, hiddenDocumentTypeSuggestions),
    import_categories: [],
    departments: withoutHidden(mergeSuggestions(apiSuggestions.departments, FALLBACK_SUGGESTIONS.departments, customSuggestions.departments), hiddenSuggestions.departments),
  }
}

function readSuggestionStore(): SuggestionStore {
  if (typeof window === 'undefined') return EMPTY_SUGGESTION_STORE
  try {
    const data = JSON.parse(localStorage.getItem(CUSTOM_SUGGESTIONS_KEY) || '{}')
    if (data.custom || data.hidden) {
      return {
        custom: { ...EMPTY_SUGGESTIONS, ...(data.custom || {}) },
        hidden: { ...EMPTY_SUGGESTIONS, ...(data.hidden || {}) },
      }
    }
    return {
      custom: { ...EMPTY_SUGGESTIONS, ...data },
      hidden: EMPTY_SUGGESTIONS,
    }
  } catch {
    return EMPTY_SUGGESTION_STORE
  }
}

function writeSuggestionStore(value: SuggestionStore) {
  localStorage.setItem(CUSTOM_SUGGESTIONS_KEY, JSON.stringify(value))
}

function createEditForm(document: DocumentItem): EditForm {
  const category = formatCategoryLabel(document.import_category || document.display_category || document.document_type)
  return {
    title: document.title || '',
    document_type: category,
    import_category: category,
    department: document.department || '',
    description: document.description || '',
  }
}

function statusColor(status?: string) {
  if (status === 'active') return 'green'
  if (status === 'processing' || status === 'pending_review') return 'yellow'
  if (status === 'failed' || status === 'rejected') return 'red'
  return 'gray'
}

export default function AdminDocumentsPage() {
  const [token, setToken] = useState('')
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [pageSize, setPageSize] = useState(20)
  const [totalDocuments, setTotalDocuments] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [allSelectableVersionIds, setAllSelectableVersionIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isBulkBusy, setIsBulkBusy] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<MetadataSuggestions>(FALLBACK_SUGGESTIONS)
  const [apiSuggestions, setApiSuggestions] = useState<MetadataSuggestions>(EMPTY_SUGGESTIONS)
  const [customSuggestions, setCustomSuggestions] = useState<MetadataSuggestions>(EMPTY_SUGGESTIONS)
  const [hiddenSuggestions, setHiddenSuggestions] = useState<MetadataSuggestions>(EMPTY_SUGGESTIONS)
  const [activeSuggestionField, setActiveSuggestionField] = useState<SuggestionField | ''>('')
  const [editingId, setEditingId] = useState('')
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [savingId, setSavingId] = useState('')
  const toast = useToast()

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token],
  )

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY) || '')
    const saved = readSuggestionStore()
    setCustomSuggestions(saved.custom)
    setHiddenSuggestions(saved.hidden)
    setSuggestions(buildSuggestions(EMPTY_SUGGESTIONS, saved.custom, saved.hidden))
  }, [])

  useEffect(() => {
    if (!token) return
    void loadDocuments()
    void loadSuggestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, pageSize])

  useEffect(() => {
    setPageInput(String(page))
  }, [page])

  useEffect(() => {
    if (!token || !documents.some((document) => document.current_version?.status === 'processing')) return
    const interval = window.setInterval(() => {
      void loadDocuments({ silent: true })
    }, 5000)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, documents])

  async function request(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: {
        ...authHeaders,
        ...(init.headers || {}),
      },
    })
    if (response.status === 401 || response.status === 403) {
      throw new Error('Tài khoản không có quyền quản lý tài liệu.')
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.detail || 'API tài liệu đang lỗi.')
    }
    return response.json()
  }

  async function loadDocuments(options: { silent?: boolean; nextPage?: number; nextPageSize?: number } = {}) {
    const targetPage = options.nextPage || page
    const targetPageSize = options.nextPageSize || pageSize
    if (!options.silent) setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      params.set('status_filter', statusFilter)
      params.set('page', String(targetPage))
      params.set('page_size', String(targetPageSize))
      const data = await request(`/api/v1/admin/documents?${params.toString()}`)
      setDocuments(data.items || [])
      setTotalDocuments(data.total || 0)
      setTotalPages(data.total_pages || 1)
      setAllSelectableVersionIds(data.selectable_version_ids || [])
      if (data.page && data.page !== page) setPage(data.page)
      if (data.page_size && data.page_size !== pageSize) setPageSize(data.page_size)
      setSelectedVersionIds((current) =>
        current.filter((id) => (data.selectable_version_ids || []).includes(id)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được tài liệu.')
    } finally {
      if (!options.silent) setIsLoading(false)
    }
  }

  async function loadSuggestions() {
    try {
      const data = await request('/api/v1/admin/document-metadata/suggestions')
      const nextApiSuggestions = {
        document_types: data.document_types || [],
        import_categories: data.import_categories || [],
        departments: data.departments || [],
      }
      const saved = readSuggestionStore()
      setApiSuggestions(nextApiSuggestions)
      setCustomSuggestions(saved.custom)
      setHiddenSuggestions(saved.hidden)
      setSuggestions(buildSuggestions(nextApiSuggestions, saved.custom, saved.hidden))
    } catch {
      setSuggestions(buildSuggestions(EMPTY_SUGGESTIONS, customSuggestions, hiddenSuggestions))
    }
  }

  function updateSuggestionStore(nextCustom: MetadataSuggestions, nextHidden = hiddenSuggestions) {
    setCustomSuggestions(nextCustom)
    setHiddenSuggestions(nextHidden)
    writeSuggestionStore({ custom: nextCustom, hidden: nextHidden })
    setSuggestions(buildSuggestions(apiSuggestions, nextCustom, nextHidden))
  }

  function addSuggestion(field: SuggestionField) {
    const value = window.prompt(`Thêm ${FIELD_LABELS[field]}`)
    if (!value?.trim()) return
    const nextHidden = field === 'document_types'
      ? {
        ...hiddenSuggestions,
        document_types: hiddenSuggestions.document_types.filter((item) => formatCategoryLabel(item) !== formatCategoryLabel(value)),
        import_categories: hiddenSuggestions.import_categories.filter((item) => formatCategoryLabel(item) !== formatCategoryLabel(value)),
      }
      : {
        ...hiddenSuggestions,
        [field]: hiddenSuggestions[field].filter((item) => item !== value.trim()),
      }
    updateSuggestionStore({
      ...customSuggestions,
      [field]: mergeSuggestions([], customSuggestions[field], [value]),
    }, nextHidden)
  }

  function renameSuggestion(field: SuggestionField, oldValue: string) {
    const value = window.prompt(`Sửa ${FIELD_LABELS[field]}`, oldValue)
    if (!value?.trim()) return
    updateSuggestionStore({
      ...customSuggestions,
      [field]: mergeSuggestions([], customSuggestions[field].filter((item) => item !== oldValue), [value]),
    }, {
      ...hiddenSuggestions,
      [field]: mergeSuggestions([], hiddenSuggestions[field], [oldValue]).filter((item) => item !== value.trim()),
    })
  }

  function removeSuggestion(field: SuggestionField, value: string) {
    if (!window.confirm(`Xóa "${value}" khỏi gợi ý ${FIELD_LABELS[field]}?`)) return
    if (field === 'document_types') {
      updateSuggestionStore({
        ...customSuggestions,
        document_types: customSuggestions.document_types.filter((item) => formatCategoryLabel(item) !== formatCategoryLabel(value)),
        import_categories: customSuggestions.import_categories.filter((item) => formatCategoryLabel(item) !== formatCategoryLabel(value)),
      }, {
        ...hiddenSuggestions,
        document_types: mergeSuggestions([], hiddenSuggestions.document_types, [value]),
        import_categories: mergeSuggestions([], hiddenSuggestions.import_categories, [value]),
      })
      return
    }
    updateSuggestionStore({
      ...customSuggestions,
      [field]: customSuggestions[field].filter((item) => item !== value),
    }, {
      ...hiddenSuggestions,
      [field]: mergeSuggestions([], hiddenSuggestions[field], [value]),
    })
  }

  function renderSuggestionPanel(field: SuggestionField, selectValue: (value: string) => void) {
    if (activeSuggestionField !== field) return null
    return (
      <Box bg="gray.50" borderColor="gray.200" borderRadius="md" borderWidth="1px" mt={2} p={3}>
        <HStack justify="space-between" mb={2}>
          <Text fontSize="sm" fontWeight="800">Gợi ý {FIELD_LABELS[field]}</Text>
          <Button size="sm" type="button" onClick={() => addSuggestion(field)}>+</Button>
        </HStack>
        <Stack maxH="220px" overflowY="auto" spacing={2}>
          {suggestions[field].map((value) => (
            <Grid gap={2} gridTemplateColumns="minmax(0, 1fr) auto auto" key={value}>
              <Button justifyContent="flex-start" overflow="hidden" size="sm" textOverflow="ellipsis" type="button" variant="outline" whiteSpace="nowrap" onClick={() => selectValue(value)}>
                {value}
              </Button>
              <Button size="sm" type="button" onClick={() => renameSuggestion(field, value)}>Sửa</Button>
              <Button colorScheme="red" size="sm" type="button" variant="outline" onClick={() => removeSuggestion(field, value)}>Xóa</Button>
            </Grid>
          ))}
        </Stack>
      </Box>
    )
  }

  function startEdit(document: DocumentItem) {
    setEditingId(document.id)
    setEditForm(createEditForm(document))
    setError('')
    setMessage('')
  }

  function cancelEdit() {
    setEditingId('')
    setEditForm(null)
    setActiveSuggestionField('')
  }

  async function saveDocumentMetadata(documentId: string) {
    if (!editForm) return
    const category = formatCategoryLabel(editForm.document_type || editForm.import_category)
    setSavingId(documentId)
    setError('')
    setMessage('')
    try {
      await request(`/api/v1/admin/documents/${documentId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...editForm,
          document_type: category,
          import_category: category,
        }),
      })
      notify('success', 'Đã cập nhật tài liệu')
      cancelEdit()
      await loadDocuments()
      await loadSuggestions()
    } catch (err) {
      notify('error', 'Không cập nhật được thông tin tài liệu', err instanceof Error ? err.message : undefined)
    } finally {
      setSavingId('')
    }
  }

  function notify(status: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) {
    toast({
      title,
      description,
      status,
      duration: status === 'error' ? 7000 : 4000,
      isClosable: true,
      position: 'top-right',
    })
  }

  function toggleSelected(versionId: string) {
    setSelectedVersionIds((current) =>
      current.includes(versionId)
        ? current.filter((id) => id !== versionId)
        : [...current, versionId],
    )
  }

  function toggleAll() {
    const ids = allSelectableVersionIds
    if (ids.length && ids.every((id) => selectedVersionIds.includes(id))) {
      setSelectedVersionIds([])
      return
    }
    setSelectedVersionIds(ids)
  }

  function goToPage(rawValue: string) {
    const nextPage = Math.min(Math.max(Number(rawValue) || 1, 1), totalPages)
    setPage(nextPage)
  }

  async function reindex(versionId: string) {
    setError('')
    setMessage('')
    try {
      await request(`/api/v1/admin/document-versions/${versionId}/reindex`, { method: 'POST' })
      notify('success', 'Đã tạo job re-index')
      await loadDocuments()
    } catch (err) {
      notify('error', 'Không tạo được job re-index', err instanceof Error ? err.message : undefined)
    }
  }

  async function bulkReindex() {
    if (!selectedVersionIds.length) return
    const confirmed = window.confirm(`Tạo job index cho ${selectedVersionIds.length} version đã chọn?`)
    if (!confirmed) return
    setIsBulkBusy(true)
    setError('')
    setMessage('')
    try {
      const data = await request('/api/v1/admin/document-versions/bulk/reindex', {
        method: 'POST',
        body: JSON.stringify({ version_ids: selectedVersionIds }),
      })
      notify('success', 'Đã tạo job re-index hàng loạt', `${data.reindexed?.length || 0} version.`)
      setSelectedVersionIds([])
      await loadDocuments()
    } catch (err) {
      notify('error', 'Không tạo được job index hàng loạt', err instanceof Error ? err.message : undefined)
    } finally {
      setIsBulkBusy(false)
    }
  }

  async function downloadVersion(version: Version) {
    try {
      const response = await fetch(`/api/v1/documents/${version.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(`Không tải được file ${version.file_name}.`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = version.file_name || 'tai-lieu'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      notify('success', 'Đã bắt đầu tải file', version.file_name)
    } catch (err) {
      notify('error', 'Không tải được file', err instanceof Error ? err.message : undefined)
    }
  }

  async function bulkDownload() {
    if (!selectedVersionIds.length) return
    setIsBulkBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/v1/documents/bulk/download', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ version_ids: selectedVersionIds }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.detail || 'Không tải file hàng loạt được.')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tai-lieu-${selectedVersionIds.length}-files.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      notify('success', 'Đã tạo file ZIP', `${selectedVersionIds.length} file đã chọn.`)
    } catch (err) {
      notify('error', 'Không tải file hàng loạt được', err instanceof Error ? err.message : undefined)
    } finally {
      setIsBulkBusy(false)
    }
  }

  if (!token) return <LoginNotice title="Quản lý tài liệu" />

  const firstItem = totalDocuments ? (page - 1) * pageSize + 1 : 0
  const lastItem = Math.min(page * pageSize, totalDocuments)

  return (
    <PageShell>
      <PageHeader
        description="Quản lý tài liệu, phiên bản hiện hành, tải file và tải lại tài liệu."
        navItems={[
          { href: '/chat', label: 'Chat' },
          { href: '/admin/documents/new', label: 'Upload mới' },
          { href: '/admin/documents/review', label: 'Review' },
          { href: '/admin/users', label: 'Users' },
        ]}
        title="Quản lý tài liệu"
      />
      <StatusAlert message={error} status="error" />
      <StatusAlert message={message} status="success" />

      <Card mb={4}>
        <CardBody>
          <Grid gap={3} gridTemplateColumns={{ base: '1fr', md: 'minmax(260px, 1fr) 190px auto' }}>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tiêu đề, mô tả, loại tài liệu" />
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="pending_review">Pending review</option>
              <option value="processing">Processing</option>
              <option value="active">Active</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </Select>
            <Button onClick={() => {
              setPage(1)
              void loadDocuments({ nextPage: 1 })
            }}>Lọc</Button>
          </Grid>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Stack spacing={4}>
            <HStack align={{ base: 'stretch', md: 'center' }} flexWrap="wrap" justify="space-between">
              <Text fontSize="lg" fontWeight="800">Danh sách tài liệu</Text>
              <HStack color="gray.600" spacing={2}>
                {isLoading ? <Spinner size="sm" /> : null}
                <Text fontWeight="700">{isLoading ? 'Đang tải...' : `${firstItem}-${lastItem}/${totalDocuments} tài liệu`}</Text>
              </HStack>
            </HStack>

            {allSelectableVersionIds.length ? (
              <Stack bg="gray.50" borderColor="gray.200" borderRadius="lg" borderWidth="1px" direction={{ base: 'column', md: 'row' }} p={3} spacing={3}>
                <Checkbox isChecked={allSelectableVersionIds.length > 0 && allSelectableVersionIds.every((id) => selectedVersionIds.includes(id))} onChange={toggleAll}>
                  Chọn tất cả
                </Checkbox>
                <Badge alignSelf={{ base: 'flex-start', md: 'center' }} colorScheme="brand">{selectedVersionIds.length} đã chọn</Badge>
                <Button colorScheme="brand" isDisabled={!selectedVersionIds.length || isBulkBusy} isLoading={isBulkBusy} onClick={bulkReindex}>
                  Re-index đã chọn
                </Button>
                <Button isDisabled={!selectedVersionIds.length || isBulkBusy} onClick={bulkDownload}>
                  Tải file đã chọn
                </Button>
              </Stack>
            ) : null}

            {isLoading ? (
              <HStack justify="center" py={10}><Spinner /></HStack>
            ) : documents.length ? (
              <Box overflowX="auto">
                <Table minW={{ base: '760px', xl: '100%' }} size="sm" variant="simple" w="full">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th w="48px"></Th>
                      <Th>Tài liệu</Th>
                      <Th>Version hiện hành</Th>
                      <Th>Trạng thái</Th>
                      <Th>Thao tác</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {documents.map((document) => (
                      <Fragment key={document.id}>
                        <Tr _hover={{ bg: 'gray.50' }}>
                          <Td>
                            {document.current_version ? (
                              <Checkbox isChecked={selectedVersionIds.includes(document.current_version.id)} onChange={() => toggleSelected(document.current_version!.id)} />
                            ) : null}
                          </Td>
                          <Td maxW={{ base: '280px', xl: 'none' }}>
                            <Text fontWeight="800">{document.title}</Text>
                            <Text color="gray.600" fontSize="sm">
                              {formatCategoryLabel(document.display_category || document.import_category || document.document_type) || 'Chưa phân loại'}
                              {document.department ? ` · ${document.department}` : ''}
                            </Text>
                          </Td>
                          <Td color="gray.700">
                            {document.current_version ? `v${document.current_version.version_number} · ${document.current_version.file_name}` : 'Chưa có active version'}
                          </Td>
                          <Td>
                            <Stack align="flex-start" spacing={1}>
                              <Badge colorScheme={statusColor(document.current_version?.status || document.status)}>
                                {document.current_version?.status || document.status}
                              </Badge>
                              {document.current_version?.indexing_error_message ? (
                                <Text color="red.600" fontSize="xs" maxW="260px">
                                  {document.current_version.indexing_error_message}
                                </Text>
                              ) : document.current_version?.indexing_job_status === 'failed' ? (
                                <Text color="red.600" fontSize="xs" maxW="260px">
                                  Index lỗi. Kiểm tra log worker để biết chi tiết.
                                </Text>
                              ) : null}
                            </Stack>
                          </Td>
                          <Td>
                            <HStack flexWrap="wrap" spacing={2}>
                              <Button size="sm" onClick={() => startEdit(document)}>Sửa thông tin</Button>
                              <Button as={Link} href={`/admin/documents/${document.id}/replace`} size="sm" variant="outline">Thay thế</Button>
                              {document.current_version ? <Button size="sm" variant="outline" onClick={() => downloadVersion(document.current_version!)}>Tải file</Button> : null}
                              {document.current_version ? <Button size="sm" variant="outline" onClick={() => reindex(document.current_version!.id)}>Re-index</Button> : null}
                            </HStack>
                          </Td>
                        </Tr>
                        {editingId === document.id && editForm ? (
                          <Tr>
                            <Td colSpan={5}>
                              <Card bg="gray.50" variant="outline">
                                <CardBody>
                                  <Stack spacing={4}>
                                    <Grid gap={4} gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, minmax(0, 1fr))', '2xl': 'repeat(4, minmax(0, 1fr))' }}>
                                      <FormControl isRequired>
                                        <FormLabel>Tên tài liệu</FormLabel>
                                        <Input value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} />
                                      </FormControl>
                                      <FormControl>
                                        <FormLabel>Loại tài liệu</FormLabel>
                                        <HStack align="start">
                                          <Input
                                            list="document-type-suggestions"
                                            value={editForm.document_type}
                                            onChange={(event) => {
                                              const value = event.target.value
                                              setEditForm({ ...editForm, document_type: value, import_category: value })
                                            }}
                                          />
                                          <Button type="button" onClick={() => setActiveSuggestionField(activeSuggestionField === 'document_types' ? '' : 'document_types')}>...</Button>
                                        </HStack>
                                        {renderSuggestionPanel('document_types', (value) => setEditForm({ ...editForm, document_type: value, import_category: value }))}
                                      </FormControl>
                                      <FormControl>
                                        <FormLabel>Phòng ban</FormLabel>
                                        <HStack align="start">
                                          <Input list="department-suggestions" value={editForm.department} onChange={(event) => setEditForm({ ...editForm, department: event.target.value })} />
                                          <Button type="button" onClick={() => setActiveSuggestionField(activeSuggestionField === 'departments' ? '' : 'departments')}>...</Button>
                                        </HStack>
                                        {renderSuggestionPanel('departments', (value) => setEditForm({ ...editForm, department: value }))}
                                      </FormControl>
                                    </Grid>
                                    <FormControl>
                                      <FormLabel>Mô tả</FormLabel>
                                      <Textarea minH="80px" value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} />
                                    </FormControl>
                                    <HStack flexWrap="wrap">
                                      <Button colorScheme="brand" isLoading={savingId === document.id} onClick={() => saveDocumentMetadata(document.id)}>
                                        Lưu
                                      </Button>
                                      <Button isDisabled={savingId === document.id} variant="outline" onClick={cancelEdit}>Hủy</Button>
                                    </HStack>
                                  </Stack>
                                </CardBody>
                              </Card>
                            </Td>
                          </Tr>
                        ) : null}
                      </Fragment>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            ) : (
              <EmptyState>Không có tài liệu phù hợp.</EmptyState>
            )}

            <HStack align={{ base: 'stretch', md: 'center' }} flexWrap="wrap" justify="space-between">
              <HStack spacing={2}>
                <Text color="gray.600" fontSize="sm" fontWeight="700">Hiển thị</Text>
                <Select
                  size="sm"
                  value={pageSize}
                  w="96px"
                  onChange={(event) => {
                    const nextPageSize = Number(event.target.value)
                    setPageSize(nextPageSize)
                    setPage(1)
                    void loadDocuments({ nextPage: 1, nextPageSize })
                  }}
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </Select>
              </HStack>
              <HStack spacing={2}>
                <Button isDisabled={page <= 1 || isLoading} size="sm" variant="outline" onClick={() => setPage((current) => Math.max(current - 1, 1))}>
                  Trước
                </Button>
                <HStack spacing={2}>
                  <Text color="gray.700" fontSize="sm" fontWeight="700">Trang</Text>
                  <Input
                    max={totalPages}
                    min={1}
                    size="sm"
                    type="number"
                    value={pageInput}
                    w="72px"
                    onBlur={() => goToPage(pageInput)}
                    onChange={(event) => setPageInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') goToPage(pageInput)
                    }}
                  />
                  <Text color="gray.700" fontSize="sm" fontWeight="700">/ {totalPages}</Text>
                </HStack>
                <Button isDisabled={page >= totalPages || isLoading} size="sm" variant="outline" onClick={() => setPage((current) => Math.min(current + 1, totalPages))}>
                  Sau
                </Button>
              </HStack>
            </HStack>
          </Stack>
          <datalist id="document-type-suggestions">
            {suggestions.document_types.map((value) => <option key={value} value={value} />)}
          </datalist>
          <datalist id="department-suggestions">
            {suggestions.departments.map((value) => <option key={value} value={value} />)}
          </datalist>
        </CardBody>
      </Card>
    </PageShell>
  )
}
