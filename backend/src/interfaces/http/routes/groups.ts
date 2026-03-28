import type { FastifyInstance } from 'fastify'
import { GroupService } from '../../../services/GroupService.js'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { UnauthorizedError, ForbiddenError } from '../../../utils/errors.js'

const groupService = new GroupService(prisma)

const ADMIN_ROLE_ID = 'role-admin'

export async function groupsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    const user = (request as any).user
    if (!user) throw new UnauthorizedError('Unauthorized')
    if (user.roleId !== ADMIN_ROLE_ID) throw new ForbiddenError('Admin access required')
  })

  // GET /api/v1/groups
  app.get(
    '/groups',
    {
      schema: {
        tags: ['Groups'],
        summary: 'List all groups',
        querystring: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { projectId } = request.query as { projectId?: string }
      return groupService.listGroups(projectId)
    }
  )

  // GET /api/v1/groups/:id
  app.get<{ Params: { id: string } }>(
    '/groups/:id',
    {
      schema: {
        tags: ['Groups'],
        summary: 'Get group details',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      return groupService.getGroup(request.params.id)
    }
  )

  // POST /api/v1/groups
  app.post(
    '/groups',
    {
      schema: {
        tags: ['Groups'],
        summary: 'Create a group',
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            projectId: { type: 'string' },
          },
        },
        response: {
          201: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as { name: string; description?: string; projectId?: string }
      const group = await groupService.createGroup({
        name: body.name,
        description: body.description ?? null,
        projectId: body.projectId,
      })
      return reply.status(201).send(group)
    }
  )

  // PATCH /api/v1/groups/:id
  app.patch<{ Params: { id: string } }>(
    '/groups/:id',
    {
      schema: {
        tags: ['Groups'],
        summary: 'Update a group',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const body = request.body as { name?: string; description?: string }
      return groupService.updateGroup(request.params.id, body)
    }
  )

  // DELETE /api/v1/groups/:id
  app.delete<{ Params: { id: string } }>(
    '/groups/:id',
    {
      schema: {
        tags: ['Groups'],
        summary: 'Delete a group',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      await groupService.deleteGroup(request.params.id)
      return reply.status(204).send()
    }
  )

  // POST /api/v1/groups/:id/members
  app.post<{ Params: { id: string } }>(
    '/groups/:id/members',
    {
      schema: {
        tags: ['Groups'],
        summary: 'Add a member to a group',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
        response: {
          201: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.body as { userId: string }
      const member = await groupService.addMember(request.params.id, userId)
      return reply.status(201).send(member)
    }
  )

  // DELETE /api/v1/groups/:id/members/:userId
  app.delete<{ Params: { id: string; userId: string } }>(
    '/groups/:id/members/:userId',
    {
      schema: {
        tags: ['Groups'],
        summary: 'Remove a member from a group',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      await groupService.removeMember(request.params.id, request.params.userId)
      return reply.status(204).send()
    }
  )

  // PUT /api/v1/groups/:id/permissions
  app.put<{ Params: { id: string } }>(
    '/groups/:id/permissions',
    {
      schema: {
        tags: ['Groups'],
        summary: 'Set permissions for a group',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['permissions'],
          properties: {
            permissions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['module', 'canCreate', 'canRead', 'canUpdate', 'canDelete', 'canExport'],
                properties: {
                  module: { type: 'string' },
                  canCreate: { type: 'boolean' },
                  canRead: { type: 'boolean' },
                  canUpdate: { type: 'boolean' },
                  canDelete: { type: 'boolean' },
                  canExport: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { permissions } = request.body as { permissions: any[] }
      await groupService.setPermissions(request.params.id, permissions)
      return reply.send({ ok: true })
    }
  )
}
