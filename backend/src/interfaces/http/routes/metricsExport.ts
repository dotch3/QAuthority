import { FastifyInstance } from 'fastify'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'

export async function metricsExportRoutes(app: FastifyInstance) {
  app.get('/export/prometheus', async (_req, reply) => {
    const snapshots = await prisma.metricSnapshot.findMany({
      orderBy: { recordedAt: 'desc' },
      distinct: ['projectId', 'metricType'],
    })

    const lines: string[] = [
      '# HELP qauthority_metric QAuthority QA metric snapshot',
      '# TYPE qauthority_metric gauge',
    ]

    for (const s of snapshots) {
      const labels = s.projectId
        ? `project_id="${s.projectId}",metric="${s.metricType}"`
        : `metric="${s.metricType}"`
      lines.push(`qauthority_metric{${labels}} ${s.value}`)
    }

    reply.header('Content-Type', 'text/plain; version=0.0.4')
    return reply.send(lines.join('\n'))
  })

  app.get('/export/grafana', { preHandler: [requireAuth()] }, async (req, reply) => {
    const { projectId, metricType, days = '30' } = req.query as any
    const since = new Date()
    since.setDate(since.getDate() - Number(days))

    const snapshots = await prisma.metricSnapshot.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(metricType ? { metricType } : {}),
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'asc' },
    })

    const byType: Record<string, any[]> = {}
    for (const s of snapshots) {
      if (!byType[s.metricType]) byType[s.metricType] = []
      byType[s.metricType].push([s.value, new Date(s.recordedAt).getTime()])
    }

    return reply.send(
      Object.entries(byType).map(([target, datapoints]) => ({ target, datapoints }))
    )
  })

  app.get('/export/json', { preHandler: [requireAuth()] }, async (req, reply) => {
    const { projectId, days = '30' } = req.query as any
    const since = new Date()
    since.setDate(since.getDate() - Number(days))

    const snapshots = await prisma.metricSnapshot.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'desc' },
    })

    return reply.send({
      exportedAt: new Date().toISOString(),
      projectId: projectId ?? 'all',
      count: snapshots.length,
      data: snapshots,
    })
  })
}
