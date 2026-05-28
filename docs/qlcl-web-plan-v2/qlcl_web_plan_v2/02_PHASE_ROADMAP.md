# 02 - Phase Roadmap & Delivery Gates

## 1. Nguyên tắc chia phase

Mục tiêu là chia nhỏ để Codex không bị quá tải và người quản lý có thể kiểm từng phần. Mỗi phase cần:

- Có mục tiêu rõ ràng.
- Có phạm vi **không làm** để tránh lan rộng.
- Có batch nhỏ A/B/C nếu phase lớn.
- Có migration/API/UI/test cụ thể.
- Có acceptance checklist.
- Có rollback hoặc cách tắt tính năng nếu lỗi.

---

## 2. Roadmap tổng thể

| Phase | Tên | Mục tiêu | Độ ưu tiên | Có thể giao Codex? |
|---:|---|---|---:|---|
| 0 | Baseline & repo audit | Hiểu stack, auth, DB, migration, route hiện có | Rất cao | Có, đọc/ghi report là chính |
| 1 | Auth + Portal foundation | Login, session, portal layout, route guard | Rất cao | Có, chia 3 batch |
| 2 | Core data + RBAC schema | Tạo bảng `quality_*`, seed role/permission | Rất cao | Có, chia 4 batch |
| 3 | Manual web input MVP | Nhập liệu thủ công, nháp, gửi duyệt | Cao | Có, chia 4 batch |
| 4 | Excel import preview validate | Upload file, parse, preview, validate | Cao | Có, chia 4 batch |
| 5 | Review approval period lock | Duyệt/từ chối, khóa kỳ, audit | Cao | Có, chia 3 batch |
| 6 | Calculation engine MVP | Python tính nhóm chỉ số đầu tiên | Cao | Có, chia 4 batch |
| 7 | Dashboard MVP | KPI cards, chart, table, filters | Cao | Có, chia 4 batch |
| 8 | Export reports | Excel/PDF export | Trung bình | Có, chia 3 batch |
| 9 | Admin audit monitoring | Admin UI, audit viewer, data quality logs | Trung bình-cao | Có, chia 4 batch |
| 10 | Agent-AI integration later | Tích hợp AI vào portal + permission | Sau MVP | Có, sau khi MVP ổn |

---

## 3. Dependency giữa các phase

```text
Phase 0
  ↓
Phase 1 Auth/Portal
  ↓
Phase 2 Core DB/RBAC
  ↓
Phase 3 Manual Input ─┐
                      ├→ Phase 5 Review/Lock → Phase 6 Calculation → Phase 7 Dashboard → Phase 8 Export
Phase 4 Excel Import ─┘
  ↓
Phase 9 Admin/Audit/Monitoring chạy song song sau khi có RBAC
  ↓
Phase 10 Agent-AI integration later
```

---

## 4. Delivery gates

### Gate 0 - Sau Phase 0

- Biết repo dùng framework nào.
- Biết migration dùng Alembic, Prisma, SQL script hay chưa có.
- Biết auth hiện có hay chưa.
- Biết DB connection/env.
- Có baseline report.

### Gate 1 - Sau Phase 1

- Có `/login` hoặc cơ chế login dùng được.
- Có `/` portal shell.
- Có route guard.
- Có `/api/v1/auth/me` hoặc endpoint tương đương.
- Topbar hiển thị user/role.
- User chưa đăng nhập bị redirect/chặn.

### Gate 2 - Sau Phase 2

- Migration tạo được bảng core `quality_*`.
- Seed role/permission chạy được.
- Có helper `require_permission` và `require_scope`.
- Có data model cho department/station/indicator/variable.

### Gate 3 - Sau Phase 3

- Tạo input batch nháp được.
- Thêm/sửa/xóa dòng nháp được theo quyền.
- Submit batch được.
- Có audit log.

### Gate 4 - Sau Phase 4

- Upload Excel/CSV vào private storage được.
- Parse file và lưu raw rows được.
- Preview dòng valid/error được.
- Cancel/confirm import được theo quyền.

### Gate 5 - Sau Phase 5

- Review task hiển thị batch chờ duyệt.
- Approve/reject được theo quyền/scope.
- Khóa kỳ được.
- Dữ liệu kỳ đã khóa không sửa được.

### Gate 6 - Sau Phase 6

- Chạy calculation run được.
- Có run status pending/running/success/failed.
- Ghi `quality_indicator_results`.
- Tính được nhóm chỉ số MVP.

### Gate 7 - Sau Phase 7

- Dashboard đọc API summary/trend/result.
- Không query raw/import trực tiếp từ frontend.
- Có filter ngày/kỳ/khoa/trạm.
- Có loading/error/empty state.

### Gate 8 - Sau Phase 8

- Export Excel theo ngày/tháng được.
- Export không bypass permission/scope.
- File export không lưu public nếu chứa dữ liệu nội bộ.

### Gate 9 - Sau Phase 9

- Admin xem/quản lý role/permission/scope.
- Audit log xem được.
- Data quality/calc logs xem được.
- Có health check tổng.

### Gate 10 - Sau Phase 10

- Agent-AI hiển thị trong portal.
- Chỉ user có `ai_agent:use` dùng được.
- Giao diện AI phù hợp layout QLCL Web.

---

## 5. Cách chia batch trong mỗi phase

Mỗi batch nên nhỏ, có thể kiểm ngay. Gợi ý kích thước:

| Batch type | Nội dung | Số file nên chạm |
|---|---|---:|
| Audit batch | Đọc repo, viết report | 1-3 file report |
| Migration batch | DB migration + seed | 2-6 file |
| Backend batch | Model/schema/service/router/test | 5-12 file |
| Frontend batch | Page/component/client API | 5-12 file |
| Integration batch | Kết nối UI/API + bug fix | 3-10 file |
| Test batch | Unit/integration/e2e/checklist | 2-8 file |

Không nên để một prompt Codex vừa tạo migration, vừa build toàn bộ UI, vừa calculation, vừa dashboard.

---

## 6. Definition of Done chung cho mọi phase

- Code build/lint/compile pass theo stack hiện có.
- Migration chạy được hoặc có hướng dẫn chạy rõ.
- API có permission guard nếu là route nội bộ.
- Action thay đổi dữ liệu có audit log.
- UI có loading/error/empty state.
- Không commit `.env`, token, database dump, private file upload.
- Có README hoặc note ngắn cho thay đổi phase.
- Có checklist tự kiểm.

---

## 7. Ưu tiên triển khai thực tế

Nếu nguồn lực hạn chế, làm theo thứ tự tối thiểu sau:

```text
0 → 1 → 2 → 3 → 5 → 6 → 7
```

Có thể trì hoãn Phase 4 Excel Import nếu ban đầu chỉ cần nhập tay. Có thể trì hoãn Phase 8 Export nếu dashboard trước mắt đủ xem. Agent-AI để sau MVP.
