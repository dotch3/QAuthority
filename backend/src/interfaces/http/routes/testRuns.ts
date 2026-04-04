import type { FastifyInstance } from "fastify"
import { testRunService } from "../../../services/TestRunService.js"
import { NotFoundError } from "../../../utils/errors.js"

export async function testRunRoutes(app: FastifyInstance) {
  // ─── List runs for a project ──────────────────────────────────────────────
  app.get(
    "/projects/:projectId/test-runs",
    {
      schema: {
        tags: ["Test Runs"],
        summary: "List test runs for a project",
        params: { type: "object", properties: { projectId: { type: "string" } } },
        querystring: {
          type: "object",
          properties: {
            status: { type: "string" },
            testPlanId: { type: "string" },
            search: { type: "string" },
            page: { type: "number", default: 1 },
            limit: { type: "number", default: 25 },
          },
        },
      },
    },
    async (request) => {
      const { projectId } = request.params as { projectId: string }
      const q = request.query as { status?: string; testPlanId?: string; search?: string; page?: number; limit?: number }
      return testRunService.findByProject(projectId, q)
    }
  )

  // ─── Create a run ─────────────────────────────────────────────────────────
  app.post(
    "/projects/:projectId/test-runs",
    {
      schema: {
        tags: ["Test Runs"],
        summary: "Create a new test run",
        params: { type: "object", properties: { projectId: { type: "string" } } },
        body: {
          type: "object",
          required: ["testPlanId", "name", "caseIds"],
          properties: {
            testPlanId: { type: "string" },
            name: { type: "string", minLength: 1 },
            description: { type: "string" },
            environment: { type: "string" },
            caseIds: { type: "array", items: { type: "string" } },
          },
        },
        response: { 201: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const { projectId } = request.params as { projectId: string }
      const body = request.body as {
        testPlanId: string
        name: string
        description?: string
        environment?: string
        caseIds: string[]
      }
      const run = await testRunService.create({ ...body, projectId, createdById: user.userId })
      return reply.status(201).send(run)
    }
  )

  // ─── Get run detail ───────────────────────────────────────────────────────
  app.get(
    "/test-runs/:id",
    {
      schema: {
        tags: ["Test Runs"],
        summary: "Get test run details with all cases",
        params: { type: "object", properties: { id: { type: "string" } } },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      return testRunService.findById(id)
    }
  )

  // ─── Update run ───────────────────────────────────────────────────────────
  app.patch(
    "/test-runs/:id",
    {
      schema: {
        tags: ["Test Runs"],
        summary: "Update test run (name, environment, status)",
        params: { type: "object", properties: { id: { type: "string" } } },
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            environment: { type: "string" },
            status: { type: "string", enum: ["not_started", "in_progress", "completed", "aborted"] },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const body = request.body as any
      return testRunService.update(id, body)
    }
  )

  // ─── Delete run ───────────────────────────────────────────────────────────
  app.delete(
    "/test-runs/:id",
    {
      schema: {
        tags: ["Test Runs"],
        summary: "Delete a test run",
        params: { type: "object", properties: { id: { type: "string" } } },
        response: { 204: { type: "null" } },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      await testRunService.delete(id)
      return reply.status(204).send()
    }
  )

  // ─── Progress ─────────────────────────────────────────────────────────────
  app.get(
    "/test-runs/:id/progress",
    {
      schema: {
        tags: ["Test Runs"],
        summary: "Get execution progress for a run",
        params: { type: "object", properties: { id: { type: "string" } } },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      return testRunService.getProgress(id)
    }
  )

  // ─── Add cases to run ─────────────────────────────────────────────────────
  app.post(
    "/test-runs/:id/cases",
    {
      schema: {
        tags: ["Test Runs"],
        summary: "Add test cases to a run",
        params: { type: "object", properties: { id: { type: "string" } } },
        body: {
          type: "object",
          required: ["caseIds"],
          properties: {
            caseIds: { type: "array", items: { type: "string" } },
          },
        },
        response: { 201: { type: "array", items: { type: "object", additionalProperties: true } } },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { caseIds } = request.body as { caseIds: string[] }
      const cases = await testRunService.addCases(id, caseIds)
      return reply.status(201).send(cases)
    }
  )

  // ─── Remove case from run ─────────────────────────────────────────────────
  app.delete(
    "/test-runs/:id/cases/:caseId",
    {
      schema: {
        tags: ["Test Runs"],
        summary: "Remove a case from a run",
        params: {
          type: "object",
          properties: { id: { type: "string" }, caseId: { type: "string" } },
        },
        response: { 204: { type: "null" } },
      },
    },
    async (request, reply) => {
      const { id, caseId } = request.params as { id: string; caseId: string }
      await testRunService.removeCase(id, caseId)
      return reply.status(204).send()
    }
  )

  // ─── Bulk assign ──────────────────────────────────────────────────────────
  app.patch(
    "/test-runs/:id/cases/bulk-assign",
    {
      schema: {
        tags: ["Test Runs"],
        summary: "Bulk assign cases in a run to a user",
        params: { type: "object", properties: { id: { type: "string" } } },
        body: {
          type: "object",
          required: ["caseIds"],
          properties: {
            caseIds: { type: "array", items: { type: "string" } },
            assigneeId: { type: ["string", "null"] },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const { caseIds, assigneeId } = request.body as { caseIds: string[]; assigneeId?: string | null }
      return testRunService.bulkAssign(id, caseIds, assigneeId ?? null)
    }
  )

  // ─── Record result for a case ─────────────────────────────────────────────
  app.patch(
    "/test-run-cases/:caseId/result",
    {
      schema: {
        tags: ["Test Runs"],
        summary: "Record execution result for a case in a run",
        params: { type: "object", properties: { caseId: { type: "string" } } },
        body: {
          type: "object",
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: ["not_run", "in_progress", "passed", "failed", "blocked", "skipped"],
            },
            notes: { type: "string" },
            durationMs: { type: "number" },
          },
        },
      },
    },
    async (request) => {
      const user = request.user!
      const { caseId } = request.params as { caseId: string }
      const body = request.body as { status: any; notes?: string; durationMs?: number }
      return testRunService.recordResult(caseId, body, user.userId)
    }
  )

  // ─── Case execution history ───────────────────────────────────────────────
  app.get(
    "/test-cases/:caseId/run-history",
    {
      schema: {
        tags: ["Test Runs"],
        summary: "Get execution history for a test case across all runs",
        params: { type: "object", properties: { caseId: { type: "string" } } },
        querystring: {
          type: "object",
          properties: {
            page: { type: "number", default: 1 },
            limit: { type: "number", default: 20 },
          },
        },
      },
    },
    async (request) => {
      const { caseId } = request.params as { caseId: string }
      const { page, limit } = request.query as { page?: number; limit?: number }
      return testRunService.getCaseHistory(caseId, page, limit)
    }
  )
}
