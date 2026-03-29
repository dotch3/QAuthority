import type { FastifyInstance } from 'fastify'
import { PermissionMatrixService } from '../../../services/PermissionMatrixService.js'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'

export async function permissionsRoutes(app: FastifyInstance) {
  const service = new PermissionMatrixService(prisma)

  app.get('/permissions/my-matrix', { preHandler: [requireAuth()] }, async (request, reply) => {
    const matrix = await service.getFullMatrix(request.user!.userId)
    return reply.send(matrix)
  })
}
