'use client'

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { useAuth } from './AuthProvider'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, status } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const requestedNextPath = searchParams.get('next') || '/'
  const nextPath = requestedNextPath.startsWith('/') && !requestedNextPath.startsWith('//')
    ? requestedNextPath
    : '/'

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(nextPath)
    }
  }, [nextPath, router, status])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const result = await login(username, password)
    setIsSubmitting(false)

    if (!result.ok) {
      setError(result.message || 'Đăng nhập không thành công.')
      return
    }

    router.replace(nextPath)
  }

  if (status === 'loading') {
    return (
      <Flex align="center" bg="gray.50" justify="center" minH="100vh">
        <Spinner color="brand.600" />
      </Flex>
    )
  }

  return (
    <Flex align="center" bg="gray.50" minH="100vh" px={4} py={8}>
      <Card maxW="md" mx="auto" w="full">
        <CardBody>
          <Stack as="form" onSubmit={handleSubmit} spacing={4}>
            <Box>
              <Text color="brand.600" fontSize="sm" fontWeight="800" textTransform="uppercase">
                Trung tâm Cấp cứu 115
              </Text>
              <Heading size="lg">Đăng nhập QLCL Web</Heading>
              <Text color="gray.600" mt={1}>
                Dùng tài khoản nội bộ để vào portal quản lý chất lượng.
              </Text>
            </Box>

            <FormControl isRequired>
              <FormLabel>Tài khoản</FormLabel>
              <Input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Mật khẩu</FormLabel>
              <Input
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </FormControl>

            {error ? (
              <Alert borderRadius="lg" status="error">
                <AlertIcon />
                {error}
              </Alert>
            ) : null}

            <Button colorScheme="brand" isLoading={isSubmitting} type="submit" w="full">
              Đăng nhập
            </Button>
          </Stack>
        </CardBody>
      </Card>
    </Flex>
  )
}
