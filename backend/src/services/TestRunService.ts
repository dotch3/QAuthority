import { randomBytes } from "node:crypto"
import { prisma } from "../infrastructure/database/prisma.js"
import { NotFoundError, BadRequestError } from "../utils/errors.js"

export type TestRunStatus = "not_started" | "in_progress" | "completed" | "aborted"
export type TestRunCaseStatus = "not_run" | "in_progress" | "passed" | "failed" | "blocked" | "skipped"

export interface CreateTestRunData {
  projectId: string
  testPlanId: string
  name: string
  description?: string
  environment?: string
  caseIds: string[]
  createdById: string
}

export interface RecordResultData {
  status: TestRunCaseStatus
  notes?: string
  durationMs?: number
}

const TERMINAL_STATUSES: TestRunCaseStatus[] = ["passed", "failed", "blocked", "skipped"]

export class TestRunService {
  async create(data: CreateTestRunData) {
    const testPlan = await prisma.testPlan.findUnique({ where: { id: data.testPlanId } })
    if (!testPlan) throw new NotFoundError("Test plan not found")

    return prisma.$transaction(async (tx) => {
      const run = await tx.testRun.create({
        data: {
          projectId: data.projectId,
          testPlanId: data.testPlanId,
          name: data.name,
          description: data.description,
          environment: data.environment,
          createdById: data.createdById,
          status: "not_started",
          callbackToken: randomBytes(24).toString("hex"),
        },
      })

      if (data.caseIds.length > 0) {
        await tx.testRunCase.createMany({
          data: data.caseIds.map((testCaseId, index) => ({
            testRunId: run.id,
            testCaseId,
            orderIndex: index,
          })),
          skipDuplicates: true,
        })
      }

      return this._findByIdTx(tx, run.id)
    })
  }

  async findById(id: string) {
    return this._findByIdTx(prisma, id)
  }

  private async _findByIdTx(tx: any, id: string) {
    const run = await tx.testRun.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        testPlan: { select: { id: true, name: true } },
        cases: {
          orderBy: { orderIndex: "asc" },
          include: {
            testCase: {
              select: {
                id: true,
                title: true,
                description: true,
                preconditions: true,
                steps: true,
                externalId: true,
                priority: { select: { id: true, label: true, value: true, color: true } },
                type: { select: { id: true, label: true, value: true } },
                suite: { select: { id: true, name: true } },
              },
            },
            assignee: { select: { id: true, name: true, email: true } },
            executions: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                notes: true,
                durationMs: true,
                executedAt: true,
                executedBy: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        _count: { select: { cases: true } },
      },
    })
    if (!run) throw new NotFoundError("Test run not found")
    return run
  }

  async findByProject(
    projectId: string,
    filters?: { status?: string; testPlanId?: string; search?: string; page?: number; limit?: number }
  ) {
    const { status, testPlanId, search, page = 1, limit = 25 } = filters || {}

    const where: any = { projectId }
    if (status) where.status = status
    if (testPlanId) where.testPlanId = testPlanId
    if (search) where.name = { contains: search, mode: "insensitive" }

    const [data, total] = await Promise.all([
      prisma.testRun.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          testPlan: { select: { id: true, name: true } },
          _count: { select: { cases: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.testRun.count({ where }),
    ])

    // Attach progress per run
    const runsWithProgress = await Promise.all(
      data.map(async (run) => {
        const progress = await this.getProgress(run.id)
        return { ...run, progress }
      })
    )

    return { data: runsWithProgress, total }
  }

  async update(id: string, data: { name?: string; description?: string; environment?: string; status?: TestRunStatus }) {
    const run = await prisma.testRun.findUnique({ where: { id } })
    if (!run) throw new NotFoundError("Test run not found")

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.environment !== undefined) updateData.environment = data.environment

    if (data.status) {
      updateData.status = data.status
      if (data.status === "in_progress" && !run.startedAt) updateData.startedAt = new Date()
      if (data.status === "completed" || data.status === "aborted") updateData.completedAt = new Date()
    }

    return prisma.testRun.update({ where: { id }, data: updateData })
  }

  async addCases(testRunId: string, caseIds: string[]) {
    const run = await prisma.testRun.findUnique({ where: { id: testRunId } })
    if (!run) throw new NotFoundError("Test run not found")

    const currentCount = await prisma.testRunCase.count({ where: { testRunId } })

    await prisma.testRunCase.createMany({
      data: caseIds.map((testCaseId, i) => ({
        testRunId,
        testCaseId,
        orderIndex: currentCount + i,
      })),
      skipDuplicates: true,
    })

    return prisma.testRunCase.findMany({
      where: { testRunId, testCaseId: { in: caseIds } },
      include: { testCase: { select: { id: true, title: true } } },
    })
  }

  async removeCase(testRunId: string, testCaseId: string) {
    const rc = await prisma.testRunCase.findUnique({
      where: { testRunId_testCaseId: { testRunId, testCaseId } },
    })
    if (!rc) throw new NotFoundError("Case not in run")
    await prisma.testRunCase.delete({ where: { id: rc.id } })
  }

  async bulkAssign(testRunId: string, caseIds: string[], assigneeId: string | null) {
    const result = await prisma.testRunCase.updateMany({
      where: { testRunId, testCaseId: { in: caseIds } },
      data: { assigneeId },
    })
    return { updated: result.count }
  }

  async recordResult(testRunCaseId: string, data: RecordResultData, executedById: string | null) {
    const runCase = await prisma.testRunCase.findUnique({
      where: { id: testRunCaseId },
      include: { testRun: true, testCase: true },
    })
    if (!runCase) throw new NotFoundError("Test run case not found")

    return prisma.$transaction(async (tx) => {
      // Update the run case status
      const updatedCase = await tx.testRunCase.update({
        where: { id: testRunCaseId },
        data: { status: data.status },
        include: {
          testCase: { select: { id: true, title: true, suiteId: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      })

      // Fetch execution_status enum value matching this result
      const statusKey = data.status === "not_run" ? "not_run" : data.status
      const statusEnum = await tx.enumValue.findFirst({
        where: {
          enumType: { name: "execution_status" },
          systemKey: { in: [statusKey, statusKey.toUpperCase()] },
        },
      })

      let execution = null
      if (statusEnum && executedById && data.status !== "not_run" && data.status !== "in_progress") {
        execution = await tx.testExecution.create({
          data: {
            testCaseId: runCase.testCaseId,
            testPlanId: runCase.testRun.testPlanId,
            suiteId: runCase.testCase.suiteId,
            testRunCaseId,
            statusId: statusEnum.id,
            executedById,
            executedAt: new Date(),
            notes: data.notes,
            durationMs: data.durationMs,
            environment: runCase.testRun.environment,
          },
        })
      }

      // Auto-transition run to in_progress if still not_started
      if (runCase.testRun.status === "not_started") {
        await tx.testRun.update({
          where: { id: runCase.testRunId },
          data: { status: "in_progress", startedAt: new Date() },
        })
      }

      return { runCase: updatedCase, execution }
    })
  }

  async getProgress(testRunId: string) {
    const cases = await prisma.testRunCase.groupBy({
      by: ["status"],
      where: { testRunId },
      _count: true,
    })

    const counts: Record<string, number> = {}
    let total = 0
    for (const row of cases) {
      counts[row.status] = row._count
      total += row._count
    }

    const completed = (counts["passed"] || 0) + (counts["failed"] || 0) + (counts["blocked"] || 0) + (counts["skipped"] || 0)

    return {
      total,
      completed,
      passed: counts["passed"] || 0,
      failed: counts["failed"] || 0,
      blocked: counts["blocked"] || 0,
      skipped: counts["skipped"] || 0,
      inProgress: counts["in_progress"] || 0,
      notRun: counts["not_run"] || 0,
    }
  }

  async delete(id: string) {
    const run = await prisma.testRun.findUnique({ where: { id } })
    if (!run) throw new NotFoundError("Test run not found")
    await prisma.testRun.delete({ where: { id } })
  }

  async getCaseHistory(testCaseId: string, page = 1, limit = 20) {
    const [executions, total] = await Promise.all([
      prisma.testExecution.findMany({
        where: { testCaseId, testRunCaseId: { not: null } },
        include: {
          status: { select: { label: true, value: true, color: true } },
          executedBy: { select: { id: true, name: true, email: true } },
          testRunCase: {
            include: {
              testRun: { select: { id: true, name: true, environment: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.testExecution.count({ where: { testCaseId, testRunCaseId: { not: null } } }),
    ])

    return { executions, total }
  }
}

export const testRunService = new TestRunService()
