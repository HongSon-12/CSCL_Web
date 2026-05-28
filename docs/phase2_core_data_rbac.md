# Phase 2 Core Data And RBAC Notes

Date: 2026-05-27

## Scope Completed

- Added SQLAlchemy models for Phase 2 `quality_*` tables:
  - `quality_departments`
  - `quality_stations`
  - `quality_hospitals`
  - `quality_indicator_catalog`
  - `quality_indicator_variables`
  - `quality_indicator_thresholds`
  - `quality_roles`
  - `quality_permissions`
  - `quality_role_permissions`
  - `quality_user_roles`
  - `quality_user_scopes`
  - `quality_audit_logs`
  - `quality_data_quality_logs`
- Added idempotent seed data for QLCL departments, permissions, roles, CS1-CS10, and A/B variables.
- Added `scripts/seed_quality_rbac.py` for repeatable Phase 2 seed.
- Added SQL fallback migration/seed file for environments without local Python deps:
  `apps/agent-ai/backend/sql/001_quality_phase2_core_data_rbac.sql`.
- Added backend RBAC helpers:
  - `require_permission`
  - `require_any_permission`
  - `require_scope`
  - `require_period_not_locked`
- Added audit service `log_audit`.
- Added read-only master data APIs:
  - `GET /api/v1/quality/master/departments`
  - `GET /api/v1/quality/master/stations`
  - `GET /api/v1/quality/master/hospitals`
  - `GET /api/v1/quality/indicators/catalog`
  - `GET /api/v1/quality/indicators/variables`

## Commands

Backend database split:

```text
POSTGRES_*         -> local AgentAI/RAG database
QUALITY_POSTGRES_* -> external QLCL Web database at 172.16.20.17
```

`apps/agent-ai/docker-compose.yml` now injects root `.env.example` into the backend so `QUALITY_POSTGRES_*` is available to the API container, while overriding `POSTGRES_HOST=postgres` for the local AgentAI DB.

Create tables through current repo mechanism:

```bash
cd apps/agent-ai
docker compose up -d backend
```

Run Phase 2 seed after database is reachable:

```bash
cd apps/agent-ai
python3 scripts/seed_quality_rbac.py
```

The seed is idempotent and can be rerun. It reads `QUALITY_POSTGRES_*` database settings from `apps/agent-ai/.env` when present, then falls back to repo-root `.env.example`.

If Python dependencies are not installed on the host, run the SQL file with a DB client instead:

```bash
psql "$QUALITY_POSTGRES_URL" -f apps/agent-ai/backend/sql/001_quality_phase2_core_data_rbac.sql
```

The SQL file also uses `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT DO NOTHING`, so it avoids overwriting existing rows.

## Notes

- The external Web database at `172.16.20.17` is the target for QLCL Web data.
- The local PostgreSQL database on this server remains for AgentAI/RAG only.
- Phase 2 code must only create and seed new `quality_*` tables on the QLCL Web database.
- Do not update, delete, remap, or overwrite existing tables/data outside `quality_*`.
- User/permission management can be built in new `quality_*` tables. Existing users are referenced by ID/text only when an explicit mapping is created.
- No manual input/import/review/calculation/dashboard feature was implemented in this phase.
- `quality_period_locks` is still a Phase 5 table. `require_period_not_locked` is present now and treats missing period-lock table as unlocked.
- Existing legacy `Admin` users are not automatically assigned `system_admin` by the seed script. Add rows to `quality_user_roles` explicitly when ready.

## Execution Log

Earlier execution was run on local container `ai_chatbot_db` before the DB split decision. Current code no longer targets local DB for QLCL Web data.

Executed on the running PostgreSQL container `ai_chatbot_db` using:

```bash
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 \
  -f /tmp/001_quality_phase2_core_data_rbac.sql
```

Result:

```text
quality_* tables created/confirmed: 13
departments=4
indicators=10
variables=10
permissions=49
roles=8
role_permissions=139
user_roles=0
```

`user_roles=0` is intentional: no existing user was automatically assigned a QLCL role.

After the DB split, the same SQL must be run against `QUALITY_POSTGRES_HOST=172.16.20.17`.

Executed against the external QLCL Web database:

```text
QUALITY_POSTGRES_HOST=172.16.20.17
QUALITY_POSTGRES_DB=postgres
```

Result:

```text
quality_* tables created/confirmed: 13
departments=4
indicators=10
variables=10
permissions=49
roles=8
role_permissions=139
user_roles=0
```

This is now the authoritative database target for QLCL Web data.
