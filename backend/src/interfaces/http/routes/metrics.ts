import type { FastifyInstance } from 'fastify'
import { MetricsCollectorService } from '../../../services/MetricsCollectorService.js'
import { MetricsAggregatorService } from '../../../services/MetricsAggregatorService.js'
import { PBCCalculatorService } from '../../../services/PBCCalculatorService.js'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../../../infrastructure/auth/authMiddleware.js'

export async function metricsRoutes(app: FastifyInstance) {
  const collector = new MetricsCollectorService(prisma)
  const aggregator = new MetricsAggregatorService(prisma)
  const pbc = new PBCCalculatorService()

  app.get<{ Params: { projectId: string } }>(
    '/metrics/project/:projectId',
    { preHandler: [requireAuth(), requirePermission('QA_GOVERNANCE', 'read')] },
    async (request, reply) => {
      const metrics = await collector.getLatestForProject(request.params.projectId)
      return reply.send(metrics)
    }
  )

  app.post<{ Params: { projectId: string } }>(
    '/metrics/project/:projectId/collect',
    { preHandler: [requireAuth(), requirePermission('QA_GOVERNANCE', 'create')] },
    async (request, reply) => {
      const result = await collector.collectForProject(request.params.projectId)
      return reply.send(result)
    }
  )

  app.get<{ Params: { projectId: string; metricType: string }; Querystring: { days?: string } }>(
    '/metrics/project/:projectId/history/:metricType',
    { preHandler: [requireAuth(), requirePermission('QA_GOVERNANCE', 'read')] },
    async (request, reply) => {
      const { projectId, metricType } = request.params
      const days = Number(request.query.days ?? 90)
      const history = await collector.getHistoryForProject(projectId, metricType as any, days)

      if (history.length >= 2) {
        const dataPoints = history.map(h => ({ date: h.recordedAt.toISOString(), value: h.value }))
        const pbcResult = pbc.computeXmR(dataPoints)
        const signals = pbc.detectSignals(dataPoints, pbcResult)
        return reply.send({ history, pbc: { ...pbcResult, signals } })
      }
      return reply.send({ history, pbc: null })
    }
  )

  app.get(
    '/metrics/org',
    { preHandler: [requireAuth(), requirePermission('QA_GOVERNANCE', 'read')] },
    async (_request, reply) => {
      const result = await aggregator.aggregateAllProjects()
      return reply.send(result)
    }
  )

  app.get(
    '/metrics/org/team-health',
    { preHandler: [requireAuth(), requirePermission('QA_GOVERNANCE', 'read')] },
    async (_request, reply) => {
      const scores = await aggregator.getTeamHealthScores()
      return reply.send(scores)
    }
  )
}
