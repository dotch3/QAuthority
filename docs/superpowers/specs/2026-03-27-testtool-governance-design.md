# QAuthority — Enterprise QA Governance Platform Design Spec
**Date:** 2026-03-27
**Branch:** governance-planning
**Status:** Approved for implementation planning

---

## 1. Vision

**QAuthority** is not a test management tool. It is the **Enterprise QA Command Center** — built for QA Managers who need to govern multiple teams, drive data-informed decisions, and present executive-grade quality intelligence to leadership. It provides:

- Full test lifecycle management (Plans → Suites → Cases → Executions)
- Executive-ready KPIs, OKRs, DORA metrics, and Process Behavior Charts
- Cross-project visibility for QA Managers presenting to executives
- Group-based permission management for all QA roles
- Visual QA process designer with Mermaid/JSON export
- Configurable AI code generation from manual test steps
- Advanced reporting (PDF, DOCX, Excel, Grafana/Prometheus export)
- CI/CD and external tool integrations (GitHub Actions, Jenkins, Jira)

---

## 2. Navigation Architecture

### Pattern: Icon Rail + Contextual Sidebar

The UI uses a **three-panel layout**:
- **Left rail (48px):** Module icons — always visible, highlights active module
- **Sidebar (220px):** Menu items for the active module — changes per module
- **Content area:** Page content

### Top Bar

Contains a **project selector dropdown** with two modes:
- `[Project Name]` — project-scoped view (Test Management fully active)
- `🌐 All Projects` — org-wide view (Executive Dashboard, org OKRs, org reports)

### Module Map

| Module | Icon | Sidebar Items | Scope |
|--------|------|---------------|-------|
| **Test Management** | 📋 | Test Plans, Test Suites, Test Cases, Executions, Bugs, ET Charters, Heuristics | Project |
| **QA Governance** | 📊 | Executive Dashboard, Project Dashboard, OKRs, KPIs & Metrics, Process Designer, Workflows | Org + Project |
| **Reports** | 📄 | Report Templates, Generate Report, Report History, Export Center | Org + Project |
| **AI & Integrations** | 🔗 | AI Code Generator, AI Providers, CI/CD Connections, External Issues, Webhooks | Project |
| **Users & Groups** | 👥 | Users, Groups, Permissions Matrix, Roles | Org |
| **Admin / System** | ⚙️ | System Settings, Setup Wizard, Enums/Custom Fields, Audit Log, About | Org (admin only) |

---

## 3. Six Implementation Plans Overview

### Dependency Graph

```
PLAN 0: Groups & Permissions + Setup Wizard
  (foundation — all other plans depend on this)
              │
    ┌─────────┼──────────────────────┐
    ▼         ▼                      ▼
 PLAN 1:   PLAN 3:              PLAN 4:
 KPIs/OKRs CI/CD &             Visual Process
 Dashboard  Integrations        Designer
    │           │
    ▼           ▼
 PLAN 2:    PLAN 5:
 Advanced   AI Code
 Reporting  Generation
```

---

## 4. Plan 0 — Groups & Permissions + Setup Wizard

### Goal
Replace the current flat Role/Permission model with a **group-based permissions system** that admins configure per module. Add a **Setup Wizard** for first-time installation.

### Approach: Hybrid
- `UserGroup` and `ModulePermission` are the user-facing concepts
- Existing `Role`/`Permission` tables remain as the enforcement layer
- Groups map to Roles under the hood; GroupService syncs them

### DB Schema

```prisma
model UserGroup {
  id          String   @id @default(uuid())
  name        String
  description String?
  isSystem    Boolean  @default(false)  // system groups cannot be deleted
  projectId   String?                   // null = org-level group
  project     Project? @relation(...)
  members     UserGroupMember[]
  permissions ModulePermission[]
  createdAt   DateTime @default(now())
}

model UserGroupMember {
  userId    String
  groupId   String
  user      User       @relation(...)
  group     UserGroup  @relation(...)
  @@id([userId, groupId])
}

model ModulePermission {
  id        String    @id @default(uuid())
  groupId   String
  group     UserGroup @relation(...)
  module    ModuleType
  canCreate Boolean   @default(false)
  canRead   Boolean   @default(true)
  canUpdate Boolean   @default(false)
  canDelete Boolean   @default(false)
  canExport Boolean   @default(false)
}

enum ModuleType {
  TEST_PLANS
  TEST_SUITES
  TEST_CASES
  EXECUTIONS
  BUGS
  ET_CHARTERS
  HEURISTICS
  QA_GOVERNANCE
  REPORTING
  PROCESS_DESIGNER
  AI_CODEGEN
  INTEGRATIONS
  USERS_GROUPS
  ADMIN
}
```

### Seed Groups (isSystem = true)

| Group | Default Permissions |
|-------|-------------------|
| System Admin | Full CRUD on all modules |
| QA Manager | Full CRUD except Admin |
| QA Lead | CRUD on Test Mgmt + Governance read |
| QA Engineer / Tester | CRUD on Test Cases/Executions/Bugs, read others |
| Automation Engineer | CRUD on Test Cases + AI Codegen + Integrations read |
| Analyst | Read all + Export |
| Designer | Read + Process Designer CRUD |
| Stakeholder | Read only (Governance + Reports) |

### OOP Services

- `GroupService` — CRUD for groups and membership
- `PermissionMatrixService` — evaluate effective permissions for a user across modules
- `SetupWizardService` — guided first-run: DB migration check, locale/language, admin user creation, default groups seed

### Setup Wizard Flow

```
Step 1: System Check (DB connection, migrations status)
Step 2: Language & Locale (default: English)
Step 3: Create Admin User
Step 4: Organization Name & Settings
Step 5: Seed Default Groups (confirm or customize)
Step 6: Done — go to dashboard
```

---

## 5. Plan 1 — KPIs / OKRs / Metrics Dashboard

### Goal
Give QA Managers a real-time view of quality health — per project and across all projects — with executive-ready dashboards.

### Two Scopes
- **Project scope:** metrics, OKRs, KPIs for one project
- **Org scope:** aggregated across all projects for executive view

### OKR Hierarchy (one-way: Org → Project)

- Org OKRs can be **adopted** into projects (top-down)
- Project OKRs with `isAdopted=false` stay project-only (never promoted)
- Adopted OKR Key Results feed rollup aggregation to the parent org OKR

### DB Schema

```prisma
model OKR {
  id          String   @id @default(uuid())
  title       String
  description String?
  quarter     Int      // 1-4
  year        Int
  status      OKRStatus
  scope       OKRScope // PROJECT | ORGANIZATION
  projectId   String?  // null = org-level
  parentOkrId String?  // set when project adopts an org OKR
  isAdopted   Boolean  @default(false)
  project     Project?  @relation(...)
  parent      OKR?      @relation("OKRAdoption", fields: [parentOkrId], references: [id])
  adopted     OKR[]     @relation("OKRAdoption")
  keyResults  KeyResult[]
  createdById String
}

model KeyResult {
  id                   String   @id @default(uuid())
  okrId                String
  title                String
  targetValue          Float
  currentValue         Float    @default(0)
  unit                 String   // "%", "count", "days", etc.
  aggregationStrategy  AggregationStrategy // SUM | AVG | MIN | MAX
  okr                  OKR      @relation(...)
}

model MetricSnapshot {
  id         String      @id @default(uuid())
  projectId  String?     // null = org-level aggregated
  metricType MetricType
  value      Float
  recordedAt DateTime    @default(now())
  metadata   Json?       // e.g. breakdown per project for org snapshots
  project    Project?    @relation(...)
}

model PBCSnapshot {
  id           String      @id @default(uuid())
  projectId    String?
  metricType   MetricType
  dataPoints   Json        // [{ date, value, movingRange }]
  centralLine  Float       // X̄
  upperLimit   Float       // UNPL = X̄ + 2.66 × mR̄
  lowerLimit   Float       // LNPL = X̄ - 2.66 × mR̄
  signals      Json        // [{ date, type: OUTSIDE_LIMIT|RUN|TREND }]
  calculatedAt DateTime    @default(now())
  project      Project?    @relation(...)
}

model ExecutiveDashboard {
  id          String   @id @default(uuid())
  name        String
  isDefault   Boolean  @default(false)
  config      Json     // which metrics, projects, date range, layout
  createdById String
}

enum MetricType {
  DORA_DEPLOY_FREQUENCY
  DORA_LEAD_TIME
  DORA_CHANGE_FAIL_RATE
  DORA_MTTR
  QUALITY_REQUIREMENT_COVERAGE
  QUALITY_DEFECT_DENSITY
  QUALITY_ESCAPED_DEFECTS
  EXECUTION_BURNDOWN
  EXECUTION_PASS_RATE
}

enum OKRScope { PROJECT ORGANIZATION }
enum OKRStatus { DRAFT ON_TRACK AT_RISK ACHIEVED CANCELLED }
enum AggregationStrategy { SUM AVG MIN MAX }
```

### OOP Services

- `OKRService` — CRUD, adoption logic, rollup calculation
- `MetricsCollectorService` — collect & store metric snapshots from execution/CI data
- `MetricsAggregatorService` — roll up project snapshots to org-level
- `DORACalculatorService` — compute DORA from CIBuild + Bug + Execution data
- `PBCCalculatorService` — XmR chart computation + signal detection
- `ExecutiveDashboardService` — save/load dashboard configurations

### Executive Dashboard Layout

Accessible when "All Projects" is selected in the project switcher. Shows:
- Portfolio summary (total projects, testers, test cases, open bugs)
- Team health scorecards per project (composite score)
- DORA metrics aggregated (with PBC trend lines)
- Escaped defects trend (last 6 months, per project stacked)
- OKR progress (org-level OKRs with % completion, aggregated from projects)

---

## 6. Plan 2 — Advanced Reporting

### Goal
Generate professional PDF/DOCX/Excel reports for any scope (project or org), and expose metric data for Grafana/Prometheus consumption.

### DB Schema

```prisma
model ReportTemplate {
  id        String      @id @default(uuid())
  name      String
  type      ReportType
  scope     ReportScope // PROJECT | ORGANIZATION
  projectId String?
  config    Json        // sections, filters, branding
  createdById String
  jobs      ReportJob[]
}

model ReportJob {
  id           String       @id @default(uuid())
  templateId   String
  status       JobStatus    // PENDING | RUNNING | DONE | FAILED
  format       ReportFormat // PDF | DOCX | EXCEL | CSV | JSON
  filePath     String?
  projectIds   Json?        // for org reports: which projects included
  createdAt    DateTime     @default(now())
  completedAt  DateTime?
  createdById  String
  template     ReportTemplate @relation(...)
}

enum ReportType { EXECUTION_SUMMARY TEST_COVERAGE DEFECT_ANALYSIS KPI_SUMMARY OKR_PROGRESS EXECUTIVE_BRIEFING }
enum ReportScope { PROJECT ORGANIZATION }
enum ReportFormat { PDF DOCX EXCEL CSV JSON }
enum JobStatus { PENDING RUNNING DONE FAILED }
```

### OOP Services

- `ReportGeneratorService` — project-scoped report generation
- `OrgReportService` — cross-project aggregated report generation
- `ReportJobQueueService` — BullMQ worker; async generation, file storage
- `PrometheusExportService` — `/metrics` endpoint in Prometheus format
- `GrafanaExportService` — JSON/CSV export endpoint for Grafana datasource

### Dependencies
- Depends on Plan 0 (permissions: who can generate/export which reports)
- Depends on Plan 1 (KPI/OKR data for KPI_SUMMARY, OKR_PROGRESS report types)

---

## 7. Plan 3 — CI/CD & External Integrations

### Goal
Sync test results from CI pipelines into QAuthority, and link bugs to external issue trackers (Jira, GitHub Issues, GitLab).

### DB Schema

```prisma
model CIBuild {
  id                 String      @id @default(uuid())
  integrationId      String
  projectId          String
  buildNumber        String
  branch             String
  status             BuildStatus // PENDING | RUNNING | SUCCESS | FAILED
  testResultsPayload Json?       // raw JUnit XML / Playwright JSON parsed
  triggeredAt        DateTime
  completedAt        DateTime?
  integration        Integration @relation(...)
  project            Project     @relation(...)
}

model ExternalIssue {
  id            String   @id @default(uuid())
  integrationId String
  externalId    String   // Jira issue key, GitHub issue number
  provider      ExternalProvider // JIRA | GITHUB | GITLAB
  title         String
  status        String
  url           String
  linkedBugId   String?
  bug           Bug?     @relation(...)
  integration   Integration @relation(...)
}

enum BuildStatus { PENDING RUNNING SUCCESS FAILED }
enum ExternalProvider { JIRA GITHUB GITLAB JENKINS }
```

### OOP Services

- `CIBuildSyncService` — receive build webhooks, parse test results, create executions
- `ExternalIssueService` — sync issue status bidirectionally (create/update/link)
- `WebhookDispatcherService` — extends existing webhooks with typed CI/CD events
- `JUnitParserService` — parse JUnit XML / Playwright JSON into ExecutionStepResults

### Dependencies
- Depends on Plan 0 (permissions)
- Feeds data into Plan 1 (DORA metrics: deploy frequency, lead time from builds)

---

## 8. Plan 4 — Visual QA Process Designer

### Goal
Let QA teams visually design their quality process as a flowchart — drag-and-drop blocks, define connections, export as Mermaid.js or JSON.

### DB Schema

```prisma
model QAWorkflow {
  id          String          @id @default(uuid())
  projectId   String
  name        String
  description String?
  project     Project         @relation(...)
  blocks      WorkflowBlock[]
  edges       WorkflowEdge[]
  createdById String
}

model WorkflowBlock {
  id         String        @id @default(uuid())
  workflowId String
  type       BlockType
  label      String
  posX       Float
  posY       Float
  config     Json?
  workflow   QAWorkflow    @relation(...)
  outgoing   WorkflowEdge[] @relation("source")
  incoming   WorkflowEdge[] @relation("target")
}

model WorkflowEdge {
  id           String        @id @default(uuid())
  workflowId   String
  sourceBlockId String
  targetBlockId String
  label        String?
  workflow     QAWorkflow    @relation(...)
  source       WorkflowBlock @relation("source", ...)
  target       WorkflowBlock @relation("target", ...)
}

enum BlockType {
  BRAINSTORMING
  RISK_ANALYSIS
  RACI_MATRIX
  ORACLE_DEFINITION
  SANITY_SMOKE
  ENVIRONMENT_SETUP
  SIGN_OFF
  NOTE
  DECISION
  SUBPROCESS
}
```

### OOP Services

- `WorkflowService` — CRUD for workflows, blocks, edges
- `MermaidExportService` — serialize workflow to Mermaid.js flowchart syntax
- `WorkflowImportService` — parse Mermaid/JSON back into WorkflowBlock/Edge records

### Dependencies
- Depends on Plan 0 (permissions: who can create/edit workflows)

---

## 9. Plan 5 — AI Code Generation

### Goal
Translate manual test case steps into automation code (Playwright, Cypress, Jest) using the Page Object Model pattern. Admin configures the AI provider; users pick framework and generate.

### DB Schema

```prisma
model AIProviderConfig {
  id        String   @id @default(uuid())
  name      String
  provider  AIProvider
  apiKey    String   // stored encrypted
  model     String   // e.g. "claude-sonnet-4-6", "gpt-4o"
  baseUrl   String?  // for OLLAMA or CUSTOM providers
  isDefault Boolean  @default(false)
  projectId String?  // null = org-wide default
}

model GeneratedTestCode {
  id          String      @id @default(uuid())
  testCaseId  String
  framework   TestFramework
  code        String
  promptUsed  String
  generatedAt DateTime    @default(now())
  createdById String
  testCase    TestCase    @relation(...)
}

enum AIProvider { ANTHROPIC OPENAI OLLAMA CUSTOM }
enum TestFramework { PLAYWRIGHT CYPRESS JEST SELENIUM }
```

### OOP Services

- `AIProviderService` — manage provider configs, encrypt/decrypt API keys
- `PromptBuilderService` — construct prompts from test case steps + framework POM template
- `CodeGeneratorService` — call AI provider, return generated code, store result

### Generation Flow

```
User selects TestCase → picks framework (Playwright/Cypress/Jest)
  → PromptBuilderService builds prompt:
      "Given these test steps: [steps]
       Generate a Playwright test using Page Object Model pattern
       with TypeScript. Include: page class, test file, locators."
  → CodeGeneratorService calls configured AIProvider
  → Returns code → stored in GeneratedTestCode
  → Shown in code editor with copy/download
```

### Dependencies
- Depends on Plan 0 (permissions: who can use AI codegen)
- Depends on existing TestCase model

---

## 10. Navigation Plan (UI Restructure)

### Goal
Restructure the current flat sidebar into a modular icon rail + contextual sidebar system.

### Layout Components

```
AppShell
├── TopBar
│   ├── Logo
│   ├── ProjectSelector (dropdown: projects + "All Projects" org view)
│   └── UserMenu
├── ModuleRail (icon rail, always visible)
│   └── ModuleIcon × 6 (highlights active)
├── ModuleSidebar (changes per active module)
│   └── NavItem list
└── PageContent
```

### Module Visibility Rules

| Module | Visible to |
|--------|-----------|
| Test Management | All authenticated users with read on any test module |
| QA Governance | QA Engineer+ (read), QA Lead+ (edit) |
| Reports | Analyst, QA Lead, QA Manager, Admin |
| AI & Integrations | Automator, QA Lead, Admin |
| Users & Groups | QA Manager, Admin |
| Admin / System | Admin only |

### Project Selector Behavior

- Default: last used project
- "All Projects" unlocks Executive Dashboard, org OKRs, org reports
- "All Projects" grays out Test Management module (no single project context)

### Dependencies
- Depends on Plan 0 (group permissions determine which modules are visible)
- Should be implemented after Plan 0 groups are seeded

---

## 11. Summary — Execution Order & Dependencies

| Plan | Name | Depends On | Can Run in Parallel With |
|------|------|------------|--------------------------|
| **0** | Groups & Permissions + Setup Wizard | — (foundation) | — |
| **1** | Navigation / UI Restructure | Plan 0 | Plans 2, 3, 4, 5 |
| **2** | KPIs / OKRs / Metrics Dashboard | Plan 0 | Plans 3, 4, 5 |
| **3** | Advanced Reporting | Plans 0, 2 | Plan 4 |
| **4** | CI/CD & External Integrations | Plan 0 | Plans 2, 5 |
| **5** | Visual QA Process Designer | Plan 0 | Plans 2, 4 |
| **6** | AI Code Generation | Plan 0 | Plans 4, 5 |
| **7** | QAuthority Rebranding | — (independent) | All plans |

---

## 12. Plan 7 — QAuthority Rebranding

### Goal
Transform QAuthority from a developer-facing test tool into an **enterprise-grade QA Command Center** brand. Remove all traces of "testtool", establish a professional tone, and align documentation, API surface, and UI copy with the new positioning.

### Tone of Voice
- **Professional & authoritative** — QA Managers presenting to CTOs and VPs
- **Data-driven** — every claim backed by metrics
- **Enterprise-scale** — "teams", "portfolios", "governance", not "tests" and "checklists"
- **Action-oriented** — dashboards that drive decisions, not just display data

### Scope of Changes

#### Layer 1 — Documentation (no code risk, do first)

| File | Change |
|------|--------|
| `README.md` | Full rewrite — enterprise positioning, Executive Dashboard highlight, QA Manager use cases |
| `docs/testtools-specs.md` | Rename to `docs/qauthority-specs.md`, update all references |
| All `/docs/*.md` | Replace "testtool" → "QAuthority" throughout |
| Swagger `title` | `"testtool API"` → `"QAuthority API"` |
| Swagger `description` | Rewrite: enterprise QA governance platform description |
| Swagger `info.contact` | Update contact/license info |

#### Layer 2 — API Paths & Package Names (low-risk, rename only)

| Current | New |
|---------|-----|
| `package.json name: "testtool-backend"` | `"qauthority-api"` |
| `package.json name: "testtool-frontend"` | `"qauthority-ui"` |
| Docker image names in `docker-compose.yml` | `testtool-*` → `qauthority-*` |
| API base path prefix (if any) | `/api/v1` stays — no path changes needed |

#### Layer 3 — Entity & Model Naming (evaluate carefully — DB migration required)

Principle: keep internal model names that are semantically correct (`TestCase`, `TestPlan`).
Rename only where the current name is misleading at the enterprise level.

| Current | Proposed | Rationale |
|---------|----------|-----------|
| `Project` | `Project` | Keep — universally understood |
| `TestCase` | `TestCase` | Keep — domain-correct |
| `TestPlan` | `TestPlan` | Keep — domain-correct |
| `Bug` | `Defect` | More professional in governance context |
| `ETCharter` | `ExploratoryCharter` | Clearer for non-QA stakeholders |
| `Heuristic` | `Heuristic` | Keep — accurate |
| `UserGroup` | `TeamGroup` | Clearer — "teams" not "users" |
| `ExecutiveDashboard` | `ExecutiveDashboard` | Keep — already correct |

> **Note:** Layer 3 requires Prisma migrations + seed updates + service renames.
> Do after Layer 1 & 2 are merged to avoid merge conflicts.

#### Layer 4 — UI Copy & Labels

| Current label | New label |
|---------------|-----------|
| "Test Management" (module) | "Test Command" |
| "Bugs" (sidebar) | "Defects" |
| "Dashboard" (home) | "Command Center" |
| "Projects" (selector) | "Portfolios" (at org level) / "Projects" (at project level) |
| App title in browser tab | "QAuthority" |
| Login page headline | "QAuthority — Enterprise QA Command Center" |

### README.md Structure (new)

```
# QAuthority — Enterprise QA Command Center

> The governance platform built for QA Managers who need
> more than test cases. Real-time DORA metrics, OKR tracking,
> executive dashboards, and multi-team visibility — all in one place.

## Why QAuthority?

Traditional test management tools track test cases.
QAuthority tracks quality.

[Executive Dashboard screenshot]

## Key Capabilities

- **Executive Dashboards** — Present DORA metrics & OKR progress to leadership
- **Multi-Project Governance** — Unified visibility across all QA teams
- **Process Behavior Charts** — Distinguish real signals from noise in your metrics
- **OKR Management** — Org-level objectives, adopted down to project teams
- **Visual Process Designer** — Design your QA lifecycle as a flowchart
- **AI Test Automation** — Generate Playwright/Cypress/Jest code from manual steps
- **Advanced Reporting** — PDF/DOCX/Excel reports ready for board meetings

## QA Manager Use Cases

1. CTO meeting prep: generate an Executive Briefing report in 2 clicks
2. Quarterly review: show OKR progress with DORA trend lines
3. Team health audit: compare escaped defects across all projects
4. Process standardization: design & export QA workflows as Mermaid diagrams

## Quick Start
...
```

### Swagger Description (new)

```yaml
info:
  title: QAuthority API
  version: 1.0.0
  description: |
    QAuthority is an Enterprise QA Governance Platform providing
    multi-project test management, executive KPI dashboards,
    DORA metrics, OKR tracking, and AI-powered test automation.

    Designed for QA Managers governing multiple teams at scale.

    Authentication: Bearer JWT (obtain via /auth/login or OAuth2)
  contact:
    name: QAuthority Support
```

### OOP Services Affected

No new services — this plan is purely cosmetic + naming.
After Layer 3 entity renames:
- `BugService` → `DefectService`
- `ETCharterService` → `ExploratoryCharterService`
- `GroupService` → `TeamGroupService`

### Dependencies
- Layer 1 & 2: **independent** — can run in parallel with any plan
- Layer 3 (entity renames): run **after** Plan 0 (Groups) is merged to avoid conflicts on `UserGroup` rename
- Layer 4 (UI copy): can run **with** Plan 1 (Navigation restructure)
