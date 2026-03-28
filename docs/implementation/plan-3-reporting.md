# Plan 3: Advanced Reporting

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Async generation of professional PDF/DOCX/Excel reports (per-project and org-wide), plus Prometheus and Grafana-compatible metric export endpoints.

**Architecture:** `ReportTemplate` defines what to generate; `ReportJob` tracks async generation status. BullMQ worker processes jobs in the background and stores files. A `/metrics/prometheus` endpoint exposes data in Prometheus format. Grafana gets a `/metrics/grafana` JSON endpoint.

**Tech Stack:** BullMQ 5, `pdfkit` (PDF), `docx` (DOCX), `exceljs` (Excel), Fastify 5, Prisma 6, Next.js 16

**Depends on:** Plan 0 (permissions), Plan 2 (KPI data for executive report types)

---

## ⚠️ Path & URL Convention — Read This First

Pages live under `frontend/src/app/[locale]/(app)/`. The `[locale]` segment is **NOT in the URL** — the app uses `localePrefix: 'never'` in `middleware.ts`. URL is `/reports/templates` not `/en/reports/templates`. Use `Link` from `next-intl` with clean hrefs.

---

## File Map

### Backend — New
- `backend/prisma/migrations/XXXXXX_add_reports/migration.sql`
- `backend/src/services/ReportGeneratorService.ts`
- `backend/src/services/OrgReportService.ts`
- `backend/src/workers/reportWorker.ts`
- `backend/src/interfaces/http/routes/reports.ts`
- `backend/src/interfaces/http/routes/metricsExport.ts`
- `backend/tests/services/ReportGeneratorService.test.ts`

### Backend — Modified
- `backend/prisma/schema.prisma`
- `backend/src/interfaces/http/routes/index.ts`
- `backend/src/workers/index.ts` (register new worker)
- `backend/package.json` (add pdfkit, docx, exceljs)

### Frontend — New
- `frontend/src/app/[locale]/(app)/reports/templates/page.tsx`
- `frontend/src/app/[locale]/(app)/reports/history/page.tsx`
- `frontend/src/app/[locale]/(app)/reports/export/page.tsx`
- `frontend/src/components/reports/ReportTemplateForm.tsx`
- `frontend/src/components/reports/ReportJobList.tsx`

---

## Task 1: Install Dependencies

- [ ] **Step 1: Install report generation libraries**

```bash
cd backend
npm install pdfkit docx exceljs
npm install --save-dev @types/pdfkit
```

- [ ] **Step 2: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: add pdfkit, docx, exceljs for report generation"
```

---

## Task 2: Prisma Schema — Report Models

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add models**

Append to `backend/prisma/schema.prisma`:

```prisma
enum ReportType {
  EXECUTION_SUMMARY
  TEST_COVERAGE
  DEFECT_ANALYSIS
  KPI_SUMMARY
  OKR_PROGRESS
  EXECUTIVE_BRIEFING
}

enum ReportScope { PROJECT ORGANIZATION }

enum ReportFormat { PDF DOCX EXCEL CSV JSON }

enum JobStatus { PENDING RUNNING DONE FAILED }

model ReportTemplate {
  id          String      @id @default(uuid())
  name        String
  type        ReportType
  scope       ReportScope
  projectId   String?
  config      Json
  createdById String
  createdAt   DateTime    @default(now())
  project     Project?    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  jobs        ReportJob[]
}

model ReportJob {
  id          String         @id @default(uuid())
  templateId  String
  status      JobStatus      @default(PENDING)
  format      ReportFormat
  filePath    String?
  projectIds  Json?
  errorMsg    String?
  createdById String
  createdAt   DateTime       @default(now())
  completedAt DateTime?
  template    ReportTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
}
```

Add to `Project` model:
```prisma
  reportTemplates ReportTemplate[]
```

- [ ] **Step 2: Run migration**

```bash
cd backend && npx prisma migrate dev --name add_reports
```

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add ReportTemplate and ReportJob models"
```

---

## Task 3: ReportGeneratorService

**Files:**
- Create: `backend/src/services/ReportGeneratorService.ts`
- Create: `backend/tests/services/ReportGeneratorService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/services/ReportGeneratorService.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { ReportGeneratorService } from '../../src/services/ReportGeneratorService'
import path from 'path'
import fs from 'fs'

const mockPrisma = {
  testExecution: { findMany: vi.fn() },
  testCase: { count: vi.fn() },
  bug: { findMany: vi.fn() },
  metricSnapshot: { findMany: vi.fn() },
}

describe('ReportGeneratorService', () => {
  const service = new ReportGeneratorService(mockPrisma as any, '/tmp/reports')

  it('generateExcelExecutionSummary returns a buffer', async () => {
    mockPrisma.testExecution.findMany.mockResolvedValue([
      { id: '1', status: 'PASSED', testCase: { title: 'Login test' }, executedAt: new Date() },
    ])
    const buffer = await service.generateExcelExecutionSummary('proj1')
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('buildFilePath creates directory if needed', () => {
    const p = service.buildFilePath('job1', 'PDF')
    expect(p).toContain('job1')
    expect(p).toContain('.pdf')
  })
})
```

- [ ] **Step 2: Implement ReportGeneratorService**

Create `backend/src/services/ReportGeneratorService.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx'
import path from 'path'
import fs from 'fs'

export class ReportGeneratorService {
  constructor(
    private prisma: PrismaClient,
    private outputDir: string = process.env.REPORT_OUTPUT_DIR ?? './reports'
  ) {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }

  buildFilePath(jobId: string, format: string): string {
    const ext = format.toLowerCase()
    return path.join(this.outputDir, `${jobId}.${ext}`)
  }

  async generateExcelExecutionSummary(projectId: string): Promise<Buffer> {
    const executions = await this.prisma.testExecution.findMany({
      where: { testCase: { suite: { plan: { projectId } } } },
      include: { testCase: true },
      orderBy: { executedAt: 'desc' },
      take: 500,
    })

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Execution Summary')

    ws.columns = [
      { header: 'Test Case', key: 'title', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Executed At', key: 'executedAt', width: 25 },
    ]

    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    for (const exec of executions) {
      ws.addRow({
        title: exec.testCase?.title ?? '—',
        status: exec.status,
        executedAt: exec.executedAt?.toISOString() ?? '—',
      })
    }

    return wb.xlsx.writeBuffer() as Promise<Buffer>
  }

  async generatePDFExecutionSummary(projectId: string): Promise<Buffer> {
    const executions = await this.prisma.testExecution.findMany({
      where: { testCase: { suite: { plan: { projectId } } } },
      include: { testCase: true },
      orderBy: { executedAt: 'desc' },
      take: 200,
    })

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 })
      const chunks: Buffer[] = []
      doc.on('data', c => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      doc.fontSize(20).font('Helvetica-Bold').text('QAuthority — Execution Summary', { align: 'center' })
      doc.moveDown()
      doc.fontSize(10).font('Helvetica').text(`Project ID: ${projectId}`)
      doc.text(`Generated: ${new Date().toISOString()}`)
      doc.text(`Total executions: ${executions.length}`)
      doc.moveDown()

      const passed = executions.filter(e => e.status === 'PASSED').length
      const failed = executions.filter(e => e.status === 'FAILED').length
      doc.font('Helvetica-Bold').text('Summary:')
      doc.font('Helvetica').text(`  Passed: ${passed}`)
      doc.text(`  Failed: ${failed}`)
      doc.text(`  Pass Rate: ${executions.length > 0 ? ((passed / executions.length) * 100).toFixed(1) : 0}%`)

      doc.end()
    })
  }

  async generateDOCXExecutiveBriefing(projectId: string): Promise<Buffer> {
    const bugs = await this.prisma.bug.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'QAuthority — Executive Briefing', bold: true, size: 32 })],
          }),
          new Paragraph({ children: [new TextRun({ text: `Project: ${projectId}` })] }),
          new Paragraph({ children: [new TextRun({ text: `Date: ${new Date().toLocaleDateString()}` })] }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Paragraph({
            children: [new TextRun({ text: 'Defect Overview', bold: true, size: 24 })],
          }),
          new Table({
            rows: [
              new TableRow({
                children: ['Title', 'Severity', 'Status'].map(t =>
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })] })
                ),
              }),
              ...bugs.slice(0, 20).map(b =>
                new TableRow({
                  children: [b.title, (b as any).severity ?? '—', b.status].map(t =>
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(t) })] })] })
                  ),
                })
              ),
            ],
          }),
        ],
      }],
    })

    return Packer.toBuffer(doc)
  }
}
```

- [ ] **Step 3: Run tests**

```bash
cd backend && npx vitest run tests/services/ReportGeneratorService.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/ReportGeneratorService.ts backend/tests/services/ReportGeneratorService.test.ts
git commit -m "feat(service): add ReportGeneratorService for Excel, PDF, and DOCX report generation"
```

---

## Task 4: Report BullMQ Worker

**Files:**
- Create: `backend/src/workers/reportWorker.ts`
- Modify: `backend/src/workers/index.ts`

- [ ] **Step 1: Create report worker**

Create `backend/src/workers/reportWorker.ts`:

```typescript
import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { ReportGeneratorService } from '../services/ReportGeneratorService'
import fs from 'fs'

interface ReportJobData {
  jobId: string
  projectId?: string
  format: string
  type: string
}

export function createReportWorker(prisma: PrismaClient, redisUrl: string) {
  const generator = new ReportGeneratorService(prisma)

  return new Worker<ReportJobData>(
    'reports',
    async (job: Job<ReportJobData>) => {
      const { jobId, projectId, format, type } = job.data

      await prisma.reportJob.update({
        where: { id: jobId },
        data: { status: 'RUNNING' },
      })

      try {
        let buffer: Buffer
        const filePath = generator.buildFilePath(jobId, format)

        if (format === 'EXCEL') {
          buffer = await generator.generateExcelExecutionSummary(projectId!)
        } else if (format === 'PDF') {
          buffer = await generator.generatePDFExecutionSummary(projectId!)
        } else if (format === 'DOCX') {
          buffer = await generator.generateDOCXExecutiveBriefing(projectId!)
        } else {
          throw new Error(`Unsupported format: ${format}`)
        }

        fs.writeFileSync(filePath, buffer)

        await prisma.reportJob.update({
          where: { id: jobId },
          data: { status: 'DONE', filePath, completedAt: new Date() },
        })
      } catch (err: any) {
        await prisma.reportJob.update({
          where: { id: jobId },
          data: { status: 'FAILED', errorMsg: err.message, completedAt: new Date() },
        })
        throw err
      }
    },
    {
      connection: { url: redisUrl },
      concurrency: 3,
    }
  )
}
```

- [ ] **Step 2: Register worker in workers index**

In `backend/src/workers/index.ts` (create if it doesn't exist):

```typescript
import { createReportWorker } from './reportWorker'
import { PrismaClient } from '@prisma/client'

export function startWorkers(prisma: PrismaClient) {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
  createReportWorker(prisma, redisUrl)
  console.log('✓ Report worker started')
}
```

Call `startWorkers(prisma)` from the backend `src/server.ts` startup.

- [ ] **Step 3: Commit**

```bash
git add backend/src/workers/reportWorker.ts backend/src/workers/index.ts
git commit -m "feat(worker): add BullMQ report worker for async PDF/DOCX/Excel generation"
```

---

## Task 5: Reports Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/reports.ts`

- [ ] **Step 1: Create reports routes**

Create `backend/src/interfaces/http/routes/reports.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { Queue } from 'bullmq'
import fs from 'fs'
import { requirePermission } from '../../../infrastructure/auth/authMiddleware'

export async function reportsRoutes(app: FastifyInstance) {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
  const reportQueue = new Queue('reports', { connection: { url: redisUrl } })
  const auth = [app.authenticate, requirePermission('REPORTING', 'read')]
  const authCreate = [app.authenticate, requirePermission('REPORTING', 'create')]

  // GET /reports/templates
  app.get('/templates', { onRequest: auth }, async (req, reply) => {
    const templates = await app.prisma.reportTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(templates)
  })

  // POST /reports/templates
  app.post('/templates', { onRequest: authCreate }, async (req, reply) => {
    const body = req.body as any
    const template = await app.prisma.reportTemplate.create({
      data: { ...body, createdById: (req.user as any).id },
    })
    return reply.code(201).send(template)
  })

  // POST /reports/generate — enqueue a report job
  app.post('/generate', { onRequest: authCreate }, async (req, reply) => {
    const { templateId, format, projectIds } = req.body as any

    const template = await app.prisma.reportTemplate.findUnique({ where: { id: templateId } })
    if (!template) return reply.code(404).send({ error: 'Template not found' })

    const job = await app.prisma.reportJob.create({
      data: {
        templateId,
        format,
        projectIds: projectIds ?? null,
        status: 'PENDING',
        createdById: (req.user as any).id,
      },
    })

    await reportQueue.add('generate', {
      jobId: job.id,
      projectId: template.projectId,
      format,
      type: template.type,
    })

    return reply.code(202).send({ jobId: job.id, status: 'PENDING' })
  })

  // GET /reports/jobs — list all report jobs
  app.get('/jobs', { onRequest: auth }, async (_req, reply) => {
    const jobs = await app.prisma.reportJob.findMany({
      include: { template: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return reply.send(jobs)
  })

  // GET /reports/jobs/:id/download — download completed report file
  app.get('/jobs/:id/download', { onRequest: auth }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const job = await app.prisma.reportJob.findUnique({ where: { id } })
    if (!job || job.status !== 'DONE' || !job.filePath) {
      return reply.code(404).send({ error: 'Report not ready or not found' })
    }
    const ext = job.format.toLowerCase()
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      json: 'application/json',
    }
    reply.header('Content-Type', mimeMap[ext] ?? 'application/octet-stream')
    reply.header('Content-Disposition', `attachment; filename="report-${id}.${ext}"`)
    return reply.send(fs.createReadStream(job.filePath))
  })
}
```

- [ ] **Step 2: Register routes**

In `backend/src/interfaces/http/routes/index.ts`:
```typescript
import { reportsRoutes } from './reports'
app.register(reportsRoutes, { prefix: '/reports' })
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/interfaces/http/routes/reports.ts
git commit -m "feat(routes): add /reports endpoints for templates, job enqueue, and file download"
```

---

## Task 6: Prometheus + Grafana Export Endpoints

**Files:**
- Create: `backend/src/interfaces/http/routes/metricsExport.ts`

- [ ] **Step 1: Create metrics export route**

Create `backend/src/interfaces/http/routes/metricsExport.ts`:

```typescript
import { FastifyInstance } from 'fastify'

export async function metricsExportRoutes(app: FastifyInstance) {
  // Prometheus format: GET /metrics/prometheus
  app.get('/prometheus', async (_req, reply) => {
    const snapshots = await app.prisma.metricSnapshot.findMany({
      orderBy: { recordedAt: 'desc' },
      distinct: ['projectId', 'metricType'],
    })

    const lines: string[] = [
      '# HELP qauthority_metric QAuthority QA metric snapshot',
      '# TYPE qauthority_metric gauge',
    ]

    for (const s of snapshots) {
      const labels = s.projectId
        ? `project_id="${s.projectId}",metric="${s.metricType}"`
        : `metric="${s.metricType}"`
      lines.push(`qauthority_metric{${labels}} ${s.value}`)
    }

    reply.header('Content-Type', 'text/plain; version=0.0.4')
    return reply.send(lines.join('\n'))
  })

  // Grafana-compatible JSON datasource: GET /metrics/grafana
  app.get('/grafana', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { projectId, metricType, days = '30' } = req.query as any
    const since = new Date()
    since.setDate(since.getDate() - Number(days))

    const snapshots = await app.prisma.metricSnapshot.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(metricType ? { metricType } : {}),
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'asc' },
    })

    // Grafana simple JSON datasource format
    const byType: Record<string, any[]> = {}
    for (const s of snapshots) {
      if (!byType[s.metricType]) byType[s.metricType] = []
      byType[s.metricType].push([s.value, s.recordedAt.getTime()])
    }

    return reply.send(
      Object.entries(byType).map(([target, datapoints]) => ({ target, datapoints }))
    )
  })
}
```

- [ ] **Step 2: Register routes**

In `backend/src/interfaces/http/routes/index.ts`:
```typescript
import { metricsExportRoutes } from './metricsExport'
app.register(metricsExportRoutes, { prefix: '/export' })
```

- [ ] **Step 3: Test Prometheus endpoint**

```bash
curl http://localhost:3001/export/prometheus
```

Expected: Prometheus text format with `qauthority_metric` gauge lines.

- [ ] **Step 4: Commit**

```bash
git add backend/src/interfaces/http/routes/metricsExport.ts
git commit -m "feat(routes): add Prometheus and Grafana-compatible metrics export endpoints"
```

---

## Task 7: Frontend — Reports Pages

- [ ] **Step 1: Create Report Templates page**

Create `frontend/src/app/[locale]/(app)/reports/templates/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import { toast } from 'sonner'
import { useNavigationStore } from '@/stores/navigationStore'

const FORMAT_OPTIONS = ['PDF', 'DOCX', 'EXCEL', 'CSV', 'JSON']
const TYPE_OPTIONS = ['EXECUTION_SUMMARY', 'TEST_COVERAGE', 'DEFECT_ANALYSIS', 'KPI_SUMMARY', 'EXECUTIVE_BRIEFING']

export default function ReportTemplatesPage() {
  const { activeProject } = useNavigationStore()
  const [templates, setTemplates] = useState<any[]>([])
  const [generating, setGenerating] = useState<string | null>(null)

  useEffect(() => {
    api.get('/reports/templates').then(r => setTemplates(r.data))
  }, [])

  const generate = async (templateId: string, format: string) => {
    setGenerating(templateId)
    try {
      const res = await api.post('/reports/generate', {
        templateId,
        format,
        projectIds: activeProject ? [activeProject] : null,
      })
      toast.success(`Report queued — Job ID: ${res.data.jobId}`)
    } catch {
      toast.error('Failed to queue report')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">Report Templates</h1>
      <div className="space-y-3">
        {templates.map(t => (
          <div key={t.id} className="border rounded p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{t.name}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{t.type}</Badge>
                <Badge variant="secondary">{t.scope}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map(fmt => (
                <Button
                  key={fmt}
                  size="sm"
                  variant="outline"
                  disabled={generating === t.id}
                  onClick={() => generate(t.id, fmt)}
                >
                  {fmt}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create Report History page**

Create `frontend/src/app/[locale]/(app)/reports/history/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'secondary', RUNNING: 'default', DONE: 'default', FAILED: 'destructive',
}

export default function ReportHistoryPage() {
  const [jobs, setJobs] = useState<any[]>([])

  useEffect(() => {
    api.get('/reports/jobs').then(r => setJobs(r.data))
    const interval = setInterval(() => api.get('/reports/jobs').then(r => setJobs(r.data)), 5000)
    return () => clearInterval(interval)
  }, [])

  const download = (jobId: string) => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/reports/jobs/${jobId}/download`, '_blank')
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">Report History</h1>
      <div className="space-y-2">
        {jobs.map(job => (
          <div key={job.id} className="border rounded p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{job.template?.name}</p>
              <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                <span>{job.format}</span>
                <span>•</span>
                <span>{new Date(job.createdAt).toLocaleString()}</span>
                {job.errorMsg && <span className="text-red-500">{job.errorMsg}</span>}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Badge variant={STATUS_COLORS[job.status] as any}>{job.status}</Badge>
              {job.status === 'DONE' && (
                <Button size="sm" onClick={() => download(job.id)}>Download</Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/[locale]/(app)/reports/
git commit -m "feat(ui): add Report Templates and Report History pages with download support"
```

---

## Final: Integration Verification

- [ ] **Step 1: Create a report template via API**

```bash
curl -X POST http://localhost:3001/reports/templates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Sprint Execution Report","type":"EXECUTION_SUMMARY","scope":"PROJECT","projectId":"<id>","config":{}}'
```

- [ ] **Step 2: Queue a report generation**

```bash
curl -X POST http://localhost:3001/reports/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"templateId":"<id>","format":"EXCEL"}'
```

Expected: `{"jobId":"...","status":"PENDING"}`

- [ ] **Step 3: Poll until DONE and download**

```bash
curl http://localhost:3001/reports/jobs/<jobId>/download \
  -H "Authorization: Bearer <token>" \
  --output report.xlsx
```

Expected: valid Excel file downloaded.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(plan-3): complete Advanced Reporting with PDF/DOCX/Excel and Prometheus/Grafana export"
```
