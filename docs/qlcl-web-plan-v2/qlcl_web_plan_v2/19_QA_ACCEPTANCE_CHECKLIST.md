# 19 - QA & Acceptance Checklist

## 1. Phase 0 - Baseline

```text
[ ] Có docs/phase0_repo_audit.md
[ ] Xác định frontend stack
[ ] Xác định backend stack
[ ] Xác định auth hiện có
[ ] Xác định migration framework
[ ] Xác định Docker/service/port
[ ] Xác định lệnh test/build
[ ] Không sửa logic hệ thống
```

---

## 2. Phase 1 - Auth + Portal

```text
[ ] Có /login
[ ] Login thành công
[ ] Login sai báo lỗi chung
[ ] Logout hoạt động
[ ] /api/v1/auth/me trả user/roles/permissions/scopes
[ ] User chưa login bị chặn khỏi route nội bộ
[ ] Có PortalLayout
[ ] Có Sidebar/Topbar
[ ] Menu theo permission
[ ] Có trang 403 hoặc PermissionDenied
[ ] Placeholder routes không crash
```

---

## 3. Phase 2 - Core DB/RBAC

```text
[ ] Migration master data chạy được
[ ] Migration indicator metadata chạy được
[ ] Migration RBAC chạy được
[ ] Migration audit/data_quality chạy được
[ ] Seed roles chạy được
[ ] Seed permissions chạy được
[ ] Seed idempotent
[ ] require_permission hoạt động
[ ] require_scope hoạt động
[ ] audit_service hoạt động
[ ] Master data APIs trả dữ liệu
```

---

## 4. Phase 3 - Manual Input

```text
[ ] /reports/input render được
[ ] Form template API hoạt động
[ ] Tạo input batch draft được
[ ] Sửa draft được
[ ] Submit batch được
[ ] Required field bị validate
[ ] Giá trị âm bị chặn nếu không cho phép
[ ] User thiếu quyền bị 403
[ ] User ngoài scope không thấy/sửa batch
[ ] Audit log create/update/submit có dữ liệu
```

---

## 5. Phase 4 - Excel Import

```text
[ ] /reports/import render được
[ ] Upload xlsx/csv được
[ ] File sai extension bị chặn
[ ] File quá dung lượng bị chặn
[ ] File lưu private
[ ] Import batch được tạo
[ ] Import rows được ghi
[ ] Preview có summary
[ ] Dòng lỗi hiển thị rõ
[ ] Confirm import hoạt động
[ ] Cancel import hoạt động
[ ] Kỳ đã khóa không cho confirm
[ ] Audit log upload/confirm/cancel có dữ liệu
```

---

## 6. Phase 5 - Review/Lock

```text
[ ] Batch submitted tạo review task
[ ] Reviewer thấy task trong scope
[ ] Approve batch hoạt động
[ ] Reject batch bắt buộc lý do
[ ] Người nhập không tự approve nếu không có quyền đặc biệt
[ ] Lock period hoạt động
[ ] Kỳ locked chặn sửa input
[ ] Kỳ locked chặn confirm import
[ ] Unlock bắt buộc lý do
[ ] Audit log approve/reject/lock/unlock có dữ liệu
```

---

## 7. Phase 6 - Calculation

```text
[ ] Có data_engine package
[ ] safe_divide hoạt động
[ ] Variable loader đọc input approved/locked
[ ] Indicator registry có chỉ số MVP
[ ] POST calculate/run tạo run
[ ] Run status cập nhật đúng
[ ] Result ghi vào quality_indicator_results
[ ] Rerun upsert không tạo duplicate
[ ] Calculation error được log
[ ] UI /etl/calculation-runs hiển thị run
```

---

## 8. Phase 7 - Dashboard

```text
[ ] Dashboard API đọc quality_indicator_results
[ ] /dashboard/bgd render được
[ ] /dashboard/kdh render được
[ ] /dashboard/kccnbv render được
[ ] /dashboard/quality render được
[ ] Có filter date/period/department/station
[ ] Có KPI card
[ ] Có trend/chart/table MVP
[ ] Có loading/error/empty state
[ ] Permission/scope guard đúng
[ ] Frontend không đọc raw/import/input trực tiếp
```

---

## 9. Phase 8 - Export

```text
[ ] /reports/export render được
[ ] Export Excel hoạt động
[ ] Export kiểm permission
[ ] Export kiểm scope
[ ] Export ghi audit log
[ ] File không lưu public nếu chứa dữ liệu nội bộ
[ ] PDF/Word deferred hoặc skeleton rõ
```

---

## 10. Phase 9 - Admin/Audit/Monitoring

```text
[ ] /admin/users render được
[ ] /admin/roles render được
[ ] /admin/permissions render được
[ ] /admin/scopes render được
[ ] Gán role được
[ ] Gán scope được
[ ] Audit logs xem được
[ ] Data quality logs xem được
[ ] /api/v1/system/health hoạt động
[ ] Không log password/token
```

---

## 11. Phase 10 - Agent-AI later

```text
[ ] Có audit hiện trạng AI
[ ] Menu AI chỉ hiện nếu có ai_agent:use
[ ] /ai-agent/chat có permission guard
[ ] User thiếu quyền bị 403
[ ] Chat UI nằm trong PortalLayout
[ ] Chat UI không tràn layout
[ ] Không ảnh hưởng module QLCL
```

---

## 12. Checklist bảo mật chung

```text
[ ] Không commit .env
[ ] Không commit token/credential
[ ] Không commit database dump
[ ] Upload private, không nằm public
[ ] Backend enforce permission
[ ] Backend enforce scope
[ ] Route thay đổi dữ liệu có audit log
[ ] Dữ liệu kỳ locked không sửa được
[ ] Error message không lộ stack/secret cho user thường
```
