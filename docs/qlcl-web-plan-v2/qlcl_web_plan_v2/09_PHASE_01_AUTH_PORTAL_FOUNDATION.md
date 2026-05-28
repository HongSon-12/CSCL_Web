# 09 - Phase 1: Auth, Login & Portal Foundation

## 1. Mục tiêu

Tạo nền đăng nhập và portal shell cho QLCL Web. Đây là phase bắt buộc trước khi làm nhập liệu, dashboard và admin.

---

## 2. Đầu ra chính

```text
/login
/
Protected routes
PortalLayout
Sidebar
Topbar
Auth provider/client
/api/v1/auth/login hoặc dùng auth hiện có
/api/v1/auth/me
Permission-aware menu cơ bản
```

---

## 3. Không làm trong phase này

- Không làm database nghiệp vụ QLCL đầy đủ.
- Không làm upload Excel.
- Không làm review/lock.
- Không làm calculation.
- Không tích hợp Agent-AI.
- Không làm admin role UI đầy đủ nếu RBAC chưa có schema.

---

## 4. Batch 1A - Login/Auth baseline

### Backend

Nếu repo đã có auth:

- Chuẩn hóa endpoint `/api/v1/auth/me` trả user, roles, permissions, scopes.
- Đảm bảo lỗi 401 khi chưa đăng nhập.

Nếu chưa có auth:

- Tạo auth tối thiểu theo cơ chế phù hợp repo.
- Không hard-code password trong repo.
- User admin đầu tiên đọc từ env hoặc seed an toàn.

### Frontend

- Tạo `/login`.
- Tạo auth client/provider.
- Tạo hook `useCurrentUser()` hoặc tương đương.
- Tạo logout.

### Acceptance

- Login thành công vào `/`.
- Login sai báo lỗi.
- `/api/v1/auth/me` trả user hiện tại.
- Chưa login vào route protected bị redirect/chặn.

---

## 5. Batch 1B - Portal shell

### Tạo component

```text
components/layout/PortalLayout.tsx
components/layout/Sidebar.tsx
components/layout/Topbar.tsx
components/layout/PageHeader.tsx
components/layout/PermissionGate.tsx
```

### Routes placeholder

```text
/
/dashboard
/indicators
/reports
/reports/input
/reports/import
/reports/review
/reports/locked-periods
/etl
/admin
```

### Acceptance

- `/` có portal home.
- Sidebar hiển thị menu theo permission giả lập hoặc permissions từ `/me`.
- Topbar hiển thị user.
- Layout không tràn màn hình.

---

## 6. Batch 1C - Route guard & permission UI

### Việc làm

- Tạo route guard.
- Tạo `PermissionGate`.
- Ẩn menu nếu thiếu permission.
- Tạo trang 403 hoặc component “Không có quyền”.

### Permission tối thiểu Phase 1

```text
portal:view
dashboard:view
reports:input:view
reports:import:view
reports:review:view
reports:period_lock:view
etl:view
indicators:view
admin:view
ai_agent:use    # seed later, menu có thể ẩn mặc định
```

### Acceptance

- User thiếu `admin:view` không thấy menu Admin.
- User vào route không có quyền thấy 403.
- User logout xong không vào được route nội bộ.

---

## 7. Checklist nghiệm thu Phase 1

```text
[ ] Có /login
[ ] Có login/logout flow
[ ] Có /api/v1/auth/me hoặc equivalent
[ ] Có PortalLayout
[ ] Có Sidebar/Topbar
[ ] Có route placeholders
[ ] Có route guard
[ ] Có PermissionGate
[ ] Menu theo permission
[ ] User chưa login không vào route nội bộ
[ ] Chưa làm Agent-AI
```

---

## 8. Prompt Codex gợi ý

```text
Thực hiện Phase 1 - Auth, Login & Portal Foundation cho QLCL Web.
Mục tiêu: tạo/chuẩn hóa login, /api/v1/auth/me, PortalLayout, Sidebar, Topbar, protected routes và menu theo permission.
Không làm database nghiệp vụ, không làm upload/import/review/calculation/dashboard thật, không tích hợp Agent-AI.
Nếu repo đã có auth, tái sử dụng; nếu chưa có, tạo auth tối thiểu an toàn, không hard-code secret.
Sau khi xong chạy lint/build/compile phù hợp và báo file đã sửa, cách test thủ công.
```
