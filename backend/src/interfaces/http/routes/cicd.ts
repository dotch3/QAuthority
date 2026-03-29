import { FastifyInstance } from 'fastify'
import { CIBuildSyncService } from '../../../services/CIBuildSyncService.js'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../../../infrastructure/auth/authMiddleware.js'

export async function cicdRoutes(app: FastifyInstance) {
  const service = new CIBuildSyncService(prisma)

  app.post('/cicd/webhook', async (req, reply) => {
    const secret = req.headers['x-qauthority-secret']
    const integration = await prisma.integration.findFirst({
      where: { webhookSecret: String(secret) },
    })
    if (!integration) return reply.code(401).send({ error: 'Invalid webhook secret' })

    const body = req.body as any
    const build = await service.receiveBuildEvent({
      integrationId: integration.id,
      projectId: integration.projectId,
      buildNumber: String(body.buildNumber ?? body.run_number ?? 'unknown'),
      branch: body.branch ?? body.ref?.replace('refs/heads/', '') ?? 'unknown',
      status: body.status ?? body.conclusion ?? 'UNKNOWN',
      triggeredAt: body.triggeredAt ?? body.created_at ?? new Date().toISOString(),
      completedAt: body.completedAt ?? body.updated_at,
      testResults: body.testResults,
    })

    return reply.code(202).send({ buildId: build.id })
  })

  app.get('/cicd/builds', { preHandler: [requireAuth(), requirePermission('INTEGRATIONS', 'read')] }, async (req, reply) => {
    const { projectId } = req.query as { projectId?: string }
    const builds = await prisma.cIBuild.findMany({
      where: projectId ? { projectId } : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { integration: true },
    })
    return reply.send(builds)
  })
}
