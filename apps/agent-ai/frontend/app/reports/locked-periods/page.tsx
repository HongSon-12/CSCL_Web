import { PortalLayout } from '../../../components/layout/PortalLayout'
import { ModulePlaceholder } from '../../../components/portal/ModulePlaceholder'

export default function LockedPeriodsPage() {
  return (
    <PortalLayout requiredPermissions="reports:period_lock:view" title="Khóa kỳ báo cáo">
      <ModulePlaceholder
        title="Period lock"
        summary="Placeholder cho quản lý kỳ đã khóa và guard chống sửa dữ liệu sau khóa ở Phase 5."
        metrics={[
          { label: 'Guard', value: 'Bắt buộc', tone: 'brand' },
          { label: 'Phase triển khai', value: '5', tone: 'yellow' },
          { label: 'Audit', value: 'Bắt buộc', tone: 'gray' },
        ]}
        items={[
          'Danh sách kỳ báo cáo',
          'Khóa và mở khóa theo quyền',
          'Chặn sửa dữ liệu kỳ đã khóa',
          'Ghi audit log cho thao tác khóa kỳ',
        ]}
      />
    </PortalLayout>
  )
}
