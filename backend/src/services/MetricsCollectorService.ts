import { PrismaClient, MetricType } from '@prisma/client'
import { DORACalculatorService } from './DORACalculatorService.js'

export class MetricsCollectorService {
  private dora: DORACalculatorService

  constructor(private prisma: PrismaClient) {
    this.dora = new DORACalculatorService(prisma)
  }

  async collectForProject(projectId: string) {
    const doraMetrics = await this.dora.computeAll(projectId, 30)

    const [totalCases, totalDefects, passedSteps, totalSteps] =
      await Promise.all([
        this.prisma.testCase.count({ where: { suite: { testPlan: { projectId } } } }),
        this.prisma.defect.count({ where: { projectId } }),
        this.prisma.executionStepResult.count({
          where: {
            execution: { testCase: { suite: { testPlan: { projectId } } } },
            status: 'PASSED',
          },
        }),
        this.prisma.executionStepResult.count({
          where: {
            execution: { testCase: { suite: { testPlan: { projectId } } } },
          },
        }),
      ])

    const snapshots = [
      { metricType: 'DORA_DEPLOY_FREQUENCY' as MetricType, value: doraMetrics.deployFreq },
      { metricType: 'DORA_LEAD_TIME_HOURS' as MetricType, value: doraMetrics.leadTime },
      { metricType: 'DORA_CHANGE_FAIL_RATE' as MetricType, value: doraMetrics.changeFailRate },
      { metricType: 'DORA_MTTR_HOURS' as MetricType, value: doraMetrics.mttr },
      { metricType: 'QUALITY_REQUIREMENT_COVERAGE' as MetricType, value: 0 }, // requirementId not in schema yet
      {
        metricType: 'QUALITY_DEFECT_DENSITY' as MetricType,
        value: totalCases > 0 ? totalDefects / totalCases : 0,
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
    return this.prisma.metricSnapshot.findMany({
      where: { projectId },
      orderBy: { recordedAt: 'desc' },
      distinct: ['metricType'],
    })
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
