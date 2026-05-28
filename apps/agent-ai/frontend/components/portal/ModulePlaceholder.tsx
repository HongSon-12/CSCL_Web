import { Badge, Box, Card, CardBody, Grid, Heading, Stack, Text } from '@chakra-ui/react'

type Metric = {
  label: string
  value: string
  tone?: 'green' | 'yellow' | 'gray' | 'brand'
}

export function ModulePlaceholder({
  title,
  summary,
  metrics,
  items,
}: {
  title: string
  summary: string
  metrics: Metric[]
  items: string[]
}) {
  return (
    <Stack spacing={5}>
      <Box>
        <Heading size={{ base: 'md', md: 'lg' }}>{title}</Heading>
        <Text color="gray.600" mt={1}>
          {summary}
        </Text>
      </Box>

      <Grid gap={4} templateColumns={{ base: '1fr', md: 'repeat(3, minmax(0, 1fr))' }}>
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardBody>
              <Stack spacing={2}>
                <Text color="gray.600" fontSize="sm" fontWeight="800">
                  {metric.label}
                </Text>
                <Heading size="lg">{metric.value}</Heading>
                <Badge alignSelf="flex-start" colorScheme={metric.tone === 'brand' ? 'green' : metric.tone || 'gray'}>
                  Phase 1
                </Badge>
              </Stack>
            </CardBody>
          </Card>
        ))}
      </Grid>

      <Card>
        <CardBody>
          <Stack spacing={3}>
            <Text fontWeight="900">Phạm vi đã mở</Text>
            <Grid gap={3} templateColumns={{ base: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }}>
              {items.map((item) => (
                <Box bg="gray.50" borderRadius="md" borderWidth="1px" key={item} px={4} py={3}>
                  <Text color="gray.700" fontWeight="700">
                    {item}
                  </Text>
                </Box>
              ))}
            </Grid>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  )
}
