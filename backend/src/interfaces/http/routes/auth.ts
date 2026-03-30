import type { FastifyInstance } from 'fastify'
import { config } from '../../../config.js'
import { AuthService, AuthError } from '../../../services/AuthService.js'
import { JwtService } from '../../../services/JwtService.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { logger } from '../../../logger.js'
import { prisma } from '../../../infrastructure/database/prisma.js'

export async function authRoutes(app: FastifyInstance) {
  const jwtService = new JwtService(
    config.JWT_SECRET,
    config.JWT_EXPIRES_IN,
    config.JWT_REFRESH_EXPIRES_IN,
  )
  const authService = new AuthService(jwtService)

  app.get(
    '/users',
    { preHandler: [requireAuth()] },
    async (_request, reply) => {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, avatarUrl: true },
      })
      return reply.send(users)
    },
  )

  app.get<{ Params: { provider: string } }>(
    '/auth/:provider',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Initiate OAuth2 login',
        params: { type: 'object', properties: { provider: { type: 'string' } } },
        response: { 302: { type: 'null' } },
      },
    },
    async (request, reply) => {
      if (config.AUTH_MODE === 'local') {
        return reply.status(404).send({ error: 'OAuth not available in local auth mode' })
      }

      const { provider } = request.params
      const { createOAuthAdapter } = await import('../../../infrastructure/auth/OAuthProviderFactory.js')
      const adapter = createOAuthAdapter(provider)
      const state = require('crypto').randomBytes(16).toString('hex')

      return reply.redirect(adapter.getAuthorizationUrl(state))
    },
  )

  app.get<{ Params: { provider: string }; Querystring: { code: string; state?: string } }>(
    '/auth/:provider/callback',
    {
      schema: {
        tags: ['Auth'],
        summary: 'OAuth2 callback',
        params: { type: 'object', properties: { provider: { type: 'string' } } },
        querystring: { type: 'object', required: ['code'], properties: { code: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      try {
        const { provider } = request.params
        const { code } = request.query
        const result = await authService.oauthCallback(provider, code)

        return reply.redirect(`${config.FRONTEND_URL}/auth/success?token=${result.accessToken}`)
      } catch (err) {
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({ error: err.message })
        }
        throw err
      }
    },
  )

  app.post<{ Body: { email: string; password: string } }>(
    '/auth/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Local email/password login',
        body: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              user: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' }, roleId: { type: 'string' }, forcePasswordChange: { type: 'boolean' } } },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (config.AUTH_MODE === 'oauth') {
        return reply.status(404).send({ error: 'Local login not available' })
      }

      try {
        const result = await authService.loginLocal(request.body.email, request.body.password)
        return reply.send(result)
      } catch (err) {
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({ error: err.message })
        }
        throw err
      }
    },
  )

  app.post<{ Body: { email: string; password: string; name?: string } }>(
    '/auth/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Self-registration (if ALLOW_REGISTRATION=true)',
        body: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      try {
        const user = await authService.register(request.body.email, request.body.password, request.body.name)
        return reply.status(201).send({ id: user.id, email: user.email })
      } catch (err) {
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({ error: err.message })
        }
        throw err
      }
    },
  )

  app.post<{ Body: { refreshToken: string } }>(
    '/auth/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        body: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      try {
        logger.debug({ action: 'auth.token_refresh_request' })
        const result = await authService.refreshToken(request.body.refreshToken)
        logger.info({ action: 'auth.token_refreshed', userId: result.user.id })
        return reply.send(result)
      } catch (err) {
        logger.error({ action: 'auth.token_refresh_error', error: err })
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({ error: err.message })
        }
        throw err
      }
    },
  )

  app.post<{ Body: { refreshToken: string } }>(
    '/auth/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Logout — revoke refresh token',
        body: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      await authService.logout(request.body.refreshToken)
      return reply.send({ success: true })
    },
  )

  app.post<{ Body: { email: string } }>(
    '/auth/forgot-password',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        body: { type: 'object', required: ['email'], properties: { email: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      await authService.forgotPassword(request.body.email)
      return reply.send({ message: 'If the email exists, a reset link has been sent' })
    },
  )

  app.post<{ Body: { token: string; newPassword: string } }>(
    '/auth/reset-password',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        body: { type: 'object', required: ['token', 'newPassword'], properties: { token: { type: 'string' }, newPassword: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      try {
        await authService.resetPassword(request.body.token, request.body.newPassword)
        return reply.send({ message: 'Password reset successfully' })
      } catch (err) {
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({ error: err.message })
        }
        throw err
      }
    },
  )

  app.patch<{ Body: { currentPassword: string; newPassword: string } }>(
    '/auth/change-password',
    {
      preHandler: [requireAuth()],
      schema: {
        tags: ['Auth'],
        summary: 'Change password (authenticated)',
        body: { type: 'object', required: ['currentPassword', 'newPassword'], properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' } } },
      },
    },
    async (request: any, reply) => {
      try {
        await authService.changePassword(request.user.userId, request.body.currentPassword, request.body.newPassword)
        return reply.send({ message: 'Password changed successfully' })
      } catch (err) {
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({ error: err.message })
        }
        throw err
      }
    },
  )

  app.get(
    '/auth/me',
    {
      preHandler: [requireAuth()],
      schema: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              avatarUrl: { type: 'string' },
              role: { type: 'object' },
              projectIds: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (request: any, reply: any) => {
      try {
        logger.debug({ action: 'auth.me', userId: request.user?.userId })
        const userProfile = await authService.getUserProfile(request.user.userId)
        return reply.send(userProfile)
      } catch (err) {
        logger.error({ action: 'auth.me_error', error: err })
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({ error: err.message })
        }
        throw err
      }
    },
  )
}
