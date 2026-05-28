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
