import { FastifyInstance } from 'fastify'
import { WorkflowService } from '../../../services/WorkflowService.js'
import { MermaidExportService } from '../../../services/MermaidExportService.js'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../../../infrastructure/auth/authMiddleware.js'

export async function workflowRoutes(app: FastifyInstance) {
  const workflowService = new WorkflowService(prisma)
  const mermaidService = new MermaidExportService()

  app.get('/workflows/project/:projectId', { preHandler: [requireAuth(), requirePermission('PROCESS_DESIGNER', 'read')] }, async (req, reply) => {
    const { projectId } = req.params as { projectId: string }
    return reply.send(await workflowService.listForProject(projectId))
  })

  app.get('/workflows/:id', { preHandler: [requireAuth(), requirePermission('PROCESS_DESIGNER', 'read')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    return reply.send(await workflowService.getWorkflow(id))
  })

  app.post('/workflows', { preHandler: [requireAuth(), requirePermission('PROCESS_DESIGNER', 'create')] }, async (req, reply) => {
    const body = req.body as any
    const workflow = await workflowService.createWorkflow({
      ...body,
      createdById: (req.user as any).userId,
    })
    return reply.code(201).send(workflow)
  })

  app.put('/workflows/:id', { preHandler: [requireAuth(), requirePermission('PROCESS_DESIGNER', 'update')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    return reply.send(await workflowService.saveWorkflow(id, req.body as any))
  })

  app.delete('/workflows/:id', { preHandler: [requireAuth(), requirePermission('PROCESS_DESIGNER', 'delete')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await workflowService.deleteWorkflow(id)
    return reply.code(204).send()
  })

  app.get('/workflows/:id/export/mermaid', { preHandler: [requireAuth(), requirePermission('PROCESS_DESIGNER', 'read')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const workflow = await workflowService.getWorkflow(id)
    const mermaid = mermaidService.toMermaid(workflow)
    reply.header('Content-Type', 'text/plain')
    return reply.send(mermaid)
  })

  app.get('/workflows/:id/export/json', { preHandler: [requireAuth(), requirePermission('PROCESS_DESIGNER', 'read')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const workflow = await workflowService.getWorkflow(id)
    const json = mermaidService.toJSON(workflow)
    reply.header('Content-Type', 'application/json')
    reply.header('Content-Disposition', `attachment; filename="workflow-${id}.json"`)
    return reply.send(json)
  })
}
