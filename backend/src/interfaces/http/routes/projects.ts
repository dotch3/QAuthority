import type { FastifyInstance } from "fastify"
import { projectService } from "../../../services/ProjectService.js"
import { prisma } from "../../../infrastructure/database/prisma.js"
import { ForbiddenError } from "../../../utils/errors.js"

const ADMIN_ROLE_ID = "role-admin"

export async function projectRoutes(app: FastifyInstance) {
  app.addHook("onRequest", async (request) => {
    const user = request.user
    if (!user) {
      throw new Error("Unauthorized")
    }
  })

  app.get(
    "/projects",
    {
      schema: {
        tags: ["Projects"],
        summary: "List user's projects",
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                slug: { type: "string" },
                description: { type: "string" },
                createdAt: { type: "string" },
                _count: {
                  type: "object",
                  properties: {
                    members: { type: "number" },
                    testPlans: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const user = request.user
      return projectService.listProjects(user!.userId)
    }
  )

  app.post(
    "/projects",
    {
      schema: {
        tags: ["Projects"],
        summary: "Create a new project",
        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1 },
            description: { type: "string" },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              slug: { type: "string" },
              description: { type: "string" },
              createdAt: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user
      if (user!.roleId !== ADMIN_ROLE_ID) {
        throw new ForbiddenError("Only administrators can create projects")
      }
      const project = await projectService.createProject(
        {
          name: (request.body as { name: string }).name,
          description: (request.body as { description?: string }).description,
          createdById: user!.userId,
        },
        user!.roleId
      )
      return reply.status(201).send(project)
    }
  )

  app.get<{ Params: { id: string } }>(
    "/projects/:id",
    {
      schema: {
        tags: ["Projects"],
        summary: "Get project details",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              slug: { type: "string" },
              description: { type: "string" },
              createdAt: { type: "string" },
            },
          },
        },
      },
    },
    async (request) => {
      const user = request.user
      return projectService.getProject(request.params.id, user!.userId)
    }
  )

  app.patch<{ Params: { id: string } }>(
    "/projects/:id",
    {
      schema: {
        tags: ["Projects"],
        summary: "Update project",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1 },
            description: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const user = request.user
      return projectService.updateProject(
        request.params.id,
        user!.userId,
        request.body as { name?: string; description?: string }
      )
    }
  )

  app.delete<{ Params: { id: string } }>(
    "/projects/:id",
    {
      schema: {
        tags: ["Projects"],
        summary: "Delete project",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user
      if (user!.roleId !== ADMIN_ROLE_ID) {
        throw new ForbiddenError("Only administrators can delete projects")
      }
      await projectService.deleteProject(request.params.id, user!.userId)
      return reply.status(204).send()
    }
  )

  app.get<{ Params: { id: string } }>(
    "/projects/:id/members",
    {
      schema: {
        tags: ["Projects"],
        summary: "List project members",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                projectId: { type: "string" },
                userId: { type: "string" },
                roleId: { type: "string" },
                joinedAt: { type: "string" },
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    email: { type: "string" },
                    name: { type: "string" },
                    avatarUrl: { type: "string" },
                  },
                },
                role: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    label: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const user = request.user
      return projectService.listMembers(request.params.id, user!.userId)
    }
  )

  app.post<{ Params: { id: string } }>(
    "/projects/:id/members",
    {
      schema: {
        tags: ["Projects"],
        summary: "Add project member",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["userId", "roleId"],
          properties: {
            userId: { type: "string" },
            roleId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user
      const member = await projectService.addMember(request.params.id, user!.userId, {
        projectId: request.params.id,
        userId: (request.body as { userId: string }).userId,
        roleId: (request.body as { roleId: string }).roleId,
      })
      return reply.status(201).send(member)
    }
  )

  app.patch<{ Params: { id: string; userId: string } }>(
    "/projects/:id/members/:userId",
    {
      schema: {
        tags: ["Projects"],
        summary: "Update member role",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["roleId"],
          properties: {
            roleId: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const user = request.user
      return projectService.updateMemberRole(
        request.params.id,
        user!.userId,
        request.params.userId,
        (request.body as { roleId: string }).roleId
      )
    }
  )

  app.get<{ Params: { id: string } }>(
    "/projects/:id/stats",
    {
      schema: {
        tags: ["Projects"],
        summary: "Get project dashboard statistics",
        params: {
          type: "object",
          properties: { id: { type: "string" } },
        },
        response: {
          200: { type: "object", additionalProperties: true },
        },
      },
    },
    async (request) => {
      const user = request.user!
      const projectId = request.params.id
      await projectService.getProject(projectId, user.userId)

      const [testPlanCount, testSuiteCount, testCaseCount, executionCount, bugCounts] =
        await Promise.all([
          prisma.testPlan.count({ where: { projectId } }),
          prisma.testSuite.count({ where: { testPlan: { projectId } } }),
          prisma.testCase.count({ where: { suite: { testPlan: { projectId } } } }),
          prisma.testExecution.count({ where: { testPlan: { projectId } } }),
          prisma.defect.groupBy({
            by: ["statusId"],
            where: { projectId },
            _count: { id: true },
          }),
        ])

      const bugStatusIds = bugCounts.map((b) => b.statusId)
      const bugStatuses = await prisma.enumValue.findMany({
        where: { id: { in: bugStatusIds } },
        select: { id: true, value: true, label: true },
      })
      const statusMap = Object.fromEntries(bugStatuses.map((s) => [s.id, s]))

      const bugsByStatus: Record<string, number> = {}
      let openBugs = 0
      for (const row of bugCounts) {
        const status = statusMap[row.statusId]
        const key = status?.value ?? row.statusId
        bugsByStatus[key] = row._count.id
        if (key === "open" || key === "in_progress" || key === "reopened") {
          openBugs += row._count.id
        }
      }

      return {
        testPlans: testPlanCount,
        testSuites: testSuiteCount,
        testCases: testCaseCount,
        executions: executionCount,
        openBugs,
        bugsByStatus,
      }
    }
  )

  app.delete<{ Params: { id: string; userId: string } }>(
    "/projects/:id/members/:userId",
    {
      schema: {
        tags: ["Projects"],
        summary: "Remove project member",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user
      await projectService.removeMember(
        request.params.id,
        user!.userId,
        request.params.userId
      )
      return reply.status(204).send()
    }
  )
}
