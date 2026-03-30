import { FastifyInstance } from 'fastify'
import { AIProviderService } from '../../../services/AIProviderService.js'
import { CodeGeneratorService } from '../../../services/CodeGeneratorService.js'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../../../infrastructure/auth/authMiddleware.js'

export async function aiCodegenRoutes(app: FastifyInstance) {
  const providerService = new AIProviderService(prisma)
  const codegenService = new CodeGeneratorService(prisma)

  app.get('/ai/providers', { preHandler: [requireAuth(), requirePermission('AI_CODEGEN', 'read')] }, async (req, reply) => {
    const { projectId } = req.query as { projectId?: string }
    return reply.send(await providerService.listProviders(projectId))
  })

  app.post('/ai/providers', { preHandler: [requireAuth(), requirePermission('ADMIN', 'create')] }, async (req, reply) => {
    const provider = await providerService.createProvider(req.body as any)
    return reply.code(201).send({ ...provider, apiKey: '***' })
  })

  app.put('/ai/providers/:id', { preHandler: [requireAuth(), requirePermission('ADMIN', 'update')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    return reply.send(await providerService.updateProvider(id, req.body as any))
  })

  app.delete('/ai/providers/:id', { preHandler: [requireAuth(), requirePermission('ADMIN', 'delete')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await providerService.deleteProvider(id)
    return reply.code(204).send()
  })

  app.post('/ai/generate', { preHandler: [requireAuth(), requirePermission('AI_CODEGEN', 'create')] }, async (req, reply) => {
    const { testCaseId, framework, providerId } = req.body as {
      testCaseId: string
      framework: any
      providerId?: string
    }

    let provider
    if (providerId) {
      provider = await providerService.getDecryptedProvider(providerId)
    } else {
      try {
        provider = await providerService.getDefaultProvider()
      } catch {
        return reply.code(400).send({ error: 'No AI provider configured. Please add one in AI Providers.' })
      }
    }

    const code = await codegenService.generate({
      testCaseId,
      framework,
      provider,
      createdById: (req.user as any).id,
    })

    return reply.send({ code, framework, testCaseId })
  })

  app.get('/ai/test-cases/:testCaseId/codes', { preHandler: [requireAuth(), requirePermission('AI_CODEGEN', 'read')] }, async (req, reply) => {
    const { testCaseId } = req.params as { testCaseId: string }
    return reply.send(await codegenService.getGeneratedCodes(testCaseId))
  })
}
