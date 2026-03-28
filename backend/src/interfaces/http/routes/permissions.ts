import { FastifyInstance } from 'fastify'
import { PermissionMatrixService } from '../../../services/PermissionMatrixService'

export async function permissionsRoutes(app: FastifyInstance) {
  const service = new PermissionMatrixService(app.prisma)

  app.get('/permissions/my-matrix', { onRequest: [app.authenticate] }, async (req, reply) => {
    const matrix = await service.getFullMatrix((req.user as any).id)
    return reply.send(matrix)
  })
}
