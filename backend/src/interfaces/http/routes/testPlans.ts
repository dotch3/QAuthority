import type { FastifyInstance } from "fastify"
import { testPlanService } from "../../../services/TestPlanService.js"
import { testCaseService } from "../../../services/TestCaseService.js"
import { NotFoundError } from "../../../utils/errors.js"

export async function testPlanRoutes(app: FastifyInstance) {
  app.get(
    "/projects/:projectId/test-plans",
    {
      schema: {
        tags: ["Test Plans"],
        summary: "List test plans for a project",
        params: {
          type: "object",
          properties: {
            projectId: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const user = request.user!
      const { projectId } = request.params as { projectId: string }
      return testPlanService.findByProject(projectId, user.userId, user.roleId)
    }
  )

  app.post(
    "/projects/:projectId/test-plans",
    {
      schema: {
        tags: ["Test Plans"],
        summary: "Create a test plan",
        params: {
          type: "object",
          properties: {
            projectId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["name", "statusId"],
          properties: {
            name: { type: "string", minLength: 1 },
            description: { type: "string" },
            statusId: { type: "string" },
            startDate: { type: "string" },
            endDate: { type: "string" },
          },
        },
        response: { 201: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const { projectId } = request.params as { projectId: string }
      const body = request.body as {
        name: string
        description?: string
        statusId: string
        startDate?: string
        endDate?: string
      }

      const plan = await testPlanService.create({
        projectId,
        name: body.name,
        description: body.description,
        statusId: body.statusId,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        createdById: user.userId,
      }, user.userId, user.roleId)

      return reply.status(201).send(plan)
    }
  )

  app.get<{ Params: { id: string } }>(
    "/test-plans/:id",
    {
      schema: {
        tags: ["Test Plans"],
        summary: "Get test plan details",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const plan = await testPlanService.findById(id)
      if (!plan) {
        throw new NotFoundError("Test plan not found")
      }
      return plan
    }
  )

  app.patch<{ Params: { id: string } }>(
    "/test-plans/:id",
    {
      schema: {
        tags: ["Test Plans"],
        summary: "Update test plan",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            statusId: { type: "string" },
            startDate: { type: "string", nullable: true },
            endDate: { type: "string", nullable: true },
            idPrefix: { type: "string", nullable: true },
            idInitialNumber: { type: "number", nullable: true },
            bugPrefix: { type: "string", nullable: true },
          },
        },
      },
    },
    async (request) => {
      const user = request.user!
      const { id } = request.params as { id: string }
      const body = request.body as {
        name?: string
        description?: string
        statusId?: string
        startDate?: string | null
        endDate?: string | null
        idPrefix?: string | null
        idInitialNumber?: number | null
        bugPrefix?: string | null
      }

      return testPlanService.update(id, {
        name: body.name,
        description: body.description,
        statusId: body.statusId,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        idPrefix: body.idPrefix,
        idInitialNumber: body.idInitialNumber,
        bugPrefix: body.bugPrefix,
      }, user.userId, user.roleId)
    }
  )

  app.delete<{ Params: { id: string } }>(
    "/test-plans/:id",
    {
      schema: {
        tags: ["Test Plans"],
        summary: "Delete test plan",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const { id } = request.params as { id: string }
      await testPlanService.delete(id, user.userId, user.roleId)
      return reply.status(204).send()
    }
  )

  app.post<{ Params: { id: string } }>(
    "/test-plans/:id/clone",
    {
      schema: {
        tags: ["Test Plans"],
        summary: "Clone test plan",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        response: { 201: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const { id } = request.params as { id: string }
      const cloned = await testPlanService.clone(id, user.userId, user.userId, user.roleId)
      return reply.status(201).send(cloned)
    }
  )

  app.get<{ Params: { id: string } }>(
    "/test-plans/:id/cases",
    {
      schema: {
        tags: ["Test Plans"],
        summary: "Get test cases for a test plan",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      return testCaseService.findByTestPlan(id)
    }
  )
}
