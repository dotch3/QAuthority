# QAuthority — Enterprise QA Command Center

> The governance platform built for QA Managers who need more than test cases.
> Real-time DORA metrics, OKR tracking, executive dashboards, Process Behavior Charts,
> and multi-team visibility — all in one command center.

---

## Key Capabilities

| Module | What it does |
|--------|-------------|
| **Test Command** | Full test lifecycle: Plans → Suites → Cases → Executions → Defects |
| **QA Governance** | DORA metrics, OKRs (org + project), KPIs, Process Behavior Charts |
| **Executive Dashboards** | Cross-project health scorecards, team comparisons, OKR rollup |
| **Visual Process Designer** | Drag-and-drop QA workflow builder (ReactFlow) with Mermaid export |
| **Advanced Reporting** | PDF/DOCX/Excel reports + Prometheus/Grafana data export |
| **AI Code Generation** | Manual test steps → Playwright/Cypress/Jest POM automation code |
| **CI/CD Integrations** | GitHub Actions, Jenkins webhook ingestion, Jira/GitHub issue sync |
| **Groups & Permissions** | Fine-grained per-module permissions for every QA role |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend  (Next.js 16 + React 19)  :3000           │
└────────────────────┬────────────────────────────────┘
                     │ REST API (HTTP/JSON)
┌────────────────────▼────────────────────────────────┐
│  Backend  (Fastify 5 + TypeScript)  :3001           │
│  Auth: JWT  |  Queue: BullMQ + Redis                │
└────────────────────┬────────────────────────────────┘
                     │ Prisma ORM
┌────────────────────▼────────────────────────────────┐
│  PostgreSQL 16  (DB: qauthority)                    │
└─────────────────────────────────────────────────────┘
```

---

## Quick Start

### Option A — Local Development (no Docker)

**Prerequisites:** Node.js 20+, PostgreSQL 16+, Redis 7+

**1. Clone and configure**

```bash
git clone https://github.com/dotch3/QAuthority.git
cd QAuthority
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/qauthority
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-to-a-strong-secret-min-32-chars
ENCRYPTION_KEY=<64-char hex string>
ADMIN_EMAIL=admin@qauthority.com
ADMIN_PASSWORD=Changeme123!
```

**2. Backend**

```bash
cd backend
cp ../.env .env
npm install
npx prisma migrate deploy   # apply all migrations
npx prisma db seed          # seed admin user, groups, demo project
npm run dev                 # starts on http://localhost:3001
```

**3. Frontend**

```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1" > .env.local
npm install
npm run dev                 # starts on http://localhost:3000
```

**4. Log in**

Open `http://localhost:3000` and log in with:
- **Email:** `admin@qauthority.com`
- **Password:** `Changeme123!`

---

### Option B — Docker (full stack)

**Prerequisites:** Docker + Docker Compose

**1. Clone and configure**

```bash
git clone https://github.com/dotch3/QAuthority.git
cd QAuthority
cp .env.example .env
# Edit .env — set JWT_SECRET, ENCRYPTION_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
```

**2a. Start everything including local PostgreSQL + Redis**

```bash
docker compose --profile local-db up
```

This starts: PostgreSQL, Redis, API (auto-runs migrations + seed on first boot), Frontend, and a nightly backup container.

**2b. Use an external database (Supabase / Neon / RDS)**

```bash
# Set DATABASE_URL in .env to your cloud DB connection string, then:
docker compose up
```

**3. Log in**

Open `http://localhost:3000` — credentials are the `ADMIN_EMAIL` / `ADMIN_PASSWORD` values from your `.env`.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `ENCRYPTION_KEY` | Yes | 64-char hex key for AES-256-GCM (AI key storage) |
| `ADMIN_EMAIL` | Yes | First-boot admin email |
| `ADMIN_PASSWORD` | Yes | First-boot admin password |
| `AUTH_MODE` | No | `local` \| `oauth` \| `both` (default: `both`) |
| `ALLOW_REGISTRATION` | No | Allow self-registration (default: `false`) |
| `NEXT_PUBLIC_API_URL` | Yes (frontend) | Backend API URL (e.g. `http://localhost:3001/api/v1`) |
| `OAUTH_GITHUB_CLIENT_ID` | No | GitHub OAuth app ID |
| `OAUTH_GITHUB_CLIENT_SECRET` | No | GitHub OAuth app secret |
| `OAUTH_GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `OAUTH_GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `SMTP_HOST` | No | SMTP host for email notifications |

See `.env.example` for the full list.

---

## Database Reset (development only)

```bash
cd backend
npx prisma migrate reset --force   # drops DB, re-runs all migrations + seed
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, ReactFlow |
| Backend | Node.js 20, Fastify 5, TypeScript, Prisma 6 |
| Database | PostgreSQL 16 |
| Queue | BullMQ 5 + Redis 7 |
| Auth | JWT (access + refresh tokens), OAuth2 (GitHub / Google / Microsoft) |
| i18n | next-intl (English default) |
| Testing | Vitest 2 |

---

## License

MIT
