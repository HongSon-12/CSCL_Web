import { PortalLayout } from '../../components/layout/PortalLayout'
import { ModulePlaceholder } from '../../components/portal/ModulePlaceholder'

export default function EtlPage() {
  return (
    <PortalLayout title="ETL và calculation engine">
      <ModulePlaceholder
        title="Theo dõi xử lý dữ liệu"
        summary="Khu vực dành cho job ETL, chuẩn hóa dữ liệu nguồn và tính chỉ số chất lượng."
        metrics={[
          { label: 'Engine', value: 'Python', tone: 'brand' },
          { label: 'Worker', value: 'Tách sau', tone: 'gray' },
          { label: 'Trạng thái', value: 'Planned', tone: 'yellow' },
        ]}
        items={[
          'ETL callcenterdata',
          'ETL KCCNBV',
          'Calculation CS1-CS23 MVP',
          'Audit và data quality log',
        ]}
      />
    </PortalLayout>
  )
}
