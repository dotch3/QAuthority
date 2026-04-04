import { prisma } from "../infrastructure/database/prisma.js"
import type { TestPlan } from "@prisma/client"
import { NotFoundError, ForbiddenError } from "../utils/errors.js"

export interface CreateTestPlanData {
  projectId: string
  name: string
  description?: string
  statusId: string
  startDate?: Date
  endDate?: Date
  createdById: string
}

export interface UpdateTestPlanData {
  name?: string
  description?: string
  statusId?: string
  startDate?: Date | null
  endDate?: Date | null
  idPrefix?: string | null
  idInitialNumber?: number | null
  bugPrefix?: string | null
}

async function checkProjectAccess(projectId: string, userId: string, roleId: string): Promise<boolean> {
  if (roleId === 'role-admin') return true
  
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  })
  return !!member
}

export class TestPlanService {
  async create(data: CreateTestPlanData, userId: string, roleId: string): Promise<TestPlan> {
    const hasAccess = await checkProjectAccess(data.projectId, userId, roleId)
    if (!hasAccess) {
      throw new ForbiddenError("You don't have access to this project")
    }

    return prisma.testPlan.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        statusId: data.statusId,
        startDate: data.startDate,
        endDate: data.endDate,
        createdById: data.createdById,
      },
    })
  }

  async findById(id: string): Promise<TestPlan | null> {
    return prisma.testPlan.findUnique({
      where: { id },
      include: {
        status: true,
      },
    })
  }

  async findByProject(projectId: string, userId: string, roleId: string): Promise<TestPlan[]> {
    const hasAccess = await checkProjectAccess(projectId, userId, roleId)
    if (!hasAccess) {
      throw new ForbiddenError("You don't have access to this project")
    }

    const plans = await prisma.testPlan.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { suites: true, executions: true },
        },
        status: true,
        suites: {
          select: {
            _count: {
              select: { cases: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return plans.map(plan => ({
      ...plan,
      _count: {
        ...plan._count,
        cases: plan.suites.reduce((acc, suite) => acc + (suite._count?.cases || 0), 0),
      },
    }))
  }

  async update(id: string, data: UpdateTestPlanData, userId: string, roleId: string): Promise<TestPlan> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Test plan not found")
    }

    const hasAccess = await checkProjectAccess(existing.projectId, userId, roleId)
    if (!hasAccess) {
      throw new ForbiddenError("You don't have access to this project")
    }

    return prisma.testPlan.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        statusId: data.statusId,
        startDate: data.startDate,
        endDate: data.endDate,
        idPrefix: data.idPrefix,
        idInitialNumber: data.idInitialNumber,
        bugPrefix: data.bugPrefix,
      },
      include: { status: true },
    })
  }

  async delete(id: string, userId: string, roleId: string): Promise<void> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Test plan not found")
    }

    const hasAccess = await checkProjectAccess(existing.projectId, userId, roleId)
    if (!hasAccess) {
      throw new ForbiddenError("You don't have access to this project")
    }

    await prisma.testPlan.delete({
      where: { id },
    })
  }

  async clone(id: string, createdById: string, userId: string, roleId: string): Promise<TestPlan> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Test plan not found")
    }

    const hasAccess = await checkProjectAccess(existing.projectId, userId, roleId)
    if (!hasAccess) {
      throw new ForbiddenError("You don't have access to this project")
    }

    const cloned = await prisma.testPlan.create({
      data: {
        projectId: existing.projectId,
        name: `${existing.name} (Copy)`,
        description: existing.description,
        statusId: existing.statusId,
        startDate: existing.startDate,
        endDate: existing.endDate,
        createdById,
      },
    })

    const suites = await prisma.testSuite.findMany({
      where: { testPlanId: id },
    })

    if (suites.length > 0) {
      const suiteIdMap = new Map<string, string>()

      for (const suite of suites) {
        const newSuite = await prisma.testSuite.create({
          data: {
            testPlanId: cloned.id,
            name: suite.name,
            description: suite.description,
            parentSuiteId: suite.parentSuiteId
              ? suiteIdMap.get(suite.parentSuiteId) ?? null
              : null,
            orderIndex: suite.orderIndex,
            createdById,
          },
        })
        suiteIdMap.set(suite.id, newSuite.id)
      }
    }

    return cloned
  }

  async archive(_id: string): Promise<TestPlan> {
    throw new Error("Archive not implemented - field does not exist in schema")
  }
}

export const testPlanService = new TestPlanService()
