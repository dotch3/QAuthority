import { prisma } from "../infrastructure/database/prisma.js"
import type { Defect } from "@prisma/client"
import { NotFoundError, BadRequestError } from "../utils/errors.js"

export interface CreateBugData {
  projectId: string
  title: string
  description?: string
  statusId: string
  priorityId: string
  severityId: string
  sourceId: string
  reportedById: string
  assignedToId?: string
  externalId?: string
  externalUrl?: string
}

export interface UpdateBugData {
  title?: string
  description?: string
  statusId?: string
  priorityId?: string
  severityId?: string
  sourceId?: string
  assignedToId?: string | null
}

export class DefectService {
  async create(data: CreateBugData): Promise<Defect> {
    return prisma.defect.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        statusId: data.statusId,
        priorityId: data.priorityId,
        severityId: data.severityId,
        sourceId: data.sourceId,
        reportedById: data.reportedById,
        assignedToId: data.assignedToId,
        externalId: data.externalId,
        externalUrl: data.externalUrl,
      },
    })
  }

  async findById(id: string): Promise<Defect | null> {
    return prisma.defect.findUnique({
      where: { id },
      include: {
        reportedBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  }

  async findByProject(projectId: string): Promise<Defect[]> {
    return prisma.defect.findMany({
      where: { projectId },
      include: {
        status: true,
        priority: true,
        severity: true,
        reportedBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async findByExecution(executionId: string): Promise<Defect[]> {
    return prisma.defect.findMany({
      where: {
        executions: {
          some: { executionId },
        },
      },
      include: {
        status: true,
        priority: true,
        severity: true,
      },
    })
  }

  async update(id: string, data: UpdateBugData): Promise<Defect> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Bug not found")
    }

    return prisma.defect.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        statusId: data.statusId,
        priorityId: data.priorityId,
        severityId: data.severityId,
        sourceId: data.sourceId,
        assignedToId: data.assignedToId,
      },
    })
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Bug not found")
    }

    await prisma.defect.delete({
      where: { id },
    })
  }

  async linkToExecution(bugId: string, executionId: string): Promise<void> {
    await prisma.bugTestExecution.upsert({
      where: {
        bugId_executionId: { bugId, executionId },
      },
      create: { bugId, executionId },
      update: {},
    })
  }

  async unlinkFromExecution(bugId: string, executionId: string): Promise<void> {
    await prisma.bugTestExecution.delete({
      where: {
        bugId_executionId: { bugId, executionId },
      },
    })
  }

  async getLinkedExecutions(bugId: string): Promise<string[]> {
    const links = await prisma.bugTestExecution.findMany({
      where: { bugId },
      select: { executionId: true },
    })
    return links.map((l) => l.executionId)
  }

  async getStats(projectId: string): Promise<{
    total: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
    bySeverity: Record<string, number>
  }> {
    const [total, byStatus, byPriority, bySeverity] = await Promise.all([
      prisma.defect.count({ where: { projectId } }),
      prisma.defect.groupBy({
        by: ["statusId"],
        where: { projectId },
        _count: true,
      }),
      prisma.defect.groupBy({
        by: ["priorityId"],
        where: { projectId },
        _count: true,
      }),
      prisma.defect.groupBy({
        by: ["severityId"],
        where: { projectId },
        _count: true,
      }),
    ])

    const statusValues = await prisma.enumValue.findMany({
      where: { id: { in: byStatus.map((s) => s.statusId) } },
      select: { id: true, value: true },
    })
    const priorityValues = await prisma.enumValue.findMany({
      where: { id: { in: byPriority.map((p) => p.priorityId) } },
      select: { id: true, value: true },
    })
    const severityValues = await prisma.enumValue.findMany({
      where: { id: { in: bySeverity.map((s) => s.severityId) } },
      select: { id: true, value: true },
    })

    const statusMap = Object.fromEntries(statusValues.map((s) => [s.value, 0]))
    const priorityMap = Object.fromEntries(priorityValues.map((p) => [p.value, 0]))
    const severityMap = Object.fromEntries(severityValues.map((s) => [s.value, 0]))

    for (const s of byStatus) {
      const val = statusValues.find((v) => v.id === s.statusId)
      if (val) statusMap[val.value] = s._count
    }
    for (const p of byPriority) {
      const val = priorityValues.find((v) => v.id === p.priorityId)
      if (val) priorityMap[val.value] = p._count
    }
    for (const s of bySeverity) {
      const val = severityValues.find((v) => v.id === s.severityId)
      if (val) severityMap[val.value] = s._count
    }

    return { total, byStatus: statusMap, byPriority: priorityMap, bySeverity: severityMap }
  }
}

export const defectService = new DefectService()
