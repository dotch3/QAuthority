import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'

export async function processTemplateRoutes(app: FastifyInstance) {
  // List all process templates (system + custom)
  app.get(
    '/process-templates',
    { preHandler: [requireAuth()] },
    async (_request, reply) => {
      const templates = await prisma.processTemplate.findMany({
        orderBy: [{ isSystem: 'desc' }, { category: 'asc' }, { name: 'asc' }],
      })
      return reply.send(templates)
    }
  )

  // Get single process template
  app.get<{ Params: { id: string } }>(
    '/process-templates/:id',
    { preHandler: [requireAuth()] },
    async (request, reply) => {
      const template = await prisma.processTemplate.findUnique({
        where: { id: request.params.id },
      })
      if (!template) return reply.status(404).send({ error: 'Template not found' })
      return reply.send(template)
    }
  )
}
