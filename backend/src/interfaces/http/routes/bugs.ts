import type { FastifyInstance } from "fastify"
import { defectService } from "../../../services/DefectService.js"
import { evidenceService } from "../../../services/EvidenceService.js"
import { NotFoundError } from "../../../utils/errors.js"

export async function bugRoutes(app: FastifyInstance) {
  app.get(
    "/projects/:projectId/bugs",
    {
      schema: {
        tags: ["Bugs"],
        summary: "List bugs for a project",
        params: {
          type: "object",
          properties: {
            projectId: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { projectId } = request.params as { projectId: string }
      return defectService.findByProject(projectId)
    }
  )

  app.post(
    "/projects/:projectId/bugs",
    {
      schema: {
        tags: ["Bugs"],
        summary: "Create a bug",
        params: {
          type: "object",
          properties: {
            projectId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["title", "statusId", "priorityId", "severityId", "sourceId"],
          properties: {
            title: { type: "string", minLength: 1 },
            description: { type: "string" },
            statusId: { type: "string" },
            priorityId: { type: "string" },
            severityId: { type: "string" },
            sourceId: { type: "string" },
            assignedToId: { type: "string" },
            externalId: { type: "string" },
            externalUrl: { type: "string" },
            actualResult: { type: "string" },
            expectedResult: { type: "string" },
          },
        },
        response: { 201: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const { projectId } = request.params as { projectId: string }
      const body = request.body as {
        title: string
        description?: string
        statusId: string
        priorityId: string
        severityId: string
        sourceId: string
        assignedToId?: string
        externalId?: string
        externalUrl?: string
        actualResult?: string
        expectedResult?: string
      }

      const bug = await defectService.create({
        projectId,
        title: body.title,
        description: body.description,
        statusId: body.statusId,
        priorityId: body.priorityId,
        severityId: body.severityId,
        sourceId: body.sourceId,
        reportedById: user.userId,
        assignedToId: body.assignedToId,
        externalId: body.externalId,
        externalUrl: body.externalUrl,
        actualResult: body.actualResult,
        expectedResult: body.expectedResult,
      })

      return reply.status(201).send(bug)
    }
  )

  app.get<{ Params: { id: string } }>(
    "/bugs/:id",
    {
      schema: {
        tags: ["Bugs"],
        summary: "Get bug details",
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
      const bug = await defectService.findById(id)
      if (!bug) {
        throw new NotFoundError("Defect not found")
      }
      return bug
    }
  )

  app.patch<{ Params: { id: string } }>(
    "/bugs/:id",
    {
      schema: {
        tags: ["Bugs"],
        summary: "Update bug",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            statusId: { type: "string" },
            priorityId: { type: "string" },
            severityId: { type: "string" },
            sourceId: { type: "string" },
            assignedToId: { type: "string", nullable: true },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const body = request.body as {
        title?: string
        description?: string
        statusId?: string
        priorityId?: string
        severityId?: string
        sourceId?: string
        assignedToId?: string | null
      }

      return defectService.update(id, body)
    }
  )

  app.delete<{ Params: { id: string } }>(
    "/bugs/:id",
    {
      schema: {
        tags: ["Bugs"],
        summary: "Delete bug",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      await defectService.delete(id)
      return reply.status(204).send()
    }
  )

  app.post<{ Params: { id: string; executionId: string } }>(
    "/bugs/:id/executions/:executionId",
    {
      schema: {
        tags: ["Bugs"],
        summary: "Link bug to execution",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
            executionId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id, executionId } = request.params as { id: string; executionId: string }
      await defectService.linkToExecution(id, executionId)
      return reply.status(204).send()
    }
  )

  app.delete<{ Params: { id: string; executionId: string } }>(
    "/bugs/:id/executions/:executionId",
    {
      schema: {
        tags: ["Bugs"],
        summary: "Unlink bug from execution",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
            executionId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id, executionId } = request.params as { id: string; executionId: string }
      await defectService.unlinkFromExecution(id, executionId)
      return reply.status(204).send()
    }
  )

  app.get<{ Params: { projectId: string } }>(
    "/projects/:projectId/bugs/stats",
    {
      schema: {
        tags: ["Bugs"],
        summary: "Get bug statistics",
        params: {
          type: "object",
          properties: {
            projectId: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { projectId } = request.params as { projectId: string }
      return defectService.getStats(projectId)
    }
  )

  app.get<{ Params: { projectId: string; bugId: string } }>(
    "/projects/:projectId/bugs/:bugId/evidence",
    {
      schema: {
        tags: ["Bugs"],
        summary: "Get all evidence for a bug",
        params: {
          type: "object",
          properties: {
            projectId: { type: "string" },
            bugId: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { bugId } = request.params as { projectId: string; bugId: string }
      return evidenceService.getByEntity("bug", bugId)
    }
  )

  app.delete<{ Params: { projectId: string; bugId: string; attachmentId: string } }>(
    "/projects/:projectId/bugs/:bugId/evidence/:attachmentId",
    {
      schema: {
        tags: ["Bugs"],
        summary: "Delete evidence from a bug",
        params: {
          type: "object",
          properties: {
            projectId: { type: "string" },
            bugId: { type: "string" },
            attachmentId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { attachmentId } = request.params as { projectId: string; bugId: string; attachmentId: string }
      await evidenceService.delete(attachmentId)
      return reply.status(204).send()
    }
  )
}
