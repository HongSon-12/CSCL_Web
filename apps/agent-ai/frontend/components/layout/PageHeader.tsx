import { Badge, Box, Heading, HStack, Text } from '@chakra-ui/react'

export function PageHeader({
  eyebrow = 'CSCL Web',
  phaseLabel = 'Phase 1',
  title,
}: {
  eyebrow?: string
  phaseLabel?: string
  title: string
}) {
  return (
    <Box minW={0}>
      <HStack spacing={2}>
        <Text color="brand.600" fontSize="xs" fontWeight="900" textTransform="uppercase">
          {eyebrow}
        </Text>
        <Badge colorScheme="green" variant="subtle">
          {phaseLabel}
        </Badge>
      </HStack>
      <Heading noOfLines={1} size={{ base: 'md', md: 'lg' }}>
        {title}
      </Heading>
    </Box>
  )
}
