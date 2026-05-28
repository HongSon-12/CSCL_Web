import { PortalLayout } from '../../components/layout/PortalLayout'
import { ModulePlaceholder } from '../../components/portal/ModulePlaceholder'

export default function DashboardPage() {
  return (
    <PortalLayout title="Dashboard chỉ số">
      <ModulePlaceholder
        title="Dashboard vận hành"
        summary="Khung route cho các dashboard BGD, KĐH, KCCNBV và chất lượng tổng hợp."
        metrics={[
          { label: 'Nhóm dashboard', value: '4', tone: 'brand' },
          { label: 'Nguồn dữ liệu', value: 'PostgreSQL', tone: 'gray' },
          { label: 'Trạng thái', value: 'Shell', tone: 'yellow' },
        ]}
        items={[
          '/dashboard/bgd',
          '/dashboard/kdh',
          '/dashboard/kccnbv',
          '/dashboard/quality',
        ]}
      />
    </PortalLayout>
  )
}
