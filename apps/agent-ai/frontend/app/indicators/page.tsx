'use client'

import {
  Badge,
  Box,
  Card,
  CardBody,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Text,
  Tooltip,
  useToast,
  VStack,
  Divider,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import {
  FiActivity,
  FiAward,
  FiBookOpen,
  FiCheckCircle,
  FiDatabase,
  FiFileText,
  FiHelpCircle,
  FiInfo,
  FiLayout,
  FiList,
  FiTrendingUp,
} from 'react-icons/fi'
import { useAuth } from '../../components/auth/AuthProvider'
import { PortalLayout } from '../../components/layout/PortalLayout'

// Định nghĩa kiểu dữ liệu chỉ số
type Indicator = {
  code: string
  name: string
  group_code: string
  formula_python_key: string
  frequency: string
  source_type: string
  owner_department_code: string
}

// Bảng gợi ý công thức và logic tính toán chi tiết bằng Tiếng Việt
const FORMULA_EXPLANATIONS: Record<string, { formula: string; logic: string }> = {
  // Operational (CS1 - CS10)
  CS1: {
    formula: "A1 (Tổng số cuộc gọi)",
    logic: "Tổng hợp toàn bộ các cuộc gọi đến Tổng đài Điều hành trong ngày báo cáo."
  },
  CS2: {
    formula: "(A2 / A1) * 100",
    logic: "Tỷ lệ tiếp nhận cuộc gọi = (Tổng số cuộc gọi được tiếp nhận A2 / Tổng số cuộc gọi A1) * 100."
  },
  CS3: {
    formula: "(A3 / A2) * 100",
    logic: "Tỷ lệ cuộc gọi có nội dung = (Tổng cuộc gọi ghi nhận nội dung y tế A3 / Tổng cuộc gọi tiếp nhận A2) * 100."
  },
  CS4: {
    formula: "(A5 / A3) * 100",
    logic: "Tỷ lệ cuộc gọi có dấu hiệu cấp cứu = (Tổng cuộc gọi có dấu hiệu cấp cứu rõ rệt A5 / Tổng cuộc gọi có nội dung A3) * 100."
  },
  CS5: {
    formula: "(A7 / A6) * 100",
    logic: "Tỷ lệ cấp cứu điều phối trạm vệ tinh = (Số ca trạm vệ tinh nhận điều phối A7 / Tổng ca điều phối A6) * 100."
  },
  CS6: {
    formula: "B1 (Tổng số ca vận chuyển)",
    logic: "Tổng số chuyến xe vận chuyển thực tế ghi nhận thành công có bệnh nhân."
  },
  CS7: {
    formula: "(B2 / B1) * 100",
    logic: "Tỷ lệ vận chuyển có bệnh nhân cấp cứu = (Tổng số ca cấp cứu B2 / Tổng số ca vận chuyển B1) * 100."
  },
  CS8: {
    formula: "(B3 / B1) * 100",
    logic: "Tỷ lệ vận chuyển có can thiệp nâng cao = (Tổng số ca can thiệp thủ thuật nâng cao B3 / Tổng số ca vận chuyển B1) * 100."
  },
  CS9: {
    formula: "(B4 / B1) * 100",
    logic: "Tỷ lệ vận chuyển chuyển tuyến = (Tổng số ca chuyển tuyến viện B4 / Tổng số ca vận chuyển B1) * 100."
  },
  CS10: {
    formula: "(B5 / B4) * 100",
    logic: "Tỷ lệ vận chuyển phản hồi trễ = (Tổng số chuyến xe phản hồi chậm trễ B5 / Tổng số ca chuyển tuyến B4) * 100."
  },

  // Clinical (CS11 - CS26)
  CS11: {
    formula: "AVERAGE(Tgtaophieu)",
    logic: "Trung bình thời gian tiếp nhận và tạo phiếu tiếp nhận cấp cứu ngoài bệnh viện (phút)."
  },
  CS12: {
    formula: "AVERAGE(TgngheDT)",
    logic: "Trung bình thời gian đàm thoại cuộc gọi cấp cứu (phút)."
  },
  CS13: {
    formula: "(SUM(TgngheDT) / 2) / 6",
    logic: "Tổng số giờ đàm thoại điều phối tổng đài cấp cứu."
  },
  CS14: {
    formula: "AVERAGE(ThoiLuongToiHienTruong)",
    logic: "Trung bình thời gian di chuyển từ lúc xuất xe đến hiện trường cấp cứu (phút)."
  },
  CS15: {
    formula: "(B1_BB / A7_BB) * 100",
    logic: "Tỷ lệ xuất xe = (Số chuyến xe xuất bến B1_BB / Số ca yêu cầu điều phối A7_BB) * 100."
  },
  CS16: {
    formula: "DIVIDE(2B, 3B, 0) (tối đa 100%)",
    logic: "Tỷ lệ chuyến xe có bệnh nhân = (Số ca có bệnh nhân thực tế 2B / Số ca xe xuất bến 3B) * 100."
  },
  CS17: {
    formula: "(4B / 2B) * 100",
    logic: "Tỷ lệ trường hợp chuyển viện = (Số ca bàn giao tại bệnh viện nhan 4B / Số ca có bệnh nhân 2B) * 100."
  },
  CS18: {
    formula: "(6B / 7B) * 100",
    logic: "Tỷ lệ hồi sinh tim phổi (CPR) thành công = (Số ca ngưng tuần hoàn hồi sinh có tim đập lại 6B / Tổng số ca ngưng tuần hoàn có xử trí CPR 7B) * 100."
  },
  CS19: {
    formula: "8B + 9B",
    logic: "Tổng số trường hợp bệnh nhân tử vong (trước khi đến hoặc lập biên bản tại chỗ)."
  },
  CS20: {
    formula: "(B10 / 1B) * 100",
    logic: "Tỷ lệ trường hợp có dấu hiệu cấp cứu ngoại viện rõ rệt."
  },
  CS21: {
    formula: "(B11 / 2B) * 100",
    logic: "Tỷ lệ trường hợp có can thiệp y tế = (Số ca được xử lý thủ thuật y khoa B11 / Số ca có bệnh nhân 2B) * 100."
  },
  CS22: {
    formula: "AVERAGE(ThoiLuongXuatXe)",
    logic: "Trung bình thời gian kích hoạt cấp cứu tính từ lúc nhận lệnh đến lúc bánh xe lăn (phút)."
  },
  CS23: {
    formula: "AVERAGE(ThoiLuongToiHienTruong)",
    logic: "Trung bình thời gian tiếp cận bệnh nhân từ lúc xuất xe tới hiện trường (phút)."
  },
  CS24: {
    formula: "AVERAGE(chi_so[cs24])",
    logic: "Trung bình thời gian xử trí cấp cứu tại hiện trường (phút)."
  },
  CS25: {
    formula: "AVERAGE(ThoiLuongDenBenhVien)",
    logic: "Trung bình thời lượng vận chuyển bệnh nhân từ hiện trường đến bệnh viện nhận (phút)."
  },
  CS26: {
    formula: "AVERAGE(ThoiLuongGiaoBenh)",
    logic: "Trung bình thời gian bàn giao bệnh nhân cho khoa Cấp cứu của bệnh viện nhận (phút)."
  },

  // Manual Room (CS27 - CS53)
  CS28: {
    formula: "AVERAGE(cs28)",
    logic: "Tỷ lệ thiết bị y tế quan trọng được bảo trì định kỳ đúng quy chuẩn (%)"
  },
  CS29: {
    formula: "AVERAGE(cs29)",
    logic: "Tỷ lệ thiết bị y tế hoàn tất kiểm định chất lượng nghiêm ngặt (%)"
  },
  CS30: {
    formula: "AVERAGE(cs30) / 100",
    logic: "Tỷ lệ cung ứng đủ số lượng vật tư y tế thiết yếu (%)"
  },
  CS31: {
    formula: "AVERAGE(cs31)",
    logic: "Tỷ lệ sự cố tai nạn thương tích do vật sắc nhọn gây ra (%)"
  },
  CS32: {
    formula: "AVERAGE(cs32) / 100",
    logic: "Tỷ lệ tuân thủ quy trình vệ sinh tay ngoại khoa (%)"
  },
  CS33: {
    formula: "AVERAGE(cs33) / 100",
    logic: "Tỷ lệ sự hài lòng chung của người bệnh về dịch vụ của Trung tâm (%)"
  },
  CS34: {
    formula: "cs34",
    logic: "Điểm đánh giá cải cách thủ tục hành chính cấp Trung tâm."
  },
  CS35: {
    formula: "AVERAGE(cs35) / 100",
    logic: "Điểm tiêu chí cơ sở xanh - sạch - đẹp đạt chuẩn (%)"
  },
  CS36: {
    formula: "AVERAGE(cs36) / 100",
    logic: "Tỷ lệ sự cố y khoa nghiêm trọng ngoài mong muốn (%)"
  },
  CS37: {
    formula: "AVERAGE(cs37) / 100",
    logic: "Tỷ lệ xe cứu thương hoạt động kết nối hệ thống định vị GPS (%)"
  },
  CS38: {
    formula: "AVERAGE(cs38) / 100",
    logic: "Hiệu suất sử dụng xe cứu thương cấp cứu thực tế (%)"
  },
  CS39: {
    formula: "AVERAGE(cs39) / 100",
    logic: "Tỷ lệ nhân viên được tuyển dụng thành công theo đề án (%)"
  },
  CS40: {
    formula: "SUM(cs40)",
    logic: "Tổng số sự cố y khoa bắt buộc báo cáo toàn Trung tâm."
  },
  CS41: {
    formula: "AVERAGE(cs41) / 100",
    logic: "Tỷ lệ người dân hài lòng về thái độ phục vụ cấp cứu 115 (%)"
  },
  CS42: {
    formula: "AVERAGE(cs42)",
    logic: "Điểm số chất lượng trung bình của Trung tâm Cấp cứu."
  },
  CS43: {
    formula: "AVERAGE(cs43)",
    logic: "Điểm số chất lượng trung bình của các Trạm vệ tinh."
  },
  CS44: {
    formula: "SUM(cs44)",
    logic: "Tổng số lượng Trạm vệ tinh Cấp cứu 115 đang vận hành."
  },
  CS45: {
    formula: "AVERAGE(cs45) / 100",
    logic: "Tỷ lệ Trạm vệ tinh kết nối thông suốt với trung tâm điều hành (%)"
  },
  CS46: {
    formula: "AVERAGE(cs46) / 100",
    logic: "Tỷ lệ nhân viên y tế được đào tạo cập nhật liên tục (%)"
  },
  CS47: {
    formula: "SUM(cs47)",
    logic: "Số lượng sự kiện chính trị - xã hội được phục vụ y tế thành công."
  },
  CS48: {
    formula: "SUM(cs48)",
    logic: "Số lượng cơ sở y tế được hỗ trợ chuyên môn cấp cứu 115."
  },
  CS49: {
    formula: "SUM(cs49)",
    logic: "Số lượng lớp tập huấn y khoa liên tục được tổ chức cho NVYT."
  },
  CS50: {
    formula: "SUM(cs50)",
    logic: "Số lượng lớp đào tạo sơ cấp cứu cơ bản được tổ chức cho cộng đồng."
  },
  CS51: {
    formula: "AVERAGEX(ListTVT, cs51...)",
    logic: "Tổng số biên lai thanh toán thu được trung bình mỗi phiên trực của các Trạm vệ tinh."
  },
  CS52: {
    formula: "AVERAGEX(ListTVT, cs52...)",
    logic: "Trung bình số tiền thu được trên mỗi biên lai cấp cứu (VNĐ)."
  },
  CS53: {
    formula: "AVERAGEX(ListTVT, cs53...)",
    logic: "Số tiền thu được trung bình mỗi phiên trực cấp cứu (VNĐ)."
  }
}

export default function IndicatorsPage() {
  const toast = useToast()
  const { token } = useAuth()
  
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('ALL')

  useEffect(() => {
    async function fetchIndicators() {
      if (!token) return
      setLoading(true)
      try {
        const res = await fetch('/api/v1/quality/indicators/catalog', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setIndicators(data.data || [])
        } else {
          throw new Error('Lỗi fetch catalog')
        }
      } catch {
        toast({
          title: 'Lỗi tải dữ liệu',
          description: 'Không thể kết nối lấy danh mục chỉ số chất lượng.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        })
      } finally {
        setLoading(false)
      }
    }
    
    void fetchIndicators()
  }, [token, toast])

  // Lọc chỉ số dựa trên tìm kiếm và phòng ban
  const filterList = (list: Indicator[]) => {
    return list.filter((ind) => {
      const matchSearch =
        ind.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ind.name.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchDept = selectedDept === 'ALL' || ind.owner_department_code === selectedDept
      
      return matchSearch && matchDept
    })
  }

  // Chia nhóm chỉ số
  const operationalIndicators = indicators.filter((i) => {
    const num = parseInt(i.code.replace('CS', ''), 10)
    return num <= 10
  })

  const clinicalIndicators = indicators.filter((i) => {
    const num = parseInt(i.code.replace('CS', ''), 10)
    return num >= 11 && num <= 26
  })

  const manualRoomIndicators = indicators.filter((i) => {
    const num = parseInt(i.code.replace('CS', ''), 10)
    return num >= 27
  })

  const renderIndicatorGrid = (list: Indicator[]) => {
    const filtered = filterList(list)

    if (filtered.length === 0) {
      return (
        <Flex py={16} align="center" justify="center" direction="column" gap={3}>
          <Icon as={FiInfo} w={8} h={8} color="gray.300" />
          <Text color="gray.500" fontSize="sm">Không tìm thấy chỉ số chất lượng phù hợp với bộ lọc.</Text>
        </Flex>
      )
    }

    return (
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {filtered.map((ind) => {
          const explanation = FORMULA_EXPLANATIONS[ind.code] || {
            formula: "AVERAGE(chi_so[" + ind.formula_python_key + "])",
            logic: "Chỉ số khoa phòng tự khai báo và tổng hợp."
          }

          return (
            <Tooltip
              key={ind.code}
              label={
                <VStack align="stretch" spacing={1.5} py={1} px={2} maxW="300px">
                  <Text fontWeight="bold" color="yellow.300" fontSize="xs">
                    Công thức: {explanation.formula}
                  </Text>
                  <Text fontSize="11px" color="white" lineHeight="tall">
                    Giải nghĩa: {explanation.logic}
                  </Text>
                </VStack>
              }
              placement="top-start"
              hasArrow
              borderRadius="xl"
              bg="gray.850"
              boxShadow="xl"
              px={4}
              py={3.5}
            >
              <Card
                borderRadius="2xl"
                border="1px"
                borderColor="gray.100"
                boxShadow="sm"
                _hover={{
                  borderColor: 'brand.200',
                  boxShadow: 'md',
                  transform: 'translateY(-2px)',
                }}
                transition="all 0.25s cubic-bezier(.08,.52,.52,1)"
                cursor="pointer"
              >
                <CardBody p={5}>
                  <Flex justify="space-between" align="start">
                    <VStack align="stretch" spacing={2.5} flex={1}>
                      <HStack spacing={2}>
                        <Badge
                          colorScheme="brand"
                          variant="solid"
                          fontSize="xs"
                          borderRadius="md"
                          px={2}
                          py={0.5}
                        >
                          {ind.code}
                        </Badge>
                        <Badge colorScheme={ind.source_type === 'calculated' ? 'green' : 'orange'} variant="subtle" borderRadius="md" px={2} fontSize="10px">
                          {ind.source_type === 'calculated' ? 'Tự động' : 'Nhập tay'}
                        </Badge>
                      </HStack>
                      <Heading size="xs" color="gray.700" noOfLines={2} lineHeight="base" fontWeight="semibold">
                        {ind.name}
                      </Heading>
                      <Divider />
                      <HStack justify="space-between" fontSize="11px" color="gray.500" pt={1}>
                        <HStack spacing={1}>
                          <Icon as={FiDatabase} />
                          <Text>{ind.owner_department_code}</Text>
                        </HStack>
                        <HStack spacing={1}>
                          <Icon as={FiActivity} />
                          <Text>Hàng ngày</Text>
                        </HStack>
                      </HStack>
                    </VStack>
                  </Flex>
                </CardBody>
              </Card>
            </Tooltip>
          )
        })}
      </SimpleGrid>
    )
  }

  return (
    <PortalLayout requiredPermissions="indicators:view" title="Danh mục 53 Chỉ số chất lượng (CS1-CS53)">
      <VStack spacing={6} align="stretch" w="full">
        {/* ==========================================
            BỘ LỌC TÌM KIẾM
            ========================================== */}
        <Card borderRadius="2xl" border="1px" borderColor="gray.100" boxShadow="sm">
          <CardBody p={4}>
            <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
              <Input
                placeholder="Tìm tên hoặc mã chỉ số (ví dụ: CS11, tử vong)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                borderRadius="xl"
                size="md"
              />
              <Select
                maxW={{ base: 'full', md: '250px' }}
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                borderRadius="xl"
              >
                <option value="ALL">Tất cả khoa phòng</option>
                <option value="KDH">Điều hành (KDH)</option>
                <option value="KCCNBV">Cấp cứu ngoài viện (KCCNBV)</option>
                <option value="QLCL">Quản lý chất lượng (QLCL)</option>
              </Select>
            </Flex>
          </CardBody>
        </Card>

        {loading ? (
          <Flex py={24} align="center" justify="center" direction="column" gap={4}>
            <Spinner size="lg" color="brand.500" />
            <Text color="gray.500">Đang tải danh mục 53 chỉ số chất lượng...</Text>
          </Flex>
        ) : (
          <Box w="full">
            <Tabs variant="enclosed" colorScheme="brand">
              <TabList borderBottom="1px" borderColor="gray.100" gap={1}>
                <Tab borderRadius="xl" fontWeight="semibold" fontSize="sm" py={2.5}>
                  <HStack spacing={2}>
                    <Icon as={FiTrendingUp} />
                    <Text>Chỉ số Điều hành (CS1 - CS10)</Text>
                    <Badge borderRadius="full" px={1.5} bg="gray.100">{operationalIndicators.length}</Badge>
                  </HStack>
                </Tab>
                <Tab borderRadius="xl" fontWeight="semibold" fontSize="sm" py={2.5}>
                  <HStack spacing={2}>
                    <Icon as={FiAward} />
                    <Text>Chỉ số Lâm sàng (CS11 - CS26)</Text>
                    <Badge borderRadius="full" px={1.5} bg="gray.100">{clinicalIndicators.length}</Badge>
                  </HStack>
                </Tab>
                <Tab borderRadius="xl" fontWeight="semibold" fontSize="sm" py={2.5}>
                  <HStack spacing={2}>
                    <Icon as={FiBookOpen} />
                    <Text>Chỉ số Khoa phòng (CS27 - CS53)</Text>
                    <Badge borderRadius="full" px={1.5} bg="gray.100">{manualRoomIndicators.length}</Badge>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels pt={6}>
                <TabPanel p={0}>
                  {renderIndicatorGrid(operationalIndicators)}
                </TabPanel>
                <TabPanel p={0}>
                  {renderIndicatorGrid(clinicalIndicators)}
                </TabPanel>
                <TabPanel p={0}>
                  {renderIndicatorGrid(manualRoomIndicators)}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        )}
      </VStack>
    </PortalLayout>
  )
}
