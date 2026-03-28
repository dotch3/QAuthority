# Plan 4: CI/CD & External Integrations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Receive test results from CI pipelines (GitHub Actions, Jenkins) via webhooks, parse JUnit/Playwright JSON, create executions automatically, and sync bugs bidirectionally with external issue trackers (Jira, GitHub Issues).

**Architecture:** `CIBuild` stores build events; `ExternalIssue` tracks linked tickets. `CIBuildSyncService` parses incoming payloads and creates `TestExecution` records. `JUnitParserService` handles XML/JSON test result formats. Extends the existing `Integration` table — no new auth needed.

**Tech Stack:** Fastify 5, Prisma 6, `fast-xml-parser` (JUnit XML), Vitest 2

**Depends on:** Plan 0 (permissions for INTEGRATIONS module)

---

## ⚠️ Path & URL Convention — Read This First

Pages live under `frontend/src/app/[locale]/(app)/`. The `[locale]` segment is **NOT in the URL** — the app uses `localePrefix: 'never'` in `middleware.ts`. URL is `/integrations/cicd` not `/en/integrations/cicd`. Use `Link` from `next-intl` with clean hrefs.

---

## File Map

### Backend — New
- `backend/prisma/migrations/XXXXXX_add_cicd/migration.sql`
- `backend/src/services/CIBuildSyncService.ts`
- `backend/src/services/JUnitParserService.ts`
- `backend/src/services/ExternalIssueService.ts`
- `backend/src/interfaces/http/routes/cicd.ts`
- `backend/src/interfaces/http/routes/externalIssues.ts`
- `backend/tests/services/JUnitParserService.test.ts`
- `backend/tests/services/CIBuildSyncService.test.ts`

### Backend — Modified
- `backend/prisma/schema.prisma`
- `backend/src/interfaces/http/routes/index.ts`
- `backend/package.json`

### Frontend — New
- `frontend/src/app/[locale]/(app)/integrations/cicd/page.tsx`
- `frontend/src/app/[locale]/(app)/integrations/issues/page.tsx`
- `frontend/src/components/integrations/CIBuildList.tsx`
- `frontend/src/components/integrations/ExternalIssueList.tsx`

---

## Task 1: Install Dependencies

- [ ] **Step 1: Install XML parser**

```bash
cd backend && npm install fast-xml-parser
```

- [ ] **Step 2: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: add fast-xml-parser for JUnit XML parsing"
```

---

## Task 2: Prisma Schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add CIBuild and ExternalIssue models**

Append to `backend/prisma/schema.prisma`:

```prisma
enum BuildStatus { PENDING RUNNING SUCCESS FAILED }
enum ExternalProvider { JIRA GITHUB GITLAB JENKINS }

model CIBuild {
  id                  String      @id @default(uuid())
  integrationId       String
  projectId           String
  buildNumber         String
  branch              String
  status              BuildStatus
  testResultsPayload  Json?
  triggeredAt         DateTime
  completedAt         DateTime?
  integration         Integration @relation(fields: [integrationId], references: [id], onDelete: Cascade)
  project             Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt           DateTime    @default(now())
}

model ExternalIssue {
  id            String           @id @default(uuid())
  integrationId String
  externalId    String
  provider      ExternalProvider
  title         String
  status        String
  url           String
  linkedBugId   String?
  integration   Integration      @relation(fields: [integrationId], references: [id], onDelete: Cascade)
  bug           Bug?             @relation(fields: [linkedBugId], references: [id])
  syncedAt      DateTime         @default(now())
  createdAt     DateTime         @default(now())

  @@unique([integrationId, externalId])
}
```

Add to `Integration` model:
```prisma
  ciBuilds       CIBuild[]
  externalIssues ExternalIssue[]
```

Add to `Project` model:
```prisma
  ciBuilds CIBuild[]
```

Add to `Bug` model:
```prisma
  externalIssues ExternalIssue[]
```

- [ ] **Step 2: Run migration**

```bash
cd backend && npx prisma migrate dev --name add_cicd_integrations
```

Expected: migration applied cleanly.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add CIBuild and ExternalIssue models"
```

---

## Task 3: JUnitParserService

**Files:**
- Create: `backend/src/services/JUnitParserService.ts`
- Create: `backend/tests/services/JUnitParserService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/services/JUnitParserService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { JUnitParserService } from '../../src/services/JUnitParserService'

const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="LoginSuite" tests="3" failures="1" errors="0" time="1.5">
    <testcase name="should login with valid credentials" time="0.5"/>
    <testcase name="should reject invalid password" time="0.3">
      <failure message="Expected 401">AssertionError: expected 200 to equal 401</failure>
    </testcase>
    <testcase name="should redirect after login" time="0.7"/>
  </testsuite>
</testsuites>`

const samplePlaywrightJSON = {
  suites: [{
    title: 'LoginSuite',
    specs: [
      { title: 'login works', ok: true, tests: [{ results: [{ status: 'passed', duration: 500 }] }] },
      { title: 'rejects bad password', ok: false, tests: [{ results: [{ status: 'failed', duration: 300, error: { message: 'Expected 401' } }] }] },
    ],
  }],
}

describe('JUnitParserService', () => {
  const service = new JUnitParserService()

  it('parses JUnit XML into test results', () => {
    const results = service.parseJUnitXML(sampleXML)
    expect(results).toHaveLength(3)
    expect(results[0].name).toBe('should login with valid credentials')
    expect(results[0].status).toBe('PASSED')
    expect(results[1].status).toBe('FAILED')
    expect(results[1].errorMessage).toContain('AssertionError')
  })

  it('parses Playwright JSON into test results', () => {
    const results = service.parsePlaywrightJSON(samplePlaywrightJSON)
    expect(results).toHaveLength(2)
    expect(results[0].status).toBe('PASSED')
    expect(results[1].status).toBe('FAILED')
    expect(results[1].errorMessage).toBe('Expected 401')
  })

  it('detects format from content', () => {
    expect(service.detectFormat(sampleXML)).toBe('junit')
    expect(service.detectFormat(JSON.stringify(samplePlaywrightJSON))).toBe('playwright')
  })
})
```

- [ ] **Step 2: Implement JUnitParserService**

Create `backend/src/services/JUnitParserService.ts`:

```typescript
import { XMLParser } from 'fast-xml-parser'

interface ParsedTestResult {
  suiteName: string
  name: string
  status: 'PASSED' | 'FAILED' | 'SKIPPED'
  durationMs: number
  errorMessage?: string
}

export class JUnitParserService {
  private xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

  detectFormat(content: string): 'junit' | 'playwright' | 'unknown' {
    const trimmed = content.trim()
    if (trimmed.startsWith('<')) return 'junit'
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.suites) return 'playwright'
    } catch {
      // not JSON
    }
    return 'unknown'
  }

  parseJUnitXML(xml: string): ParsedTestResult[] {
    const parsed = this.xmlParser.parse(xml)
    const results: ParsedTestResult[] = []

    const suites = parsed.testsuites?.testsuite
    if (!suites) return results

    const suiteList = Array.isArray(suites) ? suites : [suites]
    for (const suite of suiteList) {
      const suiteName: string = suite['@_name'] ?? 'Unknown Suite'
      const cases = suite.testcase
      if (!cases) continue
      const caseList = Array.isArray(cases) ? cases : [cases]

      for (const tc of caseList) {
        const name: string = tc['@_name'] ?? 'Unknown Test'
        const durationMs = Math.round((Number(tc['@_time'] ?? 0)) * 1000)
        let status: ParsedTestResult['status'] = 'PASSED'
        let errorMessage: string | undefined

        if (tc.failure) {
          status = 'FAILED'
          errorMessage = typeof tc.failure === 'string'
            ? tc.failure
            : tc.failure['#text'] ?? tc.failure['@_message'] ?? 'Test failed'
        } else if (tc.skipped !== undefined) {
          status = 'SKIPPED'
        }

        results.push({ suiteName, name, status, durationMs, errorMessage })
      }
    }
    return results
  }

  parsePlaywrightJSON(json: any): ParsedTestResult[] {
    const results: ParsedTestResult[] = []
    const suites = json.suites ?? []

    for (const suite of suites) {
      const suiteName: string = suite.title ?? 'Unknown Suite'
      const specs = suite.specs ?? []

      for (const spec of specs) {
        const name: string = spec.title ?? 'Unknown Test'
        const testResult = spec.tests?.[0]?.results?.[0]
        if (!testResult) continue

        const status: ParsedTestResult['status'] =
          testResult.status === 'passed' ? 'PASSED'
          : testResult.status === 'skipped' ? 'SKIPPED'
          : 'FAILED'

        results.push({
          suiteName,
          name,
          status,
          durationMs: testResult.duration ?? 0,
          errorMessage: testResult.error?.message,
        })
      }
    }
    return results
  }

  parse(content: string): ParsedTestResult[] {
    const format = this.detectFormat(content)
    if (format === 'junit') return this.parseJUnitXML(content)
    if (format === 'playwright') return this.parsePlaywrightJSON(JSON.parse(content))
    throw new Error(`Unknown test result format`)
  }
}
```

- [ ] **Step 3: Run tests**

```bash
cd backend && npx vitest run tests/services/JUnitParserService.test.ts
```

Expected: PASS — 3 tests passing.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/JUnitParserService.ts backend/tests/services/JUnitParserService.test.ts
git commit -m "feat(service): add JUnitParserService for JUnit XML and Playwright JSON parsing"
```

---

## Task 4: CIBuildSyncService

**Files:**
- Create: `backend/src/services/CIBuildSyncService.ts`
- Create: `backend/tests/services/CIBuildSyncService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/services/CIBuildSyncService.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { CIBuildSyncService } from '../../src/services/CIBuildSyncService'

const mockPrisma = {
  cIBuild: { create: vi.fn(), update: vi.fn() },
  testCase: { findFirst: vi.fn() },
  testExecution: { create: vi.fn() },
  executionStepResult: { create: vi.fn() },
}

describe('CIBuildSyncService', () => {
  const service = new CIBuildSyncService(mockPrisma as any)

  it('creates a CIBuild record from a webhook payload', async () => {
    mockPrisma.cIBuild.create.mockResolvedValue({ id: 'build-1' })
    await service.receiveBuildEvent({
      integrationId: 'int-1',
      projectId: 'proj-1',
      buildNumber: '42',
      branch: 'main',
      status: 'SUCCESS',
      triggeredAt: new Date().toISOString(),
    })
    expect(mockPrisma.cIBuild.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ buildNumber: '42', status: 'SUCCESS' }),
      })
    )
  })
})
```

- [ ] **Step 2: Implement CIBuildSyncService**

Create `backend/src/services/CIBuildSyncService.ts`:

```typescript
import { PrismaClient, BuildStatus } from '@prisma/client'
import { JUnitParserService } from './JUnitParserService'

interface BuildEventInput {
  integrationId: string
  projectId: string
  buildNumber: string
  branch: string
  status: string
  triggeredAt: string
  completedAt?: string
  testResults?: string  // raw JUnit XML or Playwright JSON string
}

export class CIBuildSyncService {
  private parser = new JUnitParserService()

  constructor(private prisma: PrismaClient) {}

  async receiveBuildEvent(input: BuildEventInput) {
    const build = await this.prisma.cIBuild.create({
      data: {
        integrationId: input.integrationId,
        projectId: input.projectId,
        buildNumber: input.buildNumber,
        branch: input.branch,
        status: input.status as BuildStatus,
        triggeredAt: new Date(input.triggeredAt),
        completedAt: input.completedAt ? new Date(input.completedAt) : undefined,
        testResultsPayload: input.testResults ? JSON.parse(input.testResults.trim().startsWith('<') ? '{}' : input.testResults) : undefined,
      },
    })

    if (input.testResults && (input.status === 'SUCCESS' || input.status === 'FAILED')) {
      await this.syncTestResults(build.id, input.projectId, input.testResults)
    }

    return build
  }

  private async syncTestResults(buildId: string, projectId: string, rawResults: string) {
    let parsed
    try {
      parsed = this.parser.parse(rawResults)
    } catch {
      return // Skip if unparseable
    }

    for (const result of parsed) {
      // Try to match test case by name (fuzzy match)
      const testCase = await this.prisma.testCase.findFirst({
        where: {
          title: { contains: result.name, mode: 'insensitive' },
          suite: { plan: { projectId } },
        },
      })

      if (testCase) {
        await this.prisma.testExecution.create({
          data: {
            testCaseId: testCase.id,
            status: result.status,
            executedAt: new Date(),
            durationMs: result.durationMs,
            notes: result.errorMessage ?? null,
          },
        })
      }
    }
  }
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/services/CIBuildSyncService.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/CIBuildSyncService.ts backend/tests/services/CIBuildSyncService.test.ts
git commit -m "feat(service): add CIBuildSyncService to ingest CI webhooks and create executions"
```

---

## Task 5: ExternalIssueService

**Files:**
- Create: `backend/src/services/ExternalIssueService.ts`

- [ ] **Step 1: Implement ExternalIssueService**

Create `backend/src/services/ExternalIssueService.ts`:

```typescript
import { PrismaClient, ExternalProvider } from '@prisma/client'

interface SyncIssueInput {
  integrationId: string
  externalId: string
  provider: ExternalProvider
  title: string
  status: string
  url: string
}

export class ExternalIssueService {
  constructor(private prisma: PrismaClient) {}

  async syncIssue(input: SyncIssueInput) {
    return this.prisma.externalIssue.upsert({
      where: {
        integrationId_externalId: {
          integrationId: input.integrationId,
          externalId: input.externalId,
        },
      },
      update: { title: input.title, status: input.status, syncedAt: new Date() },
      create: { ...input },
    })
  }

  async linkToBug(externalIssueId: string, bugId: string) {
    return this.prisma.externalIssue.update({
      where: { id: externalIssueId },
      data: { linkedBugId: bugId },
    })
  }

  async unlinkFromBug(externalIssueId: string) {
    return this.prisma.externalIssue.update({
      where: { id: externalIssueId },
      data: { linkedBugId: null },
    })
  }

  async listForProject(projectId: string) {
    return this.prisma.externalIssue.findMany({
      where: { integration: { projectId } },
      include: { bug: true },
      orderBy: { syncedAt: 'desc' },
    })
  }

  async listForBug(bugId: string) {
    return this.prisma.externalIssue.findMany({ where: { linkedBugId: bugId } })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/ExternalIssueService.ts
git commit -m "feat(service): add ExternalIssueService for Jira/GitHub issue sync and bug linking"
```

---

## Task 6: CI/CD Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/cicd.ts`
- Create: `backend/src/interfaces/http/routes/externalIssues.ts`

- [ ] **Step 1: Create CI/CD webhook routes**

Create `backend/src/interfaces/http/routes/cicd.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { CIBuildSyncService } from '../../../services/CIBuildSyncService'
import { requirePermission } from '../../../infrastructure/auth/authMiddleware'

export async function cicdRoutes(app: FastifyInstance) {
  const service = new CIBuildSyncService(app.prisma)
  const auth = [app.authenticate, requirePermission('INTEGRATIONS', 'read')]

  // POST /cicd/webhook — receive build events (no auth, uses integration secret)
  app.post('/webhook', async (req, reply) => {
    const secret = req.headers['x-qauthority-secret']
    const integration = await app.prisma.integration.findFirst({
      where: { webhookSecret: String(secret) },
    })
    if (!integration) return reply.code(401).send({ error: 'Invalid webhook secret' })

    const body = req.body as any
    const build = await service.receiveBuildEvent({
      integrationId: integration.id,
      projectId: integration.projectId,
      buildNumber: String(body.buildNumber ?? body.run_number ?? 'unknown'),
      branch: body.branch ?? body.ref?.replace('refs/heads/', '') ?? 'unknown',
      status: body.status ?? body.conclusion ?? 'UNKNOWN',
      triggeredAt: body.triggeredAt ?? body.created_at ?? new Date().toISOString(),
      completedAt: body.completedAt ?? body.updated_at,
      testResults: body.testResults,
    })

    return reply.code(202).send({ buildId: build.id })
  })

  // GET /cicd/builds — list recent builds
  app.get('/builds', { onRequest: auth }, async (req, reply) => {
    const { projectId } = req.query as { projectId?: string }
    const builds = await app.prisma.cIBuild.findMany({
      where: projectId ? { projectId } : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { integration: true },
    })
    return reply.send(builds)
  })
}
```

- [ ] **Step 2: Create external issues routes**

Create `backend/src/interfaces/http/routes/externalIssues.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { ExternalIssueService } from '../../../services/ExternalIssueService'
import { requirePermission } from '../../../infrastructure/auth/authMiddleware'

export async function externalIssuesRoutes(app: FastifyInstance) {
  const service = new ExternalIssueService(app.prisma)
  const auth = [app.authenticate, requirePermission('INTEGRATIONS', 'read')]
  const authWrite = [app.authenticate, requirePermission('INTEGRATIONS', 'update')]

  app.get('/project/:projectId', { onRequest: auth }, async (req, reply) => {
    const { projectId } = req.params as { projectId: string }
    return reply.send(await service.listForProject(projectId))
  })

  app.post('/sync', { onRequest: authWrite }, async (req, reply) => {
    const body = req.body as any
    return reply.send(await service.syncIssue(body))
  })

  app.patch('/:id/link/:bugId', { onRequest: authWrite }, async (req, reply) => {
    const { id, bugId } = req.params as { id: string; bugId: string }
    return reply.send(await service.linkToBug(id, bugId))
  })

  app.patch('/:id/unlink', { onRequest: authWrite }, async (req, reply) => {
    const { id } = req.params as { id: string }
    return reply.send(await service.unlinkFromBug(id))
  })
}
```

- [ ] **Step 3: Register routes**

In `backend/src/interfaces/http/routes/index.ts`:
```typescript
import { cicdRoutes } from './cicd'
import { externalIssuesRoutes } from './externalIssues'

app.register(cicdRoutes, { prefix: '/cicd' })
app.register(externalIssuesRoutes, { prefix: '/external-issues' })
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/interfaces/http/routes/cicd.ts backend/src/interfaces/http/routes/externalIssues.ts
git commit -m "feat(routes): add CI/CD webhook receiver and external issues endpoints"
```

---

## Task 7: Frontend — CI/CD + External Issues Pages

- [ ] **Step 1: Create CI/CD Connections page**

Create `frontend/src/app/[locale]/(app)/integrations/cicd/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: 'default', FAILED: 'destructive', RUNNING: 'secondary', PENDING: 'outline',
}

export default function CICDPage() {
  const { activeProject } = useNavigationStore()
  const [builds, setBuilds] = useState<any[]>([])

  useEffect(() => {
    const params = activeProject ? `?projectId=${activeProject}` : ''
    api.get(`/cicd/builds${params}`).then(r => setBuilds(r.data))
  }, [activeProject])

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">CI/CD Builds</h1>
      <p className="text-sm text-muted-foreground">
        Send build results to: <code className="bg-muted px-1 rounded">POST /cicd/webhook</code> with header{' '}
        <code className="bg-muted px-1 rounded">x-qauthority-secret: &lt;integration secret&gt;</code>
      </p>
      <div className="space-y-2">
        {builds.map(build => (
          <div key={build.id} className="border rounded p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">#{build.buildNumber} — {build.branch}</p>
              <p className="text-xs text-muted-foreground">
                {build.integration?.type ?? 'CI'} • {new Date(build.createdAt).toLocaleString()}
              </p>
            </div>
            <Badge variant={STATUS_COLORS[build.status] as any}>{build.status}</Badge>
          </div>
        ))}
        {builds.length === 0 && (
          <p className="text-muted-foreground text-sm">No builds yet. Configure a CI webhook to start syncing.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create External Issues page**

Create `frontend/src/app/[locale]/(app)/integrations/issues/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function ExternalIssuesPage() {
  const { activeProject } = useNavigationStore()
  const [issues, setIssues] = useState<any[]>([])

  useEffect(() => {
    if (activeProject) {
      api.get(`/external-issues/project/${activeProject}`).then(r => setIssues(r.data))
    }
  }, [activeProject])

  const unlink = async (id: string) => {
    await api.patch(`/external-issues/${id}/unlink`)
    setIssues(prev => prev.map(i => i.id === id ? { ...i, linkedBugId: null, bug: null } : i))
    toast.success('Issue unlinked')
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">External Issues</h1>
      <div className="space-y-2">
        {issues.map(issue => (
          <div key={issue.id} className="border rounded p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{issue.provider}</Badge>
                <a href={issue.url} target="_blank" rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline">
                  {issue.externalId}: {issue.title}
                </a>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Status: {issue.status}
                {issue.bug && ` • Linked to bug: ${issue.bug.title}`}
              </p>
            </div>
            {issue.linkedBugId && (
              <Button size="sm" variant="outline" onClick={() => unlink(issue.id)}>
                Unlink
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/[locale]/(app)/integrations/
git commit -m "feat(ui): add CI/CD builds and External Issues pages"
```

---

## Final: Integration Test

- [ ] **Step 1: Test webhook endpoint**

```bash
curl -X POST http://localhost:3001/cicd/webhook \
  -H "x-qauthority-secret: <integration-webhook-secret>" \
  -H "Content-Type: application/json" \
  -d '{
    "buildNumber": "101",
    "branch": "main",
    "status": "SUCCESS",
    "triggeredAt": "2026-03-27T10:00:00Z"
  }'
```

Expected: `{"buildId":"..."}`

- [ ] **Step 2: Verify build appears in UI**

Open `http://localhost:3000/integrations/cicd` — build #101 should appear with SUCCESS badge.

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat(plan-4): complete CI/CD integrations with webhook ingestion and external issue sync"
```
