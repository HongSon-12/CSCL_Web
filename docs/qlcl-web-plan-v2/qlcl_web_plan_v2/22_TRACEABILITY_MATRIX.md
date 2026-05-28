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
