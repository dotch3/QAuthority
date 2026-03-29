import type { FastifyInstance } from 'fastify'
import { OKRService } from '../../../services/OKRService.js'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../../../infrastructure/auth/authMiddleware.js'

export async function okrRoutes(app: FastifyInstance) {
  const service = new OKRService(prisma)

  app.get(
    '/okrs/org',
    { preHandler: [requireAuth(), requirePermission('QA_GOVERNANCE', 'read')] },
    async (_request, reply) => reply.send(await service.listOrgOKRs())
  )

  app.get<{ Params: { projectId: string } }>(
    '/okrs/project/:projectId',
    { preHandler: [requireAuth(), requirePermission('QA_GOVERNANCE', 'read')] },
    async (request, reply) => reply.send(await service.listProjectOKRs(request.params.projectId))
  )

  app.post(
    '/okrs',
    { preHandler: [requireAuth(), requirePermission('QA_GOVERNANCE', 'create')] },
    async (request, reply) => {
      const body = request.body as any
      const okr = await service.createOKR({ ...body, createdById: request.user!.userId })
      return reply.code(201).send(okr)
    }
  )

  app.post<{ Params: { orgOkrId: string; projectId: string } }>(
    '/okrs/:orgOkrId/adopt/:projectId',
    { preHandler: [requireAuth(), requirePermission('QA_GOVERNANCE', 'create')] },
    async (request, reply) => {
      const { orgOkrId, projectId } = request.params
      const adopted = await service.adoptOrgOKR(orgOkrId, projectId, request.user!.userId)
      return reply.code(201).send(adopted)
    }
  )

  app.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/okrs/:id/status',
    { preHandler: [requireAuth(), requirePermission('QA_GOVERNANCE', 'update')] },
    async (request, reply) => {
      return reply.send(await service.updateOKRStatus(request.params.id, request.body.status as any))
    }
  )

  app.patch<{ Params: { id: string }; Body: { currentValue: number } }>(
    '/okrs/key-results/:id',
    { preHandler: [requireAuth(), requirePermission('QA_GOVERNANCE', 'update')] },
    async (request, reply) => {
      return reply.send(await service.updateKeyResult(request.params.id, request.body.currentValue))
    }
  )

  app.get<{ Params: { id: string } }>(
    '/okrs/:id/rollup',
    { preHandler: [requireAuth(), requirePermission('QA_GOVERNANCE', 'read')] },
    async (request, reply) => reply.send(await service.computeOrgRollup(request.params.id))
  )

  app.delete<{ Params: { id: string } }>(
    '/okrs/:id',
    { preHandler: [requireAuth(), requirePermission('QA_GOVERNANCE', 'delete')] },
    async (request, reply) => {
      await service.deleteOKR(request.params.id)
      return reply.code(204).send()
    }
  )
}
