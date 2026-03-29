import Fastify from 'fastify'
import fastifyMultipart from '@fastify/multipart'
import swaggerPlugin from './interfaces/http/plugins/swagger.js'
import corsPlugin from './interfaces/http/plugins/cors.js'
import authPlugin from './interfaces/http/plugins/auth.js'
import auditLogPlugin from './interfaces/http/plugins/auditLog.js'
import { healthRoutes } from './interfaces/http/routes/health.js'
import { authRoutes } from './interfaces/http/routes/auth.js'
import { profileRoutes } from './interfaces/http/routes/profile.js'
import { projectRoutes } from './interfaces/http/routes/projects.js'
import { testPlanRoutes } from './interfaces/http/routes/testPlans.js'
import { testSuiteRoutes } from './interfaces/http/routes/testSuites.js'
import { testCaseRoutes } from './interfaces/http/routes/testCases.js'
import { etCharterRoutes } from './interfaces/http/routes/etCharters.js'
import { heuristicRoutes } from './interfaces/http/routes/heuristics.js'
import { importRoutes } from './interfaces/http/routes/import.js'
import { executionRoutes } from './interfaces/http/routes/executions.js'
import { bugRoutes } from './interfaces/http/routes/bugs.js'
import { webhookRoutes } from './interfaces/http/routes/webhooks.js'
import { adminUsersRoutes } from './interfaces/http/routes/admin/users.js'
import { evidenceRoutes } from './interfaces/http/routes/evidence.js'
import { enumRoutes } from './interfaces/http/routes/enums.js'
import { groupsRoutes } from './interfaces/http/routes/groups.js'
import { setupWizardRoutes } from './interfaces/http/routes/setupWizard.js'
import { permissionsRoutes } from './interfaces/http/routes/permissions.js'
import { metricsRoutes } from './interfaces/http/routes/metrics.js'
import { okrRoutes } from './interfaces/http/routes/okrs.js'
import { cicdRoutes } from './interfaces/http/routes/cicd.js'
import { externalIssuesRoutes } from './interfaces/http/routes/externalIssues.js'
import { reportsRoutes } from './interfaces/http/routes/reports.js'
import { metricsExportRoutes } from './interfaces/http/routes/metricsExport.js'
import { logger } from './logger.js'
import { NotFoundError, ForbiddenError, BadRequestError, UnauthorizedError } from './utils/errors.js'

const fastifyLogger = Object.assign(Object.create(Object.getPrototypeOf(logger)), logger, {
  fatal: logger.error.bind(logger),
  trace: logger.debug.bind(logger),
  child: (bindings: Record<string, unknown>) => {
    const child = logger.child(bindings) as typeof logger & { fatal: typeof logger.error; trace: typeof logger.debug }
    child.fatal = child.error.bind(child)
    child.trace = child.debug.bind(child)
    return child
  },
})

export async function buildApp() {
  const app = Fastify({
    loggerInstance: fastifyLogger,
    disableRequestLogging: true,
    bodyLimit: 60 * 1024 * 1024, // 60MB
  })

  app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    if (error instanceof NotFoundError) {
      return reply.status(404).send({ error: error.message })
    }
    if (error instanceof ForbiddenError) {
      return reply.status(403).send({ error: error.message })
    }
    if (error instanceof BadRequestError) {
      return reply.status(400).send({ error: error.message })
    }
    if (error instanceof UnauthorizedError) {
      return reply.status(401).send({ error: error.message })
    }
    // Fastify validation errors
    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ error: error.message })
    }
    logger.error('Unhandled error', { err: error.message, method: request.method, url: request.url })
    return reply.status(500).send({ error: error.message || 'Internal Server Error' })
  })

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  })
  await app.register(corsPlugin)
  await app.register(swaggerPlugin)
  await app.register(auditLogPlugin)
  await app.register(authPlugin)

  app.get('/', {
    schema: { hide: true },
  }, async (_, reply) => {
    return reply.redirect('/docs')
  })

  app.get('/api/v1', {
    schema: { hide: true },
  }, async (_, reply) => {
    return reply.redirect('/docs')
  })

  await app.register(healthRoutes, { prefix: '/api/v1' })
  await app.register(authRoutes, { prefix: '/api/v1' })
  await app.register(profileRoutes, { prefix: '/api/v1' })
  await app.register(projectRoutes, { prefix: '/api/v1' })
  await app.register(testPlanRoutes, { prefix: '/api/v1' })
  await app.register(testSuiteRoutes, { prefix: '/api/v1' })
  await app.register(testCaseRoutes, { prefix: '/api/v1' })
  await app.register(importRoutes, { prefix: '/api/v1' })
  await app.register(executionRoutes, { prefix: '/api/v1' })
  await app.register(bugRoutes, { prefix: '/api/v1' })
  await app.register(webhookRoutes, { prefix: '/api/v1' })
  await app.register(adminUsersRoutes, { prefix: '/api/v1' })
  await app.register(etCharterRoutes, { prefix: '/api/v1' })
  await app.register(heuristicRoutes, { prefix: '/api/v1' })
  await app.register(evidenceRoutes, { prefix: '/api/v1' })
  await app.register(enumRoutes, { prefix: '/api/v1' })
  await app.register(groupsRoutes, { prefix: '/api/v1' })
  await app.register(setupWizardRoutes, { prefix: '/api/v1' })
  await app.register(permissionsRoutes, { prefix: '/api/v1' })
  await app.register(metricsRoutes, { prefix: '/api/v1' })
  await app.register(okrRoutes, { prefix: '/api/v1' })
  await app.register(cicdRoutes, { prefix: '/api/v1' })
  await app.register(externalIssuesRoutes, { prefix: '/api/v1' })
  await app.register(reportsRoutes, { prefix: '/api/v1' })
  await app.register(metricsExportRoutes, { prefix: '/api/v1' })

  return app
}
