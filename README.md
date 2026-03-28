# QAuthority — Enterprise QA Command Center

> The governance platform built for QA Managers who need more than test cases.
> Real-time DORA metrics, OKR tracking, executive dashboards, Process Behavior Charts,
> and multi-team visibility — all in one command center.

---

## Why QAuthority?

Traditional test management tools track test cases. **QAuthority tracks quality.**

Your QA team doesn't just run tests — they govern a quality process that spans
multiple teams, multiple projects, and multiple stakeholders. QAuthority gives
you the data, the dashboards, and the reports to lead that process with authority.

---

## Key Capabilities

| Module | What it does |
|--------|-------------|
| **Test Command** | Full test lifecycle: Plans → Suites → Cases → Executions → Defects |
| **QA Governance** | DORA metrics, OKRs (org + project), KPIs, Process Behavior Charts |
| **Executive Dashboards** | Cross-project health scorecards, team comparisons, OKR rollup |
| **Visual Process Designer** | Drag-and-drop QA workflow builder with Mermaid.js export |
| **Advanced Reporting** | PDF/DOCX/Excel reports + Prometheus/Grafana data export |
| **AI Code Generation** | Manual test steps → Playwright/Cypress/Jest POM automation code |
| **CI/CD Integrations** | GitHub Actions, Jenkins webhook ingestion, Jira/GitHub issue sync |
| **Groups & Permissions** | Fine-grained per-module permissions for every QA role |

---

## QA Manager Use Cases

**Quarterly executive review:**
1. Open Executive Dashboard → select "All Projects"
2. See team health scorecards + DORA trends with Process Behavior Chart signal detection
3. Export as DOCX Executive Briefing → present to CTO

**Sprint planning:**
1. Open OKRs → adopt org-level OKR into your project
2. Track progress via Key Results updated after each execution cycle

**Onboarding a new automation engineer:**
1. Create a "Automation Engineer" group with AI Codegen permissions
2. Add them to the group
3. They select any manual test case → AI generates Playwright POM code in one click

**Standardizing QA process across teams:**
1. Open Process Designer → create a "Sprint QA Workflow"
2. Export as Mermaid.js → embed in team wikis
3. Import on other projects to replicate the process

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  QAuthority — Frontend (Next.js 16 + React 19)      │
│  Module Rail + Contextual Sidebar + Executive Views │
└────────────────────┬────────────────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────────────────┐
│  qauthority-api (Fastify 5 + TypeScript)             │
│  Auth: JWT + OAuth2 (GitHub / Google / Microsoft)   │
│  Queue: BullMQ + Redis (reports, metric collection) │
└────────────────────┬────────────────────────────────┘
                     │ Prisma ORM
┌────────────────────▼────────────────────────────────┐
│  PostgreSQL 16                                      │
│  30+ tables: test hierarchy, metrics, OKRs,         │
│  workflows, AI configs, CI builds, groups           │
└─────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Docker + Docker Compose
- Node.js 20+

### 1. Clone and configure

```bash
git clone https://github.com/your-org/qauthority.git
cd qauthority
cp .env.example .env.local
# Edit .env.local with your database URL, JWT secret, and OAuth credentials
```

### 2. Start services

```bash
docker-compose up -d
```

### 3. First-run setup

Open `http://localhost:3000/setup` and complete the Setup Wizard:
- System health check
- Language & locale (default: English)
- Create admin account
- Seed default groups (System Admin, QA Manager, QA Lead, QA Engineer, etc.)

### 4. Log in

Open `http://localhost:3000/login` — use the admin credentials from setup.

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Yes |
| `AI_KEY_ENCRYPTION_SECRET` | AES-256 key for AI API key storage (32 chars) | Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID | Optional |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret | Optional |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Optional |
| `REPORT_OUTPUT_DIR` | Directory for generated report files | Optional |
| `SMTP_HOST` | SMTP host for email notifications | Optional |

---

## Tech Stack

- **Backend:** Node.js + TypeScript + Fastify 5 + Prisma 6
- **Frontend:** Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui
- **Database:** PostgreSQL 16
- **Queue:** BullMQ 5 + Redis 7
- **Auth:** JWT + OAuth2
- **i18n:** next-intl (English / Portuguese / Spanish)
- **Testing:** Vitest 2

---

## License

MIT
