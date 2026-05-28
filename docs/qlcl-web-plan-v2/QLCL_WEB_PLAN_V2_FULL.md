# QLCL WEB PLAN V2 - FULL COMBINED DOCUMENT

Tài liệu này là bản ghép toàn bộ các file trong thư mục `qlcl_web_plan_v2`.



---

<!-- Source file: 00_INDEX_README.md -->

# QLCL Web Plan V2 - Bộ tài liệu triển khai chi tiết

**Dự án:** Web quản lý chất lượng Trung tâm Cấp cứu 115 TP.HCM  
**Phiên bản tài liệu:** V2.0  
**Ngày:** 27/05/2026  
**Định hướng V2:** Ưu tiên xây dựng web QLCL độc lập, có đăng nhập, phân quyền, nhập liệu, import, duyệt, khóa kỳ, tính toán và dashboard. Agent-AI không còn là trọng tâm giai đoạn đầu; sẽ được tích hợp lại như một module phụ ở phase sau.

---

## 1. Thay đổi chính so với bộ tài liệu trước

| Nội dung | V1 | V2 |
|---|---|---|
| Trọng tâm | Mở rộng hệ thống Agent-AI hiện có | Xây QLCL Web là sản phẩm chính |
| Agent-AI | Luôn giữ là module song song cần bảo toàn | Đưa xuống phase sau, không ưu tiên MVP |
| Auth/Login | Nhắc gián tiếp qua auth/token hiện có | Đưa vào Phase 1 rõ ràng |
| RBAC | Có mô hình nhưng nằm rải rác | Tách thành tài liệu riêng và triển khai sớm |
| Nhập liệu | Ban đầu vẫn có nhiều nguồn ETL/Dagster | Ưu tiên nhập trực tiếp trên web + upload Excel nội bộ |
| Codex execution | Prompt lớn dễ quá tải | Chia phase nhỏ, batch nhỏ, checklist rõ |

---

## 2. Nguyên tắc mới

1. **QLCL Web là sản phẩm chính.** Các module nhập liệu, dữ liệu, dashboard, báo cáo và phân quyền được ưu tiên trước.
2. **Agent-AI không phải blocker.** Chỉ tích hợp sau khi web QLCL ổn định, theo giao diện và permission của QLCL Web.
3. **Mỗi phase phải nhỏ.** Codex chỉ nên xử lý từng phase hoặc từng batch nhỏ trong phase, không giao một prompt quá dài.
4. **Backend enforce permission.** Frontend chỉ ẩn/hiện menu, không được xem là lớp bảo mật chính.
5. **Dữ liệu nhạy cảm không đi qua public storage.** Upload Excel phải nằm trong private storage, không đưa lên thư mục public.
6. **Không ghi thẳng vào dashboard result.** Dữ liệu phải đi qua raw/staging/input, validate, duyệt/khóa, calculation rồi mới thành result/summary.
7. **Có audit log.** Mọi hành động tạo/sửa/xóa/duyệt/khóa/chạy tính toán phải ghi log.
8. **Có checkpoint dễ kiểm.** Mỗi phase có đầu ra, API, UI, bảng DB và acceptance checklist riêng.
9. **Tách database Agent-AI và QLCL Web.** `POSTGRES_*` chỉ dành cho database Agent-AI/RAG local trên server hiện tại. Toàn bộ dữ liệu QLCL Web phải dùng `QUALITY_POSTGRES_*`, trỏ tới PostgreSQL `172.16.20.17`, và chỉ ghi vào bảng `quality_*`.

---

## 3. Danh sách tài liệu

| File | Nội dung |
|---|---|
| `00_INDEX_README.md` | File mục lục và định hướng V2 |
| `01_SCOPE_PRODUCT_VISION.md` | Tầm nhìn sản phẩm, phạm vi, module, người dùng |
| `02_PHASE_ROADMAP.md` | Roadmap phase chi tiết, dependency, gate kiểm tra |
| `03_DATA_MODEL_DICTIONARY.md` | Thiết kế database, bảng, trạng thái, lineage dữ liệu |
| `04_AUTH_RBAC_PERMISSION_MODEL.md` | Đăng nhập, role, permission, scope, policy backend/frontend |
| `05_FRONTEND_UI_UX_SPEC.md` | Giao diện, route, component, trạng thái màn hình |
| `06_BACKEND_API_CONTRACTS.md` | API contract cho Auth, input, import, review, lock, calculation, dashboard |
| `07_CODEX_EXECUTION_GUIDE.md` | Cách chia việc cho Codex để không quá tải |
| `08_PHASE_00_BASELINE_REPO_AUDIT.md` | Phase 0 - khảo sát repo, stack, migration, auth hiện có |
| `09_PHASE_01_AUTH_PORTAL_FOUNDATION.md` | Phase 1 - login, session, portal shell, protected routes |
| `10_PHASE_02_CORE_DATA_RBAC_SCHEMA.md` | Phase 2 - migration dữ liệu lõi và RBAC seed |
| `11_PHASE_03_MANUAL_WEB_INPUT_MVP.md` | Phase 3 - nhập liệu thủ công MVP |
| `12_PHASE_04_EXCEL_IMPORT_PREVIEW_VALIDATE.md` | Phase 4 - upload Excel, preview, validate |
| `13_PHASE_05_REVIEW_APPROVAL_PERIOD_LOCK.md` | Phase 5 - duyệt, từ chối, khóa kỳ |
| `14_PHASE_06_CALCULATION_ENGINE_MVP.md` | Phase 6 - calculation engine MVP |
| `15_PHASE_07_DASHBOARD_MVP.md` | Phase 7 - dashboard MVP |
| `16_PHASE_08_EXPORT_REPORTS.md` | Phase 8 - xuất Excel/PDF/report |
| `17_PHASE_09_ADMIN_AUDIT_MONITORING.md` | Phase 9 - admin, audit, monitoring, hardening |
| `18_PHASE_10_AGENT_AI_INTEGRATION_LATER.md` | Phase 10 - tích hợp Agent-AI sau cùng |
| `19_QA_ACCEPTANCE_CHECKLIST.md` | Checklist nghiệm thu tổng hợp theo phase |
| `20_DEPLOYMENT_ROLLBACK_RUNBOOK.md` | Runbook deploy, backup, rollback |
| `21_CODEX_PHASE_PROMPTS.md` | Prompt ngắn cho Codex theo từng phase/batch |
| `22_TRACEABILITY_MATRIX.md` | Ma trận trace feature -> phase -> DB/API/UI/test |

---

## 4. Cách dùng bộ tài liệu

### Khi bạn muốn lên kế hoạch tổng thể
Đọc theo thứ tự:

```text
00_INDEX_README.md
01_SCOPE_PRODUCT_VISION.md
02_PHASE_ROADMAP.md
```

### Khi bạn muốn giao cho Codex làm
Đọc theo thứ tự:

```text
07_CODEX_EXECUTION_GUIDE.md
08_PHASE_00_BASELINE_REPO_AUDIT.md
09_PHASE_01_AUTH_PORTAL_FOUNDATION.md
...
21_CODEX_PHASE_PROMPTS.md
```

### Khi bạn muốn kiểm nghiệm thu
Đọc:

```text
19_QA_ACCEPTANCE_CHECKLIST.md
22_TRACEABILITY_MATRIX.md
```

### Khi bạn muốn thiết kế kỹ thuật
Đọc:

```text
03_DATA_MODEL_DICTIONARY.md
04_AUTH_RBAC_PERMISSION_MODEL.md
05_FRONTEND_UI_UX_SPEC.md
06_BACKEND_API_CONTRACTS.md
```

---

## 5. Roadmap ngắn gọn

```text
Phase 0  - Baseline repo, auth, DB, deployment hiện có
Phase 1  - Login/Auth + Portal shell + protected routes
Phase 2  - Core DB schema + RBAC seed + master data
Phase 3  - Manual web input MVP
Phase 4  - Excel import + preview + validate
Phase 5  - Review/approve/reject + period lock
Phase 6  - Calculation engine MVP
Phase 7  - Dashboard MVP
Phase 8  - Export reports
Phase 9  - Admin/audit/monitoring/hardening
Phase 10 - Agent-AI integration later
```

---

## 6. Quy tắc giao việc cho Codex

- Không giao quá 1 phase trong 1 prompt.
- Với phase lớn, chia thành batch A/B/C.
- Mỗi batch phải có output kiểm được.
- Sau mỗi batch, chạy lint/build/compile/test phù hợp.
- Không giao vừa DB vừa UI phức tạp vừa business logic trong cùng một batch nếu chưa có nền.
- Mọi thay đổi DB phải có migration idempotent hoặc Alembic migration rõ ràng.
- Mọi API thay đổi dữ liệu phải có permission guard và audit log.



---

<!-- Source file: 01_SCOPE_PRODUCT_VISION.md -->

# 01 - Scope & Product Vision V2

## 1. Tầm nhìn sản phẩm

Xây dựng một **Web quản lý chất lượng (QLCL Web)** dùng nội bộ cho Trung tâm Cấp cứu 115 TP.HCM. Hệ thống là nơi tập trung cho:

```text
Đăng nhập và phân quyền
→ Nhập liệu trực tiếp trên web
→ Upload Excel nội bộ
→ Validate và chuẩn hóa dữ liệu
→ Duyệt và khóa kỳ báo cáo
→ Tính toán chỉ số chất lượng
→ Dashboard theo vai trò/phạm vi
→ Xuất báo cáo
→ Audit và giám sát vận hành
→ Tích hợp Agent-AI sau cùng như module phụ
```

V2 xem QLCL Web là sản phẩm chính. Agent-AI chỉ là một module được đưa vào sau, không còn là ràng buộc ưu tiên trong MVP.

---

## 2. Mục tiêu kinh doanh

| Mã | Mục tiêu | Kết quả kỳ vọng |
|---|---|---|
| OBJ-01 | Tạo cổng QLCL Web nội bộ | Người dùng truy cập một web thống nhất |
| OBJ-02 | Có đăng nhập và phân quyền | Dữ liệu và chức năng theo đúng vai trò |
| OBJ-03 | Chuẩn hóa nhập liệu | Giảm phụ thuộc Google Sheet/Drive/Excel rời rạc |
| OBJ-04 | Quản lý workflow báo cáo | Có nháp, gửi duyệt, duyệt, khóa kỳ |
| OBJ-05 | Có audit log | Biết ai làm gì, lúc nào, trên dữ liệu nào |
| OBJ-06 | Tính toán chỉ số bằng Python | Dễ kiểm thử, audit, thay thế dần DAX/Power BI |
| OBJ-07 | Dashboard theo phạm vi | Ban giám đốc/khoa/trạm xem đúng dữ liệu |
| OBJ-08 | Xuất báo cáo | Excel/PDF phục vụ họp, báo cáo tháng/quý/năm |
| OBJ-09 | Tích hợp AI sau | Agent-AI dùng giao diện và permission của QLCL Web |

---

## 3. Module sản phẩm

| Module | Ưu tiên | Mô tả |
|---|---:|---|
| Auth/Login | Rất cao | Đăng nhập, session/token, `/login`, `/logout`, `/me` |
| Portal Shell | Rất cao | Layout chung, sidebar, topbar, route guard |
| RBAC/Admin | Rất cao | Role, permission, scope dữ liệu, admin cơ bản |
| Master Data | Cao | Khoa, trạm, bệnh viện, danh mục chỉ số, biến đầu vào |
| Manual Input | Cao | Nhập liệu trực tiếp trên web |
| Excel Import | Cao | Upload Excel/CSV, preview, validate, confirm |
| Review & Period Lock | Cao | Gửi duyệt, duyệt/từ chối, khóa/mở khóa kỳ |
| Calculation Engine | Cao | Python tính biến/chỉ số, ghi result |
| Dashboard | Cao | Dashboard BGD/KĐH/KCCNBV/QLCL |
| Export Reports | Trung bình | Excel trước, PDF/Word sau |
| Audit/Monitoring | Trung bình-cao | Log thao tác, log dữ liệu lỗi, calculation run |
| Agent-AI Module | Sau MVP | Tích hợp giao diện/permission, không ưu tiên phase đầu |

---

## 4. Vai trò người dùng nghiệp vụ

| Vai trò nghiệp vụ | Nhu cầu chính |
|---|---|
| Ban Giám đốc | Xem dashboard tổng quan, cảnh báo, tải báo cáo |
| Lãnh đạo khoa/phòng | Xem và duyệt dữ liệu thuộc phạm vi quản lý |
| Nhân sự nhập liệu | Nhập dữ liệu, upload file, sửa nháp, gửi duyệt |
| Nhân sự QLCL | Quản lý chỉ số, review số liệu, khóa kỳ, đối chiếu |
| Nhân sự ETL/dữ liệu | Chạy calculation, kiểm log lỗi, backfill |
| Admin hệ thống | Quản lý user, role, permission, scope, cấu hình |
| Auditor | Xem audit log, dữ liệu đã khóa, lịch sử thay đổi |
| Người dùng Agent-AI | Dùng trợ lý AI sau khi module được tích hợp |

---

## 5. Phạm vi MVP

### Must-have MVP

- Trang `/login` hoặc cơ chế đăng nhập rõ ràng.
- Portal shell có protected routes.
- RBAC cơ bản với role/permission/scope.
- Master data tối thiểu: khoa, trạm, bệnh viện, indicator catalog, variables.
- Nhập liệu thủ công: tạo batch, nhập record, lưu nháp, gửi duyệt.
- Upload Excel/CSV: private storage, parse, preview, validate, cancel/confirm.
- Review workflow: approve/reject batch.
- Period lock: khóa kỳ, chặn sửa dữ liệu đã khóa.
- Calculation run skeleton và tính nhóm chỉ số MVP.
- Dashboard MVP đọc từ `quality_indicator_results`, không đọc raw/import trực tiếp.
- Audit log cho hành động thay đổi dữ liệu.

### Should-have MVP+

- Dashboard theo khoa/trạm.
- Export Excel theo kỳ.
- Data quality log UI.
- Admin role/permission UI hoàn chỉnh.
- Calculation rerun theo quyền.

### Could-have sau MVP

- PDF/Word report theo template hành chính.
- AI giải thích biến động dashboard.
- Tích hợp Agent-AI vào portal.
- Gợi ý cải tiến chất lượng tự động.
- SSO.

### Won't-have phase đầu

- Rebuild Agent-AI.
- Kubernetes.
- Multi-server phức tạp.
- Tính đủ 53 chỉ số ngay từ lượt đầu.
- Xóa Power BI/Dagster ngay lập tức.

---

## 6. Định hướng Agent-AI trong V2

Agent-AI được chuyển thành **Phase 10 - Later integration**.

Nguyên tắc:

- Không dùng Agent-AI làm điều kiện hoàn thành MVP QLCL Web.
- Khi tích hợp, Agent-AI phải dùng layout, login và permission của QLCL Web.
- Permission chính: `ai_agent:use`.
- Route đề xuất: `/ai-agent` và `/ai-agent/chat`.
- Người không có `ai_agent:use` không thấy menu AI và không gọi được API AI.
- Không cần đổi RAG/embedding/LLM ở phase tích hợp đầu tiên, trừ khi có yêu cầu riêng.

---

## 7. Tiêu chí thành công cấp sản phẩm

| Nhóm | Tiêu chí |
|---|---|
| Auth | User chưa đăng nhập không vào được route nội bộ |
| RBAC | Backend từ chối request không có permission/scope |
| Input | Người nhập tạo nháp và gửi duyệt được |
| Import | Upload Excel có preview, dòng lỗi rõ ràng |
| Review | Manager/QLCL duyệt/từ chối theo quyền được |
| Lock | Dữ liệu kỳ đã khóa không bị sửa trái phép |
| Calculation | Tính được nhóm chỉ số MVP và ghi result |
| Dashboard | Dashboard đọc result/summary đã tính sẵn |
| Audit | Tác vụ quan trọng có audit log |
| Operate | Có backup, rollback, runbook |



---

<!-- Source file: 02_PHASE_ROADMAP.md -->

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



---

<!-- Source file: 03_DATA_MODEL_DICTIONARY.md -->

# 03 - Data Model & Dictionary

## 1. Nguyên tắc dữ liệu

1. Dùng prefix `quality_*` để tránh phụ thuộc schema riêng và dễ triển khai trong repo hiện có.
2. Không dùng chung bảng với RAG/Agent-AI.
3. Không ghi upload Excel thẳng vào bảng kết quả.
4. Mọi dữ liệu nhập/import phải qua batch, validate, workflow duyệt/khóa.
5. Kết quả dashboard đọc từ bảng result/summary đã tính toán.
6. Mọi thay đổi quan trọng phải có audit log.
7. Thiết kế bảng có thể chạy idempotent hoặc migration versioned.

---

## 2. Nhóm bảng

| Nhóm | Bảng | Phase |
|---|---|---:|
| Master data | `quality_departments`, `quality_stations`, `quality_hospitals` | 2 |
| Indicator metadata | `quality_indicator_catalog`, `quality_indicator_variables`, `quality_indicator_thresholds` | 2 |
| RBAC | `quality_roles`, `quality_permissions`, `quality_role_permissions`, `quality_user_roles`, `quality_user_scopes` | 2 |
| Manual input | `quality_input_batches`, `quality_input_records` | 3 |
| Import | `quality_import_batches`, `quality_import_rows` | 4 |
| Review/lock | `quality_review_tasks`, `quality_period_locks` | 5 |
| Calculation | `quality_calculation_runs`, `quality_indicator_results` | 6 |
| Dashboard/export | `quality_dashboard_snapshots` hoặc view/API summary | 7-8 |
| Logs | `quality_audit_logs`, `quality_data_quality_logs` | 2-9 |

---

## 3. Master data

### 3.1 `quality_departments`

Dùng để quản lý khoa/phòng/đơn vị.

```sql
CREATE TABLE IF NOT EXISTS quality_departments (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT,
    parent_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

Ví dụ code:

```text
BGD
KDH
KCCNBV
QLCL
HCQT
```

### 3.2 `quality_stations`

Dùng cho trạm/cơ sở vệ tinh.

```sql
CREATE TABLE IF NOT EXISTS quality_stations (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department_code TEXT,
    is_satellite BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

### 3.3 `quality_hospitals`

Dùng cho bệnh viện nhận/chuyển viện.

```sql
CREATE TABLE IF NOT EXISTS quality_hospitals (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    api_id TEXT,
    excel_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

---

## 4. Indicator metadata

### 4.1 `quality_indicator_catalog`

Danh mục chỉ số CS1-CS53.

```sql
CREATE TABLE IF NOT EXISTS quality_indicator_catalog (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    group_code TEXT,
    formula_text TEXT,
    formula_python_key TEXT,
    unit TEXT,
    frequency TEXT DEFAULT 'daily',
    source_type TEXT DEFAULT 'mixed',
    owner_department_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

Trường quan trọng:

| Field | Ý nghĩa |
|---|---|
| `code` | Mã CS1..CS53 |
| `formula_text` | Công thức nghiệp vụ dễ đọc |
| `formula_python_key` | Key map sang function Python |
| `source_type` | `manual`, `auto`, `import`, `mixed` |
| `frequency` | `daily`, `monthly`, `quarterly`, `yearly` |

### 4.2 `quality_indicator_variables`

Danh mục biến đầu vào A/B/C/D/E hoặc biến nghiệp vụ.

```sql
CREATE TABLE IF NOT EXISTS quality_indicator_variables (
    id BIGSERIAL PRIMARY KEY,
    variable_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    group_code TEXT,
    data_type TEXT DEFAULT 'number',
    unit TEXT,
    source_type TEXT DEFAULT 'manual',
    source_table TEXT,
    source_column TEXT,
    required BOOLEAN DEFAULT false,
    min_value NUMERIC,
    max_value NUMERIC,
    calculation_note TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

### 4.3 `quality_indicator_thresholds`

Ngưỡng cảnh báo cho dashboard.

```sql
CREATE TABLE IF NOT EXISTS quality_indicator_thresholds (
    id BIGSERIAL PRIMARY KEY,
    indicator_code TEXT NOT NULL,
    department_code TEXT,
    station_code TEXT,
    period_type TEXT DEFAULT 'daily',
    warning_min NUMERIC,
    warning_max NUMERIC,
    critical_min NUMERIC,
    critical_max NUMERIC,
    target_value NUMERIC,
    comparison_direction TEXT DEFAULT 'higher_is_better',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(indicator_code, department_code, station_code, period_type)
);
```

---

## 5. RBAC tables

### 5.1 `quality_roles`

```sql
CREATE TABLE IF NOT EXISTS quality_roles (
    id BIGSERIAL PRIMARY KEY,
    role_code TEXT UNIQUE NOT NULL,
    role_name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

### 5.2 `quality_permissions`

```sql
CREATE TABLE IF NOT EXISTS quality_permissions (
    id BIGSERIAL PRIMARY KEY,
    permission_code TEXT UNIQUE NOT NULL,
    permission_name TEXT NOT NULL,
    module_code TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT now()
);
```

### 5.3 `quality_role_permissions`

```sql
CREATE TABLE IF NOT EXISTS quality_role_permissions (
    role_id BIGINT REFERENCES quality_roles(id) ON DELETE CASCADE,
    permission_id BIGINT REFERENCES quality_permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
```

### 5.4 `quality_user_roles`

```sql
CREATE TABLE IF NOT EXISTS quality_user_roles (
    user_id TEXT NOT NULL,
    role_id BIGINT REFERENCES quality_roles(id) ON DELETE CASCADE,
    assigned_by TEXT,
    assigned_at TIMESTAMP DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);
```

### 5.5 `quality_user_scopes`

```sql
CREATE TABLE IF NOT EXISTS quality_user_scopes (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    scope_type TEXT NOT NULL,
    scope_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(user_id, scope_type, scope_code)
);
```

`scope_type`:

```text
department
station
dashboard
indicator_group
```

---

## 6. Manual input tables

### 6.1 `quality_input_batches`

```sql
CREATE TABLE IF NOT EXISTS quality_input_batches (
    id BIGSERIAL PRIMARY KEY,
    batch_code TEXT UNIQUE NOT NULL,
    report_date DATE NOT NULL,
    period_type TEXT DEFAULT 'daily',
    department_code TEXT,
    station_code TEXT,
    source_type TEXT DEFAULT 'web_form',
    status TEXT DEFAULT 'draft',
    created_by TEXT,
    submitted_by TEXT,
    approved_by TEXT,
    rejected_by TEXT,
    locked_by TEXT,
    created_at TIMESTAMP DEFAULT now(),
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    locked_at TIMESTAMP,
    note TEXT,
    reject_reason TEXT
);
```

Trạng thái:

```text
draft
submitted
approved
rejected
locked
cancelled
```

### 6.2 `quality_input_records`

```sql
CREATE TABLE IF NOT EXISTS quality_input_records (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT REFERENCES quality_input_batches(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    period_type TEXT DEFAULT 'daily',
    department_code TEXT,
    station_code TEXT,
    variable_code TEXT,
    indicator_code TEXT,
    value NUMERIC,
    text_value TEXT,
    unit TEXT,
    note TEXT,
    row_status TEXT DEFAULT 'valid',
    error_code TEXT,
    error_message TEXT,
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

---

## 7. Import tables

### 7.1 `quality_import_batches`

```sql
CREATE TABLE IF NOT EXISTS quality_import_batches (
    id BIGSERIAL PRIMARY KEY,
    import_code TEXT UNIQUE NOT NULL,
    original_filename TEXT NOT NULL,
    stored_filename TEXT,
    file_hash TEXT,
    file_size BIGINT,
    report_date DATE,
    period_type TEXT DEFAULT 'daily',
    import_type TEXT NOT NULL,
    department_code TEXT,
    station_code TEXT,
    status TEXT DEFAULT 'uploaded',
    total_rows INT DEFAULT 0,
    valid_rows INT DEFAULT 0,
    warning_rows INT DEFAULT 0,
    error_rows INT DEFAULT 0,
    created_by TEXT,
    confirmed_by TEXT,
    cancelled_by TEXT,
    created_at TIMESTAMP DEFAULT now(),
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    note TEXT
);
```

Trạng thái:

```text
uploaded
validated
has_errors
confirmed
cancelled
processed
```

### 7.2 `quality_import_rows`

```sql
CREATE TABLE IF NOT EXISTS quality_import_rows (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT REFERENCES quality_import_batches(id) ON DELETE CASCADE,
    row_number INT NOT NULL,
    raw_payload JSONB NOT NULL,
    normalized_payload JSONB,
    row_status TEXT DEFAULT 'pending',
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT now()
);
```

Dòng import:

```text
pending
valid
warning
error
ignored
```

---

## 8. Review and period lock

### 8.1 `quality_review_tasks`

```sql
CREATE TABLE IF NOT EXISTS quality_review_tasks (
    id BIGSERIAL PRIMARY KEY,
    target_type TEXT NOT NULL,
    target_id BIGINT NOT NULL,
    status TEXT DEFAULT 'pending',
    assigned_to TEXT,
    requested_by TEXT,
    reviewed_by TEXT,
    requested_at TIMESTAMP DEFAULT now(),
    reviewed_at TIMESTAMP,
    review_note TEXT
);
```

`target_type`:

```text
input_batch
import_batch
calculation_run
period_lock
```

### 8.2 `quality_period_locks`

```sql
CREATE TABLE IF NOT EXISTS quality_period_locks (
    id BIGSERIAL PRIMARY KEY,
    period_type TEXT NOT NULL,
    report_date DATE NOT NULL,
    department_code TEXT,
    station_code TEXT,
    is_locked BOOLEAN DEFAULT false,
    locked_by TEXT,
    locked_at TIMESTAMP,
    unlock_reason TEXT,
    unlocked_by TEXT,
    unlocked_at TIMESTAMP,
    UNIQUE(period_type, report_date, department_code, station_code)
);
```

---

## 9. Calculation and results

### 9.1 `quality_calculation_runs`

```sql
CREATE TABLE IF NOT EXISTS quality_calculation_runs (
    id BIGSERIAL PRIMARY KEY,
    run_code TEXT UNIQUE NOT NULL,
    report_date DATE NOT NULL,
    period_type TEXT DEFAULT 'daily',
    department_code TEXT,
    station_code TEXT,
    status TEXT DEFAULT 'pending',
    started_by TEXT,
    started_at TIMESTAMP DEFAULT now(),
    finished_at TIMESTAMP,
    total_indicators INT DEFAULT 0,
    success_indicators INT DEFAULT 0,
    error_indicators INT DEFAULT 0,
    error_message TEXT,
    calculation_version TEXT,
    metadata JSONB
);
```

Trạng thái:

```text
pending
running
success
failed
partial_success
cancelled
```

### 9.2 `quality_indicator_results`

```sql
CREATE TABLE IF NOT EXISTS quality_indicator_results (
    id BIGSERIAL PRIMARY KEY,
    indicator_code TEXT NOT NULL,
    report_date DATE NOT NULL,
    period_type TEXT DEFAULT 'daily',
    department_code TEXT,
    station_code TEXT,
    value NUMERIC,
    numerator NUMERIC,
    denominator NUMERIC,
    unit TEXT,
    status TEXT,
    source_run_id BIGINT,
    calculated_at TIMESTAMP DEFAULT now(),
    calculation_version TEXT,
    UNIQUE(indicator_code, report_date, period_type, department_code, station_code)
);
```

`status`:

```text
good
warning
critical
no_data
error
```

---

## 10. Logs

### 10.1 `quality_audit_logs`

```sql
CREATE TABLE IF NOT EXISTS quality_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor TEXT,
    action TEXT NOT NULL,
    target_table TEXT,
    target_id TEXT,
    before_data JSONB,
    after_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT now()
);
```

Bắt buộc audit các action:

```text
login_success
login_failed
create_input_batch
update_input_record
delete_input_record
submit_input_batch
approve_input_batch
reject_input_batch
upload_import_file
confirm_import_batch
cancel_import_batch
run_calculation
lock_period
unlock_period
change_role
change_permission
change_scope
export_report
```

### 10.2 `quality_data_quality_logs`

```sql
CREATE TABLE IF NOT EXISTS quality_data_quality_logs (
    id BIGSERIAL PRIMARY KEY,
    source_type TEXT,
    batch_id BIGINT,
    table_name TEXT,
    row_identifier TEXT,
    severity TEXT DEFAULT 'error',
    error_code TEXT,
    error_message TEXT,
    raw_payload JSONB,
    created_at TIMESTAMP DEFAULT now()
);
```

---

## 11. Index đề xuất

```sql
CREATE INDEX IF NOT EXISTS idx_quality_input_batches_date_status
    ON quality_input_batches(report_date, status);

CREATE INDEX IF NOT EXISTS idx_quality_input_records_batch
    ON quality_input_records(batch_id);

CREATE INDEX IF NOT EXISTS idx_quality_input_records_date_var
    ON quality_input_records(report_date, variable_code);

CREATE INDEX IF NOT EXISTS idx_quality_import_rows_batch
    ON quality_import_rows(batch_id);

CREATE INDEX IF NOT EXISTS idx_quality_results_date_code
    ON quality_indicator_results(report_date, indicator_code);

CREATE INDEX IF NOT EXISTS idx_quality_results_scope
    ON quality_indicator_results(department_code, station_code);

CREATE INDEX IF NOT EXISTS idx_quality_audit_target
    ON quality_audit_logs(target_table, target_id);

CREATE INDEX IF NOT EXISTS idx_quality_audit_actor_time
    ON quality_audit_logs(actor, created_at);

CREATE INDEX IF NOT EXISTS idx_quality_user_scopes_user
    ON quality_user_scopes(user_id);
```

---

## 12. Data lineage

```text
Manual input:
/reports/input
→ quality_input_batches
→ quality_input_records
→ review/approve
→ period lock
→ calculation run
→ quality_indicator_results
→ dashboard/export

Excel import:
/reports/import
→ private file storage
→ quality_import_batches
→ quality_import_rows
→ preview/validate
→ confirm
→ quality_input_records hoặc fact table
→ review/approve
→ period lock
→ calculation run
→ quality_indicator_results
→ dashboard/export
```

---

## 13. Quy tắc dữ liệu đã khóa

Khi kỳ đã khóa:

- Không được sửa `quality_input_records` trong kỳ đó.
- Không được confirm import mới vào kỳ đó.
- Không được xóa batch đã approved/locked.
- Chỉ `quality_admin` hoặc `system_admin` có quyền unlock.
- Unlock phải có `unlock_reason` và audit log.



---

<!-- Source file: 04_AUTH_RBAC_PERMISSION_MODEL.md -->

# 04 - Auth, Login, RBAC & Permission Model

## 1. Mục tiêu

Thiết kế đăng nhập và phân quyền cho QLCL Web ngay từ đầu. Không để dashboard, nhập liệu, import, duyệt, khóa kỳ hoặc export hoạt động khi chưa có kiểm soát quyền.

---

## 2. Nguyên tắc

1. User chưa đăng nhập không vào được route nội bộ.
2. Login/session phải dùng chung cho toàn bộ QLCL Web.
3. Frontend chỉ ẩn/hiện menu, backend mới enforce permission.
4. Permission quyết định **được làm gì**.
5. Scope quyết định **được làm trên dữ liệu nào**.
6. Mọi action thay đổi dữ liệu phải ghi audit log.
7. Agent-AI có permission riêng nhưng triển khai ở phase sau.

---

## 3. Trang đăng nhập

### Route frontend

```text
/login
/logout hoặc action logout trên topbar
```

### Hành vi

| Tình huống | Kết quả |
|---|---|
| User chưa đăng nhập vào `/` | Redirect `/login` |
| User chưa đăng nhập vào `/reports/input` | Redirect `/login` |
| Login sai | Hiển thị lỗi chung, không tiết lộ user tồn tại hay không |
| Login đúng | Redirect về `/` hoặc URL trước đó |
| Token/session hết hạn | Redirect `/login` |
| User không có permission vào route | Hiển thị 403 hoặc redirect trang không có quyền |

### API tối thiểu

```http
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
GET  /api/v1/auth/permissions
```

Nếu repo đã có auth hiện tại, Phase 1 chỉ cần chuẩn hóa để portal sử dụng được.

---

## 4. Role đề xuất

| Role | Mô tả |
|---|---|
| `system_admin` | Toàn quyền hệ thống |
| `quality_admin` | Quản trị QLCL, chỉ số, kỳ báo cáo, duyệt/khóa |
| `department_manager` | Xem và duyệt dữ liệu đơn vị phụ trách |
| `data_entry` | Nhập liệu, upload file, sửa nháp, gửi duyệt |
| `dashboard_viewer` | Xem dashboard theo phạm vi |
| `etl_operator` | Chạy calculation, xem log ELT |
| `auditor` | Chỉ xem log, dữ liệu đã khóa, lịch sử |
| `ai_agent_user` | Dùng Agent-AI khi module được tích hợp ở Phase 10 |

---

## 5. Permission catalog

### 5.1 Portal/Auth

```text
portal:view
profile:view
```

### 5.2 Dashboard

```text
dashboard:view
dashboard:view_bgd
dashboard:view_kdh
dashboard:view_kccnbv
dashboard:view_quality
dashboard:export_snapshot
```

### 5.3 Manual input

```text
reports:input:view
reports:input:create
reports:input:update_own
reports:input:update_department
reports:input:delete_draft
reports:input:submit
```

### 5.4 Excel import

```text
reports:import:view
reports:import:upload
reports:import:preview
reports:import:confirm
reports:import:cancel_own
reports:import:cancel_any
```

### 5.5 Review and period lock

```text
reports:review:view
reports:review:approve
reports:review:reject
reports:period_lock:view
reports:period_lock:lock
reports:period_lock:unlock
```

### 5.6 Indicators

```text
indicators:view
indicators:manage_catalog
indicators:manage_thresholds
indicators:view_results
indicators:recalculate
```

### 5.7 Calculation/ELT

```text
etl:view
etl:run
etl:rerun
etl:view_logs
etl:view_data_quality
etl:cancel_run
```

### 5.8 Admin

```text
admin:view
admin:manage_users
admin:manage_roles
admin:manage_permissions
admin:manage_scopes
admin:view_audit_logs
```

### 5.9 Export

```text
reports:export:view
reports:export:excel
reports:export:pdf
reports:export:word
```

### 5.10 Agent-AI later

```text
ai_agent:use
ai_agent:manage_sources
```

`ai_agent:use` không bắt buộc trong MVP phase đầu, nhưng cần seed sẵn để Phase 10 dùng.

---

## 6. Role -> permission mặc định

### 6.1 `system_admin`

Có toàn bộ permission.

### 6.2 `quality_admin`

```text
portal:view
profile:view
dashboard:view
dashboard:view_bgd
dashboard:view_kdh
dashboard:view_kccnbv
dashboard:view_quality
dashboard:export_snapshot
reports:input:view
reports:input:create
reports:input:update_department
reports:input:delete_draft
reports:input:submit
reports:import:view
reports:import:upload
reports:import:preview
reports:import:confirm
reports:import:cancel_any
reports:review:view
reports:review:approve
reports:review:reject
reports:period_lock:view
reports:period_lock:lock
reports:period_lock:unlock
indicators:view
indicators:manage_catalog
indicators:manage_thresholds
indicators:view_results
indicators:recalculate
etl:view
etl:run
etl:rerun
etl:view_logs
etl:view_data_quality
reports:export:view
reports:export:excel
admin:view
admin:view_audit_logs
```

### 6.3 `department_manager`

```text
portal:view
profile:view
dashboard:view
reports:input:view
reports:import:view
reports:review:view
reports:review:approve
reports:review:reject
reports:period_lock:view
indicators:view
indicators:view_results
etl:view
etl:view_data_quality
reports:export:view
reports:export:excel
```

Giới hạn bằng scope `department` hoặc `station`.

### 6.4 `data_entry`

```text
portal:view
profile:view
reports:input:view
reports:input:create
reports:input:update_own
reports:input:delete_draft
reports:input:submit
reports:import:view
reports:import:upload
reports:import:preview
reports:import:cancel_own
```

Không được tự duyệt batch của mình nếu không có cấu hình đặc biệt.

### 6.5 `etl_operator`

```text
portal:view
profile:view
etl:view
etl:run
etl:rerun
etl:view_logs
etl:view_data_quality
indicators:view_results
```

### 6.6 `dashboard_viewer`

```text
portal:view
profile:view
dashboard:view
indicators:view_results
reports:export:view
```

Scope quyết định dashboard/phạm vi được xem.

### 6.7 `auditor`

```text
portal:view
profile:view
dashboard:view
reports:review:view
reports:period_lock:view
indicators:view_results
etl:view
etl:view_logs
etl:view_data_quality
admin:view_audit_logs
```

Chỉ đọc.

### 6.8 `ai_agent_user`

```text
portal:view
profile:view
ai_agent:use
```

Chỉ có ý nghĩa từ Phase 10.

---

## 7. Scope dữ liệu

Permission là hành động. Scope là phạm vi dữ liệu.

Ví dụ:

```json
{
  "user_id": "u001",
  "roles": ["department_manager"],
  "scopes": {
    "department": ["KDH"],
    "station": [],
    "dashboard": ["kdh"],
    "indicator_group": ["A"]
  }
}
```

Scope type:

| Scope | Ý nghĩa |
|---|---|
| `department` | Chỉ xem/sửa/duyệt khoa/phòng được cấp |
| `station` | Chỉ xem/sửa/duyệt trạm được cấp |
| `dashboard` | Chỉ xem dashboard được cấp |
| `indicator_group` | Chỉ xem/quản lý nhóm chỉ số được cấp |

---

## 8. Backend guard

Tạo helper:

```python
def require_permission(user, permission_code: str):
    ...


def require_any_permission(user, permission_codes: list[str]):
    ...


def require_scope(user, scope_type: str, scope_code: str | None):
    ...


def require_period_not_locked(report_date, period_type='daily', department_code=None, station_code=None):
    ...
```

Áp dụng:

```python
@router.post('/quality/import/upload')
def upload_import(payload, user=Depends(get_current_user)):
    require_permission(user, 'reports:import:upload')
    require_scope(user, 'department', payload.department_code)
    require_period_not_locked(payload.report_date, payload.period_type, payload.department_code, payload.station_code)
    ...
```

---

## 9. Frontend guard

Frontend cần:

- Redirect nếu chưa đăng nhập.
- Ẩn menu nếu thiếu permission.
- Disable button nếu thiếu quyền.
- Hiển thị 403 rõ ràng.
- Không lưu secret trong localStorage nếu có thể dùng HttpOnly cookie.

Menu mapping:

| Menu | Permission |
|---|---|
| Dashboard | `dashboard:view` |
| Nhập liệu | `reports:input:view` |
| Import Excel | `reports:import:view` |
| Duyệt dữ liệu | `reports:review:view` |
| Khóa kỳ | `reports:period_lock:view` |
| ETL/Calculation | `etl:view` |
| Chỉ số | `indicators:view` |
| Admin | `admin:view` |
| Trợ lý AI | `ai_agent:use` |

---

## 10. Audit policy

Ghi audit log khi:

- Login thành công/thất bại.
- Tạo/sửa/xóa input batch/record.
- Submit batch.
- Upload/confirm/cancel import.
- Approve/reject batch.
- Lock/unlock period.
- Chạy/rerun calculation.
- Export report.
- Thay đổi role/permission/scope.
- Tích hợp hoặc bật/tắt Agent-AI menu.

---

## 11. Acceptance criteria

- User chưa đăng nhập không vào được route nội bộ.
- User thiếu permission bị backend trả 403.
- User thiếu scope không xem/sửa dữ liệu đơn vị khác.
- Data entry chỉ sửa draft của mình hoặc trong scope cho phép.
- Department manager duyệt được trong scope.
- Quality admin khóa/mở khóa kỳ được.
- Audit log ghi đúng action quan trọng.
- Menu/nút frontend thay đổi theo permission.
- Agent-AI có permission riêng để dùng ở Phase 10.



---

<!-- Source file: 05_FRONTEND_UI_UX_SPEC.md -->

# 05 - Frontend UI/UX Specification

## 1. Mục tiêu giao diện

Giao diện QLCL Web phải phục vụ người dùng nội bộ, ưu tiên rõ ràng, dễ thao tác, dễ kiểm lỗi. Không cần quá cầu kỳ ở MVP, nhưng phải có cấu trúc tốt để mở rộng.

---

## 2. Route tổng thể

```text
/login
/
/dashboard
/dashboard/bgd
/dashboard/kdh
/dashboard/kccnbv
/dashboard/quality
/indicators
/indicators/catalog
/indicators/results
/indicators/thresholds
/reports
/reports/input
/reports/import
/reports/review
/reports/locked-periods
/reports/history
/reports/export
/etl
/etl/calculation-runs
/etl/data-quality
/admin
/admin/users
/admin/roles
/admin/permissions
/admin/scopes
/admin/audit-logs
/ai-agent              # Phase 10 later
/ai-agent/chat         # Phase 10 later
```

---

## 3. Layout chính

### 3.1 `PortalLayout`

Thành phần:

- Sidebar trái.
- Topbar.
- Content area.
- Breadcrumb hoặc page title.
- Global loading/error boundary.

```text
components/layout/PortalLayout.tsx
components/layout/Sidebar.tsx
components/layout/Topbar.tsx
components/layout/PageHeader.tsx
components/layout/PermissionGate.tsx
components/layout/EmptyState.tsx
components/layout/ErrorState.tsx
```

### 3.2 Sidebar

Menu theo permission:

| Menu | Route | Permission |
|---|---|---|
| Tổng quan | `/` | `portal:view` |
| Dashboard | `/dashboard` | `dashboard:view` |
| Chỉ số | `/indicators` | `indicators:view` |
| Nhập liệu | `/reports/input` | `reports:input:view` |
| Import Excel | `/reports/import` | `reports:import:view` |
| Duyệt dữ liệu | `/reports/review` | `reports:review:view` |
| Khóa kỳ | `/reports/locked-periods` | `reports:period_lock:view` |
| ETL/Calculation | `/etl/calculation-runs` | `etl:view` |
| Admin | `/admin` | `admin:view` |
| Trợ lý AI | `/ai-agent/chat` | `ai_agent:use` |

Agent-AI menu chỉ bật ở Phase 10.

### 3.3 Topbar

Hiển thị:

- Tên user.
- Role chính.
- Đơn vị/scope nếu có.
- Nút logout.
- Trạng thái hệ thống nhỏ: OK/warning nếu cần.

---

## 4. Trang login

Route: `/login`

Thành phần:

- Logo/tên hệ thống.
- Username/email.
- Password.
- Button đăng nhập.
- Lỗi đăng nhập.
- Loading state.

Không hiển thị chi tiết như “username không tồn tại”. Chỉ báo lỗi chung: “Thông tin đăng nhập không đúng hoặc tài khoản chưa được cấp quyền.”

---

## 5. Trang chủ `/`

Mục tiêu: portal home.

Thành phần:

- Welcome card.
- Module cards theo quyền.
- Tóm tắt trạng thái kỳ báo cáo hiện tại.
- Shortcut nhanh:
  - Nhập liệu hôm nay.
  - Import file.
  - Batch chờ duyệt.
  - Dashboard BGD/KĐH/KCCNBV.

Card module:

```text
Dashboard
Nhập liệu báo cáo
Import Excel
Duyệt & khóa kỳ
Calculation/ELT
Chỉ số chất lượng
Admin
Trợ lý AI (Phase 10)
```

---

## 6. Module nhập liệu thủ công

Route: `/reports/input`

### 6.1 Bộ lọc đầu form

- `report_date`
- `period_type`
- `department_code`
- `station_code`
- `input_group`

### 6.2 Form fields

Lấy từ API form template.

Mỗi dòng:

- Mã biến/chỉ số.
- Tên biến/chỉ số.
- Ô nhập value/text value.
- Unit.
- Required indicator.
- Validation message.
- Note.

### 6.3 Action buttons

| Button | Permission | Điều kiện |
|---|---|---|
| Lưu nháp | `reports:input:create` hoặc `reports:input:update_own` | Kỳ chưa khóa |
| Gửi duyệt | `reports:input:submit` | Batch draft và valid |
| Xóa nháp | `reports:input:delete_draft` | Batch draft |

### 6.4 UI state

- Loading template.
- Empty template.
- Field error inline.
- Batch saved success toast.
- Period locked warning.
- Permission denied.

---

## 7. Module import Excel

Route: `/reports/import`

### 7.1 Form upload

- File upload area.
- `import_type`.
- `report_date`.
- `period_type`.
- `department_code`.
- `station_code`.
- Nút upload.

### 7.2 Preview

Sau upload:

- Tổng số dòng.
- Số dòng hợp lệ.
- Số dòng warning.
- Số dòng lỗi.
- Bảng preview có highlight dòng lỗi.
- Tab hoặc filter: All / Valid / Warning / Error.
- Nút tải file lỗi nếu Phase 8 hỗ trợ.

### 7.3 Actions

| Button | Permission | Điều kiện |
|---|---|---|
| Xác nhận import | `reports:import:confirm` | Không có lỗi blocking |
| Hủy import | `reports:import:cancel_own` hoặc `reports:import:cancel_any` | Batch chưa processed |

---

## 8. Module duyệt dữ liệu

Route: `/reports/review`

### 8.1 Danh sách batch chờ duyệt

Columns:

- Batch code.
- Loại: web form/import.
- Ngày báo cáo.
- Khoa/trạm.
- Người gửi.
- Thời điểm gửi.
- Số dòng.
- Trạng thái.
- Action.

### 8.2 Detail drawer/page

- Thông tin batch.
- Danh sách records.
- Lịch sử audit.
- Ghi chú duyệt.
- Button Approve/Reject.

### 8.3 Quy tắc UX

- Người nhập không thấy nút tự duyệt nếu không có quyền đặc biệt.
- Nếu thiếu scope, không hiện batch hoặc hiển thị 403.
- Reject bắt buộc nhập lý do.

---

## 9. Module khóa kỳ

Route: `/reports/locked-periods`

Thành phần:

- Filter period/date/department/station.
- Bảng kỳ đã khóa/chưa khóa.
- Button lock/unlock theo quyền.
- Unlock bắt buộc nhập lý do.
- Cảnh báo tác động khi lock: không sửa input/import kỳ đó.

---

## 10. Module calculation/ELT

Route: `/etl/calculation-runs`

Thành phần:

- Button chạy calculation theo quyền.
- Filter date/period/department/station/status.
- Bảng calculation runs.
- Detail lỗi run.
- Link sang data quality logs.

Route: `/etl/data-quality`

- Bảng lỗi dữ liệu.
- Filter severity/source/batch/date.
- Detail raw payload.

---

## 11. Dashboard MVP

### Routes

```text
/dashboard/bgd
/dashboard/kdh
/dashboard/kccnbv
/dashboard/quality
```

### Component

```text
components/dashboard/KpiCard.tsx
components/dashboard/TrendChart.tsx
components/dashboard/BarCompareChart.tsx
components/dashboard/IndicatorTable.tsx
components/dashboard/DashboardFilters.tsx
components/dashboard/StatusBadge.tsx
```

### Dashboard state

- Loading.
- Empty data.
- API error.
- Permission denied.
- Last calculated timestamp.

### Nguyên tắc

Frontend chỉ gọi API:

```text
/api/v1/quality/dashboard/summary
/api/v1/quality/dashboard/trend
/api/v1/quality/dashboard/station-compare
/api/v1/quality/indicators/results
```

Không gọi raw/import/input rows trực tiếp cho dashboard.

---

## 12. Admin UI

Routes:

```text
/admin/users
/admin/roles
/admin/permissions
/admin/scopes
/admin/audit-logs
```

MVP admin:

- Xem user.
- Gán role.
- Gán scope.
- Xem permission matrix.
- Xem audit logs.

Có thể làm UI chỉnh sửa role/permission ở Phase 9, trước đó seed bằng script.

---

## 13. Agent-AI UI later

Phase 10:

```text
/ai-agent
/ai-agent/chat
```

Yêu cầu:

- Dùng `PortalLayout`.
- Menu chỉ hiện khi có `ai_agent:use`.
- Chat UI không dùng `100vw` làm tràn layout.
- Giao diện đồng bộ với QLCL Web.

---

## 14. Accessibility và usability cơ bản

- Button có trạng thái disabled rõ.
- Form field có label rõ.
- Error hiển thị gần field.
- Không chỉ dùng màu để báo lỗi.
- Bảng dài có pagination.
- Date filter có giá trị mặc định hợp lý.
- Modal confirm cho action nguy hiểm: lock, unlock, delete, cancel, approve.



---

<!-- Source file: 06_BACKEND_API_CONTRACTS.md -->

# 06 - Backend API Contracts

## 1. Quy ước chung

Base path đề xuất:

```text
/api/v1
```

Module QLCL:

```text
/api/v1/quality
```

Response thành công:

```json
{
  "success": true,
  "data": {},
  "message": null
}
```

Response lỗi:

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Bạn không có quyền thực hiện thao tác này",
    "details": {}
  }
}
```

HTTP status:

| Status | Ý nghĩa |
|---:|---|
| 200 | OK |
| 201 | Created |
| 400 | Validation error |
| 401 | Chưa đăng nhập/token sai |
| 403 | Thiếu permission/scope |
| 404 | Không tìm thấy |
| 409 | Conflict, ví dụ kỳ đã khóa |
| 422 | Payload không hợp lệ |
| 500 | Lỗi hệ thống |

---

## 2. Auth APIs

### 2.1 Login

```http
POST /api/v1/auth/login
```

Payload:

```json
{
  "username": "admin",
  "password": "***"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "u001",
      "username": "admin",
      "display_name": "Admin",
      "roles": ["system_admin"]
    },
    "permissions": ["portal:view", "admin:view"],
    "scopes": []
  }
}
```

Token/session nên dùng cơ chế hiện có nếu repo đã có. Nếu tạo mới, ưu tiên HttpOnly cookie.

### 2.2 Current user

```http
GET /api/v1/auth/me
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "u001",
    "username": "admin",
    "display_name": "Admin",
    "roles": ["system_admin"],
    "permissions": ["portal:view", "admin:view"],
    "scopes": [
      {"scope_type": "department", "scope_code": "KDH"}
    ]
  }
}
```

### 2.3 Logout

```http
POST /api/v1/auth/logout
```

---

## 3. Master data APIs

```http
GET /api/v1/quality/master/departments
GET /api/v1/quality/master/stations
GET /api/v1/quality/master/hospitals
GET /api/v1/quality/indicators/catalog
GET /api/v1/quality/indicators/variables
```

Các API quản lý master data cần quyền admin/quality admin:

```http
POST /api/v1/quality/master/departments
PUT  /api/v1/quality/master/departments/{id}
```

---

## 4. Manual input APIs

### 4.1 Form template

```http
GET /api/v1/quality/input/form-template?date=2026-05-27&period_type=daily&department_code=KDH&station_code=&group=A
```

Permission: `reports:input:view`

Response:

```json
{
  "success": true,
  "data": {
    "report_date": "2026-05-27",
    "period_type": "daily",
    "department_code": "KDH",
    "station_code": null,
    "fields": [
      {
        "variable_code": "A1",
        "indicator_code": null,
        "label": "Tổng số cuộc gọi",
        "data_type": "number",
        "unit": "cuộc",
        "required": true,
        "min": 0,
        "max": null
      }
    ]
  }
}
```

### 4.2 Create/update draft batch

```http
POST /api/v1/quality/input/batches
```

Permission: `reports:input:create`

Payload:

```json
{
  "report_date": "2026-05-27",
  "period_type": "daily",
  "department_code": "KDH",
  "station_code": null,
  "note": "Ca trực ngày",
  "records": [
    {"variable_code": "A1", "value": 1200, "note": ""}
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "batch_id": 1,
    "batch_code": "INP-20260527-0001",
    "status": "draft"
  }
}
```

### 4.3 List batches

```http
GET /api/v1/quality/input/batches?date=2026-05-27&status=draft&department_code=KDH
```

### 4.4 Batch detail

```http
GET /api/v1/quality/input/batches/{batch_id}
```

### 4.5 Submit batch

```http
POST /api/v1/quality/input/batches/{batch_id}/submit
```

Permission: `reports:input:submit`

---

## 5. Excel import APIs

### 5.1 Upload

```http
POST /api/v1/quality/import/upload
Content-Type: multipart/form-data
```

Form data:

```text
file
import_type
report_date
period_type
department_code
station_code
```

Permission: `reports:import:upload`

Backend rules:

- Chỉ nhận `.xlsx`, `.xls`, `.csv`.
- Max size đọc từ env.
- Lưu private storage.
- Tính file hash.
- Ghi `quality_import_batches`.
- Parse và ghi `quality_import_rows`.
- Validate row.
- Trả preview summary.

Response:

```json
{
  "success": true,
  "data": {
    "batch_id": 10,
    "import_code": "IMP-20260527-0001",
    "status": "validated",
    "total_rows": 100,
    "valid_rows": 95,
    "warning_rows": 0,
    "error_rows": 5
  }
}
```

### 5.2 Preview

```http
GET /api/v1/quality/import/batches/{batch_id}/preview?page=1&page_size=50&status=error
```

Response:

```json
{
  "success": true,
  "data": {
    "batch_id": 10,
    "status": "has_errors",
    "columns": ["ngay", "tram", "tong_so_ca"],
    "summary": {
      "total_rows": 100,
      "valid_rows": 95,
      "error_rows": 5
    },
    "rows": [
      {
        "row_number": 6,
        "row_status": "error",
        "raw_payload": {},
        "normalized_payload": null,
        "error_code": "MISSING_REQUIRED_FIELD",
        "error_message": "Thiếu ngày báo cáo"
      }
    ]
  }
}
```

### 5.3 Confirm import

```http
POST /api/v1/quality/import/batches/{batch_id}/confirm
```

Permission: `reports:import:confirm`

Kết quả:

- Chuyển rows valid sang `quality_input_records` hoặc fact table tương ứng.
- Tạo input batch nếu cần.
- Audit log.
- Không cho confirm nếu kỳ đã khóa.

### 5.4 Cancel import

```http
POST /api/v1/quality/import/batches/{batch_id}/cancel
```

---

## 6. Review APIs

### 6.1 List review tasks

```http
GET /api/v1/quality/review/tasks?status=pending&department_code=KDH
```

Permission: `reports:review:view`

### 6.2 Approve batch

```http
POST /api/v1/quality/input/batches/{batch_id}/approve
```

Permission: `reports:review:approve`

Payload:

```json
{"review_note": "Đã đối chiếu"}
```

### 6.3 Reject batch

```http
POST /api/v1/quality/input/batches/{batch_id}/reject
```

Permission: `reports:review:reject`

Payload:

```json
{"review_note": "Sai số liệu trạm A"}
```

---

## 7. Period lock APIs

### 7.1 List locks

```http
GET /api/v1/quality/period-locks?date=2026-05-27&period_type=daily&department_code=KDH
```

### 7.2 Lock period

```http
POST /api/v1/quality/period-locks
```

Payload:

```json
{
  "period_type": "daily",
  "report_date": "2026-05-27",
  "department_code": "KDH",
  "station_code": null
}
```

Permission: `reports:period_lock:lock`

### 7.3 Unlock period

```http
POST /api/v1/quality/period-locks/{lock_id}/unlock
```

Payload:

```json
{"unlock_reason": "Cần điều chỉnh sau đối chiếu"}
```

Permission: `reports:period_lock:unlock`

---

## 8. Calculation APIs

### 8.1 Run calculation

```http
POST /api/v1/quality/calculate/run
```

Permission: `etl:run` hoặc `indicators:recalculate`

Payload:

```json
{
  "report_date": "2026-05-27",
  "period_type": "daily",
  "department_code": null,
  "station_code": null,
  "indicator_codes": ["CS1", "CS2"]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "run_id": 100,
    "run_code": "CALC-20260527-0001",
    "status": "running"
  }
}
```

### 8.2 List calculation runs

```http
GET /api/v1/quality/calculate/runs?date=2026-05-27&status=success
```

### 8.3 Run detail

```http
GET /api/v1/quality/calculate/runs/{run_id}
```

---

## 9. Dashboard APIs

### 9.1 Summary

```http
GET /api/v1/quality/dashboard/summary?date=2026-05-27&department_code=&station_code=
```

Permission: `dashboard:view`

Response:

```json
{
  "success": true,
  "data": {
    "report_date": "2026-05-27",
    "last_calculated_at": "2026-05-27T20:00:00",
    "kpis": [
      {
        "code": "CS1",
        "name": "Tổng số cuộc gọi",
        "value": 1234,
        "unit": "cuộc",
        "status": "good"
      }
    ],
    "charts": {
      "daily_trend": [],
      "station_compare": [],
      "indicator_status": []
    }
  }
}
```

### 9.2 Trend

```http
GET /api/v1/quality/dashboard/trend?indicator_code=CS1&from=2026-05-01&to=2026-05-27&department_code=KDH
```

### 9.3 Station compare

```http
GET /api/v1/quality/dashboard/station-compare?indicator_code=CS15&date=2026-05-27
```

### 9.4 Indicator results

```http
GET /api/v1/quality/indicators/results?date=2026-05-27&indicator_code=CS1
```

---

## 10. Export APIs

```http
GET /api/v1/quality/export/excel?period_type=monthly&month=2026-05&department_code=KDH
GET /api/v1/quality/export/pdf?dashboard=bgd&date=2026-05-27
```

Permission:

```text
reports:export:excel
reports:export:pdf
```

Export phải kiểm scope dữ liệu.

---

## 11. Admin/RBAC APIs

```http
GET  /api/v1/quality/admin/roles
GET  /api/v1/quality/admin/permissions
GET  /api/v1/quality/admin/users/{user_id}/roles
POST /api/v1/quality/admin/users/{user_id}/roles
GET  /api/v1/quality/admin/users/{user_id}/scopes
POST /api/v1/quality/admin/users/{user_id}/scopes
GET  /api/v1/quality/admin/audit-logs
```

Permission:

```text
admin:view
admin:manage_roles
admin:manage_permissions
admin:manage_scopes
admin:view_audit_logs
```

---

## 12. Agent-AI APIs later

Phase 10 chỉ cần đảm bảo:

- Frontend AI route yêu cầu `ai_agent:use`.
- Nếu backend AI API hiện có chưa có guard, thêm guard nhẹ hoặc proxy guard qua QLCL Web.
- Không bắt buộc sửa RAG/LLM/embedding trong phase tích hợp đầu tiên.



---

<!-- Source file: 07_CODEX_EXECUTION_GUIDE.md -->

# 07 - Codex Execution Guide: Chia việc để không quá tải

## 1. Mục tiêu

Tài liệu này dùng để giao việc cho Codex theo từng phần nhỏ, tránh một prompt quá rộng khiến Codex sửa lan man hoặc không kiểm soát được.

---

## 2. Quy tắc vàng khi giao Codex

1. **Một prompt chỉ làm một phase hoặc một batch trong phase.**
2. **Không giao “làm toàn bộ hệ thống” trong một lần.**
3. **Luôn yêu cầu Codex báo file đã sửa và cách test.**
4. **Nếu có DB migration, làm migration trước, API sau, UI sau.**
5. **Nếu có permission, backend guard phải làm cùng API.**
6. **Nếu có action thay đổi dữ liệu, audit log phải làm cùng.**
7. **Mỗi prompt phải có “không làm gì” để tránh lan phạm vi.**
8. **Sau mỗi batch, chạy test/build/compile phù hợp.**
9. **Không commit secret, `.env`, file upload, backup.**
10. **Agent-AI không làm cho tới Phase 10.**

---

## 3. Cấu trúc prompt chuẩn cho Codex

```text
Bối cảnh:
- Repo hiện đang ở Phase X.
- Mục tiêu batch này là ...

Phạm vi làm:
1. ...
2. ...

Không làm:
- Không làm phase kế tiếp.
- Không sửa Agent-AI.
- Không thay đổi secret/env.
- Không tạo dữ liệu fake quá mức nếu không cần.

Yêu cầu kỹ thuật:
- Backend phải kiểm permission.
- Action thay đổi dữ liệu phải ghi audit log.
- Migration phải idempotent/versioned.

Acceptance criteria:
- ...

Sau khi làm xong, báo:
- File đã sửa.
- Lệnh test đã chạy.
- Cách kiểm thủ công.
- Rủi ro còn lại.
```

---

## 4. Gợi ý chia batch theo phase

### Phase 0 - Baseline

- Batch 0A: Inspect repo structure.
- Batch 0B: Inspect auth/session hiện có.
- Batch 0C: Inspect DB/migration.
- Batch 0D: Viết baseline report.

### Phase 1 - Auth + Portal

- Batch 1A: Chuẩn hóa auth client/server và `/login`.
- Batch 1B: Tạo `PortalLayout`, sidebar, topbar, route guard.
- Batch 1C: Tạo home page và placeholder pages theo permission.

### Phase 2 - Core DB/RBAC

- Batch 2A: Migration master data + indicator metadata.
- Batch 2B: Migration RBAC + audit/data quality logs.
- Batch 2C: Seed roles/permissions.
- Batch 2D: Backend helpers `require_permission`, `require_scope`, audit service.

### Phase 3 - Manual Input

- Batch 3A: Backend form template + create/list/detail batch.
- Batch 3B: Backend update records + submit batch + audit.
- Batch 3C: Frontend `/reports/input` form.
- Batch 3D: Integration test and UI polish.

### Phase 4 - Excel Import

- Batch 4A: File upload validation + private storage.
- Batch 4B: Parse Excel/CSV + import rows + validate.
- Batch 4C: Preview/cancel/confirm APIs.
- Batch 4D: Frontend `/reports/import`.

### Phase 5 - Review/Lock

- Batch 5A: Review task APIs and approve/reject.
- Batch 5B: Period lock APIs and guards.
- Batch 5C: Frontend review and locked-period pages.

### Phase 6 - Calculation

- Batch 6A: Python calculation package skeleton.
- Batch 6B: Variable loader + safe math + MVP indicator registry.
- Batch 6C: Calculation run API + result upsert.
- Batch 6D: UI calculation runs and logs.

### Phase 7 - Dashboard

- Batch 7A: Dashboard summary/trend APIs.
- Batch 7B: Dashboard components.
- Batch 7C: BGD dashboard MVP.
- Batch 7D: KĐH/KCCNBV/Quality pages and filters.

### Phase 8 - Export

- Batch 8A: Excel export service.
- Batch 8B: Export UI.
- Batch 8C: PDF/Word skeleton or deferred template notes.

### Phase 9 - Admin/Audit

- Batch 9A: Admin roles/permissions/scopes APIs.
- Batch 9B: Admin UI.
- Batch 9C: Audit/data quality log viewer.
- Batch 9D: Health check and hardening.

### Phase 10 - Agent-AI later

- Batch 10A: Inspect existing AI route/API.
- Batch 10B: Add QLCL permission gate `ai_agent:use`.
- Batch 10C: Wrap AI UI in portal layout.
- Batch 10D: Polish UI and test.

---

## 5. Lệnh test Codex nên chạy

Tùy repo, Codex phải tự phát hiện. Gợi ý:

```bash
git status
npm run lint
npm run build
python -m compileall backend
pytest
```

Nếu repo dùng Docker:

```bash
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

Nếu có migration:

```bash
alembic upgrade head
```

hoặc script tương ứng.

---

## 6. Báo cáo sau mỗi batch

Codex phải trả lời theo mẫu:

```text
Đã làm:
- ...

File đã sửa:
- ...

Migration/DB:
- ...

Cách test:
- ...

Kết quả test:
- ...

Cách kiểm thủ công:
- ...

Chưa làm / để phase sau:
- ...

Rủi ro:
- ...
```

---

## 7. Checklist chống quá tải

Trước khi gửi prompt cho Codex, kiểm:

```text
[ ] Prompt chỉ thuộc 1 phase hoặc 1 batch
[ ] Có mục “không làm”
[ ] Có acceptance criteria
[ ] Có yêu cầu test/build
[ ] Có yêu cầu báo file sửa
[ ] Không yêu cầu tính đủ 53 chỉ số khi phase chỉ làm skeleton
[ ] Không yêu cầu tích hợp Agent-AI trước Phase 10
[ ] Không yêu cầu xóa hệ thống cũ/Dagster/Power BI ngay
```



---

<!-- Source file: 08_PHASE_00_BASELINE_REPO_AUDIT.md -->

# 08 - Phase 0: Baseline & Repo Audit

## 1. Mục tiêu

Hiểu hiện trạng repo, deployment, database, auth và migration trước khi sửa code. Phase này giúp tránh Codex làm sai stack hoặc tạo trùng chức năng đã có.

---

## 2. Không làm trong phase này

- Không tạo UI mới.
- Không tạo migration mới.
- Không sửa business logic.
- Không tích hợp Agent-AI.
- Không commit `.env`, backup, secret.

---

## 3. Batch 0A - Repo structure audit

### Việc làm

- Ghi nhận cây thư mục chính.
- Xác định frontend framework: Next.js App Router hay Pages Router.
- Xác định backend framework: FastAPI/module structure.
- Xác định nơi khai báo route/API.
- Xác định nơi đặt service/model/schema.

### Output

Tạo file:

```text
docs/phase0_repo_audit.md
```

Nội dung tối thiểu:

```text
Frontend path:
Backend path:
Docker compose path:
Migration path:
Auth path:
Config/env path:
Test/lint commands:
```

---

## 4. Batch 0B - Auth audit

### Việc làm

- Kiểm tra hiện có login chưa.
- Kiểm tra user table hoặc identity source.
- Kiểm tra token/session/JWT/cookie.
- Kiểm tra endpoint `/auth/me` hoặc tương đương.
- Kiểm tra frontend lưu auth ở đâu.

### Output

Thêm vào `docs/phase0_repo_audit.md`:

```text
Auth existing: yes/no
Login route:
Auth API:
User model/table:
Token storage:
Current permission model:
Gap for Phase 1:
```

---

## 5. Batch 0C - Database and migration audit

### Việc làm

- Kiểm tra PostgreSQL connection.
- Kiểm tra ORM/migration framework.
- Kiểm tra bảng hiện có.
- Xác định có Alembic hay SQL migration.
- Xác định command chạy migration.

### Output

```text
DB engine:
Migration framework:
Migration command:
Existing user/auth tables:
Existing quality tables:
Risk of table name conflict:
```

---

## 6. Batch 0D - Deployment and test audit

### Việc làm

- Kiểm tra Docker Compose service.
- Kiểm tra port frontend/backend/db.
- Kiểm tra lệnh build/lint/test.
- Kiểm tra health endpoint nếu có.

### Output

```text
Docker services:
Frontend port:
Backend port:
DB port:
Health endpoints:
Build commands:
Known failures:
```

---

## 7. Acceptance criteria

- Có `docs/phase0_repo_audit.md`.
- Biết stack frontend/backend.
- Biết auth hiện có hay chưa.
- Biết migration dùng gì.
- Biết lệnh test/build tối thiểu.
- Chưa sửa logic hệ thống.

---

## 8. Prompt Codex gợi ý

```text
Bạn đang thực hiện Phase 0 - Baseline & Repo Audit cho QLCL Web.
Không sửa logic hệ thống. Hãy kiểm tra repo structure, frontend/backend stack, auth hiện có, migration framework, Docker Compose, lệnh test/build.
Tạo file docs/phase0_repo_audit.md ghi rõ phát hiện và gap cho Phase 1.
Không commit .env, secret, backup. Không làm Agent-AI ở phase này.
Sau khi xong, báo file đã tạo và lệnh đã chạy.
```



---

<!-- Source file: 09_PHASE_01_AUTH_PORTAL_FOUNDATION.md -->

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



---

<!-- Source file: 10_PHASE_02_CORE_DATA_RBAC_SCHEMA.md -->

# 10 - Phase 2: Core Data Schema & RBAC Foundation

## 1. Mục tiêu

Tạo nền database cho QLCL Web: master data, indicator catalog, RBAC, audit logs. Phase này phải hoàn thành trước khi nhập liệu/import/dashboards thực tế.

---

## 2. Đầu ra chính

- Migration tạo bảng `quality_*` lõi.
- Seed roles/permissions.
- Backend helper permission/scope.
- Audit service.
- Master data APIs đọc danh mục.

---

## 3. Không làm trong phase này

- Không làm form nhập liệu đầy đủ.
- Không upload Excel.
- Không review/lock.
- Không calculation chỉ số.
- Không dashboard thật.
- Không Agent-AI.

---

## 4. Batch 2A - Master data and indicator metadata migration

### Bảng

```text
quality_departments
quality_stations
quality_hospitals
quality_indicator_catalog
quality_indicator_variables
quality_indicator_thresholds
```

### Seed tối thiểu

- Departments: BGD, KDH, KCCNBV, QLCL.
- Một số station mẫu nếu có dữ liệu thật.
- Indicator catalog có thể seed CS1-CS10 trước.
- Variables có thể seed nhóm A/B trước.

### Acceptance

- Migration chạy được.
- Chạy lại migration không lỗi nếu dùng SQL idempotent.
- Query được danh mục.

---

## 5. Batch 2B - RBAC and logs migration

### Bảng

```text
quality_roles
quality_permissions
quality_role_permissions
quality_user_roles
quality_user_scopes
quality_audit_logs
quality_data_quality_logs
```

### Acceptance

- Bảng tạo thành công.
- Có index cần thiết.
- Không đụng bảng ngoài `quality_*` trừ khi cần liên kết user hiện có.

---

## 6. Batch 2C - Seed roles and permissions

### Roles

```text
system_admin
quality_admin
department_manager
data_entry
dashboard_viewer
etl_operator
auditor
ai_agent_user
```

### Permission groups

Seed theo file `04_AUTH_RBAC_PERMISSION_MODEL.md`.

### Acceptance

- Seed chạy được nhiều lần không tạo trùng.
- `system_admin` có toàn bộ permission.
- `quality_admin`, `data_entry`, `department_manager` có quyền đúng mặc định.

---

## 7. Batch 2D - Backend RBAC helpers and master APIs

### Helper cần có

```python
require_permission(user, permission_code)
require_any_permission(user, permission_codes)
require_scope(user, scope_type, scope_code)
require_period_not_locked(...)
```

### Audit service

```python
log_audit(actor, action, target_table, target_id, before_data, after_data, request)
```

### API đọc danh mục

```http
GET /api/v1/quality/master/departments
GET /api/v1/quality/master/stations
GET /api/v1/quality/master/hospitals
GET /api/v1/quality/indicators/catalog
GET /api/v1/quality/indicators/variables
```

### Acceptance

- API đọc danh mục chạy được.
- API yêu cầu login.
- Helper permission có unit test hoặc test thủ công rõ.

---

## 8. Checklist nghiệm thu Phase 2

```text
[ ] Có migration master data
[ ] Có migration indicator metadata
[ ] Có migration RBAC
[ ] Có migration audit/data quality logs
[ ] Có seed role/permission
[ ] Seed idempotent
[ ] Có require_permission
[ ] Có require_scope
[ ] Có audit_service
[ ] Có API master data đọc được
[ ] Không làm Agent-AI
```

---

## 9. Prompt Codex gợi ý

```text
Thực hiện Phase 2 - Core Data Schema & RBAC Foundation.
Tạo migration cho các bảng quality_* lõi: departments, stations, hospitals, indicator_catalog, indicator_variables, thresholds, roles, permissions, role_permissions, user_roles, user_scopes, audit_logs, data_quality_logs.
Tạo seed roles/permissions theo tài liệu RBAC. Seed phải idempotent.
Tạo backend helper require_permission, require_scope và audit_service. Tạo API đọc master data.
Không làm input form, import Excel, review/lock, calculation, dashboard thật, Agent-AI.
Sau khi xong chạy migration/test phù hợp và báo cách kiểm.
```



---

<!-- Source file: 11_PHASE_03_MANUAL_WEB_INPUT_MVP.md -->

# 11 - Phase 3: Manual Web Input MVP

## 1. Mục tiêu

Cho phép người dùng nhập dữ liệu trực tiếp trên web, lưu nháp và gửi duyệt. Đây là nguồn dữ liệu nội bộ chính cho các chỉ số chưa tự động hóa.

---

## 2. Đầu ra chính

```text
/reports/input
GET  /api/v1/quality/input/form-template
POST /api/v1/quality/input/batches
GET  /api/v1/quality/input/batches
GET  /api/v1/quality/input/batches/{batch_id}
PUT  /api/v1/quality/input/batches/{batch_id}
POST /api/v1/quality/input/batches/{batch_id}/submit
```

---

## 3. Không làm trong phase này

- Không upload Excel.
- Không duyệt approve/reject đầy đủ nếu chuyển Phase 5.
- Không khóa kỳ.
- Không calculation.
- Không dashboard thật.
- Không Agent-AI.

---

## 4. Batch 3A - Backend form template and create batch

### API

```http
GET /api/v1/quality/input/form-template
POST /api/v1/quality/input/batches
```

### Validation

- User phải có `reports:input:view` để xem form.
- User phải có `reports:input:create` để tạo batch.
- Kiểm `department_code`/`station_code` theo scope.
- Kiểm kỳ chưa khóa.
- Giá trị số không âm nếu field quy định `min_value >= 0`.
- Required field không được rỗng.

### Audit

- `create_input_batch`.

### Acceptance

- Lấy template được.
- Tạo batch draft được.
- Thiếu permission trả 403.
- Kỳ đã khóa trả 409.

---

## 5. Batch 3B - Backend update/list/detail/submit

### API

```http
GET /api/v1/quality/input/batches
GET /api/v1/quality/input/batches/{batch_id}
PUT /api/v1/quality/input/batches/{batch_id}
POST /api/v1/quality/input/batches/{batch_id}/submit
```

### Quy tắc status

```text
draft → submitted
```

Không cho:

- Sửa batch không phải draft.
- Submit batch có dòng error blocking.
- User ngoài scope xem/sửa batch.

### Audit

```text
update_input_batch
update_input_record
submit_input_batch
```

---

## 6. Batch 3C - Frontend `/reports/input`

### UI

- Filter: date, period, department, station, group.
- Load template.
- Render fields.
- Validate inline.
- Save draft.
- Submit.
- Hiển thị batch status.

### State

- Loading.
- Empty template.
- Validation errors.
- Period locked.
- Permission denied.
- Save success.

---

## 7. Batch 3D - Integration and tests

### Test thủ công

```text
[ ] Data entry vào /reports/input được
[ ] User thiếu quyền không thấy menu hoặc bị 403
[ ] Tạo draft batch được
[ ] Sửa draft được
[ ] Submit batch được
[ ] Submit batch thiếu required field bị chặn
[ ] Audit log có create/update/submit
```

---

## 8. Data flow

```text
User nhập form
→ validate frontend cơ bản
→ POST input batch
→ validate backend
→ quality_input_batches status=draft
→ quality_input_records
→ submit
→ status=submitted
→ tạo review task ở Phase 5 hoặc tạo ngay nếu đã có bảng review_tasks
```

---

## 9. Checklist nghiệm thu Phase 3

```text
[ ] Có API form-template
[ ] Có API create/list/detail/update/submit batch
[ ] Có permission guard
[ ] Có scope guard
[ ] Có period lock guard nếu bảng lock đã có
[ ] Có audit log
[ ] Có UI /reports/input
[ ] Có loading/error/empty state
[ ] Không làm Excel import
[ ] Không làm Agent-AI
```

---

## 10. Prompt Codex gợi ý

```text
Thực hiện Phase 3 - Manual Web Input MVP.
Tạo API form-template, create/list/detail/update/submit input batch. Áp dụng permission reports:input:view/create/update_own/update_department/submit, scope department/station, period lock guard. Ghi audit log khi tạo/sửa/submit.
Tạo frontend /reports/input với filter, form fields, validate, save draft, submit, loading/error/empty state.
Không làm Excel import, review approve/reject đầy đủ, calculation, dashboard, Agent-AI.
Sau khi xong chạy test/build phù hợp và báo cách kiểm thủ công.
```



---

<!-- Source file: 12_PHASE_04_EXCEL_IMPORT_PREVIEW_VALIDATE.md -->

# 12 - Phase 4: Excel Import, Preview & Validation

## 1. Mục tiêu

Cho phép upload Excel/CSV trực tiếp trên web nội bộ, lưu file vào private storage, parse thành raw rows, validate và hiển thị preview trước khi confirm.

---

## 2. Đầu ra chính

```text
/reports/import
POST /api/v1/quality/import/upload
GET  /api/v1/quality/import/batches
GET  /api/v1/quality/import/batches/{batch_id}/preview
POST /api/v1/quality/import/batches/{batch_id}/confirm
POST /api/v1/quality/import/batches/{batch_id}/cancel
```

---

## 3. Không làm trong phase này

- Không parse mọi loại Excel phức tạp ngay.
- Không làm mapping tự động quá nhiều template.
- Không tính chỉ số.
- Không dashboard.
- Không Agent-AI.

---

## 4. Batch 4A - Upload and private storage

### Backend rules

- Extension cho phép: `.xlsx`, `.xls`, `.csv`.
- Max size từ env, ví dụ `QUALITY_IMPORT_MAX_MB`.
- Lưu vào private folder, ví dụ `storage/private/quality_imports/`.
- Không trả đường dẫn file thật ra frontend.
- Tính hash file.
- Tạo `quality_import_batches`.

### Permission

```text
reports:import:upload
```

### Acceptance

- Upload file hợp lệ tạo import batch.
- File sai extension bị từ chối.
- File quá dung lượng bị từ chối.
- File không nằm public storage.

---

## 5. Batch 4B - Parse rows and validation

### Parser

- CSV: dùng parser chuẩn.
- XLSX: dùng thư viện Python phù hợp như `openpyxl` nếu backend Python.
- Không đọc macro.
- Chỉ đọc sheet đầu tiên trong MVP, hoặc sheet theo `import_type`.

### Ghi DB

- Mỗi dòng thành `quality_import_rows.raw_payload`.
- Normalize vào `normalized_payload` nếu mapping được.
- Validate row status: `valid`, `warning`, `error`.
- Update `total_rows`, `valid_rows`, `warning_rows`, `error_rows`.

### Validation cơ bản

- Có ngày báo cáo.
- Có mã khoa/trạm nếu loại import yêu cầu.
- Cột bắt buộc không thiếu.
- Giá trị số không âm nếu quy định.
- Date parse được.
- Variable/indicator code tồn tại nếu import dạng chỉ số.

---

## 6. Batch 4C - Preview, confirm, cancel APIs

### Preview

```http
GET /api/v1/quality/import/batches/{batch_id}/preview
```

Trả:

- Summary.
- Columns.
- Rows phân trang.
- Errors.

### Confirm

```http
POST /api/v1/quality/import/batches/{batch_id}/confirm
```

Quy tắc:

- Chỉ confirm batch chưa processed/cancelled.
- Không confirm nếu có error blocking.
- Không confirm kỳ đã khóa.
- Chuyển rows valid sang `quality_input_records` hoặc tạo input batch import.
- Audit `confirm_import_batch`.

### Cancel

```http
POST /api/v1/quality/import/batches/{batch_id}/cancel
```

Audit `cancel_import_batch`.

---

## 7. Batch 4D - Frontend `/reports/import`

### UI

- Upload area.
- Select import type.
- Date/period/department/station.
- Upload progress.
- Preview table.
- Error row highlight.
- Confirm/cancel buttons.

### State

- Loading upload.
- Parsing/validating.
- Preview empty.
- Has errors.
- Confirm success.
- Permission denied.

---

## 8. Data flow

```text
User upload Excel
→ backend validate file
→ private storage
→ quality_import_batches
→ parse rows
→ quality_import_rows
→ preview
→ confirm
→ quality_input_batches/source_type=import
→ quality_input_records
→ review/lock/calc ở phase sau
```

---

## 9. Checklist nghiệm thu Phase 4

```text
[ ] Upload xlsx/csv được
[ ] File sai loại bị chặn
[ ] File quá dung lượng bị chặn
[ ] File lưu private
[ ] Có import batch
[ ] Có import rows
[ ] Có preview
[ ] Có valid/error count
[ ] Confirm import ghi sang input records hoặc input batch
[ ] Cancel import được
[ ] Permission/scope/lock guard đúng
[ ] Audit log có upload/confirm/cancel
[ ] UI /reports/import dùng được
[ ] Không làm Agent-AI
```

---

## 10. Prompt Codex gợi ý

```text
Thực hiện Phase 4 - Excel Import, Preview & Validation.
Tạo upload API nhận xlsx/xls/csv, kiểm extension/dung lượng, lưu private storage, tính hash, tạo import batch. Parse rows, ghi quality_import_rows, validate row và trả preview. Tạo confirm/cancel API với permission/scope/period lock guard và audit log. Tạo UI /reports/import.
Không làm calculation, dashboard, Agent-AI, không đưa file vào public storage.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```



---

<!-- Source file: 13_PHASE_05_REVIEW_APPROVAL_PERIOD_LOCK.md -->

# 13 - Phase 5: Review, Approval & Period Lock

## 1. Mục tiêu

Hoàn thiện workflow kiểm soát dữ liệu: batch sau khi nhập/import phải được gửi duyệt, duyệt hoặc từ chối, sau đó khóa kỳ để bảo vệ dữ liệu đã chốt.

---

## 2. Đầu ra chính

```text
/reports/review
/reports/locked-periods
GET  /api/v1/quality/review/tasks
POST /api/v1/quality/input/batches/{batch_id}/approve
POST /api/v1/quality/input/batches/{batch_id}/reject
GET  /api/v1/quality/period-locks
POST /api/v1/quality/period-locks
POST /api/v1/quality/period-locks/{lock_id}/unlock
```

---

## 3. Không làm trong phase này

- Không tính chỉ số phức tạp.
- Không dashboard thật.
- Không export report.
- Không Agent-AI.

---

## 4. Batch 5A - Review tasks and approve/reject

### Backend

- Khi batch submit, tạo review task nếu chưa làm Phase 3.
- List review tasks theo permission/scope.
- Approve batch.
- Reject batch với lý do bắt buộc.

### Permission

```text
reports:review:view
reports:review:approve
reports:review:reject
```

### Quy tắc

- Không cho người nhập tự approve batch của mình, trừ khi là `quality_admin` hoặc cấu hình cho phép.
- Reviewer phải có scope với department/station của batch.
- Batch chỉ approve nếu status `submitted`.
- Reject phải ghi `reject_reason`.

### Audit

```text
approve_input_batch
reject_input_batch
```

---

## 5. Batch 5B - Period lock APIs and guards

### Backend

- List period locks.
- Lock period (Hệ thống tự động kích hoạt khi Trưởng khoa/Reviewer phê duyệt số liệu).
- Unlock period (Mở khóa phục vụ điều chỉnh).
- Thêm guard vào input/import APIs nếu chưa có.

### Permission

```text
reports:period_lock:view
reports:period_lock:lock
reports:period_lock:unlock
```

### Quy tắc lock & Mở khóa

- **Duyệt đồng nghĩa với Khóa sổ:** Khi Trưởng khoa phê duyệt đợt số liệu (`POST /approve`), batch status tự động chuyển sang `'locked'` và sinh bản ghi `QualityPeriodLock(is_locked=True)` tương ứng.
- **Mở khóa hoàn nháp:** Khi thực hiện mở khóa một kỳ hạn báo cáo (`POST /unlock`), hệ thống tự động đưa **tất cả** các lô số liệu con tương ứng ngược về trạng thái **Nháp (draft)** để nhân viên có thể sửa đổi và gửi duyệt lại.
- Kỳ đã khóa chặn hoàn toàn hành động create/update/submit/confirm import.
- Unlock bắt buộc lý do.

### Audit

```text
lock_period
unlock_period
```

---

## 6. Batch 5C - Frontend review and lock pages

### `/reports/review`

- List batch chờ duyệt.
- Detail records.
- Approve/reject modal.
- Review note.
- Reject reason required.

### `/reports/locked-periods`

- Ẩn form khóa sổ thủ công.
- Hiển thị danh sách kỳ báo cáo đã khóa rộng toàn màn hình (Full width).
- Bổ sung banner giới thiệu cơ chế tự động khóa sổ khi duyệt và mở khóa hồi nháp kỳ.
- Nút **Mở khóa** kích hoạt Modal nhập lý do mở khóa bắt buộc phục vụ Audit Trail.

---

## 7. State machine

```text
Manual input/import confirmed:
  draft → submitted → locked (auto-locked on approve)
                   ↘ rejected → draft/cancelled

Unlock Period Lock:
  locked → unlocked (reverts all child batches back to 'draft')
```

---

## 8. Checklist nghiệm thu Phase 5

```text
[x] Batch submit tạo review task
[x] Reviewer xem task theo scope
[x] Phê duyệt tự động chuyển batch sang locked và khóa sổ kỳ hạn
[x] Reject bắt buộc reason
[x] Data entry không tự approve nếu không có quyền đặc biệt
[x] Mở khóa kỳ báo cáo tự động hoàn trạng thái các lô con về draft để sửa đổi
[x] Kỳ đã khóa chặn sửa input/import confirm
[x] Unlock period yêu cầu reason bắt buộc phục vụ thanh tra
[x] Audit log có approve/reject/lock/unlock đầy đủ
[x] UI review hoạt động mượt mà
[x] UI locked-periods hoạt động toàn màn hình (không có form khóa tay)
[x] Không làm Agent-AI
```

---

## 9. Prompt Codex gợi ý

```text
Thực hiện Phase 5 - Review, Approval & Period Lock.
Tạo review task list, approve/reject input batch với permission/scope guard và audit log. Không cho người nhập tự duyệt nếu không có quyền đặc biệt. Tạo period lock APIs, lock/unlock với reason, và guard chặn sửa dữ liệu kỳ đã khóa. Tạo UI /reports/review và /reports/locked-periods.
Không làm calculation, dashboard, export, Agent-AI.
Sau khi xong chạy test/build phù hợp và báo cách kiểm thủ công.
```



---

<!-- Source file: 14_PHASE_06_CALCULATION_ENGINE_MVP.md -->

# 14 - Phase 6: Calculation Engine MVP

## 1. Mục tiêu

Tạo calculation engine bằng Python để tính nhóm chỉ số MVP từ dữ liệu đã nhập/import và đã duyệt/khóa. Phase này chưa cần tính đủ 53 chỉ số.

---

## 2. Đầu ra chính

```text
backend/data_engine/
backend/data_engine/calculations/safe_math.py
backend/data_engine/calculations/variables.py
backend/data_engine/calculations/indicators.py
backend/data_engine/jobs/run_calculation.py
POST /api/v1/quality/calculate/run
GET  /api/v1/quality/calculate/runs
GET  /api/v1/quality/calculate/runs/{run_id}
/etl/calculation-runs
```

---

## 3. Không làm trong phase này

- Không tính đủ CS1-CS53.
- Không làm dashboard phức tạp.
- Không export report.
- Không Agent-AI.

---

## 4. Nhóm chỉ số MVP đề xuất

Ưu tiên 10 chỉ số đầu dễ đối chiếu:

```text
CS1  - Tổng số cuộc gọi
CS2  - Tỷ lệ cuộc gọi được tiếp nhận
CS3  - Tỷ lệ cuộc gọi có nội dung
CS4  - Tỷ lệ cuộc gọi có dấu hiệu cấp cứu
CS5  - Tỷ lệ trường hợp cấp cứu điều phối KCCNBV
CS15 - Tỷ lệ trường hợp xuất xe
CS16 - Tỷ lệ trường hợp có bệnh nhân
CS17 - Tỷ lệ trường hợp chuyển viện
CS22 - Trung bình thời gian kích hoạt cấp cứu
CS23 - Trung bình thời gian tiếp cận bệnh nhân
```

Nếu chưa đủ nguồn dữ liệu, Phase 6 có thể chỉ tính CS1-CS5 trước và để placeholder registry cho các chỉ số còn lại.

---

## 5. Batch 6A - Calculation package skeleton

### Cấu trúc

```text
backend/data_engine/
├── calculations/
│   ├── __init__.py
│   ├── safe_math.py
│   ├── variables.py
│   └── indicators.py
├── jobs/
│   ├── __init__.py
│   └── run_calculation.py
└── common/
    ├── __init__.py
    ├── db.py
    └── logging.py
```

### Safe math

```python
def safe_divide(numerator, denominator, default=0):
    if denominator is None or denominator == 0:
        return default
    if numerator is None:
        return default
    return numerator / denominator
```

---

## 6. Batch 6B - Variable loader and indicator registry

### Variable loader

Đọc từ:

```text
quality_input_records
```

Điều kiện nạp dữ liệu:

- **Bao gồm cả số liệu nháp:** Nạp dữ liệu từ các trạng thái hoạt động: `["draft", "submitted", "approved", "locked"]`.
- Loại trừ hoàn toàn dữ liệu từ các lô bị từ chối `rejected` để tránh làm nhiễu kết quả.
- Theo `report_date`, `period_type`, `department_code`, `station_code`.

### Registry

```python
INDICATOR_REGISTRY = {
    "CS1": calc_cs1,
    "CS2": calc_cs2,
    "CS3": calc_cs3,
    "CS4": calc_cs4,
    "CS5": calc_cs5,
}
```

---

## 7. Batch 6C - Calculation run API and result upsert

### API

```http
POST /api/v1/quality/calculate/run
GET  /api/v1/quality/calculate/runs
GET  /api/v1/quality/calculate/runs/{run_id}
```

### Permission

```text
etl:run
etl:view
etl:view_logs
indicators:recalculate
```

### Run behavior

1. Tạo `quality_calculation_runs` status `pending` với `run_type="auto"` (hoặc `"manual"` nếu chạy tay).
2. Chuyển `running`.
3. Load input variables (bao gồm cả nháp và gửi duyệt).
4. Run registry.
5. Upsert vào `quality_indicator_results`.
6. Cập nhật success/error count.
7. Status `success`, `failed` hoặc `partial_success`.
8. Audit `run_calculation`.

---

## 8. Batch 6D - Frontend calculation runs

Route:

```text
/etl/calculation-runs
```

UI:

- Ẩn hoàn toàn form kích hoạt thủ công bên trái.
- Hiển thị danh sách lịch sử lượt chạy rộng toàn màn hình (Full width).
- Bổ sung banner giới thiệu nguyên lý tự động chạy tính toán nền khi Lưu nháp/Cập nhật/Nộp/Duyệt số liệu.
- Nút **Xem Logs** mở Modal hiển thị thời gian thực toàn bộ nhật ký gỡ lỗi lâm sàng của động cơ Python.

---

## 9. Checklist nghiệm thu Phase 6

```text
[x] Có data_engine package hoàn chỉnh
[x] Có safe_divide chặn lỗi chia cho 0
[x] Có variable loader nạp cả nháp, gửi duyệt, khóa sổ (loại trừ rejected)
[x] Có indicator registry CS1-CS10
[x] Đăng ký API tự động chạy tính toán nền bất đồng bộ khi Lưu/Nộp/Duyệt/Mở khóa/Confirm Excel
[x] Có result upsert không trùng dữ liệu
[x] Có run status success/failed/partial_success
[x] Có audit log run_calculation đầy đủ
[x] Có UI calculation-runs toàn màn hình sang trọng
[x] Tính toán tự động phản hồi tức thì 10 chỉ số lâm sàng MVP CS1-CS10
[x] Không làm Agent-AI
```

---

## 10. Prompt Codex gợi ý

```text
Thực hiện Phase 6 - Calculation Engine MVP.
Tạo backend/data_engine với safe_math, variable loader, indicator registry và job run_calculation. Tạo API calculate/run, calculate/runs, calculate/runs/{id}. Calculation đọc input records đã approved/locked, ghi quality_calculation_runs và upsert quality_indicator_results. Tính tối thiểu nhóm chỉ số MVP khả dụng, ưu tiên CS1-CS5 nếu đủ dữ liệu. Tạo UI /etl/calculation-runs.
Không tính đủ 53 chỉ số, không làm dashboard phức tạp, không Agent-AI.
Sau khi xong chạy compile/test phù hợp và báo cách kiểm.
```



---

<!-- Source file: 15_PHASE_07_DASHBOARD_MVP.md -->

# 15 - Phase 7: Dashboard MVP

## 1. Mục tiêu

Tạo dashboard MVP đọc từ dữ liệu đã tính trong `quality_indicator_results`, không đọc raw/import/input trực tiếp từ frontend.

---

## 2. Đầu ra chính

```text
/dashboard/bgd
/dashboard/kdh
/dashboard/kccnbv
/dashboard/quality
GET /api/v1/quality/dashboard/summary
GET /api/v1/quality/dashboard/trend
GET /api/v1/quality/dashboard/station-compare
GET /api/v1/quality/indicators/results
```

---

## 3. Không làm trong phase này

- Không xây BI phức tạp như Power BI ngay.
- Không làm tất cả biểu đồ nâng cao.
- Không export PDF phức tạp.
- Không Agent-AI.

---

## 4. Batch 7A - Dashboard APIs

### APIs

```http
GET /api/v1/quality/dashboard/summary
GET /api/v1/quality/dashboard/trend
GET /api/v1/quality/dashboard/station-compare
GET /api/v1/quality/indicators/results
```

### Permission

```text
dashboard:view
dashboard:view_bgd
dashboard:view_kdh
dashboard:view_kccnbv
dashboard:view_quality
indicators:view_results
```

### Scope

- BGD có thể xem toàn cục nếu được cấp.
- KĐH chỉ xem department/station thuộc scope nếu không có quyền toàn cục.
- KCCNBV tương tự.

---

## 5. Batch 7B - Dashboard components

```text
components/dashboard/DashboardFilters.tsx
components/dashboard/KpiCard.tsx
components/dashboard/TrendChart.tsx
components/dashboard/BarCompareChart.tsx
components/dashboard/IndicatorTable.tsx
components/dashboard/StatusBadge.tsx
components/dashboard/LastCalculated.tsx
```

Chart MVP:

- KPI cards.
- Line trend.
- Bar compare.
- Indicator status table.

---

## 6. Batch 7C - BGD dashboard MVP

Route:

```text
/dashboard/bgd
```

Hiển thị:

- Tổng quan các KPI trọng yếu.
- Cảnh báo chỉ số warning/critical.
- Xu hướng theo ngày/tháng.
- Bảng chỉ số.

---

## 7. Batch 7D - KĐH/KCCNBV/Quality dashboards

Routes:

```text
/dashboard/kdh
/dashboard/kccnbv
/dashboard/quality
```

MVP có thể dùng chung component và khác filter/default indicator groups.

---

## 8. UI state bắt buộc

- Loading.
- Error.
- Empty data.
- Permission denied.
- Last calculated timestamp.
- Warning nếu chưa có calculation run mới nhất.

---

## 9. Checklist nghiệm thu Phase 7

```text
[ ] Dashboard API đọc quality_indicator_results
[ ] Frontend không query raw/import/input trực tiếp
[ ] Có dashboard BGD MVP
[ ] Có KĐH/KCCNBV/Quality pages hoặc placeholders có dữ liệu khi có result
[ ] Có filter date/period/department/station
[ ] Có KPI card/table/chart MVP
[ ] Có permission/scope guard
[ ] Có loading/error/empty state
[ ] Không làm Agent-AI
```

---

## 10. Prompt Codex gợi ý

```text
Thực hiện Phase 7 - Dashboard MVP.
Tạo API dashboard summary, trend, station-compare và indicators/results đọc từ quality_indicator_results, áp dụng permission/scope guard. Tạo components dashboard và các route /dashboard/bgd, /dashboard/kdh, /dashboard/kccnbv, /dashboard/quality với filters, KPI cards, chart/table MVP, loading/error/empty states.
Không query raw/import/input trực tiếp từ frontend. Không làm export PDF phức tạp, không Agent-AI.
Sau khi xong chạy build/test phù hợp và báo cách kiểm.
```



---

<!-- Source file: 16_PHASE_08_EXPORT_REPORTS.md -->

# 16 - Phase 8: Export Reports

## 1. Mục tiêu

Cho phép xuất báo cáo từ dữ liệu đã tính/đã khóa, ưu tiên Excel MVP. PDF/Word template có thể làm sau.

---

## 2. Đầu ra chính

```text
/reports/export
GET /api/v1/quality/export/excel
GET /api/v1/quality/export/pdf       # optional/skeleton
GET /api/v1/quality/export/word      # optional/skeleton
```

---

## 3. Không làm trong phase này

- Không làm template hành chính quá phức tạp ngay.
- Không export dữ liệu chưa qua permission/scope.
- Không lưu file nhạy cảm vào public storage.
- Không Agent-AI.

---

## 4. Batch 8A - Excel export service

### Input

```http
GET /api/v1/quality/export/excel?period_type=monthly&month=2026-05&department_code=KDH
```

### Data source

- `quality_indicator_results`.
- `quality_indicator_catalog`.
- Có thể thêm audit/calc run metadata.

### Permission

```text
reports:export:excel
```

### Scope

- Export chỉ trong scope user.
- Không cho export toàn cục nếu user chỉ có department scope.

### Audit

```text
export_report
```

---

## 5. Batch 8B - Frontend export page

Route:

```text
/reports/export
```

UI:

- Chọn period/date/month.
- Chọn dashboard/report type.
- Chọn department/station theo scope.
- Button Export Excel.
- Download file.
- Loading/error state.

---

## 6. Batch 8C - PDF/Word plan or skeleton

Nếu cần:

- Tạo API skeleton trả 501/coming soon có permission guard.
- Hoặc tạo PDF đơn giản từ dashboard summary.
- Word template để phase sau.

---

## 7. Checklist nghiệm thu Phase 8

```text
[ ] Export Excel chạy được
[ ] Export kiểm permission
[ ] Export kiểm scope
[ ] File không lưu public nếu chứa dữ liệu nội bộ
[ ] Có audit log export_report
[ ] UI /reports/export dùng được
[ ] PDF/Word có skeleton hoặc deferred rõ
[ ] Không làm Agent-AI
```

---

## 8. Prompt Codex gợi ý

```text
Thực hiện Phase 8 - Export Reports.
Tạo Excel export API đọc từ quality_indicator_results/catalog, áp dụng permission reports:export:excel và scope guard, ghi audit export_report. Tạo UI /reports/export để chọn kỳ/phạm vi và download Excel. PDF/Word chỉ làm skeleton hoặc ghi rõ deferred nếu chưa đủ thời gian.
Không lưu file nhạy cảm public, không Agent-AI.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```



---

<!-- Source file: 17_PHASE_09_ADMIN_AUDIT_MONITORING.md -->

# 17 - Phase 9: Admin, Audit & Monitoring Hardening

## 1. Mục tiêu

Hoàn thiện phần quản trị, audit log, data quality log và health monitoring để hệ thống vận hành ổn định hơn.

---

## 2. Đầu ra chính

```text
/admin/users
/admin/roles
/admin/permissions
/admin/scopes
/admin/audit-logs
/etl/data-quality
/api/v1/system/health
```

---

## 3. Không làm trong phase này

- Không thay đổi sâu calculation formula.
- Không làm Agent-AI nếu chưa tới Phase 10.
- Không tạo SSO phức tạp nếu chưa cần.

---

## 4. Batch 9A - Admin RBAC APIs

APIs:

```http
GET  /api/v1/quality/admin/roles
GET  /api/v1/quality/admin/permissions
GET  /api/v1/quality/admin/users/{user_id}/roles
POST /api/v1/quality/admin/users/{user_id}/roles
GET  /api/v1/quality/admin/users/{user_id}/scopes
POST /api/v1/quality/admin/users/{user_id}/scopes
```

Permission:

```text
admin:view
admin:manage_roles
admin:manage_permissions
admin:manage_scopes
```

Audit:

```text
change_role
change_permission
change_scope
```

---

## 5. Batch 9B - Admin UI

Routes:

```text
/admin/users
/admin/roles
/admin/permissions
/admin/scopes
```

MVP UI:

- User list.
- Assign roles.
- Assign scopes.
- Permission matrix read-only/edit basic.

---

## 6. Batch 9C - Audit and data quality UI

Routes:

```text
/admin/audit-logs
/etl/data-quality
```

UI:

- Filter actor/action/date/target.
- View before/after JSON.
- Filter severity/source/batch for data quality logs.
- Detail raw payload.

---

## 7. Batch 9D - Health check and hardening

API:

```http
GET /api/v1/system/health
```

Response:

```json
{
  "status": "ok",
  "modules": {
    "database": "ok",
    "auth": "ok",
    "quality_dashboard": "ok",
    "calculation": "ok",
    "file_storage": "ok"
  }
}
```

Hardening:

- Ensure upload folder private.
- Ensure no env/secret committed.
- Ensure 403 messages consistent.
- Ensure logs không chứa password/token.

---

## 8. Checklist nghiệm thu Phase 9

```text
[ ] Admin roles API
[ ] Admin permissions API
[ ] Assign role/scope được
[ ] Audit logs UI xem được
[ ] Data quality logs UI xem được
[ ] Health check tổng chạy được
[ ] Không log password/token
[ ] Không public upload folder
[ ] Không làm Agent-AI nếu chưa sang Phase 10
```

---

## 9. Prompt Codex gợi ý

```text
Thực hiện Phase 9 - Admin, Audit & Monitoring Hardening.
Tạo Admin RBAC APIs/UI để xem/gán roles, permissions, scopes; tạo audit log viewer và data quality log viewer; tạo /api/v1/system/health. Áp dụng admin permissions và audit log cho thay đổi role/scope. Kiểm tra không log password/token, upload folder private.
Không làm Agent-AI nếu chưa chuyển Phase 10.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```



---

<!-- Source file: 18_PHASE_10_AGENT_AI_INTEGRATION_LATER.md -->

# 18 - Phase 10: Agent-AI Integration Later

## 1. Mục tiêu

Tích hợp Agent-AI vào QLCL Web như một module phụ sau khi MVP QLCL Web đã ổn định. Agent-AI không phải ưu tiên trong các phase trước.

---

## 2. Khi nào bắt đầu Phase 10?

Chỉ bắt đầu khi các điều kiện sau đạt:

```text
[ ] Login/Auth hoạt động ổn định
[ ] RBAC/permission/scope hoạt động
[ ] Portal shell ổn định
[ ] Nhập liệu/import/review/lock không còn lỗi blocking
[ ] Dashboard MVP dùng được
[ ] Admin/audit cơ bản có sẵn
```

---

## 3. Định hướng tích hợp

Agent-AI được đưa vào QLCL Web theo giao diện và quyền của QLCL Web:

```text
/ai-agent
/ai-agent/chat
```

Permission:

```text
ai_agent:use
```

Menu “Trợ lý AI” chỉ hiển thị khi user có `ai_agent:use`.

---

## 4. Không làm trong phase đầu tích hợp AI

- Không rewrite RAG.
- Không đổi embedding model.
- Không đổi LLM provider nếu không cần.
- Không re-index tài liệu nếu không có yêu cầu riêng.
- Không để Agent-AI làm ảnh hưởng dashboard/input/import.

---

## 5. Batch 10A - Inspect existing Agent-AI

Việc làm:

- Xác định route/UI chat hiện có.
- Xác định API chat hiện có.
- Xác định auth hiện tại của AI.
- Xác định component có thể tách/reuse.

Output:

```text
docs/phase10_agent_ai_audit.md
```

---

## 6. Batch 10B - Permission gate

Việc làm:

- Thêm menu AI theo `ai_agent:use`.
- Thêm route guard `/ai-agent/chat`.
- Nếu backend API AI chưa có guard, thêm guard hoặc proxy check permission.

Acceptance:

- User thiếu `ai_agent:use` không thấy menu AI.
- User thiếu quyền gọi API AI bị chặn.

---

## 7. Batch 10C - UI integration

Việc làm:

- Bọc chat UI trong `PortalLayout`.
- Đổi tên hiển thị: “Trợ lý AI”.
- Chỉnh CSS tránh tràn layout.
- Đồng bộ theme với QLCL Web.

---

## 8. Batch 10D - Testing and polish

Checklist:

```text
[ ] /ai-agent/chat vào được nếu có ai_agent:use
[ ] User thiếu quyền bị 403
[ ] Chat UI không tràn layout
[ ] Sidebar portal và sidebar chat không xung đột
[ ] API chat hoạt động nếu đã có backend
[ ] Không ảnh hưởng dashboard/input/import
```

---

## 9. Prompt Codex gợi ý

```text
Thực hiện Phase 10 - Agent-AI Integration Later.
Chỉ tích hợp Agent-AI như module phụ trong QLCL Web. Trước hết audit route/API/component AI hiện có và ghi docs/phase10_agent_ai_audit.md. Sau đó thêm permission gate ai_agent:use, menu Trợ lý AI, route /ai-agent/chat và bọc UI chat trong PortalLayout.
Không rewrite RAG, không đổi embedding/LLM, không re-index tài liệu, không làm ảnh hưởng các module QLCL đã có.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```



---

<!-- Source file: 19_QA_ACCEPTANCE_CHECKLIST.md -->

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



---

<!-- Source file: 20_DEPLOYMENT_ROLLBACK_RUNBOOK.md -->

# 20 - Deployment & Rollback Runbook

## 1. Mục tiêu

Đảm bảo mỗi phase triển khai có thể kiểm soát, backup và rollback nếu lỗi. Runbook này là khung chung, cần điều chỉnh theo repo/server thực tế sau Phase 0 audit.

---

## 2. Nguyên tắc deploy

1. Không deploy nhiều phase cùng lúc nếu chưa test.
2. Backup trước migration lớn.
3. Migration chỉ thêm bảng/cột/index trong các phase đầu, tránh drop dữ liệu.
4. Feature mới có thể ẩn bằng permission/menu nếu lỗi.
5. Không lưu file upload vào public folder.
6. Không deploy secret trong repo.

---

## 3. Trước khi deploy

```bash
git status
git log --oneline -5
docker compose ps
```

Checklist:

```text
[ ] Branch đúng
[ ] Working tree sạch hoặc đã commit
[ ] Backup database
[ ] Backup private storage nếu cần
[ ] Backup .env ngoài repo
[ ] Build frontend pass
[ ] Compile backend pass
[ ] Migration đã test ở staging/local
[ ] Có rollback note
```

---

## 4. Backup gợi ý

```bash
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
pg_dump "$DATABASE_URL" > backups/$(date +%Y%m%d_%H%M%S)/db.sql
cp .env backups/$(date +%Y%m%d_%H%M%S)/env.backup
# Nếu có storage:
tar -czf backups/$(date +%Y%m%d_%H%M%S)/storage.tar.gz storage/
```

Không commit thư mục backup.

---

## 5. Deploy flow đề xuất

```text
Pull code
→ install/build nếu cần
→ run migration
→ restart service
→ health check
→ smoke test UI/API
→ monitor logs
```

Lệnh tham khảo:

```bash
git pull
npm run build
python -m compileall backend
# alembic upgrade head hoặc migration command tương ứng
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

---

## 6. Smoke test sau deploy

### Auth/portal

```text
[ ] /login mở được
[ ] Login được
[ ] / mở được
[ ] Sidebar/topbar đúng
[ ] User thiếu quyền bị 403
```

### Data workflow

```text
[ ] /reports/input mở được
[ ] Tạo draft được
[ ] Submit được
[ ] /reports/review thấy task
[ ] Approve/reject được
[ ] Lock kỳ được
```

### Import

```text
[ ] Upload file nhỏ được
[ ] Preview có dữ liệu
[ ] Confirm/cancel được
```

### Calculation/dashboard

```text
[ ] Chạy calculation được
[ ] Có result
[ ] Dashboard có dữ liệu
```

---

## 7. Rollback theo loại lỗi

### 7.1 Frontend lỗi

- Revert commit frontend.
- Hoặc tắt menu bằng permission.
- Backend/migration có thể giữ nếu chưa gây lỗi.

### 7.2 Backend API lỗi

- Revert commit backend.
- Restart backend.
- Nếu migration chỉ thêm bảng/cột, thường không cần rollback DB ngay.

### 7.3 Migration lỗi

- Nếu chưa có dữ liệu thật: có thể drop bảng `quality_*` mới tạo sai.
- Nếu đã có dữ liệu: restore backup hoặc tạo migration sửa.
- Không drop dữ liệu sản xuất nếu chưa backup.

### 7.4 Import file lỗi

- Tắt permission `reports:import:upload` tạm thời.
- Giữ dữ liệu đã import trong batch để đối chiếu.
- Không xóa file/batch nếu cần audit.

### 7.5 Calculation sai

- Tắt `etl:run` hoặc dashboard menu.
- Giữ Power BI/báo cáo cũ làm nguồn đối chiếu.
- Tạo calculation_version mới khi sửa công thức.

---

## 8. Feature toggle bằng permission

Có thể tắt module bằng cách gỡ permission khỏi role:

```text
reports:import:view
reports:import:upload
dashboard:view
etl:run
ai_agent:use
```

Đây là rollback mềm, không cần revert code ngay.

---

## 9. Logging cần theo dõi

- Backend errors.
- Frontend build/runtime errors.
- DB migration logs.
- Import parsing errors.
- Calculation run errors.
- Audit logs bất thường.
- Disk storage upload.

---

## 10. Go-live khuyến nghị

Không bật toàn bộ role cho tất cả người dùng ngay.

```text
Tuần 1: Admin/QLCL test nội bộ
Tuần 2: Data entry nhập thử
Tuần 3: Department manager duyệt thử
Tuần 4: Dashboard đối chiếu Power BI
Sau 1-2 kỳ: mở rộng người dùng
```

Agent-AI chỉ tích hợp sau khi QLCL Web ổn định.



---

<!-- Source file: 21_CODEX_PHASE_PROMPTS.md -->

# 21 - Codex Phase Prompts

Tài liệu này chứa prompt ngắn để copy cho Codex theo từng phase/batch. Nên gửi từng prompt nhỏ, không gửi toàn bộ file một lần.

---

## Phase 0 Prompt

```text
Bạn đang thực hiện Phase 0 - Baseline & Repo Audit cho QLCL Web.
Không sửa logic hệ thống. Hãy kiểm tra repo structure, frontend/backend stack, auth hiện có, migration framework, Docker Compose, lệnh test/build.
Tạo file docs/phase0_repo_audit.md ghi rõ phát hiện và gap cho Phase 1.
Không commit .env, secret, backup. Không làm Agent-AI ở phase này.
Sau khi xong, báo file đã tạo và lệnh đã chạy.
```

---

## Phase 1A Prompt - Login/Auth

```text
Thực hiện Phase 1A - Login/Auth baseline.
Nếu repo đã có auth, tái sử dụng và chuẩn hóa /api/v1/auth/me để trả user, roles, permissions, scopes. Nếu chưa có auth, tạo login tối thiểu an toàn, không hard-code secret/password trong repo.
Tạo /login, auth provider/client, logout flow. User chưa login phải bị chặn khỏi route nội bộ.
Không làm RBAC schema đầy đủ, không làm input/import/dashboard, không Agent-AI.
Chạy lint/build/compile phù hợp và báo file đã sửa, cách test.
```

## Phase 1B Prompt - Portal shell

```text
Thực hiện Phase 1B - Portal shell.
Tạo PortalLayout, Sidebar, Topbar, PageHeader, PermissionGate. Tạo route placeholder: /, /dashboard, /indicators, /reports/input, /reports/import, /reports/review, /reports/locked-periods, /etl, /admin.
Menu hiển thị theo permission từ auth/me nếu có, hoặc cấu trúc sẵn để Phase 2 kết nối.
Không làm chức năng thật của input/import/dashboard. Không Agent-AI.
Chạy build/lint và báo cách kiểm.
```

## Phase 1C Prompt - Route guard

```text
Thực hiện Phase 1C - Route guard & permission UI.
Tạo protected route guard, PermissionDenied/403 UI, redirect /login khi chưa đăng nhập. Ẩn/disable menu hoặc button nếu thiếu permission.
Không làm DB migration hoặc feature nghiệp vụ. Không Agent-AI.
Chạy test/build và báo cách kiểm.
```

---

## Phase 2A Prompt - Master data migration

```text
Thực hiện Phase 2A - Master data and indicator metadata migration.
Tạo migration cho quality_departments, quality_stations, quality_hospitals, quality_indicator_catalog, quality_indicator_variables, quality_indicator_thresholds. Thêm indexes cần thiết. Seed tối thiểu departments và một số indicator/variables mẫu nếu phù hợp.
Migration phải idempotent hoặc theo framework migration hiện có.
Không làm input/import/review/calculation/dashboard/Agent-AI.
Chạy migration/test và báo cách kiểm query.
```

## Phase 2B Prompt - RBAC migration

```text
Thực hiện Phase 2B - RBAC and logs migration.
Tạo quality_roles, quality_permissions, quality_role_permissions, quality_user_roles, quality_user_scopes, quality_audit_logs, quality_data_quality_logs. Thêm indexes.
Không thay đổi bảng ngoài quality_* trừ khi bắt buộc để liên kết user hiện có.
Không làm UI admin đầy đủ. Không Agent-AI.
Chạy migration/test và báo cách kiểm.
```

## Phase 2C Prompt - RBAC seed

```text
Thực hiện Phase 2C - RBAC seed.
Seed roles: system_admin, quality_admin, department_manager, data_entry, dashboard_viewer, etl_operator, auditor, ai_agent_user.
Seed permissions theo tài liệu RBAC, gồm portal, dashboard, reports input/import/review/lock, indicators, etl, admin, export, ai_agent:use. Map role_permissions mặc định. Seed phải chạy lại không tạo trùng.
Không làm UI admin đầy đủ. Không Agent-AI.
Chạy seed/test và báo cách kiểm.
```

## Phase 2D Prompt - RBAC helpers

```text
Thực hiện Phase 2D - Backend RBAC helpers and audit service.
Tạo require_permission, require_any_permission, require_scope, require_period_not_locked và audit_service.log_audit. Tạo API đọc master data: departments, stations, hospitals, indicator catalog, variables.
API phải yêu cầu login. Không làm input/import/review/calculation/dashboard thật. Không Agent-AI.
Chạy test/compile và báo cách kiểm.
```

---

## Phase 3 Prompt - Manual input MVP

```text
Thực hiện Phase 3 - Manual Web Input MVP.
Tạo API form-template, create/list/detail/update/submit input batch. Áp dụng permission reports:input:view/create/update_own/update_department/submit, scope department/station, period lock guard. Ghi audit log khi tạo/sửa/submit.
Tạo frontend /reports/input với filter, form fields, validate, save draft, submit, loading/error/empty state.
Không làm Excel import, review approve/reject đầy đủ, calculation, dashboard, Agent-AI.
Sau khi xong chạy test/build phù hợp và báo cách kiểm thủ công.
```

---

## Phase 4 Prompt - Excel import

```text
Thực hiện Phase 4 - Excel Import, Preview & Validation.
Tạo upload API nhận xlsx/xls/csv, kiểm extension/dung lượng, lưu private storage, tính hash, tạo import batch. Parse rows, ghi quality_import_rows, validate row và trả preview. Tạo confirm/cancel API với permission/scope/period lock guard và audit log. Tạo UI /reports/import.
Không làm calculation, dashboard, Agent-AI, không đưa file vào public storage.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```

---

## Phase 5 Prompt - Review and lock

```text
Thực hiện Phase 5 - Review, Approval & Period Lock.
Tạo review task list, approve/reject input batch với permission/scope guard và audit log. Không cho người nhập tự duyệt nếu không có quyền đặc biệt. Tạo period lock APIs, lock/unlock với reason, và guard chặn sửa dữ liệu kỳ đã khóa. Tạo UI /reports/review và /reports/locked-periods.
Không làm calculation, dashboard, export, Agent-AI.
Sau khi xong chạy test/build phù hợp và báo cách kiểm thủ công.
```

---

## Phase 6 Prompt - Calculation engine

```text
Thực hiện Phase 6 - Calculation Engine MVP.
Tạo backend/data_engine với safe_math, variable loader, indicator registry và job run_calculation. Tạo API calculate/run, calculate/runs, calculate/runs/{id}. Calculation đọc input records đã approved/locked, ghi quality_calculation_runs và upsert quality_indicator_results. Tính tối thiểu nhóm chỉ số MVP khả dụng, ưu tiên CS1-CS5 nếu đủ dữ liệu. Tạo UI /etl/calculation-runs.
Không tính đủ 53 chỉ số, không làm dashboard phức tạp, không Agent-AI.
Sau khi xong chạy compile/test phù hợp và báo cách kiểm.
```

---

## Phase 7 Prompt - Dashboard MVP

```text
Thực hiện Phase 7 - Dashboard MVP.
Tạo API dashboard summary, trend, station-compare và indicators/results đọc từ quality_indicator_results, áp dụng permission/scope guard. Tạo components dashboard và các route /dashboard/bgd, /dashboard/kdh, /dashboard/kccnbv, /dashboard/quality với filters, KPI cards, chart/table MVP, loading/error/empty states.
Không query raw/import/input trực tiếp từ frontend. Không làm export PDF phức tạp, không Agent-AI.
Sau khi xong chạy build/test phù hợp và báo cách kiểm.
```

---

## Phase 8 Prompt - Export

```text
Thực hiện Phase 8 - Export Reports.
Tạo Excel export API đọc từ quality_indicator_results/catalog, áp dụng permission reports:export:excel và scope guard, ghi audit export_report. Tạo UI /reports/export để chọn kỳ/phạm vi và download Excel. PDF/Word chỉ làm skeleton hoặc ghi rõ deferred nếu chưa đủ thời gian.
Không lưu file nhạy cảm public, không Agent-AI.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```

---

## Phase 9 Prompt - Admin/Audit/Monitoring

```text
Thực hiện Phase 9 - Admin, Audit & Monitoring Hardening.
Tạo Admin RBAC APIs/UI để xem/gán roles, permissions, scopes; tạo audit log viewer và data quality log viewer; tạo /api/v1/system/health. Áp dụng admin permissions và audit log cho thay đổi role/scope. Kiểm tra không log password/token, upload folder private.
Không làm Agent-AI nếu chưa chuyển Phase 10.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```

---

## Phase 10 Prompt - Agent-AI later

```text
Thực hiện Phase 10 - Agent-AI Integration Later.
Chỉ tích hợp Agent-AI như module phụ trong QLCL Web. Trước hết audit route/API/component AI hiện có và ghi docs/phase10_agent_ai_audit.md. Sau đó thêm permission gate ai_agent:use, menu Trợ lý AI, route /ai-agent/chat và bọc UI chat trong PortalLayout.
Không rewrite RAG, không đổi embedding/LLM, không re-index tài liệu, không làm ảnh hưởng các module QLCL đã có.
Sau khi xong chạy test/build phù hợp và báo cách kiểm.
```



---

<!-- Source file: 22_TRACEABILITY_MATRIX.md -->

# 22 - Traceability Matrix

Ma trận này giúp kiểm tính năng nào nằm ở phase nào, liên quan DB/API/UI/test nào.

| Feature | Phase | DB | API | UI | Permission | Test chính |
|---|---:|---|---|---|---|---|
| Login | 1 | user/auth existing hoặc auth tables hiện có | `/api/v1/auth/login`, `/me`, `/logout` | `/login` | authenticated | Login/logout, redirect |
| Portal shell | 1 | none | `/me` | `/`, Sidebar, Topbar | `portal:view` | Menu theo quyền |
| RBAC seed | 2 | `quality_roles`, `quality_permissions`, `quality_role_permissions` | admin later | none | `admin:*` | Seed idempotent |
| Scope | 2 | `quality_user_scopes` | admin later | none | scope guard | User ngoài scope bị chặn |
| Audit log | 2 | `quality_audit_logs` | audit later | admin later | `admin:view_audit_logs` | Action ghi log |
| Master data | 2 | departments/stations/hospitals | master APIs | select filters | `portal:view` hoặc module permission | Dropdown có dữ liệu |
| Indicator catalog | 2 | `quality_indicator_catalog`, variables | catalog APIs | `/indicators/catalog` later | `indicators:view` | Query catalog |
| Manual input template | 3 | variables/catalog | `/input/form-template` | `/reports/input` | `reports:input:view` | Load form |
| Create draft | 3 | input_batches/records | `POST /input/batches` | `/reports/input` | `reports:input:create` | Draft created |
| Submit input | 3 | input_batches | `/submit` | `/reports/input` | `reports:input:submit` | Status submitted |
| File upload | 4 | import_batches | `/import/upload` | `/reports/import` | `reports:import:upload` | File private |
| Import preview | 4 | import_rows | `/preview` | `/reports/import` | `reports:import:preview` | Error rows visible |
| Confirm import | 4 | input_batches/records | `/confirm` | `/reports/import` | `reports:import:confirm` | Rows transferred |
| Review task | 5 | review_tasks | `/review/tasks` | `/reports/review` | `reports:review:view` | Task visible by scope |
| Approve/reject | 5 | input_batches/review_tasks | `/approve`, `/reject` | `/reports/review` | `reports:review:*` | Status update |
| Period lock | 5 | period_locks | `/period-locks` | `/reports/locked-periods` | `reports:period_lock:*` | Locked blocks edits |
| Calculation run | 6 | calculation_runs | `/calculate/run` | `/etl/calculation-runs` | `etl:run` | Run status |
| Indicator results | 6 | indicator_results | calculate APIs | calc/detail | `indicators:view_results` | Result upsert |
| Dashboard summary | 7 | indicator_results | `/dashboard/summary` | `/dashboard/*` | `dashboard:view` | KPI visible |
| Trend/compare | 7 | indicator_results | `/dashboard/trend`, `/station-compare` | charts | dashboard permissions | Chart visible |
| Export Excel | 8 | indicator_results/catalog | `/export/excel` | `/reports/export` | `reports:export:excel` | Download OK |
| Admin role assignment | 9 | user_roles/scopes | admin APIs | `/admin/*` | `admin:manage_*` | Assign works |
| Audit viewer | 9 | audit_logs | `/admin/audit-logs` | `/admin/audit-logs` | `admin:view_audit_logs` | Logs visible |
| Health check | 9 | none | `/api/v1/system/health` | optional | admin/system | OK response |
| Agent-AI menu | 10 | existing AI + RBAC | AI existing/proxy | `/ai-agent/chat` | `ai_agent:use` | Guarded AI route |

---

## Coverage check

```text
[ ] Mỗi feature có phase rõ
[ ] Mỗi feature có DB hoặc ghi rõ không cần DB
[ ] Mỗi API có permission
[ ] Mỗi UI có route
[ ] Mỗi action thay đổi dữ liệu có audit log
[ ] Mỗi phase có acceptance checklist
```
