import { PortalLayout } from '../../components/layout/PortalLayout'
import { ModulePlaceholder } from '../../components/portal/ModulePlaceholder'

export default function ReportsPage() {
  return (
    <PortalLayout title="Báo cáo và nhập liệu">
      <ModulePlaceholder
        title="Quy trình báo cáo"
        summary="Khu vực nhập liệu thủ công, import Excel, duyệt kỳ và xuất báo cáo tổng hợp."
        metrics={[
          { label: 'Luồng dữ liệu', value: 'Import', tone: 'brand' },
          { label: 'Kiểm tra', value: 'Validate', tone: 'gray' },
          { label: 'Đầu ra', value: 'Excel', tone: 'yellow' },
        ]}
        items={[
          'Form nhập báo cáo',
          'Import và preview dữ liệu',
          'Duyệt/khóa kỳ báo cáo',
          'Xuất báo cáo tổng hợp',
        ]}
      />
    </PortalLayout>
  )
}
