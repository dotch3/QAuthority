import { PrismaClient } from '@prisma/client'

export class DORACalculatorService {
  constructor(private prisma: PrismaClient) {}

  private daysBefore(days: number) {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d
  }

  private async getCIBuilds(projectId: string, days: number, where?: Record<string, unknown>) {
    try {
      return await (this.prisma as any).ciCDBuild.findMany({
        where: { projectId, completedAt: { gte: this.daysBefore(days) }, ...where },
      })
    } catch {
      return []
    }
  }

  async calculateDeployFrequency(projectId: string, days = 30): Promise<number> {
    const builds = await this.getCIBuilds(projectId, days, { status: 'SUCCESS' })
    return builds.length / (days / 7)
  }

  async calculateChangeFailureRate(projectId: string, days = 30): Promise<number> {
    const builds = await this.getCIBuilds(projectId, days)
    if (builds.length === 0) return 0
    const failed = builds.filter((b: any) => b.status === 'FAILED').length
    return (failed / builds.length) * 100
  }

  async calculateMTTR(projectId: string, days = 30): Promise<number> {
    try {
      const builds = await (this.prisma as any).ciCDBuild.findMany({
        where: { projectId, completedAt: { gte: this.daysBefore(days) } },
        orderBy: { completedAt: 'asc' },
      })
      const recoveries: number[] = []
      for (let i = 0; i < builds.length - 1; i++) {
        if (builds[i].status === 'FAILED' && builds[i + 1].status === 'SUCCESS') {
          const diff = builds[i + 1].completedAt.getTime() - builds[i].completedAt.getTime()
          recoveries.push(diff / 1000 / 60 / 60)
        }
      }
      if (recoveries.length === 0) return 0
      return recoveries.reduce((s, v) => s + v, 0) / recoveries.length
    } catch {
      return 0
    }
  }

  async calculateLeadTime(projectId: string, days = 30): Promise<number> {
    try {
      const builds = await (this.prisma as any).ciCDBuild.findMany({
        where: { projectId, status: 'SUCCESS', completedAt: { gte: this.daysBefore(days) } },
      })
      if (builds.length === 0) return 0
      const durations = builds
        .filter((b: any) => b.triggeredAt && b.completedAt)
        .map((b: any) => (b.completedAt.getTime() - b.triggeredAt.getTime()) / 1000 / 60 / 60)
      if (durations.length === 0) return 0
      return durations.reduce((s: number, v: number) => s + v, 0) / durations.length
    } catch {
      return 0
    }
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
