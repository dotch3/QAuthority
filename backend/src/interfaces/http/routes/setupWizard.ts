import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { SetupWizardService } from '../../../services/SetupWizardService.js'

export async function setupWizardRoutes(app: FastifyInstance) {
  const service = new SetupWizardService(prisma)

  // GET /api/v1/setup/status — no auth required
  app.get('/setup/status', async (_req, reply) => {
    const complete = await service.isSetupComplete()
    const health = await service.checkSystemHealth()
    return reply.send({ complete, health })
  })

  // POST /api/v1/setup/run — no auth required
  app.post<{
    Body: {
      orgName: string
      adminEmail: string
      adminPassword: string
      adminName: string
      language?: string
      locale?: string
    }
  }>(
    '/setup/run',
    {
      schema: {
        body: {
          type: 'object',
          required: ['orgName', 'adminEmail', 'adminPassword', 'adminName'],
          properties: {
            orgName: { type: 'string' },
            adminEmail: { type: 'string', format: 'email' },
            adminPassword: { type: 'string', minLength: 1 },
            adminName: { type: 'string' },
            language: { type: 'string' },
            locale: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const result = await service.runSetup(req.body)
        return reply.code(201).send(result)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return reply.code(400).send({ error: message })
      }
    },
  )
}
