import { PrismaClient } from '@prisma/client'
import { MetricsCollectorService } from './MetricsCollectorService.js'

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
        const score = (passRate + coverage + (100 - failRate)) / 3
        return { projectId: project.id, projectName: project.name, score: Math.round(score) }
      })
    )
  }
}
