import { prisma } from "../infrastructure/database/prisma.js"

export interface CreateETCharterData {
  suiteId: string
  charter: string
  areas?: string[]
  startDate?: Date
  testerId?: string
  duration?: string
  testDesignPercentage?: number
  bugInvestigationPercentage?: number
  sessionSetupPercentage?: number
  charterVsOpportunity?: number
  dataFiles?: string[]
  testNotes?: Array<{ action: string; bullets: string[] }>
  opportunities?: Array<{ action: string; bullets: string[] }>
  bugs?: Array<{ name: string; steps: string[]; expected: string; actual: string }>
  issues?: Array<{ description: string }>
  heuristicIds?: string[]
  createdById: string
}

export interface UpdateETCharterData {
  charter?: string
  areas?: string[]
  startDate?: Date | null
  testerId?: string | null
  duration?: string
  testDesignPercentage?: number
  bugInvestigationPercentage?: number
  sessionSetupPercentage?: number
  charterVsOpportunity?: number
  dataFiles?: string[]
  testNotes?: Array<{ action: string; bullets: string[] }>
  opportunities?: Array<{ action: string; bullets: string[] }>
  bugs?: Array<{ name: string; steps: string[]; expected: string; actual: string }>
  issues?: Array<{ description: string }>
  heuristicIds?: string[]
}

export class ETCharterService {
  async findBySuite(suiteId: string) {
    return prisma.eTCharter.findMany({
      where: { suiteId },
      include: {
        tester: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        linkedDefects: { include: { bug: true } },
        linkedTestCases: { include: { testCase: { select: { id: true, title: true } } } },
        linkedHeuristics: {
          include: {
            heuristic: {
              include: {
                personas: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async findById(id: string) {
    return prisma.eTCharter.findUnique({
      where: { id },
      include: {
        tester: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        linkedDefects: { include: { bug: true } },
        linkedTestCases: { include: { testCase: { select: { id: true, title: true } } } },
        linkedHeuristics: {
          include: {
            heuristic: {
              include: {
                personas: true,
              },
            },
          },
        },
      },
    })
  }

  async create(data: CreateETCharterData) {
    const { heuristicIds, ...rest } = data

    const charter = await prisma.eTCharter.create({
      data: {
        suiteId: rest.suiteId,
        charter: rest.charter,
        areas: rest.areas || [],
        startDate: rest.startDate,
        testerId: rest.testerId,
        duration: rest.duration,
        testDesignPercentage: rest.testDesignPercentage,
        bugInvestigationPercentage: rest.bugInvestigationPercentage,
        sessionSetupPercentage: rest.sessionSetupPercentage,
        charterVsOpportunity: rest.charterVsOpportunity,
        dataFiles: rest.dataFiles || [],
        testNotes: rest.testNotes || [],
        opportunities: rest.opportunities || [],
        bugs: rest.bugs || [],
        issues: rest.issues || [],
        createdById: rest.createdById,
      },
    })

    if (heuristicIds && heuristicIds.length > 0) {
      await prisma.eTCharterHeuristic.createMany({
        data: heuristicIds.map((heuristicId) => ({
          etCharterId: charter.id,
          heuristicId,
        })),
      })
    }

    return this.findById(charter.id)
  }

  async update(id: string, data: UpdateETCharterData) {
    const { heuristicIds, ...rest } = data

    await prisma.eTCharter.update({
      where: { id },
      data: {
        ...(rest.charter !== undefined && { charter: rest.charter }),
        ...(rest.areas !== undefined && { areas: rest.areas }),
        ...(rest.startDate !== undefined && { startDate: rest.startDate }),
        ...(rest.testerId !== undefined && { testerId: rest.testerId }),
        ...(rest.duration !== undefined && { duration: rest.duration }),
        ...(rest.testDesignPercentage !== undefined && { testDesignPercentage: rest.testDesignPercentage }),
        ...(rest.bugInvestigationPercentage !== undefined && { bugInvestigationPercentage: rest.bugInvestigationPercentage }),
        ...(rest.sessionSetupPercentage !== undefined && { sessionSetupPercentage: rest.sessionSetupPercentage }),
        ...(rest.charterVsOpportunity !== undefined && { charterVsOpportunity: rest.charterVsOpportunity }),
        ...(rest.dataFiles !== undefined && { dataFiles: rest.dataFiles }),
        ...(rest.testNotes !== undefined && { testNotes: rest.testNotes }),
        ...(rest.opportunities !== undefined && { opportunities: rest.opportunities }),
        ...(rest.bugs !== undefined && { bugs: rest.bugs }),
        ...(rest.issues !== undefined && { issues: rest.issues }),
      },
    })

    if (heuristicIds !== undefined) {
      await prisma.eTCharterHeuristic.deleteMany({
        where: { etCharterId: id },
      })

      if (heuristicIds.length > 0) {
        await prisma.eTCharterHeuristic.createMany({
          data: heuristicIds.map((heuristicId) => ({
            etCharterId: id,
            heuristicId,
          })),
        })
      }
    }

    return this.findById(id)
  }

  async delete(id: string) {
    return prisma.eTCharter.delete({ where: { id } })
  }

  async copy(id: string, targetSuiteId: string, userId: string) {
    const original = await this.findById(id)
    if (!original) throw new Error("ET Charter not found")

    return prisma.eTCharter.create({
      data: {
        suiteId: targetSuiteId,
        charter: `${original.charter} (Copy)`,
        areas: original.areas,
        startDate: null,
        testerId: null,
        duration: original.duration,
        testDesignPercentage: original.testDesignPercentage,
        bugInvestigationPercentage: original.bugInvestigationPercentage,
        sessionSetupPercentage: original.sessionSetupPercentage,
        charterVsOpportunity: original.charterVsOpportunity,
        dataFiles: [],
        testNotes: [],
        opportunities: [],
        bugs: [],
        issues: [],
        createdById: userId,
      },
    })
  }

  async move(id: string, targetSuiteId: string) {
    return prisma.eTCharter.update({
      where: { id },
      data: { suiteId: targetSuiteId },
    })
  }

  async linkBug(charterId: string, bugId: string) {
    return prisma.bugETCharter.create({
      data: { etCharterId: charterId, bugId },
    })
  }

  async unlinkBug(charterId: string, bugId: string) {
    return prisma.bugETCharter.delete({
      where: { bugId_etCharterId: { bugId, etCharterId: charterId } },
    })
  }

  async linkTestCase(charterId: string, testCaseId: string) {
    return prisma.eTCharterTestCase.create({
      data: { etCharterId: charterId, testCaseId },
    })
  }

  async unlinkTestCase(charterId: string, testCaseId: string) {
    return prisma.eTCharterTestCase.delete({
      where: { etCharterId_testCaseId: { etCharterId: charterId, testCaseId } },
    })
  }
}

export const etCharterService = new ETCharterService()
