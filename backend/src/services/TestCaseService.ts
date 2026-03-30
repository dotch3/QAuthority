import { prisma } from "../infrastructure/database/prisma.js"
import type { Prisma } from "@prisma/client"
import type { TestCase } from "@prisma/client"
import { NotFoundError } from "../utils/errors.js"

export interface TestCaseStep {
  order: number
  action: string
  expectedResult: string
}

export interface CreateTestCaseData {
  suiteId: string
  title: string
  description?: string
  preconditions?: string
  notes?: string
  steps?: TestCaseStep[]
  priorityId: string
  typeId: string
  automationScriptRef?: string
  createdById: string
  assigneeIds?: string[]
}

export interface UpdateTestCaseData {
  title?: string
  description?: string
  preconditions?: string
  notes?: string
  steps?: TestCaseStep[]
  priorityId?: string
  typeId?: string
  automationScriptRef?: string | null
  assigneeIds?: string[]
}

export interface TestCaseVersion {
  id: string
  testCaseId: string
  version: number
  title: string
  description: string | null
  preconditions: string | null
  notes: string | null
  steps: Prisma.JsonValue | null
  priorityId: string
  typeId: string
  automationScriptRef: string | null
  createdById: string
  createdAt: Date
}

export class TestCaseService {
  private generateExternalId(suite: any): string {
    const project = suite?.testPlan?.project
    if (!project?.slug) {
      return `TC-${Date.now().toString(36).toUpperCase()}`
    }
    const prefix = project.slug.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '')
    const number = suite.nextCaseNumber?.toString().padStart(4, '0') || '0001'
    return `TC-${prefix}-${number}`
  }

  async create(data: CreateTestCaseData): Promise<TestCase> {
    const suite = await prisma.testSuite.findUnique({
      where: { id: data.suiteId },
      include: {
        testPlan: {
          include: {
            project: true
          }
        }
      }
    })

    const externalId = this.generateExternalId(suite)

    const created = await prisma.testCase.create({
      data: {
        suiteId: data.suiteId,
        title: data.title,
        description: data.description,
        preconditions: data.preconditions,
        notes: data.notes,
        steps: (data.steps ?? []) as unknown as Prisma.InputJsonValue,
        priorityId: data.priorityId,
        typeId: data.typeId,
        automationScriptRef: data.automationScriptRef,
        externalId,
        createdById: data.createdById,
        assignees: data.assigneeIds ? {
          create: data.assigneeIds.map(userId => ({ userId }))
        } : undefined,
      },
    })

    if (suite) {
      await prisma.testSuite.update({
        where: { id: data.suiteId },
        data: { nextCaseNumber: { increment: 1 } }
      })
    }

    return created
  }

  async findById(id: string): Promise<TestCase | null> {
    return prisma.testCase.findUnique({
      where: { id },
    })
  }

  async findBySuite(
    suiteId: string,
    options?: {
      search?: string
      typeId?: string
      priorityId?: string
      assigneeId?: string
      page?: number
      limit?: number
    }
  ): Promise<{ data: TestCase[]; total: number }> {
    const { search, typeId, priorityId, assigneeId, page = 1, limit = 25 } = options || {}
    
    const where: Prisma.TestCaseWhereInput = {
      suiteId,
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } },
      ]
    }

    if (typeId) {
      where.typeId = typeId
    }

    if (priorityId) {
      where.priorityId = priorityId
    }

    if (assigneeId) {
      where.assignees = {
        some: { userId: assigneeId }
      }
    }

    const [data, total] = await Promise.all([
      prisma.testCase.findMany({
        where,
        include: {
          priority: true,
          type: true,
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: { executions: { where: { suiteId } } },
          },
        },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.testCase.count({ where }),
    ])

    return { data, total }
  }

  async findByProject(projectId: string): Promise<TestCase[]> {
    return prisma.testCase.findMany({
      where: {
        suite: {
          testPlan: {
            projectId,
          },
        },
      },
      include: {
        suite: {
          include: {
            testPlan: true,
          },
        },
        priority: true,
        type: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async findByTestPlan(testPlanId: string): Promise<TestCase[]> {
    return prisma.testCase.findMany({
      where: {
        suite: {
          testPlanId,
        },
      },
      include: {
        priority: true,
        type: true,
      },
      orderBy: { createdAt: "asc" },
    })
  }

  async update(id: string, data: UpdateTestCaseData, userId?: string): Promise<TestCase> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Test case not found")
    }

    if (userId) {
      await this.createVersion(id, userId)
    }

    const updateData: Prisma.TestCaseUpdateInput = {
      title: data.title,
      description: data.description,
      preconditions: data.preconditions,
      notes: data.notes,
      steps: data.steps as unknown as Prisma.InputJsonValue | undefined,
      priority: data.priorityId ? { connect: { id: data.priorityId } } : undefined,
      type: data.typeId ? { connect: { id: data.typeId } } : undefined,
      automationScriptRef: data.automationScriptRef,
      currentVersion: { increment: 1 },
    }

    if (data.assigneeIds !== undefined) {
      await prisma.testCaseAssignee.deleteMany({ where: { testCaseId: id } })
      if (data.assigneeIds.length > 0) {
        updateData.assignees = {
          create: data.assigneeIds.map(userId => ({ userId }))
        }
      }
    }

    const updated = await prisma.testCase.update({
      where: { id },
      data: updateData,
    })

    return updated
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Test case not found")
    }

    await prisma.testCase.delete({
      where: { id },
    })
  }

  async copy(id: string, targetSuiteId: string, createdById: string): Promise<TestCase> {
    const original = await this.findById(id)
    if (!original) {
      throw new NotFoundError("Test case not found")
    }

    return prisma.testCase.create({
      data: {
        suiteId: targetSuiteId,
        title: `${original.title} (Copy)`,
        description: original.description,
        preconditions: original.preconditions,
        notes: original.notes,
        steps: original.steps as Prisma.InputJsonValue,
        priorityId: original.priorityId,
        typeId: original.typeId,
        automationScriptRef: original.automationScriptRef,
        createdById,
        copiedFromId: original.id,
      },
    })
  }

  async move(id: string, targetSuiteId: string): Promise<TestCase> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Test case not found")
    }

    return prisma.testCase.update({
      where: { id },
      data: {
        suiteId: targetSuiteId,
      },
    })
  }

  async bulkCreate(
    suiteId: string,
    cases: Array<{
      title: string
      description?: string
      preconditions?: string
      steps?: TestCaseStep[]
      priorityId: string
      typeId: string
      createdById: string
    }>
  ): Promise<TestCase[]> {
    const results: TestCase[] = []

    for (const caseData of cases) {
      const created = await this.create({
        ...caseData,
        suiteId,
      })
      results.push(created)
    }

    return results
  }

  async bulkDelete(caseIds: string[]): Promise<{ deletedCount: number }> {
    if (caseIds.length === 0) {
      return { deletedCount: 0 }
    }

    const result = await prisma.testCase.deleteMany({
      where: { id: { in: caseIds } },
    })

    return { deletedCount: result.count }
  }

  async bulkMove(caseIds: string[], targetSuiteId: string): Promise<{ movedCount: number }> {
    if (caseIds.length === 0) {
      return { movedCount: 0 }
    }

    await prisma.testCase.updateMany({
      where: { id: { in: caseIds } },
      data: { suiteId: targetSuiteId },
    })

    return { movedCount: caseIds.length }
  }

  async bulkAssign(caseIds: string[], userIds: string[]): Promise<{ assignedCount: number }> {
    if (caseIds.length === 0 || userIds.length === 0) {
      return { assignedCount: 0 }
    }

    const assignments: Array<{ testCaseId: string; userId: string }> = []
    for (const caseId of caseIds) {
      const testCase = await this.findById(caseId)
      if (!testCase) continue

      for (const userId of userIds) {
        const existingAssignee = await prisma.testCaseAssignee.findUnique({
          where: {
            testCaseId_userId: { testCaseId: caseId, userId },
          },
        })
        if (!existingAssignee) {
          assignments.push({ testCaseId: caseId, userId })
        }
      }
    }

    if (assignments.length > 0) {
      await prisma.testCaseAssignee.createMany({
        data: assignments,
        skipDuplicates: true,
      })
    }

    return { assignedCount: assignments.length }
  }

  async addAssignee(testCaseId: string, userId: string): Promise<{ userId: string; id: string; testCaseId: string }> {
    const testCase = await this.findById(testCaseId)
    if (!testCase) {
      throw new NotFoundError("Test case not found")
    }

    const assignee = await prisma.testCaseAssignee.create({
      data: {
        testCaseId,
        userId,
      },
    })

    return {
      userId: assignee.userId,
      id: assignee.testCaseId,
      testCaseId: assignee.testCaseId,
    }
  }

  async removeAssignee(testCaseId: string, userId: string): Promise<void> {
    const testCase = await this.findById(testCaseId)
    if (!testCase) {
      throw new NotFoundError("Test case not found")
    }

    await prisma.testCaseAssignee.delete({
      where: {
        testCaseId_userId: {
          testCaseId,
          userId,
        },
      },
    })
  }

  async getAssignees(testCaseId: string): Promise<Array<{ id: string; name?: string | null; email: string }>> {
    const testCase = await this.findById(testCaseId)
    if (!testCase) {
      throw new NotFoundError("Test case not found")
    }

    const assignees = await prisma.testCaseAssignee.findMany({
      where: { testCaseId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return assignees.map((a) => ({
      id: a.user.id,
      name: a.user.name,
      email: a.user.email,
    }))
  }

  async createVersion(testCaseId: string, userId: string): Promise<TestCaseVersion> {
    const testCase = await this.findById(testCaseId)
    if (!testCase) {
      throw new NotFoundError("Test case not found")
    }

    const latestVersion = await prisma.testCaseVersion.findFirst({
      where: { testCaseId },
      orderBy: { version: "desc" },
    })

    const newVersionNumber = (latestVersion?.version ?? 0) + 1

    return prisma.testCaseVersion.create({
      data: {
        testCaseId,
        version: newVersionNumber,
        title: testCase.title,
        description: testCase.description,
        preconditions: testCase.preconditions,
        notes: testCase.notes,
        steps: testCase.steps as Prisma.InputJsonValue | undefined,
        priorityId: testCase.priorityId,
        typeId: testCase.typeId,
        automationScriptRef: testCase.automationScriptRef,
        createdById: userId,
      },
    })
  }

  async getVersions(testCaseId: string): Promise<TestCaseVersion[]> {
    const testCase = await this.findById(testCaseId)
    if (!testCase) {
      throw new NotFoundError("Test case not found")
    }

    return prisma.testCaseVersion.findMany({
      where: { testCaseId },
      orderBy: { version: "desc" },
      include: {
        testCase: {
          select: {
            currentVersion: true,
          },
        },
      },
    })
  }

  async getVersion(testCaseId: string, version: number): Promise<TestCaseVersion | null> {
    const testCase = await this.findById(testCaseId)
    if (!testCase) {
      throw new NotFoundError("Test case not found")
    }

    return prisma.testCaseVersion.findUnique({
      where: {
        testCaseId_version: {
          testCaseId,
          version,
        },
      },
    })
  }

  async restoreVersion(testCaseId: string, version: number, userId: string): Promise<TestCase> {
    const testCaseVersion = await this.getVersion(testCaseId, version)
    if (!testCaseVersion) {
      throw new NotFoundError(`Version ${version} not found`)
    }

    await this.createVersion(testCaseId, userId)

    return prisma.testCase.update({
      where: { id: testCaseId },
      data: {
        title: testCaseVersion.title,
        description: testCaseVersion.description,
        preconditions: testCaseVersion.preconditions,
        notes: testCaseVersion.notes,
        steps: testCaseVersion.steps as Prisma.InputJsonValue,
        priorityId: testCaseVersion.priorityId,
        typeId: testCaseVersion.typeId,
        automationScriptRef: testCaseVersion.automationScriptRef,
        currentVersion: { increment: 1 },
      },
    })
  }
}

export const testCaseService = new TestCaseService()
