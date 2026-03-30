# QAuthority - Design Specification

**Version:** 1.0
**Date:** 2026-03-23
**Author:** dotch3@gmail.com

---

## Overview

QAuthority is a comprehensive test case management platform designed for development and QA teams. It provides centralized management of test plans, test suites, test cases, execution tracking, and bug reporting.

---

## Tech Stack

| Component | Technology |
|----------|------------|
| Backend | Node.js 22, Fastify 5, TypeScript |
| Frontend | Next.js 16, React 19, TypeScript |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| ORM | Prisma 6 |
| UI | Tailwind CSS 4, shadcn/ui, Lucide React |
| i18n | next-intl |
| Auth | JWT + OAuth2 (GitHub, Google, Microsoft) |

---

## Architecture

### Backend

Clean architecture with layers:
- `src/domain/` — Domain entities with business logic
- `src/services/` — Application services
- `src/infrastructure/` — Database, cache, queue, mail adapters
- `src/interfaces/http/` — HTTP routes, plugins, middleware

### Frontend

Next.js 16 App Router with:
- Route groups: `(auth)` for public pages, `(app)` for authenticated
- next-intl for i18n (no locale prefix in URLs)
- shadcn/ui components
- Server and client components appropriately

---

## Database Schema (22 Tables)

### Core Entities
- `users` — Application users
- `projects` — Test projects
- `project_members` — User-project membership

### Test Management
- `test_plans` — Test plans with status
- `test_suites` — Hierarchical test suites (self-reference)
- `test_cases` — Test cases with steps
- `test_executions` — Execution runs
- `execution_steps` — Each test case in an execution

### Bugs
- `bugs` — Bug reports with severity/priority
- `bug_execution_links` — Many-to-many linking

### Integrations
- `integrations` — Project-level config (Jira, GitHub, etc.)
- `o_auth_accounts` — Linked OAuth accounts

### System
- `roles` + `role_permissions` — RBAC
- `sessions` — Revocable refresh tokens
- `password_reset_tokens` — Time-limited reset tokens
- `audit_logs` — Activity logging
- `enum_values` — Customizable enums
- `custom_field_definitions` + `custom_field_values` — Dynamic fields
- `attachments` — File attachments
- `system_settings` — Key-value configuration

---

## Authentication

### Local Auth
- Email + password login
- JWT access tokens (8h expiry)
- Refresh tokens (30d expiry, stored in DB for revocation)
- Password policy: min 8 chars, uppercase, symbol
- Account lockout after 5 failed attempts

### OAuth2
- GitHub, Google, Microsoft
- OAuth accounts linked to user profile

### RBAC
- Roles: admin, lead, tester, viewer
- Granular permissions per resource + action
- Permission guard middleware

---

## Frontend UI

### Layout
- Collapsible sidebar (256px / 64px collapsed)
- Header with breadcrumbs and profile dropdown
- Mobile responsive (Sheet-based sidebar)

### Theme
- Dark/Light/System modes
- Stored per-user in profile
- CSS variables with shadcn/ui palette

### Internationalization
- next-intl for translations (clean URLs without locale prefix)
- Default locale from SYSTEM_SETTINGS
- Per-user locale preference
- Date/number formatting per locale

---

## Integration Architecture

### Two-Layer Model

1. **User-level credentials** (`USER_INTEGRATION_CREDENTIALS`)
   - Each user stores their API token/PAT
   - Encrypted with AES-256-GCM
   - Actions appear as the user, not a service account

2. **Project-level config** (`INTEGRATIONS`)
   - Admin configures tracker type, URL, repository
   - No credentials stored here
   - Combined with user's credential at runtime

---

## Environment Configuration

### Files
- `.env.local` — Local development
- `.env.podman` — Podman/Docker deployment
- `.env.example` — Template

### Key Variables
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
ENCRYPTION_KEY=... (64-char hex)
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```

---

## API Documentation

Swagger UI at `/docs` when backend is running.

Base URL: `/api/v1`

Key endpoints:
- `POST /auth/login` — Local login
- `GET /auth/oauth/:provider` — OAuth redirect
- `POST /auth/refresh` — Token refresh
- `GET /profile` — Current user
- `GET /projects` — User's projects
- `GET /executions` — Execution list
- `GET /bugs` — Bug list

---

## TODO

- [ ] Implement Plan 3 (Frontend Core Layout)
- [ ] Implement Plan 4 (Auth UI)
- [ ] Implement Plan 5 (Projects)
- [ ] Implement Plan 6 (Test Plans/Suites/Cases)
- [ ] Implement Plan 7 (Executions/Bugs)
- [ ] Implement Plan 8 (Admin)
- [ ] Implement Plan 9 (Profile/Integrations)
- [ ] Implement Plan 10 (Reports)
