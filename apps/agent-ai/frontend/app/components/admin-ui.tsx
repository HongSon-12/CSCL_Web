'use client'

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Heading,
  HStack,
  Stack,
  Text,
} from '@chakra-ui/react'
import Link from 'next/link'
import type { ReactNode } from 'react'

type NavItem = {
  href: string
  label: string
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <Box minH="100vh" px={{ base: 4, md: 6 }} py={{ base: 5, md: 6 }}>
      {children}
    </Box>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  navItems = [],
}: {
  eyebrow?: string
  title: string
  description?: string
  navItems?: NavItem[]
}) {
  return (
    <Flex align={{ base: 'stretch', md: 'flex-start' }} direction={{ base: 'column', md: 'row' }} gap={4} justify="space-between" mb={5}>
      <Box>
        {eyebrow ? (
          <Text color="brand.600" fontSize="xs" fontWeight="800" textTransform="uppercase">
            {eyebrow}
          </Text>
        ) : null}
        <Heading size={{ base: 'lg', md: 'xl' }}>{title}</Heading>
        {description ? (
          <Text color="gray.600" mt={1}>
            {description}
          </Text>
        ) : null}
      </Box>
      {navItems.length ? (
        <HStack align="stretch" flexWrap="wrap" spacing={2}>
          {navItems.map((item) => (
            <Button as={Link} href={item.href} key={item.href} size="sm" variant="outline">
              {item.label}
            </Button>
          ))}
        </HStack>
      ) : null}
    </Flex>
  )
}

export function StatusAlert({ message, status }: { message: string; status: 'error' | 'success' | 'info' | 'warning' }) {
  if (!message) return null
  return (
    <Alert borderRadius="lg" mb={4} status={status} variant="subtle">
      <AlertIcon />
      {message}
    </Alert>
  )
}

export function LoginNotice({ title }: { title: string }) {
  return (
    <PageShell>
      <Card maxW="xl" mx="auto" mt={{ base: 8, md: 20 }}>
        <CardBody>
          <Stack spacing={4}>
            <Heading size="lg">{title}</Heading>
            <Text color="gray.600">Vui lòng đăng nhập trước khi mở trang quản trị.</Text>
            <Button as={Link} colorScheme="brand" href="/login" w={{ base: 'full', sm: 'fit-content' }}>
              Đến trang đăng nhập
            </Button>
          </Stack>
        </CardBody>
      </Card>
    </PageShell>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Box borderColor="gray.200" borderRadius="lg" borderWidth="1px" color="gray.600" p={6} textAlign="center">
      {children}
    </Box>
  )
}
