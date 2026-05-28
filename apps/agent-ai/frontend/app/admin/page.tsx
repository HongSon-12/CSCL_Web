import { PortalLayout } from '../../components/layout/PortalLayout'
import { ModulePlaceholder } from '../../components/portal/ModulePlaceholder'

export default function AdminPage() {
  return (
    <PortalLayout title="Quản trị hệ thống">
      <ModulePlaceholder
        title="Quản trị và phân quyền"
        summary="Khu vực gom các màn hình quản trị hiện có và phần quyền cho module chất lượng."
        metrics={[
          { label: 'User admin', value: 'Sẵn có', tone: 'brand' },
          { label: 'Role matrix', value: 'Sẵn có', tone: 'gray' },
          { label: 'Quality RBAC', value: 'Phase sau', tone: 'yellow' },
        ]}
        items={[
          '/admin/users',
          '/admin/roles',
          '/admin/documents',
          'Phân quyền module quality',
        ]}
      />
    </PortalLayout>
  )
}
