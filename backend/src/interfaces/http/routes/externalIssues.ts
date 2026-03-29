import { FastifyInstance } from 'fastify'
import { ExternalIssueService } from '../../../services/ExternalIssueService.js'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../../../infrastructure/auth/authMiddleware.js'

export async function externalIssuesRoutes(app: FastifyInstance) {
  const service = new ExternalIssueService(prisma)

  app.get('/external-issues/project/:projectId', { preHandler: [requireAuth(), requirePermission('INTEGRATIONS', 'read')] }, async (req, reply) => {
    const { projectId } = req.params as { projectId: string }
    return reply.send(await service.listForProject(projectId))
  })

  app.post('/external-issues/sync', { preHandler: [requireAuth(), requirePermission('INTEGRATIONS', 'update')] }, async (req, reply) => {
    const body = req.body as any
    return reply.send(await service.syncIssue(body))
  })

  app.patch('/external-issues/:id/link/:bugId', { preHandler: [requireAuth(), requirePermission('INTEGRATIONS', 'update')] }, async (req, reply) => {
    const { id, bugId } = req.params as { id: string; bugId: string }
    return reply.send(await service.linkToBug(id, bugId))
  })

  app.patch('/external-issues/:id/unlink', { preHandler: [requireAuth(), requirePermission('INTEGRATIONS', 'update')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    return reply.send(await service.unlinkFromBug(id))
  })
}
