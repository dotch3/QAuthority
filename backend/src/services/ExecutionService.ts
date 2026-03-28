import { prisma } from "../infrastructure/database/prisma.js"
import type { TestExecution, EnumValue, ExecutionStepResult } from "@prisma/client"
import { NotFoundError, BadRequestError } from "../utils/errors.js"

export interface CreateExecutionData {
  testCaseId: string
  testPlanId: string
  executedById: string
  environment?: string
  platform?: string
}

export interface UpdateExecutionData {
  statusId?: string
  notes?: string
  durationMs?: number
  environment?: string
  platform?: string
}

export interface CreateStepResultData {
  executionId: string
  stepOrder: number
  status: string
  actualResult?: string
  notes?: string
  executedById: string
}

export class ExecutionService {
  async create(data: CreateExecutionData): Promise<TestExecution> {
    const testCase = await prisma.testCase.findUnique({
      where: { id: data.testCaseId },
    })

    if (!testCase) {
      throw new NotFoundError("Test case not found")
    }

    const draftStatus = await this.getDraftStatus()

    return prisma.testExecution.create({
      data: {
        testCaseId: data.testCaseId,
        testPlanId: data.testPlanId,
        executedById: data.executedById,
        statusId: draftStatus.id,
        environment: data.environment,
        platform: data.platform,
      },
    })
  }

  async findById(id: string): Promise<TestExecution | null> {
    return prisma.testExecution.findUnique({
      where: { id },
      include: {
        testCase: true,
        testPlan: true,
        executedBy: {
          select: { id: true, name: true, email: true },
        },
        defects: {
          include: {
            bug: true,
          },
        },
        stepResults: {
          orderBy: { stepOrder: "asc" },
        },
      },
    })
  }

  async findByTestPlan(testPlanId: string): Promise<TestExecution[]> {
    return prisma.testExecution.findMany({
      where: { testPlanId },
      include: {
        testCase: {
          select: { id: true, title: true },
        },
        executedBy: {
          select: { id: true, name: true, email: true },
        },
        status: true,
        _count: {
          select: { defects: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async findByTestCase(testCaseId: string): Promise<TestExecution[]> {
    return prisma.testExecution.findMany({
      where: { testCaseId },
      include: {
        testCase: {
          select: { id: true, title: true },
        },
        executedBy: {
          select: { id: true, name: true, email: true },
        },
        status: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async update(id: string, data: UpdateExecutionData): Promise<TestExecution> {
    const execution = await this.findById(id)
    if (!execution) {
      throw new NotFoundError("Execution not found")
    }

    return prisma.testExecution.update({
      where: { id },
      data: {
        statusId: data.statusId,
        notes: data.notes,
        durationMs: data.durationMs,
        environment: data.environment,
        platform: data.platform,
        executedAt: data.statusId ? new Date() : undefined,
      },
    })
  }

  async startExecution(id: string): Promise<TestExecution> {
    const inProgressStatus = await this.getInProgressStatus()
    return this.update(id, { statusId: inProgressStatus.id })
  }

  async completeExecution(id: string): Promise<TestExecution> {
    const completedStatus = await this.getCompletedStatus()
    return this.update(id, { statusId: completedStatus.id })
  }

  async linkBug(executionId: string, bugId: string): Promise<void> {
    await prisma.bugTestExecution.upsert({
      where: {
        bugId_executionId: { bugId, executionId },
      },
      create: { bugId, executionId },
      update: {},
    })
  }

  async unlinkBug(executionId: string, bugId: string): Promise<void> {
    await prisma.bugTestExecution.delete({
      where: {
        bugId_executionId: { bugId, executionId },
      },
    })
  }

  async addStepResult(data: CreateStepResultData): Promise<ExecutionStepResult> {
    const execution = await this.findById(data.executionId)
    if (!execution) {
      throw new NotFoundError("Execution not found")
    }

    const existingResult = await prisma.executionStepResult.findFirst({
      where: {
        executionId: data.executionId,
        stepOrder: data.stepOrder,
      },
    })

    if (existingResult) {
      return prisma.executionStepResult.update({
        where: { id: existingResult.id },
        data: {
          status: data.status,
          actualResult: data.actualResult,
          notes: data.notes,
        },
      })
    }

    return prisma.executionStepResult.create({
      data: {
        executionId: data.executionId,
        stepOrder: data.stepOrder,
        status: data.status,
        actualResult: data.actualResult,
        notes: data.notes,
        executedById: data.executedById,
      },
    })
  }

  async getStepResults(executionId: string): Promise<ExecutionStepResult[]> {
    return prisma.executionStepResult.findMany({
      where: { executionId },
      orderBy: { stepOrder: "asc" },
    })
  }

  async deleteStepResult(id: string): Promise<void> {
    await prisma.executionStepResult.delete({
      where: { id },
    })
  }

  private async getDraftStatus(): Promise<EnumValue> {
    const status = await prisma.enumValue.findFirst({
      where: {
        enumType: { name: "execution_status" },
        systemKey: "draft",
      },
    })
    if (!status) throw new Error("Draft status not found")
    return status
  }

  private async getInProgressStatus(): Promise<EnumValue> {
    const status = await prisma.enumValue.findFirst({
      where: {
        enumType: { name: "execution_status" },
        systemKey: "in_progress",
      },
    })
    if (!status) throw new Error("In progress status not found")
    return status
  }

  private async getCompletedStatus(): Promise<EnumValue> {
    const status = await prisma.enumValue.findFirst({
      where: {
        enumType: { name: "execution_status" },
        systemKey: "completed",
      },
    })
    if (!status) throw new Error("Completed status not found")
    return status
  }
}

export const executionService = new ExecutionService()
