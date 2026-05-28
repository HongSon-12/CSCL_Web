import { PortalLayout } from '../../../components/layout/PortalLayout'
import { ModulePlaceholder } from '../../../components/portal/ModulePlaceholder'

export default function ReportsImportPage() {
  return (
    <PortalLayout requiredPermissions="reports:import:view" title="Import Excel">
      <ModulePlaceholder
        title="Excel import preview validate"
        summary="Placeholder cho upload, parse, preview và validate file nội bộ ở Phase 4."
        metrics={[
          { label: 'Lưu trữ', value: 'Private', tone: 'brand' },
          { label: 'Phase triển khai', value: '4', tone: 'yellow' },
          { label: 'Preview', value: 'Bắt buộc', tone: 'gray' },
        ]}
        items={[
          'Upload Excel/CSV vào private storage',
          'Parse raw rows',
          'Preview dòng hợp lệ và dòng lỗi',
          'Confirm hoặc cancel import theo quyền',
        ]}
      />
    </PortalLayout>
  )
}
