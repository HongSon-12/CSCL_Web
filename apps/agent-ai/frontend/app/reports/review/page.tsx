import { PortalLayout } from '../../../components/layout/PortalLayout'
import { ModulePlaceholder } from '../../../components/portal/ModulePlaceholder'

export default function ReportsReviewPage() {
  return (
    <PortalLayout requiredPermissions="reports:review:view" title="Duyệt báo cáo">
      <ModulePlaceholder
        title="Review approval workflow"
        summary="Placeholder cho danh sách batch chờ duyệt, approve và reject ở Phase 5."
        metrics={[
          { label: 'Trạng thái', value: 'Pending', tone: 'yellow' },
          { label: 'Phase triển khai', value: '5', tone: 'brand' },
          { label: 'Scope', value: 'Theo đơn vị', tone: 'gray' },
        ]}
        items={[
          'Hiển thị batch chờ duyệt',
          'Approve hoặc reject theo permission/scope',
          'Ghi audit log',
          'Chặn sửa dữ liệu đã duyệt hoặc đã khóa',
        ]}
      />
    </PortalLayout>
  )
}
