import { FastifyInstance } from 'fastify'
import { Queue } from 'bullmq'
import fs from 'fs'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../../../infrastructure/auth/authMiddleware.js'

export async function reportsRoutes(app: FastifyInstance) {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
  const reportQueue = new Queue('reports', { connection: { url: redisUrl } })

  app.get('/reports/templates', { preHandler: [requireAuth(), requirePermission('REPORTING', 'read')] }, async (req, reply) => {
    const { projectId } = req.query as { projectId?: string }
    const templates = await prisma.reportTemplate.findMany({
      where: projectId ? { projectId } : {},
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(templates)
  })

  app.post('/reports/templates', { preHandler: [requireAuth(), requirePermission('REPORTING', 'create')] }, async (req, reply) => {
    const body = req.body as any
    const template = await prisma.reportTemplate.create({
      data: {
        name: body.name,
        type: body.type,
        scope: body.scope,
        projectId: body.projectId ?? null,
        config: body.config ?? {},
        createdById: (req.user as any).id,
      },
    })
    return reply.code(201).send(template)
  })

  app.delete('/reports/templates/:id', { preHandler: [requireAuth(), requirePermission('REPORTING', 'delete')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.reportTemplate.delete({ where: { id } })
    return reply.code(204).send()
  })

  app.post('/reports/generate', { preHandler: [requireAuth(), requirePermission('REPORTING', 'create')] }, async (req, reply) => {
    const { templateId, format, projectIds } = req.body as any

    const template = await prisma.reportTemplate.findUnique({ where: { id: templateId } })
    if (!template) return reply.code(404).send({ error: 'Template not found' })

    const job = await prisma.reportJob.create({
      data: {
        templateId,
        format,
        projectIds: projectIds ?? null,
        status: 'PENDING',
        createdById: (req.user as any).id,
      },
    })

    try {
      await reportQueue.add('generate', {
        jobId: job.id,
        projectId: template.projectId,
        format,
        type: template.type,
      })
    } catch (err) {
      console.warn('Failed to add job to queue:', err)
    }

    return reply.code(202).send({ jobId: job.id, status: 'PENDING' })
  })

  app.get('/reports/jobs', { preHandler: [requireAuth(), requirePermission('REPORTING', 'read')] }, async (req, reply) => {
    const jobs = await prisma.reportJob.findMany({
      include: { template: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return reply.send(jobs)
  })

  app.get('/reports/jobs/:id', { preHandler: [requireAuth(), requirePermission('REPORTING', 'read')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const job = await prisma.reportJob.findUnique({
      where: { id },
      include: { template: true },
    })
    if (!job) return reply.code(404).send({ error: 'Job not found' })
    return reply.send(job)
  })

  app.get('/reports/jobs/:id/download', { preHandler: [requireAuth(), requirePermission('REPORTING', 'read')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const job = await prisma.reportJob.findUnique({ where: { id } })
    if (!job || job.status !== 'DONE' || !job.filePath) {
      return reply.code(404).send({ error: 'Report not ready or not found' })
    }

    const extMap: Record<string, string> = {
      PDF: 'pdf',
      DOCX: 'docx',
      EXCEL: 'xlsx',
      CSV: 'csv',
      JSON: 'json',
    }
    const ext = extMap[job.format] ?? job.format.toLowerCase()
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      json: 'application/json',
    }

    reply.header('Content-Type', mimeMap[ext] ?? 'application/octet-stream')
    reply.header('Content-Disposition', `attachment; filename="report-${id}.${ext}"`)
    return reply.send(fs.createReadStream(job.filePath))
  })
}
