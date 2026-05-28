import { PortalLayout } from '../../../components/layout/PortalLayout'
import { ModulePlaceholder } from '../../../components/portal/ModulePlaceholder'

export default function ReportsInputPage() {
  return (
    <PortalLayout requiredPermissions="reports:input:view" title="Nhập liệu báo cáo">
      <ModulePlaceholder
        title="Manual web input MVP"
        summary="Placeholder cho form nhập liệu thủ công trước khi triển khai Phase 3."
        metrics={[
          { label: 'Trạng thái', value: 'Planned', tone: 'yellow' },
          { label: 'Phase triển khai', value: '3', tone: 'brand' },
          { label: 'Audit', value: 'Bắt buộc', tone: 'gray' },
        ]}
        items={[
          'Tạo input batch nháp',
          'Thêm/sửa/xóa dòng nháp theo quyền',
          'Submit batch để duyệt',
          'Ghi audit log cho thao tác dữ liệu',
        ]}
      />
    </PortalLayout>
  )
}
