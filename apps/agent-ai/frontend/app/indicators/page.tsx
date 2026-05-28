import { PortalLayout } from '../../components/layout/PortalLayout'
import { ModulePlaceholder } from '../../components/portal/ModulePlaceholder'

export default function IndicatorsPage() {
  return (
    <PortalLayout title="Danh mục chỉ số">
      <ModulePlaceholder
        title="Catalog CS1-CS53"
        summary="Khu vực quản lý định nghĩa chỉ số, biến tính toán và kết quả theo kỳ báo cáo."
        metrics={[
          { label: 'Chỉ số mục tiêu', value: '53', tone: 'brand' },
          { label: 'Biến nền', value: 'A/B/C/D/E', tone: 'gray' },
          { label: 'Schema', value: 'quality_*', tone: 'yellow' },
        ]}
        items={[
          'Danh mục indicator catalog',
          'Danh mục biến tính toán',
          'Kết quả chỉ số theo ngày/tháng',
          'Log đối chiếu với Power BI',
        ]}
      />
    </PortalLayout>
  )
}
