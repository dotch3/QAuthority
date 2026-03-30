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

  async getKPIs(projectId?: string) {
    if (!projectId) return []

    const collector = new MetricsCollectorService(this.prisma)
    const metrics = await collector.getLatestForProject(projectId)

    const kpiMap: Record<string, { name: string; unit: string; target: number }> = {
      EXECUTION_PASS_RATE: { name: 'Pass Rate', unit: '%', target: 90 },
      QUALITY_REQUIREMENT_COVERAGE: { name: 'Test Coverage', unit: '%', target: 80 },
      DORA_DEPLOY_FREQUENCY: { name: 'Deploy Frequency', unit: '/week', target: 5 },
      DORA_LEAD_TIME_HOURS: { name: 'Lead Time', unit: 'hrs', target: 24 },
      DORA_CHANGE_FAIL_RATE: { name: 'Change Fail Rate', unit: '%', target: 15 },
      DORA_MTTR_HOURS: { name: 'MTTR', unit: 'hrs', target: 4 },
    }

    return Object.entries(kpiMap).map(([id, config]) => {
      const metric = metrics.find(m => m.metricType === id)
      return {
        id,
        name: config.name,
        value: metric?.value ?? 0,
        target: config.target,
        unit: config.unit,
        trend: 'stable' as const,
      }
    })
  }
}
