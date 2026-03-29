import type { FastifyInstance } from 'fastify'
import { PermissionMatrixService } from '../../../services/PermissionMatrixService.js'
import { UnauthorizedError } from '../../../utils/errors.js'
import { prisma } from '../../../infrastructure/database/prisma.js'

export async function permissionsRoutes(app: FastifyInstance) {
  const service = new PermissionMatrixService(prisma)

  app.addHook('onRequest', async (request, reply) => {
    const user = (request as any).user
    if (!user) throw new UnauthorizedError('Unauthorized')
  })

  app.get('/permissions/my-matrix', async (req, reply) => {
    const matrix = await service.getFullMatrix((req.user as any).userId)
    return reply.send(matrix)
  })
}
