# Phase 0 Repo Audit - QLCL Web Plan V2

Date: 2026-05-27

## Repo Structure

Frontend path: `apps/agent-ai/frontend`

Backend path: `apps/agent-ai/backend`

Docker compose path: `apps/agent-ai/docker-compose.yml`

Migration path: none detected; current backend uses SQLAlchemy `Base.metadata.create_all`.

Auth path:
- Backend auth helpers: `apps/agent-ai/backend/auth.py`
- Backend auth routes: `apps/agent-ai/backend/main.py`
- Frontend legacy chat auth: `apps/agent-ai/frontend/components/ai-agent/ChatApp.tsx`

Config/env path:
- Example env: `apps/agent-ai/.env.example`
- Compose env usage: `apps/agent-ai/docker-compose.yml`

## Stack

Frontend framework: Next.js 14 App Router with React 18.

Frontend UI: Chakra UI was added for the portal shell.

Backend framework: FastAPI with SQLAlchemy models.

Database: PostgreSQL with pgvector extension.

Worker: Python worker container for Agent-AI/RAG jobs.

## Auth Existing

Auth existing: yes, JWT bearer token.

Login route: `POST /api/v1/auth/login`.

Auth API gap before Phase 1 completion: no `GET /api/v1/auth/me` endpoint was present.

User model/table: `users`.

Role/permission tables: `roles`, `permissions`, `user_roles`, `role_permissions`.

Token storage: frontend stores JWT in browser `localStorage` key `ai-chat-token`.

Current permission model: legacy RBAC for Agent-AI/document/admin permissions. QLCL portal permissions are not seeded yet.

Gap for Phase 1:
- Add `/login` page.
- Add shared frontend auth provider.
- Add `/api/v1/auth/me`.
- Add route guard and permission-aware portal menu.
- Add missing route placeholders for Phase 1.

## Database And Migration

DB engine: PostgreSQL.

Migration framework: none detected.

Migration command: none detected.

Existing user/auth tables: `users`, `roles`, `permissions`, `user_roles`, `role_permissions`.

Existing quality tables: none detected in model files.

Risk of table name conflict: low if new QLCL tables use `quality_*` prefix as required by plan-v2.

## Deployment And Test

Docker services:
- `postgres`
- `backend`
- `worker`
- `frontend`
- `nginx`

Frontend port: `3000`.

Backend port: `8000`.

DB port: `5432`.

Proxy port: `80`.

Health endpoint: `GET /api/v1/health`.

Build commands:
- Frontend: `npm run build` in `apps/agent-ai/frontend`.
- Frontend lint: `npm run lint` in `apps/agent-ai/frontend`.
- Backend compile: `python -m compileall apps/agent-ai/backend`.

Known failures before Phase 1 completion:
- Portal shell existed, but protected route behavior was not complete.
- `/login` was missing.
- `/api/v1/auth/me` was missing.
- `reports/input`, `reports/import`, `reports/review`, and `reports/locked-periods` placeholders were missing.
