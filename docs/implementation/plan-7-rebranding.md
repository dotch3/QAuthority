# Plan 7: QAuthority Rebranding

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the product identity from "testtool" to **QAuthority — Enterprise QA Command Center**. Update all documentation, API metadata, package names, Docker config, and UI copy. Rename selected DB entities that are misleading at enterprise scale.

**Architecture:** Four layers, executed in order: (1) Docs + README, (2) Package/Docker names, (3) DB entity renames + migrations, (4) UI copy. Layers 1–2 are independent and safe. Layer 3 requires a Prisma migration. Layer 4 is pure string replacement in frontend components.

**Tech Stack:** File edits, Prisma migration, shell sed/find operations, Next.js i18n strings

**Depends on:** Independent — can run alongside any other plan. Layer 3 recommended after Plan 0 is merged (avoids conflicts on UserGroup rename).

---

## File Map

### Layer 1 — Docs (no code risk)
- Modify: `README.md`
- Rename: `docs/testtools-specs.md` → `docs/qauthority-specs.md`
- Modify: `docs/superpowers/specs/2026-03-27-testtool-governance-design.md` (title)
- Modify: all `.md` files in `/docs/` (string replacement)

### Layer 2 — Package & Docker
- Modify: `backend/package.json`
- Modify: `frontend/package.json`
- Modify: `docker-compose.yml`
- Modify: `backend/src/server.ts` or main entry (Swagger info)

### Layer 3 — Entity Renames (DB migration required)
- Modify: `backend/prisma/schema.prisma` (rename `Bug` → `Defect`, `ETCharter` → `ExploratoryCharter`)
- New migration file
- Modify: all backend service/route files referencing `bug` or `etCharter`

### Layer 4 — UI Copy
- Modify: `frontend/src/components/layout/ModuleSidebar.tsx`
- Modify: `frontend/src/app/login/page.tsx`
- Modify: all i18n message files in `frontend/src/messages/`
- Modify: browser tab titles (`<title>` in layout files)

---

## Task 1: Rewrite README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README content**

Overwrite `README.md` with:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README as QAuthority Enterprise QA Command Center"
```

---

## Task 2: Rename Docs

**Files:**
- Rename: `docs/testtools-specs.md` → `docs/qauthority-specs.md`

- [ ] **Step 1: Rename spec file**

```bash
git mv docs/testtools-specs.md docs/qauthority-specs.md
```

- [ ] **Step 2: Replace "testtool" references in all docs**

```bash
cd /Users/dotch3/Documents/Coding/AIProjects/testtool
# Preview what would change (don't run -i yet, review first)
grep -r "testtool\|testtools" docs/ --include="*.md" -l
```

For each file listed, open it and replace:
- `testtool` → `QAuthority`
- `testtools` → `QAuthority`
- `test tool` → `QAuthority`

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: rename testtools-specs.md to qauthority-specs.md and update all doc references"
```

---

## Task 3: Update Package Names

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Update backend package name**

In `backend/package.json`, change:
```json
"name": "testtool-backend"
```
to:
```json
"name": "qauthority-api"
```

- [ ] **Step 2: Update frontend package name**

In `frontend/package.json`, change:
```json
"name": "testtool-frontend"
```
to:
```json
"name": "qauthority-ui"
```

- [ ] **Step 3: Update Docker service names**

In `docker-compose.yml`, rename services:
- `testtool-api` → `qauthority-api`
- `testtool-ui` → `qauthority-ui`
- `testtool-db` → `qauthority-db` (or keep `db`)

Update image names and container names accordingly.

Example:
```yaml
services:
  qauthority-api:
    container_name: qauthority-api
    build:
      context: ./backend
    # ... rest unchanged

  qauthority-ui:
    container_name: qauthority-ui
    build:
      context: ./frontend
    # ... rest unchanged
```

- [ ] **Step 4: Commit**

```bash
git add backend/package.json frontend/package.json docker-compose.yml
git commit -m "chore: rename packages and Docker services from testtool to qauthority"
```

---

## Task 4: Update Swagger/OpenAPI Info

**Files:**
- Modify: `backend/src/server.ts` (or wherever Swagger is configured)

- [ ] **Step 1: Find Swagger config**

```bash
grep -r "swagger\|openapi\|title.*API" backend/src/ --include="*.ts" -l
```

- [ ] **Step 2: Update Swagger info block**

Find the Swagger registration (typically in `server.ts` or `app.ts`) and update:

```typescript
await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'QAuthority API',
      version: '1.0.0',
      description: `QAuthority is an Enterprise QA Governance Platform providing
multi-project test management, executive KPI dashboards,
DORA metrics, OKR tracking, and AI-powered test automation.

Designed for QA Managers governing multiple teams at scale.

Authentication: Bearer JWT (obtain via /auth/login or OAuth2)`,
      contact: {
        name: 'QAuthority Support',
      },
    },
    // ... rest unchanged
  },
})
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/
git commit -m "docs(api): update Swagger title and description to QAuthority branding"
```

---

## Task 5: DB Entity Renames — Bug → Defect (Layer 3)

> **Note:** Do this after Plan 0 is merged to avoid merge conflicts.

**Files:**
- Modify: `backend/prisma/schema.prisma`
- New migration
- Modify: `backend/src/services/BugService.ts` → rename file + class
- Modify: all routes referencing `bugs`

- [ ] **Step 1: Rename Bug model to Defect in schema**

In `backend/prisma/schema.prisma`:
- Rename `model Bug` → `model Defect`
- Update all `@relation` references from `Bug` to `Defect`
- Update `bug` field names in related models to `defect`

Example:
```prisma
model Defect {
  id          String   @id @default(uuid())
  title       String
  // ... all existing fields unchanged
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  externalIssues ExternalIssue[]
  @@map("defects")  // DB table name
}
```

- [ ] **Step 2: Generate and apply migration**

```bash
cd backend
npx prisma migrate dev --name rename_bug_to_defect
```

Expected: migration creates `ALTER TABLE "Bug" RENAME TO "defects"` (or equivalent).

- [ ] **Step 3: Rename BugService to DefectService**

```bash
git mv backend/src/services/BugService.ts backend/src/services/DefectService.ts
```

In the file, rename the class:
```typescript
export class DefectService {
  // ... same implementation, just class name changed
}
```

- [ ] **Step 4: Update all route and import references**

Search and replace in backend `src/`:
- `BugService` → `DefectService`
- `from '../services/BugService'` → `from '../services/DefectService'`
- `prisma.bug` → `prisma.defect`
- Route prefix: keep `/bugs` as-is for API backwards compatibility (don't change routes — changing API paths would break existing integrations)

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/ backend/src/
git commit -m "refactor(db): rename Bug → Defect model and BugService → DefectService"
```

---

## Task 6: UI Copy Updates (Layer 4)

**Files:**
- Modify: `frontend/src/components/layout/ModuleSidebar.tsx`
- Modify: `frontend/src/messages/en.json` (or equivalent i18n file)
- Modify: `frontend/src/app/layout.tsx` (browser tab title)
- Modify: `frontend/src/app/login/page.tsx`

- [ ] **Step 1: Update browser tab title**

In `frontend/src/app/layout.tsx`:

```typescript
export const metadata = {
  title: 'QAuthority',
  description: 'Enterprise QA Command Center',
}
```

- [ ] **Step 2: Update login page headline**

In `frontend/src/app/login/page.tsx` (or auth login component), update any visible app title to:

```typescript
<h1 className="text-3xl font-bold">QAuthority</h1>
<p className="text-muted-foreground">Enterprise QA Command Center</p>
```

- [ ] **Step 3: Update sidebar labels**

In `frontend/src/components/layout/ModuleSidebar.tsx`, update the `moduleLabel` map:

```typescript
const moduleLabel: Record<string, string> = {
  'test-management': 'Test Command',
  governance: 'QA Governance',
  reports: 'Reports',
  integrations: 'AI & Integrations',
  'users-groups': 'Users & Groups',
  admin: 'Admin',
}
```

Update "Bugs" sidebar item label to "Defects":
```typescript
{ label: 'Defects', href: '/bugs' },  // keep href for API compat
```

- [ ] **Step 4: Update i18n files**

Find English messages file:
```bash
ls frontend/src/messages/
```

Update all occurrences of:
- `"testtools"` → `"QAuthority"`
- `"testtool"` → `"QAuthority"`
- `"Bugs"` (standalone label) → `"Defects"`
- App name in welcome/header strings → `"QAuthority"`

- [ ] **Step 5: Update Dashboard page title**

Find the main dashboard/home page and update its `<h1>` or page title to:
```typescript
<h1>Command Center</h1>
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat(ui): update all UI copy to QAuthority brand — module labels, page titles, login"
```

---

## Task 7: Final Verification

- [ ] **Step 1: Check for remaining "testtool" references**

```bash
grep -r "testtool\|testtools" . \
  --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" \
  --exclude-dir=node_modules --exclude-dir=.git \
  -l
```

For each file found, review context — some occurrences in git history or lockfiles are acceptable. Fix any in source files.

- [ ] **Step 2: Verify browser tab title**

Open `http://localhost:3000` — browser tab should show "QAuthority".

- [ ] **Step 3: Verify login page**

Open `http://localhost:3000/login` — should show "QAuthority" + "Enterprise QA Command Center".

- [ ] **Step 4: Verify API docs**

Open `http://localhost:3001/docs` (Swagger UI) — title should show "QAuthority API".

- [ ] **Step 5: Verify Docker**

```bash
docker-compose ps
```

Expected: containers named `qauthority-api`, `qauthority-ui`, etc.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat(plan-7): complete QAuthority rebranding — docs, packages, DB entities, and UI copy"
```
