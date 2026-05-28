'use client'

import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  ListItem,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Stack,
  Text,
  Textarea,
  UnorderedList,
} from '@chakra-ui/react'
import Link from 'next/link'
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'

type Role = 'user' | 'assistant'

type Source = {
  chunk_id: string
  document_id: string
  document_version_id: string
  source: string
  document_title?: string
  type?: string
  import_category?: string
  confidence_label?: string
  document_confidence_percent?: number
  version_number?: number
  title_path?: string[] | string | null
  page_number?: number | null
  score?: number
  distance?: number
  excerpt?: string
}

type RelatedDocument = {
  document_id: string
  document_version_id: string
  title?: string
  file_name?: string
  source?: string
  import_category?: string
  type?: string
  confidence_label?: string
  document_confidence_percent?: number
  score?: number
}

type Message = {
  id: string
  role: Role
  content: string
  sources?: Source[]
  related_documents?: RelatedDocument[]
  feedback?: 'up' | 'down'
  createdAt: string
}

type Session = {
  id: string
  title: string
  messages: Message[]
  updatedAt: string
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

const API_BASE_URL = ''
const TOKEN_KEY = 'ai-chat-token'
const SESSIONS_KEY = 'ai-chat-sessions'

function normalizeCategoryText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

function formatCategoryLabel(value?: string | null) {
  if (!value?.trim()) return ''
  return value
    .split('/')
    .map((part) => {
      const label = part.trim().replace(/^\d+\s*[\.)-]\s*/, '').trim()
      return VIETNAMESE_CATEGORY_LABELS[normalizeCategoryText(label)] || label
    })
    .filter(Boolean)
    .join(' / ')
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createSession(): Session {
  const now = new Date().toISOString()
  return {
    id: newId(),
    title: 'Hội thoại mới',
    messages: [],
    updatedAt: now,
  }
}

function formatScore(score?: number) {
  if (typeof score !== 'number') return 'N/A'
  return `${Math.round(score * 100)}%`
}

function compactSources(sources: Source[] = []) {
  const byVersion = new Map<string, Source>()

  for (const source of sources) {
    const key = source.document_version_id || source.document_id || source.source
    const existing = byVersion.get(key)

    if (!existing) {
      byVersion.set(key, source)
      continue
    }

    const existingScore = existing.score || 0
    const nextScore = source.score || 0
    if (nextScore > existingScore) {
      byVersion.set(key, source)
    }
  }

  return Array.from(byVersion.values()).slice(0, 4)
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <Box as="strong" key={index}>{part.slice(2, -2)}</Box>
        }
        return <Box as="span" key={index}>{part}</Box>
      })}
    </>
  )
}

function MarkdownText({ text }: { text: string }) {
  const blocks = text.split(/```/g)

  return (
    <Stack spacing={3}>
      {blocks.map((block, blockIndex) => {
        if (blockIndex % 2 === 1) {
          return (
            <Box as="pre" bg="gray.900" borderRadius="md" color="gray.50" fontSize="sm" key={blockIndex} overflowX="auto" p={3}>
              {block.replace(/^\w+\n/, '')}
            </Box>
          )
        }

        return block
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((paragraph, paragraphIndex) => {
            const key = `${blockIndex}-${paragraphIndex}`
            const lines = paragraph.split('\n').filter(Boolean)

            if (lines.every((line) => line.trim().startsWith('- '))) {
              return (
                <UnorderedList key={key} pl={4} spacing={1}>
                  {lines.map((line, index) => (
                    <ListItem key={index}>
                      <InlineMarkdown text={line.trim().slice(2)} />
                    </ListItem>
                  ))}
                </UnorderedList>
              )
            }

            if (/^#{1,3}\s/.test(paragraph.trim())) {
              return (
                <Heading key={key} size="sm">
                  <InlineMarkdown text={paragraph.replace(/^#{1,3}\s/, '')} />
                </Heading>
              )
            }

            return (
              <Text key={key} lineHeight="1.7">
                {lines.map((line, index) => (
                  <Box as="span" key={index}>
                    <InlineMarkdown text={line} />
                    {index < lines.length - 1 ? <br /> : null}
                  </Box>
                ))}
              </Text>
            )
          })
      })}
    </Stack>
  )
}

export function ChatApp({ embedded = false }: { embedded?: boolean }) {
  const { login: sharedLogin, logout: sharedLogout, status: authStatus, token: sharedToken } = useAuth()
  const [token, setToken] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState('')
  const [question, setQuestion] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [authError, setAuthError] = useState('')
  const [chatError, setChatError] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY) || ''
    const savedSessions = localStorage.getItem(SESSIONS_KEY)
    const parsedSessions: Session[] = savedSessions ? JSON.parse(savedSessions) : [createSession()]

    setToken(savedToken)
    setSessions(parsedSessions)
    setActiveSessionId(parsedSessions[0]?.id || '')
  }, [])

  useEffect(() => {
    if (authStatus === 'authenticated') {
      setToken(sharedToken)
    }
    if (authStatus === 'unauthenticated') {
      setToken('')
    }
  }, [authStatus, sharedToken])

  useEffect(() => {
    if (sessions.length) {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
    }
  }, [sessions])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [sessions, activeSessionId, isSending])

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId],
  )

  async function login(event: FormEvent) {
    event.preventDefault()
    setAuthError('')

    const result = await sharedLogin(username, password)
    if (!result.ok) {
      setAuthError(result.message || 'Đăng nhập không thành công. Kiểm tra lại tài khoản hoặc mật khẩu.')
      return
    }

    try {
      setToken(localStorage.getItem(TOKEN_KEY) || '')
      setPassword('')
    } catch {
      setAuthError('Không lưu được phiên đăng nhập trên trình duyệt.')
    }
  }

  function logout() {
    sharedLogout()
    setToken('')
  }

  function startNewSession() {
    const session = createSession()
    setSessions((current) => [session, ...current])
    setActiveSessionId(session.id)
    setQuestion('')
    setChatError('')
  }

  function updateSession(sessionId: string, updater: (session: Session) => Session) {
    setSessions((current) =>
      current.map((session) => (session.id === sessionId ? updater(session) : session)),
    )
  }

  function renameSession(sessionId: string) {
    const session = sessions.find((item) => item.id === sessionId)
    const nextTitle = window.prompt('Đổi tên hội thoại', session?.title || '')
    const trimmed = nextTitle?.trim()
    if (!trimmed) return

    updateSession(sessionId, (current) => ({
      ...current,
      title: trimmed.slice(0, 80),
      updatedAt: new Date().toISOString(),
    }))
  }

  function deleteSession(sessionId: string) {
    const session = sessions.find((item) => item.id === sessionId)
    const confirmed = window.confirm(`Xóa hội thoại "${session?.title || 'Hội thoại'}"?`)

    if (!confirmed) return

    setChatError('')
    setSessions((current) => {
      const remaining = current.filter((item) => item.id !== sessionId)

      if (!remaining.length) {
        const nextSession = createSession()
        setActiveSessionId(nextSession.id)
        return [nextSession]
      }

      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id)
      }

      return remaining
    })
  }

  async function sendQuestion() {
    const trimmed = question.trim()
    if (!trimmed || !activeSession || isSending) return

    setIsSending(true)
    setChatError('')
    setQuestion('')

    const userMessage: Message = {
      id: newId(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    }

    updateSession(activeSession.id, (session) => ({
      ...session,
      title: session.messages.length === 0 ? trimmed.slice(0, 64) : session.title,
      messages: [...session.messages, userMessage],
      updatedAt: new Date().toISOString(),
    }))

    try {
      const history = activeSession.messages.slice(-8).map((message) => ({
        role: message.role,
        content: message.content,
      }))

      const response = await fetch(`${API_BASE_URL}/api/v1/chat/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: trimmed, chat_history: history }),
      })

      if (response.status === 401 || response.status === 403) {
        logout()
        throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
      }

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.detail || 'API chat đang lỗi hoặc quá thời gian chờ.')
      }

      const data = await response.json()
      const assistantMessage: Message = {
        id: data.message_id || newId(),
        role: 'assistant',
        content: data.answer || '',
        sources: data.sources || [],
        related_documents: data.related_documents || [],
        createdAt: new Date().toISOString(),
      }

      updateSession(activeSession.id, (session) => ({
        ...session,
        messages: [...session.messages, assistantMessage],
        updatedAt: new Date().toISOString(),
      }))
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Không gửi được câu hỏi.')
    } finally {
      setIsSending(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendQuestion()
    }
  }

  async function sendFeedback(messageId: string, rating: 'up' | 'down') {
    await fetch(`${API_BASE_URL}/api/v1/messages/${messageId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rating, comment: null }),
    })

    updateSession(activeSession.id, (session) => ({
      ...session,
      messages: session.messages.map((message) =>
        message.id === messageId ? { ...message, feedback: rating } : message,
      ),
    }))
  }

  async function downloadSource(source: Source | RelatedDocument) {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/documents/${source.document_version_id}/download`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!response.ok) {
      setChatError('Không tải được tài liệu nguồn.')
      return
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download =
      source.source ||
      ('document_title' in source && source.document_title
        ? source.document_title
        : 'title' in source
          ? source.title
          : '') ||
      'tai-lieu.pdf'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  if (!token) {
    return (
      <Flex align="center" minH={embedded ? '100%' : '100vh'} px={4} py={8}>
        <Card maxW="md" mx="auto" w="full">
          <CardBody>
            <Stack as="form" onSubmit={login} spacing={4}>
              <Box>
                <Text color="brand.600" fontSize="sm" fontWeight="800" textTransform="uppercase">
                  AI Chatbot nội bộ
                </Text>
                <Heading size="lg">Đăng nhập</Heading>
              </Box>
              <FormControl>
                <FormLabel>Tài khoản</FormLabel>
                <Input value={username} onChange={(event) => setUsername(event.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Mật khẩu</FormLabel>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </FormControl>
              {authError ? (
                <Alert borderRadius="lg" status="error">
                  <AlertIcon />
                  {authError}
                </Alert>
              ) : null}
              <Button colorScheme="brand" type="submit" w="full">
                Đăng nhập
              </Button>
            </Stack>
          </CardBody>
        </Card>
      </Flex>
    )
  }

  return (
    <Flex bg="gray.50" direction={{ base: 'column', lg: 'row' }} h={embedded ? '100%' : '100vh'} overflow="hidden">
      <Box bg="white" borderBottomWidth={{ base: '1px', lg: 0 }} borderRightWidth={{ base: 0, lg: '1px' }} flexShrink={0} h={{ base: 'auto', lg: '100vh' }} overflowY={{ base: 'visible', lg: 'auto' }} p={4} w={{ base: 'full', lg: '320px' }}>
        <Stack spacing={4}>
          <Stack spacing={3}>
            <Text color="brand.700" fontSize="lg" fontWeight="900">AI Chatbot</Text>
            <HStack flexWrap="wrap">
              <Button as={Link} href="/admin/documents" size="sm" variant="outline">Tài liệu</Button>
              <Button as={Link} href="/admin/users" size="sm" variant="outline">Quản trị</Button>
              <Button size="sm" onClick={logout}>Đăng xuất</Button>
            </HStack>
          </Stack>
          <Button colorScheme="brand" onClick={startNewSession}>Hội thoại mới</Button>
          <Stack maxH={{ base: '220px', lg: 'none' }} overflowY="auto" spacing={2}>
            {sessions.map((session) => (
              <HStack
                bg={session.id === activeSessionId ? 'brand.50' : 'white'}
                borderColor={session.id === activeSessionId ? 'brand.200' : 'gray.200'}
                borderRadius="lg"
                borderWidth="1px"
                key={session.id}
                p={2}
              >
                <Button flex="1" h="auto" justifyContent="flex-start" py={2} variant="ghost" onClick={() => setActiveSessionId(session.id)}>
                  <Box minW={0} textAlign="left">
                    <Text fontWeight="800" noOfLines={1}>{session.title}</Text>
                    <Text color="gray.600" fontSize="xs">{session.messages.length} tin nhắn</Text>
                  </Box>
                </Button>
                <Menu>
                  <MenuButton as={Button} size="sm" variant="ghost">...</MenuButton>
                  <MenuList>
                    <MenuItem onClick={() => renameSession(session.id)}>Đổi tên</MenuItem>
                    <MenuItem color="red.600" onClick={() => deleteSession(session.id)}>Xóa</MenuItem>
                  </MenuList>
                </Menu>
              </HStack>
            ))}
          </Stack>
        </Stack>
      </Box>

      <Flex direction="column" flex="1" minH={0}>
        <Box bg="white" borderBottomWidth="1px" px={{ base: 4, md: 6 }} py={4}>
          <Text color="brand.600" fontSize="xs" fontWeight="800" textTransform="uppercase">
            Phiên bản 1.1.0
          </Text>
          <Heading noOfLines={1} size={{ base: 'md', md: 'lg' }}>{activeSession?.title || 'Hội thoại mới'}</Heading>
        </Box>

        <Stack flex="1" minH={0} overflowY="auto" px={{ base: 4, md: 6 }} py={5} spacing={5}>
          {activeSession?.messages.length ? (
            activeSession.messages.map((message) => (
              <Stack align={message.role === 'user' ? 'flex-end' : 'flex-start'} key={message.id} spacing={2}>
                <Box
                  bg={message.role === 'user' ? 'brand.600' : 'white'}
                  borderColor={message.role === 'user' ? 'brand.600' : 'gray.200'}
                  borderRadius="lg"
                  borderWidth="1px"
                  color={message.role === 'user' ? 'white' : 'gray.800'}
                  maxW={{ base: '100%', md: '78%' }}
                  p={4}
                >
                  <MarkdownText text={message.content} />
                  {message.role === 'assistant' ? (
                    <HStack flexWrap="wrap" mt={4}>
                      <Button size="xs" variant="outline" onClick={() => navigator.clipboard.writeText(message.content)}>Copy</Button>
                      <Button colorScheme={message.feedback === 'up' ? 'brand' : 'gray'} size="xs" variant={message.feedback === 'up' ? 'solid' : 'outline'} onClick={() => sendFeedback(message.id, 'up')}>
                        Hữu ích
                      </Button>
                      <Button colorScheme={message.feedback === 'down' ? 'red' : 'gray'} size="xs" variant={message.feedback === 'down' ? 'solid' : 'outline'} onClick={() => sendFeedback(message.id, 'down')}>
                        Không hữu ích
                      </Button>
                    </HStack>
                  ) : null}
                </Box>
                {message.sources?.length ? (
                  <SourceList heading="Nguồn tham khảo" items={compactSources(message.sources)} onDownload={downloadSource} />
                ) : null}
                {message.related_documents?.length ? (
                  <SourceList heading="Tài liệu liên quan" items={message.related_documents} onDownload={downloadSource} related />
                ) : null}
              </Stack>
            ))
          ) : (
            <Card>
              <CardBody>
                <Stack spacing={2} textAlign="center">
                  <Heading size="md">Đặt câu hỏi về tài liệu nội bộ</Heading>
                  <Text color="gray.600">Nhập câu hỏi bên dưới. Hệ thống sẽ trả lời theo ngữ cảnh và hiển thị nguồn.</Text>
                </Stack>
              </CardBody>
            </Card>
          )}
          {isSending ? (
            <HStack color="gray.600" justify="center">
              <Spinner size="sm" />
              <Text>Đang tìm tài liệu và sinh câu trả lời...</Text>
            </HStack>
          ) : null}
          <div ref={bottomRef} />
        </Stack>

        <Box bg="white" borderTopWidth="1px" px={{ base: 4, md: 6 }} py={4}>
          {chatError ? (
            <Alert borderRadius="lg" mb={3} status="error">
              <AlertIcon />
              {chatError}
            </Alert>
          ) : null}
          <Stack direction={{ base: 'column', md: 'row' }} spacing={3}>
            <Textarea
              minH="72px"
              placeholder="Nhập câu hỏi..."
              rows={2}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button alignSelf={{ base: 'stretch', md: 'flex-end' }} colorScheme="brand" isDisabled={isSending || !question.trim()} isLoading={isSending} minW={{ md: '96px' }} onClick={sendQuestion}>
              Gửi
            </Button>
          </Stack>
        </Box>
      </Flex>
    </Flex>
  )
}

function SourceList({
  heading,
  items,
  onDownload,
  related,
}: {
  heading: string
  items: Array<Source | RelatedDocument>
  onDownload: (source: Source | RelatedDocument) => void
  related?: boolean
}) {
  return (
    <Stack maxW={{ base: '100%', md: '78%' }} spacing={2}>
      <Text color="gray.600" fontSize="sm" fontWeight="800">{heading}</Text>
      {items.map((item) => (
        <Button
          h="auto"
          justifyContent="flex-start"
          key={item.document_version_id || item.document_id}
          px={3}
          py={2}
          textAlign="left"
          variant="outline"
          whiteSpace="normal"
          onClick={() => onDownload(item)}
        >
          <Box>
            <Text fontSize="sm" fontWeight="800">{('document_title' in item && item.document_title) || ('title' in item && item.title) || item.source || 'Nguồn tài liệu'}</Text>
            <Text color="gray.600" fontSize="xs">
              {formatCategoryLabel(item.import_category || item.type) || 'Tài liệu'} ·{' '}
              {related
                ? `${item.confidence_label || 'Có thể liên quan'} · ${typeof item.document_confidence_percent === 'number' ? `${item.document_confidence_percent}%` : formatScore(item.score)}`
                : `Score ${formatScore(item.score)}`}
            </Text>
          </Box>
        </Button>
      ))}
    </Stack>
  )
}
