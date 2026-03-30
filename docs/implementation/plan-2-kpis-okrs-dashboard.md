# Plan 2: KPIs / OKRs / Metrics Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time QA Governance dashboard with OKRs (org + project scoped), DORA metrics, quality KPIs, and Process Behavior Charts (XmR) — viewable per-project and as an executive org-wide view.

**Architecture:** New Prisma models (OKR, KeyResult, MetricSnapshot, PBCSnapshot, ExecutiveDashboard). Backend services compute metrics from existing execution/bug/CI data and store periodic snapshots. Frontend renders two dashboard modes: Project Dashboard and Executive Dashboard (all projects).

**Tech Stack:** Prisma 6, Fastify 5, Vitest 2, Next.js 16, Recharts (add as dependency), shadcn/ui

**Depends on:** Plan 0 (permissions gate governance module access)

---

## ⚠️ Path & URL Convention — Read This First

Pages live under `frontend/src/app/(app)/`. The route groups `(auth)` and `(app)` are NOT visible in URLs.

---

## File Map

### Backend — New
- `backend/prisma/migrations/XXXXXX_add_metrics/migration.sql`
- `backend/src/services/OKRService.ts`
- `backend/src/services/MetricsCollectorService.ts`
- `backend/src/services/MetricsAggregatorService.ts`
- `backend/src/services/DORACalculatorService.ts`
- `backend/src/services/PBCCalculatorService.ts`
- `backend/src/services/ExecutiveDashboardService.ts`
- `backend/src/interfaces/http/routes/okrs.ts`
- `backend/src/interfaces/http/routes/metrics.ts`
- `backend/src/interfaces/http/routes/executiveDashboard.ts`
- `backend/tests/services/OKRService.test.ts`
- `backend/tests/services/PBCCalculatorService.test.ts`
- `backend/tests/services/DORACalculatorService.test.ts`

### Backend — Modified
- `backend/src/interfaces/http/routes/index.ts`
- `backend/prisma/schema.prisma`

### Frontend — New
- `frontend/src/app/(app)/governance/executive/page.tsx`
- `frontend/src/app/(app)/governance/project/page.tsx`
- `frontend/src/app/(app)/governance/okrs/page.tsx`
- `frontend/src/app/(app)/governance/kpis/page.tsx`
- `frontend/src/components/governance/ExecutiveDashboard.tsx`
- `frontend/src/components/governance/ProjectDashboard.tsx`
- `frontend/src/components/governance/OKRCard.tsx`
- `frontend/src/components/governance/MetricCard.tsx`
- `frontend/src/components/governance/PBCChart.tsx`
- `frontend/src/components/governance/DORAPanel.tsx`
- `frontend/src/components/governance/TeamHealthCard.tsx`

---

## Task 1: Prisma Schema — Metrics & OKR Models

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add models**

Append to `backend/prisma/schema.prisma`:

```prisma
enum OKRScope  { PROJECT ORGANIZATION }
enum OKRStatus { DRAFT ON_TRACK AT_RISK ACHIEVED CANCELLED }
enum AggregationStrategy { SUM AVG MIN MAX }

enum MetricType {
  DORA_DEPLOY_FREQUENCY
  DORA_LEAD_TIME_HOURS
  DORA_CHANGE_FAIL_RATE
  DORA_MTTR_HOURS
  QUALITY_REQUIREMENT_COVERAGE
  QUALITY_DEFECT_DENSITY
  QUALITY_ESCAPED_DEFECTS
  EXECUTION_BURNDOWN
  EXECUTION_PASS_RATE
}

model OKR {
  id          String      @id @default(uuid())
  title       String
  description String?
  quarter     Int
  year        Int
  status      OKRStatus   @default(DRAFT)
  scope       OKRScope
  projectId   String?
  parentOkrId String?
  isAdopted   Boolean     @default(false)
  project     Project?    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parent      OKR?        @relation("OKRAdoption", fields: [parentOkrId], references: [id])
  adopted     OKR[]       @relation("OKRAdoption")
  keyResults  KeyResult[]
  createdById String
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model KeyResult {
  id                  String              @id @default(uuid())
  okrId               String
  title               String
  targetValue         Float
  currentValue        Float               @default(0)
  unit                String
  aggregationStrategy AggregationStrategy @default(AVG)
  okr                 OKR                 @relation(fields: [okrId], references: [id], onDelete: Cascade)
}

model MetricSnapshot {
  id         String     @id @default(uuid())
  projectId  String?
  metricType MetricType
  value      Float
  recordedAt DateTime   @default(now())
  metadata   Json?
  project    Project?   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, metricType, recordedAt])
}

model PBCSnapshot {
  id           String     @id @default(uuid())
  projectId    String?
  metricType   MetricType
  dataPoints   Json
  centralLine  Float
  upperLimit   Float
  lowerLimit   Float
  signals      Json
  calculatedAt DateTime   @default(now())
  project      Project?   @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model ExecutiveDashboard {
  id          String   @id @default(uuid())
  name        String
  isDefault   Boolean  @default(false)
  config      Json
  createdById String
  createdAt   DateTime @default(now())
}
```

- [ ] **Step 2: Add reverse relations to existing Project model**

In the `Project` model block, add:
```prisma
  okrs               OKR[]
  metricSnapshots    MetricSnapshot[]
  pbcSnapshots       PBCSnapshot[]
```

- [ ] **Step 3: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_metrics_okrs_pbc
```

Expected: no errors, migration applied.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add OKR, KeyResult, MetricSnapshot, PBCSnapshot, ExecutiveDashboard models"
```

---

## Task 2: PBCCalculatorService (XmR)

**Files:**
- Create: `backend/src/services/PBCCalculatorService.ts`
- Create: `backend/tests/services/PBCCalculatorService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/services/PBCCalculatorService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { PBCCalculatorService } from '../../src/services/PBCCalculatorService'

describe('PBCCalculatorService', () => {
  const service = new PBCCalculatorService()

  it('computes central line as mean of values', () => {
    const result = service.computeXmR([
      { date: '2026-01-01', value: 4 },
      { date: '2026-01-08', value: 6 },
      { date: '2026-01-15', value: 5 },
    ])
    expect(result.centralLine).toBeCloseTo(5, 1)
  })

  it('computes UNPL and LNPL using 2.66 * mR-bar', () => {
    // Known XmR: values [4,6,4,6,4,6,4,6] → mR=[2,2,2,2,2,2,2] → mR-bar=2
    // UNPL = 5 + 2.66*2 = 10.32, LNPL = 5 - 5.32 = -0.32
    const values = [4, 6, 4, 6, 4, 6, 4, 6].map((v, i) => ({
      date: `2026-01-0${i + 1}`,
      value: v,
    }))
    const result = service.computeXmR(values)
    expect(result.upperLimit).toBeCloseTo(10.32, 1)
    expect(result.lowerLimit).toBeCloseTo(-0.32, 1)
  })

  it('detects OUTSIDE_LIMIT signal', () => {
    const values = [5, 5, 5, 5, 20, 5, 5].map((v, i) => ({ date: `2026-01-0${i + 1}`, value: v }))
    const result = service.computeXmR(values)
    const signals = service.detectSignals(values, result)
    expect(signals.some(s => s.type === 'OUTSIDE_LIMIT')).toBe(true)
  })

  it('detects RUN signal (8 points same side)', () => {
    // 8 values all above mean
    const values = [5, 6, 6, 6, 6, 6, 6, 6, 6, 4].map((v, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      value: v,
    }))
    const result = service.computeXmR(values)
    const signals = service.detectSignals(values, result)
    expect(signals.some(s => s.type === 'RUN')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd backend && npx vitest run tests/services/PBCCalculatorService.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement PBCCalculatorService**

Create `backend/src/services/PBCCalculatorService.ts`:

```typescript
interface DataPoint { date: string; value: number }
interface XmRResult {
  centralLine: number
  upperLimit: number
  lowerLimit: number
  dataPoints: (DataPoint & { movingRange: number | null })[]
}
type SignalType = 'OUTSIDE_LIMIT' | 'RUN' | 'TREND'
interface Signal { date: string; type: SignalType }

export class PBCCalculatorService {
  computeXmR(dataPoints: DataPoint[]): XmRResult {
    if (dataPoints.length < 2) {
      throw new Error('Need at least 2 data points for XmR calculation')
    }

    const mean = dataPoints.reduce((s, p) => s + p.value, 0) / dataPoints.length

    const withMR = dataPoints.map((p, i) => ({
      ...p,
      movingRange: i === 0 ? null : Math.abs(p.value - dataPoints[i - 1].value),
    }))

    const mRValues = withMR.slice(1).map(p => p.movingRange as number)
    const mRBar = mRValues.reduce((s, v) => s + v, 0) / mRValues.length

    return {
      centralLine: mean,
      upperLimit: mean + 2.66 * mRBar,
      lowerLimit: mean - 2.66 * mRBar,
      dataPoints: withMR,
    }
  }

  detectSignals(dataPoints: DataPoint[], limits: XmRResult): Signal[] {
    const signals: Signal[] = []
    const { centralLine, upperLimit, lowerLimit } = limits

    // Signal 1: Point outside limits
    for (const p of dataPoints) {
      if (p.value > upperLimit || p.value < lowerLimit) {
        signals.push({ date: p.date, type: 'OUTSIDE_LIMIT' })
      }
    }

    // Signal 2: Run of 8 consecutive points on same side of central line
    let runCount = 1
    for (let i = 1; i < dataPoints.length; i++) {
      const prevAbove = dataPoints[i - 1].value >= centralLine
      const currAbove = dataPoints[i].value >= centralLine
      if (prevAbove === currAbove) {
        runCount++
        if (runCount >= 8) {
          signals.push({ date: dataPoints[i].date, type: 'RUN' })
        }
      } else {
        runCount = 1
      }
    }

    // Signal 3: Trend of 6 consecutive points going consistently up or down
    let trendCount = 1
    for (let i = 1; i < dataPoints.length; i++) {
      const goingUp = dataPoints[i].value > dataPoints[i - 1].value
      const prevGoingUp = i > 1 ? dataPoints[i - 1].value > dataPoints[i - 2].value : goingUp
      if (goingUp === prevGoingUp) {
        trendCount++
        if (trendCount >= 6) {
          signals.push({ date: dataPoints[i].date, type: 'TREND' })
        }
      } else {
        trendCount = 1
      }
    }

    return signals
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/services/PBCCalculatorService.test.ts
```

Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/PBCCalculatorService.ts backend/tests/services/PBCCalculatorService.test.ts
git commit -m "feat(service): add PBCCalculatorService with XmR chart computation and signal detection"
```

---

## Task 3: DORACalculatorService

**Files:**
- Create: `backend/src/services/DORACalculatorService.ts`
- Create: `backend/tests/services/DORACalculatorService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/services/DORACalculatorService.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { DORACalculatorService } from '../../src/services/DORACalculatorService'

const mockPrisma = {
  ciCDBuild: { findMany: vi.fn() },
  bug: { findMany: vi.fn() },
  testExecution: { findMany: vi.fn() },
}

describe('DORACalculatorService', () => {
  const service = new DORACalculatorService(mockPrisma as any)

  it('calculates deploy frequency as deploys per week', async () => {
    mockPrisma.ciCDBuild.findMany.mockResolvedValue([
      { completedAt: new Date('2026-01-01'), status: 'SUCCESS' },
      { completedAt: new Date('2026-01-03'), status: 'SUCCESS' },
      { completedAt: new Date('2026-01-07'), status: 'SUCCESS' },
      { completedAt: new Date('2026-01-08'), status: 'SUCCESS' },
    ])
    const result = await service.calculateDeployFrequency('proj1', 14)
    expect(result).toBeGreaterThan(0)
  })

  it('calculates change failure rate as failed/total deploys', async () => {
    mockPrisma.ciCDBuild.findMany.mockResolvedValue([
      { status: 'SUCCESS' },
      { status: 'SUCCESS' },
      { status: 'FAILED' },
      { status: 'FAILED' },
    ])
    const result = await service.calculateChangeFailureRate('proj1', 30)
    expect(result).toBe(50)
  })
})
```

- [ ] **Step 2: Implement DORACalculatorService**

Create `backend/src/services/DORACalculatorService.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

export class DORACalculatorService {
  constructor(private prisma: PrismaClient) {}

  private daysBefore(days: number) {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d
  }

  async calculateDeployFrequency(projectId: string, days = 30): Promise<number> {
    const builds = await (this.prisma as any).ciCDBuild.findMany({
      where: {
        projectId,
        status: 'SUCCESS',
        completedAt: { gte: this.daysBefore(days) },
      },
    })
    const weeks = days / 7
    return builds.length / weeks
  }

  async calculateChangeFailureRate(projectId: string, days = 30): Promise<number> {
    const builds = await (this.prisma as any).ciCDBuild.findMany({
      where: { projectId, completedAt: { gte: this.daysBefore(days) } },
    })
    if (builds.length === 0) return 0
    const failed = builds.filter((b: any) => b.status === 'FAILED').length
    return (failed / builds.length) * 100
  }

  async calculateMTTR(projectId: string, days = 30): Promise<number> {
    // Mean time from a FAILED build to the next SUCCESS build on same branch
    const builds = await (this.prisma as any).ciCDBuild.findMany({
      where: { projectId, completedAt: { gte: this.daysBefore(days) } },
      orderBy: { completedAt: 'asc' },
    })
    const recoveries: number[] = []
    for (let i = 0; i < builds.length - 1; i++) {
      if (builds[i].status === 'FAILED' && builds[i + 1].status === 'SUCCESS') {
        const diff = builds[i + 1].completedAt.getTime() - builds[i].completedAt.getTime()
        recoveries.push(diff / 1000 / 60 / 60) // hours
      }
    }
    if (recoveries.length === 0) return 0
    return recoveries.reduce((s, v) => s + v, 0) / recoveries.length
  }

  async calculateLeadTime(projectId: string, days = 30): Promise<number> {
    // Average hours from first commit in build to deploy success
    // Approximation: use build creation to completedAt as proxy
    const builds = await (this.prisma as any).ciCDBuild.findMany({
      where: { projectId, status: 'SUCCESS', completedAt: { gte: this.daysBefore(days) } },
    })
    if (builds.length === 0) return 0
    const durations = builds
      .filter((b: any) => b.triggeredAt && b.completedAt)
      .map((b: any) => (b.completedAt.getTime() - b.triggeredAt.getTime()) / 1000 / 60 / 60)
    if (durations.length === 0) return 0
    return durations.reduce((s: number, v: number) => s + v, 0) / durations.length
  }

  async computeAll(projectId: string, days = 30) {
    const [deployFreq, changeFailRate, mttr, leadTime] = await Promise.all([
      this.calculateDeployFrequency(projectId, days),
      this.calculateChangeFailureRate(projectId, days),
      this.calculateMTTR(projectId, days),
      this.calculateLeadTime(projectId, days),
    ])
    return { deployFreq, changeFailRate, mttr, leadTime }
  }
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/services/DORACalculatorService.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/DORACalculatorService.ts backend/tests/services/DORACalculatorService.test.ts
git commit -m "feat(service): add DORACalculatorService for deploy frequency, MTTR, lead time, change fail rate"
```

---

## Task 4: OKRService

**Files:**
- Create: `backend/src/services/OKRService.ts`
- Create: `backend/tests/services/OKRService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/services/OKRService.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { OKRService } from '../../src/services/OKRService'

const mockPrisma = {
  oKR: {
    findMany: vi.fn(), findUnique: vi.fn(),
    create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  },
  keyResult: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}

describe('OKRService', () => {
  const service = new OKRService(mockPrisma as any)

  it('adoptOrgOKR creates a project-scoped copy with parentOkrId set', async () => {
    mockPrisma.oKR.findUnique.mockResolvedValue({
      id: 'org-okr-1', scope: 'ORGANIZATION', title: 'Reduce bugs 90%',
      quarter: 1, year: 2026, status: 'ON_TRACK', keyResults: [],
    })
    mockPrisma.oKR.create.mockResolvedValue({ id: 'proj-okr-1' })

    await service.adoptOrgOKR('org-okr-1', 'proj-1', 'user-1')

    expect(mockPrisma.oKR.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scope: 'PROJECT',
          projectId: 'proj-1',
          parentOkrId: 'org-okr-1',
          isAdopted: true,
        }),
      })
    )
  })

  it('throws when adopting a non-org OKR', async () => {
    mockPrisma.oKR.findUnique.mockResolvedValue({
      id: 'proj-okr-1', scope: 'PROJECT',
    })
    await expect(service.adoptOrgOKR('proj-okr-1', 'proj-2', 'user-1'))
      .rejects.toThrow('Can only adopt organization-level OKRs')
  })
})
```

- [ ] **Step 2: Implement OKRService**

Create `backend/src/services/OKRService.ts`:

```typescript
import { PrismaClient, OKRScope, OKRStatus } from '@prisma/client'

interface CreateOKRInput {
  title: string
  description?: string
  quarter: number
  year: number
  scope: OKRScope
  projectId?: string
  createdById: string
}

export class OKRService {
  constructor(private prisma: PrismaClient) {}

  async listOrgOKRs() {
    return this.prisma.oKR.findMany({
      where: { scope: 'ORGANIZATION' },
      include: { keyResults: true, adopted: { include: { keyResults: true } } },
    })
  }

  async listProjectOKRs(projectId: string) {
    return this.prisma.oKR.findMany({
      where: { projectId },
      include: { keyResults: true, parent: true },
    })
  }

  async createOKR(input: CreateOKRInput) {
    return this.prisma.oKR.create({
      data: { ...input, status: 'DRAFT' },
      include: { keyResults: true },
    })
  }

  async updateOKRStatus(id: string, status: OKRStatus) {
    return this.prisma.oKR.update({ where: { id }, data: { status } })
  }

  async deleteOKR(id: string) {
    return this.prisma.oKR.delete({ where: { id } })
  }

  async adoptOrgOKR(orgOkrId: string, projectId: string, userId: string) {
    const orgOKR = await this.prisma.oKR.findUnique({
      where: { id: orgOkrId },
      include: { keyResults: true },
    })
    if (!orgOKR) throw new Error('OKR not found')
    if (orgOKR.scope !== 'ORGANIZATION') throw new Error('Can only adopt organization-level OKRs')

    const adopted = await this.prisma.oKR.create({
      data: {
        title: orgOKR.title,
        description: orgOKR.description,
        quarter: orgOKR.quarter,
        year: orgOKR.year,
        status: 'DRAFT',
        scope: 'PROJECT',
        projectId,
        parentOkrId: orgOkrId,
        isAdopted: true,
        createdById: userId,
      },
    })

    // Clone key results as project-level targets (starting at 0)
    await Promise.all(
      orgOKR.keyResults.map(kr =>
        this.prisma.keyResult.create({
          data: {
            okrId: adopted.id,
            title: kr.title,
            targetValue: kr.targetValue,
            currentValue: 0,
            unit: kr.unit,
            aggregationStrategy: kr.aggregationStrategy,
          },
        })
      )
    )

    return adopted
  }

  async updateKeyResult(id: string, currentValue: number) {
    return this.prisma.keyResult.update({ where: { id }, data: { currentValue } })
  }

  async computeOrgRollup(orgOkrId: string) {
    const orgOKR = await this.prisma.oKR.findUnique({
      where: { id: orgOkrId },
      include: {
        keyResults: true,
        adopted: { include: { keyResults: true } },
      },
    })
    if (!orgOKR) throw new Error('OKR not found')

    return orgOKR.keyResults.map(kr => {
      const projectValues = orgOKR.adopted.flatMap(a =>
        a.keyResults.filter(pkr => pkr.title === kr.title).map(pkr => pkr.currentValue)
      )
      if (projectValues.length === 0) return { ...kr, rolledUpValue: 0 }

      let rolledUpValue: number
      switch (kr.aggregationStrategy) {
        case 'SUM': rolledUpValue = projectValues.reduce((s, v) => s + v, 0); break
        case 'MIN': rolledUpValue = Math.min(...projectValues); break
        case 'MAX': rolledUpValue = Math.max(...projectValues); break
        default: rolledUpValue = projectValues.reduce((s, v) => s + v, 0) / projectValues.length
      }
      return { ...kr, rolledUpValue }
    })
  }
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/services/OKRService.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/OKRService.ts backend/tests/services/OKRService.test.ts
git commit -m "feat(service): add OKRService with org/project scoping and adoption logic"
```

---

## Task 5: MetricsCollectorService + Routes

**Files:**
- Create: `backend/src/services/MetricsCollectorService.ts`
- Create: `backend/src/services/MetricsAggregatorService.ts`
- Create: `backend/src/interfaces/http/routes/metrics.ts`
- Create: `backend/src/interfaces/http/routes/okrs.ts`

- [ ] **Step 1: Implement MetricsCollectorService**

Create `backend/src/services/MetricsCollectorService.ts`:

```typescript
import { PrismaClient, MetricType } from '@prisma/client'
import { DORACalculatorService } from './DORACalculatorService'

export class MetricsCollectorService {
  private dora: DORACalculatorService

  constructor(private prisma: PrismaClient) {
    this.dora = new DORACalculatorService(prisma)
  }

  async collectForProject(projectId: string) {
    const doraMetrics = await this.dora.computeAll(projectId, 30)

    const [totalCases, linkedCases, openBugs, totalBugs, passedSteps, totalSteps] =
      await Promise.all([
        this.prisma.testCase.count({ where: { suite: { plan: { projectId } } } }),
        this.prisma.testCase.count({
          where: { suite: { plan: { projectId } }, requirementId: { not: null } },
        }),
        this.prisma.bug.count({ where: { projectId, status: { not: 'CLOSED' } } }),
        this.prisma.bug.count({ where: { projectId } }),
        this.prisma.executionStepResult.count({
          where: { execution: { testCase: { suite: { plan: { projectId } } } }, status: 'PASSED' },
        }),
        this.prisma.executionStepResult.count({
          where: { execution: { testCase: { suite: { plan: { projectId } } } } },
        }),
      ])

    const snapshots = [
      { metricType: 'DORA_DEPLOY_FREQUENCY' as MetricType, value: doraMetrics.deployFreq },
      { metricType: 'DORA_LEAD_TIME_HOURS' as MetricType, value: doraMetrics.leadTime },
      { metricType: 'DORA_CHANGE_FAIL_RATE' as MetricType, value: doraMetrics.changeFailRate },
      { metricType: 'DORA_MTTR_HOURS' as MetricType, value: doraMetrics.mttr },
      {
        metricType: 'QUALITY_REQUIREMENT_COVERAGE' as MetricType,
        value: totalCases > 0 ? (linkedCases / totalCases) * 100 : 0,
      },
      {
        metricType: 'QUALITY_DEFECT_DENSITY' as MetricType,
        value: totalCases > 0 ? totalBugs / totalCases : 0,
      },
      {
        metricType: 'EXECUTION_PASS_RATE' as MetricType,
        value: totalSteps > 0 ? (passedSteps / totalSteps) * 100 : 0,
      },
    ]

    await Promise.all(
      snapshots.map(s =>
        this.prisma.metricSnapshot.create({ data: { projectId, ...s } })
      )
    )

    return snapshots
  }

  async getLatestForProject(projectId: string) {
    const metrics = await this.prisma.metricSnapshot.findMany({
      where: { projectId },
      orderBy: { recordedAt: 'desc' },
      distinct: ['metricType'],
    })
    return metrics
  }

  async getHistoryForProject(projectId: string, metricType: MetricType, days = 90) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    return this.prisma.metricSnapshot.findMany({
      where: { projectId, metricType, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
    })
  }
}
```

- [ ] **Step 2: Implement MetricsAggregatorService**

Create `backend/src/services/MetricsAggregatorService.ts`:

```typescript
import { PrismaClient, MetricType } from '@prisma/client'
import { MetricsCollectorService } from './MetricsCollectorService'

export class MetricsAggregatorService {
  constructor(private prisma: PrismaClient) {}

  async aggregateAllProjects() {
    const projects = await this.prisma.project.findMany({ select: { id: true } })
    const collector = new MetricsCollectorService(this.prisma)

    const allMetrics = await Promise.all(
      projects.map(p => collector.getLatestForProject(p.id))
    )

    const byMetric: Record<string, number[]> = {}
    for (const projectMetrics of allMetrics) {
      for (const m of projectMetrics) {
        if (!byMetric[m.metricType]) byMetric[m.metricType] = []
        byMetric[m.metricType].push(m.value)
      }
    }

    const aggregated: Record<string, { avg: number; min: number; max: number }> = {}
    for (const [type, values] of Object.entries(byMetric)) {
      aggregated[type] = {
        avg: values.reduce((s, v) => s + v, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      }
    }

    return { projectCount: projects.length, metrics: aggregated }
  }

  async getTeamHealthScores() {
    const projects = await this.prisma.project.findMany({ select: { id: true, name: true } })
    const collector = new MetricsCollectorService(this.prisma)

    return Promise.all(
      projects.map(async project => {
        const metrics = await collector.getLatestForProject(project.id)
        const passRate = metrics.find(m => m.metricType === 'EXECUTION_PASS_RATE')?.value ?? 0
        const coverage = metrics.find(m => m.metricType === 'QUALITY_REQUIREMENT_COVERAGE')?.value ?? 0
        const failRate = metrics.find(m => m.metricType === 'DORA_CHANGE_FAIL_RATE')?.value ?? 100
        // Simple composite: avg of pass rate, coverage, and inverse of failure rate
        const score = (passRate + coverage + (100 - failRate)) / 3
        return { projectId: project.id, projectName: project.name, score: Math.round(score) }
      })
    )
  }
}
```

- [ ] **Step 3: Create metrics routes**

Create `backend/src/interfaces/http/routes/metrics.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { MetricsCollectorService } from '../../../services/MetricsCollectorService'
import { MetricsAggregatorService } from '../../../services/MetricsAggregatorService'
import { PBCCalculatorService } from '../../../services/PBCCalculatorService'
import { requirePermission } from '../../../infrastructure/auth/authMiddleware'

export async function metricsRoutes(app: FastifyInstance) {
  const collector = new MetricsCollectorService(app.prisma)
  const aggregator = new MetricsAggregatorService(app.prisma)
  const pbc = new PBCCalculatorService()

  const auth = [app.authenticate, requirePermission('QA_GOVERNANCE', 'read')]

  // GET /metrics/project/:projectId — latest snapshot per metric
  app.get('/project/:projectId', { onRequest: auth }, async (req, reply) => {
    const { projectId } = req.params as { projectId: string }
    const metrics = await collector.getLatestForProject(projectId)
    return reply.send(metrics)
  })

  // POST /metrics/project/:projectId/collect — trigger fresh collection
  app.post('/project/:projectId/collect', { onRequest: auth }, async (req, reply) => {
    const { projectId } = req.params as { projectId: string }
    const result = await collector.collectForProject(projectId)
    return reply.send(result)
  })

  // GET /metrics/project/:projectId/history/:metricType
  app.get('/project/:projectId/history/:metricType', { onRequest: auth }, async (req, reply) => {
    const { projectId, metricType } = req.params as { projectId: string; metricType: any }
    const days = Number((req.query as any).days ?? 90)
    const history = await collector.getHistoryForProject(projectId, metricType, days)

    // Compute PBC on the fly
    if (history.length >= 2) {
      const dataPoints = history.map(h => ({ date: h.recordedAt.toISOString(), value: h.value }))
      const pbcResult = pbc.computeXmR(dataPoints)
      const signals = pbc.detectSignals(dataPoints, pbcResult)
      return reply.send({ history, pbc: { ...pbcResult, signals } })
    }
    return reply.send({ history, pbc: null })
  })

  // GET /metrics/org — aggregated across all projects
  app.get('/org', { onRequest: auth }, async (_req, reply) => {
    const result = await aggregator.aggregateAllProjects()
    return reply.send(result)
  })

  // GET /metrics/org/team-health
  app.get('/org/team-health', { onRequest: auth }, async (_req, reply) => {
    const scores = await aggregator.getTeamHealthScores()
    return reply.send(scores)
  })
}
```

- [ ] **Step 4: Create OKR routes**

Create `backend/src/interfaces/http/routes/okrs.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { OKRService } from '../../../services/OKRService'
import { requirePermission } from '../../../infrastructure/auth/authMiddleware'

export async function okrRoutes(app: FastifyInstance) {
  const service = new OKRService(app.prisma)
  const auth = [app.authenticate, requirePermission('QA_GOVERNANCE', 'read')]
  const authWrite = [app.authenticate, requirePermission('QA_GOVERNANCE', 'create')]

  app.get('/org', { onRequest: auth }, async (_req, reply) => {
    return reply.send(await service.listOrgOKRs())
  })

  app.get('/project/:projectId', { onRequest: auth }, async (req, reply) => {
    const { projectId } = req.params as { projectId: string }
    return reply.send(await service.listProjectOKRs(projectId))
  })

  app.post('/', { onRequest: authWrite }, async (req, reply) => {
    const body = req.body as any
    const okr = await service.createOKR({ ...body, createdById: (req.user as any).id })
    return reply.code(201).send(okr)
  })

  app.post('/:orgOkrId/adopt/:projectId', { onRequest: authWrite }, async (req, reply) => {
    const { orgOkrId, projectId } = req.params as { orgOkrId: string; projectId: string }
    const adopted = await service.adoptOrgOKR(orgOkrId, projectId, (req.user as any).id)
    return reply.code(201).send(adopted)
  })

  app.patch('/:id/status', { onRequest: authWrite }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: any }
    return reply.send(await service.updateOKRStatus(id, status))
  })

  app.patch('/key-results/:id', { onRequest: authWrite }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { currentValue } = req.body as { currentValue: number }
    return reply.send(await service.updateKeyResult(id, currentValue))
  })

  app.get('/:id/rollup', { onRequest: auth }, async (req, reply) => {
    const { id } = req.params as { id: string }
    return reply.send(await service.computeOrgRollup(id))
  })
}
```

- [ ] **Step 5: Register routes**

In `backend/src/interfaces/http/routes/index.ts`:
```typescript
import { metricsRoutes } from './metrics'
import { okrRoutes } from './okrs'

app.register(metricsRoutes, { prefix: '/metrics' })
app.register(okrRoutes, { prefix: '/okrs' })
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/MetricsCollectorService.ts backend/src/services/MetricsAggregatorService.ts
git add backend/src/interfaces/http/routes/metrics.ts backend/src/interfaces/http/routes/okrs.ts
git commit -m "feat(service+routes): add MetricsCollector, MetricsAggregator, and OKR routes"
```

---

## Task 6: Frontend — Install Recharts

- [ ] **Step 1: Add Recharts dependency**

```bash
cd frontend && npm install recharts
```

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add recharts for governance charts"
```

---

## Task 7: Frontend — PBCChart Component

**Files:**
- Create: `frontend/src/components/governance/PBCChart.tsx`

- [ ] **Step 1: Create PBCChart**

Create `frontend/src/components/governance/PBCChart.tsx`:

```typescript
'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Dot
} from 'recharts'

interface DataPoint { date: string; value: number; movingRange?: number | null }
interface PBCData {
  history: { recordedAt: string; value: number }[]
  pbc: {
    centralLine: number
    upperLimit: number
    lowerLimit: number
    signals: { date: string; type: string }[]
  } | null
}

interface Props {
  data: PBCData
  title: string
  unit?: string
}

export function PBCChart({ data, title, unit = '' }: Props) {
  if (!data.pbc || data.history.length < 2) {
    return (
      <div className="border rounded p-4">
        <p className="text-sm font-medium mb-2">{title}</p>
        <p className="text-xs text-muted-foreground">Not enough data for PBC analysis (need ≥ 2 data points)</p>
      </div>
    )
  }

  const signalDates = new Set(data.pbc.signals.map(s => s.date.slice(0, 10)))
  const chartData = data.history.map(h => ({
    date: h.recordedAt.slice(0, 10),
    value: h.value,
    isSignal: signalDates.has(h.recordedAt.slice(0, 10)),
  }))

  const renderDot = (props: any) => {
    const { cx, cy, payload } = props
    if (payload.isSignal) {
      return <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={6} fill="#ef4444" stroke="white" strokeWidth={2} />
    }
    return <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={3} fill="#3b82f6" />
  }

  return (
    <div className="border rounded p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>X̄ = {data.pbc.centralLine.toFixed(2)}{unit}</span>
          <span>UNPL = {data.pbc.upperLimit.toFixed(2)}{unit}</span>
          {data.pbc.signals.length > 0 && (
            <span className="text-red-500 font-medium">
              {data.pbc.signals.length} signal{data.pbc.signals.length > 1 ? 's' : ''} detected
            </span>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(2)}${unit}`, title]}
            labelFormatter={l => `Date: ${l}`}
          />
          <ReferenceLine y={data.pbc.centralLine} stroke="#6b7280" strokeDasharray="4 4" label={{ value: 'X̄', fontSize: 10 }} />
          <ReferenceLine y={data.pbc.upperLimit} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'UNPL', fontSize: 10 }} />
          <ReferenceLine y={data.pbc.lowerLimit} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'LNPL', fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={renderDot}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/governance/PBCChart.tsx
git commit -m "feat(ui): add PBCChart component with signal detection visualization"
```

---

## Task 8: Frontend — Executive Dashboard Page

**Files:**
- Create: `frontend/src/components/governance/TeamHealthCard.tsx`
- Create: `frontend/src/components/governance/DORAPanel.tsx`
- Create: `frontend/src/app/[locale]/(app)/governance/executive/page.tsx`

- [ ] **Step 1: Create TeamHealthCard**

Create `frontend/src/components/governance/TeamHealthCard.tsx`:

```typescript
'use client'
interface Props {
  projectName: string
  score: number
}

export function TeamHealthCard({ projectName, score }: Props) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  const barWidth = `${score}%`

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-sm w-40 truncate">{projectName}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: barWidth }} />
      </div>
      <span className="text-sm font-medium w-10 text-right">{score}%</span>
    </div>
  )
}
```

- [ ] **Step 2: Create Executive Dashboard page**

Create `frontend/src/app/[locale]/(app)/governance/executive/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { TeamHealthCard } from '@/components/governance/TeamHealthCard'
import api from '@/lib/api'

export default function ExecutiveDashboardPage() {
  const [orgMetrics, setOrgMetrics] = useState<any>(null)
  const [teamHealth, setTeamHealth] = useState<any[]>([])
  const [orgOKRs, setOrgOKRs] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      api.get('/metrics/org'),
      api.get('/metrics/org/team-health'),
      api.get('/okrs/org'),
    ]).then(([metrics, health, okrs]) => {
      setOrgMetrics(metrics.data)
      setTeamHealth(health.data)
      setOrgOKRs(okrs.data)
    })
  }, [])

  const m = orgMetrics?.metrics ?? {}
  const fmt = (key: string, decimals = 1) =>
    m[key] ? m[key].avg.toFixed(decimals) : '—'

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold">Executive Dashboard</h1>
      <p className="text-muted-foreground text-sm">
        Org-wide view across {orgMetrics?.projectCount ?? '—'} projects
      </p>

      {/* DORA Metrics */}
      <section>
        <h2 className="text-lg font-semibold mb-3">DORA Metrics (30-day avg)</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Deploy Frequency', value: fmt('DORA_DEPLOY_FREQUENCY'), unit: '/week' },
            { label: 'Lead Time', value: fmt('DORA_LEAD_TIME_HOURS'), unit: 'hrs' },
            { label: 'Change Fail Rate', value: fmt('DORA_CHANGE_FAIL_RATE'), unit: '%' },
            { label: 'MTTR', value: fmt('DORA_MTTR_HOURS'), unit: 'hrs' },
          ].map(item => (
            <div key={item.label} className="border rounded p-4 text-center">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold mt-1">{item.value}<span className="text-sm font-normal ml-1">{item.unit}</span></p>
            </div>
          ))}
        </div>
      </section>

      {/* Team Health */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Team Health Scorecards</h2>
        <div className="border rounded p-4 space-y-1">
          {teamHealth
            .sort((a, b) => b.score - a.score)
            .map(t => (
              <TeamHealthCard key={t.projectId} projectName={t.projectName} score={t.score} />
            ))}
        </div>
      </section>

      {/* OKR Progress */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Organization OKRs</h2>
        <div className="space-y-3">
          {orgOKRs.map((okr: any) => {
            const progress = okr.keyResults.length > 0
              ? okr.keyResults.reduce((s: number, kr: any) =>
                  s + Math.min((kr.currentValue / kr.targetValue) * 100, 100), 0
                ) / okr.keyResults.length
              : 0
            return (
              <div key={okr.id} className="border rounded p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-medium">{okr.title}</p>
                  <span className="text-sm text-muted-foreground">Q{okr.quarter} {okr.year}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{progress.toFixed(0)}% complete</p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/[locale]/(app)/governance/ frontend/src/components/governance/
git commit -m "feat(ui): add Executive Dashboard with DORA metrics, team health, and OKR progress"
```

---

## Task 9: Frontend — OKRs Page + Project Dashboard

- [ ] **Step 1: Create OKRs page**

Create `frontend/src/app/[locale]/(app)/governance/okrs/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'secondary', ON_TRACK: 'default', AT_RISK: 'destructive', ACHIEVED: 'default', CANCELLED: 'secondary',
}

export default function OKRsPage() {
  const { activeProject } = useNavigationStore()
  const [okrs, setOkrs] = useState<any[]>([])
  const [orgOKRs, setOrgOKRs] = useState<any[]>([])

  useEffect(() => {
    api.get('/okrs/org').then(r => setOrgOKRs(r.data))
    if (activeProject) {
      api.get(`/okrs/project/${activeProject}`).then(r => setOkrs(r.data))
    }
  }, [activeProject])

  const adoptOKR = async (orgOkrId: string) => {
    if (!activeProject) return toast.error('Select a project first')
    await api.post(`/okrs/${orgOkrId}/adopt/${activeProject}`)
    const r = await api.get(`/okrs/project/${activeProject}`)
    setOkrs(r.data)
    toast.success('OKR adopted for this project')
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">OKRs</h1>

      {/* Org OKRs */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Organization OKRs</h2>
        <p className="text-sm text-muted-foreground mb-3">
          These apply across all teams. Adopt one into your project to track progress locally.
        </p>
        <div className="space-y-2">
          {orgOKRs.map(okr => (
            <div key={okr.id} className="border rounded p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{okr.title}</p>
                <p className="text-xs text-muted-foreground">Q{okr.quarter} {okr.year} • {okr.keyResults?.length ?? 0} key results</p>
              </div>
              <div className="flex gap-2 items-center">
                <Badge variant={STATUS_COLORS[okr.status] as any}>{okr.status}</Badge>
                {activeProject && (
                  <Button size="sm" variant="outline" onClick={() => adoptOKR(okr.id)}>
                    Adopt
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Project OKRs */}
      {activeProject && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Project OKRs</h2>
          <div className="space-y-2">
            {okrs.map(okr => (
              <div key={okr.id} className="border rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{okr.title}</p>
                  <div className="flex gap-2">
                    {okr.isAdopted && <Badge variant="outline">Adopted</Badge>}
                    <Badge variant={STATUS_COLORS[okr.status] as any}>{okr.status}</Badge>
                  </div>
                </div>
                {okr.keyResults?.map((kr: any) => (
                  <div key={kr.id} className="mt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{kr.title}</span>
                      <span>{kr.currentValue} / {kr.targetValue} {kr.unit}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min((kr.currentValue / kr.targetValue) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/[locale]/(app)/governance/okrs/page.tsx
git commit -m "feat(ui): add OKRs page with org OKRs, project adoption, and key result progress"
```

---

## Final: Integration Verification

- [ ] **Step 1: Collect metrics for a project**

```bash
curl -X POST http://localhost:3001/metrics/project/<projectId>/collect \
  -H "Authorization: Bearer <token>"
```

Expected: array of metric snapshots.

- [ ] **Step 2: View Executive Dashboard**

Open `http://localhost:3000/governance/executive` with "All Projects" selected.

Expected: DORA panel, team health scorecards, OKR progress bars.

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat(plan-2): complete KPIs/OKRs/Metrics Dashboard with PBC charts and Executive view"
```
