import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { FastifyInstance } from 'fastify'
import { APP_CONFIG } from '../../../config.js'

export default fp(async (app: FastifyInstance) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'QAuthority API',
        version: '1.0.0',
        description: `QAuthority is an Enterprise QA Governance Platform providing multi-project test management, executive KPI dashboards, DORA metrics, OKR tracking, and AI-powered test automation. Designed for QA Managers governing multiple teams at scale. Authentication: Bearer JWT (obtain via /auth/login or OAuth2)`,
      },
      servers: [{ url: '/api/v1' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  })
})
