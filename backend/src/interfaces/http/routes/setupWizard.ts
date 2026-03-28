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
  app.post('/setup/run', async (req, reply) => {
    const body = req.body as {
      orgName: string
      adminEmail: string
      adminPassword: string
      adminName: string
      language: string
      locale: string
    }
    try {
      const result = await service.runSetup(body)
      return reply.code(201).send(result)
    } catch (err: any) {
      return reply.code(400).send({ error: err.message })
    }
  })
}
