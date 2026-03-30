import type { FastifyInstance } from "fastify"
import { testCaseService } from "../../../services/TestCaseService.js"
import { evidenceService } from "../../../services/EvidenceService.js"
import { logger } from "../../../logger.js"

export async function testCaseRoutes(app: FastifyInstance) {
  app.get<{ Params: { suiteId: string }; Querystring: { search?: string; typeId?: string; priorityId?: string; assigneeId?: string; page?: number; limit?: number } }>(
    "/suites/:suiteId/cases",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "List test cases in a suite with filters and pagination",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            search: { type: "string" },
            typeId: { type: "string" },
            priorityId: { type: "string" },
            assigneeId: { type: "string" },
            page: { type: "number", default: 1 },
            limit: { type: "number", default: 25 },
          },
        },
      },
    },
    async (request) => {
      const { suiteId } = request.params as { suiteId: string }
      const { search, typeId, priorityId, assigneeId, page, limit } = request.query as { search?: string; typeId?: string; priorityId?: string; assigneeId?: string; page?: number; limit?: number }
      return testCaseService.findBySuite(suiteId, { search, typeId, priorityId, assigneeId, page, limit })
    }
  )

  app.post<{ Params: { suiteId: string } }>(
    "/suites/:suiteId/cases",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Create a test case",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["title", "priorityId", "typeId"],
          properties: {
            title: { type: "string", minLength: 1 },
            description: { type: "string" },
            preconditions: { type: "string" },
            notes: { type: "string" },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  order: { type: "number" },
                  action: { type: "string" },
                  expectedResult: { type: "string" },
                },
              },
            },
            priorityId: { type: "string" },
            typeId: { type: "string" },
            automationScriptRef: { type: "string" },
            assigneeIds: { type: "array", items: { type: "string" } },
          },
        },
        response: { 201: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const { suiteId } = request.params as { suiteId: string }
      const body = request.body as {
        title: string
        description?: string
        preconditions?: string
        notes?: string
        steps?: Array<{ order: number; action: string; expectedResult: string }>
        priorityId: string
        typeId: string
        automationScriptRef?: string
        assigneeIds?: string[]
      }

      const testCase = await testCaseService.create({
        suiteId,
        title: body.title,
        description: body.description,
        preconditions: body.preconditions,
        notes: body.notes,
        steps: body.steps,
        priorityId: body.priorityId,
        typeId: body.typeId,
        automationScriptRef: body.automationScriptRef,
        createdById: user.userId,
        assigneeIds: body.assigneeIds,
      })

      logger.info("[TestCase] Created successfully", { testCaseId: testCase.id, externalId: testCase.externalId })
      
      // Return as string to avoid any serialization issues
      const responseString = '{"id":"' + testCase.id + '","externalId":"' + (testCase.externalId || '') + '"}'
      console.log("[Route] Raw response:", responseString)
      
      reply.header("Content-Type", "application/json")
      return reply.send(responseString)
    }
  )

  app.get<{ Params: { id: string } }>(
    "/cases/:id",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Get test case details",
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
      const testCase = await testCaseService.findById(id)
      if (!testCase) {
        throw new Error("Test case not found")
      }
      return testCase
    }
  )

  app.get<{ Params: { id: string } }>(
    "/cases/:id/evidence",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Get all evidence for a test case",
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
      return evidenceService.getByEntity("test_case", id)
    }
  )

  app.delete<{ Params: { id: string; attachmentId: string } }>(
    "/cases/:id/evidence/:attachmentId",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Delete evidence from a test case",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
            attachmentId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { attachmentId } = request.params as { id: string; attachmentId: string }
      await evidenceService.delete(attachmentId)
      return reply.status(204).send()
    }
  )

  app.patch<{ Params: { id: string } }>(
    "/cases/:id",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Update test case",
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
            preconditions: { type: "string" },
            notes: { type: "string" },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  order: { type: "number" },
                  action: { type: "string" },
                  expectedResult: { type: "string" },
                },
              },
            },
            priorityId: { type: "string" },
            typeId: { type: "string" },
            automationScriptRef: { type: "string", nullable: true },
            assigneeIds: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    async (request) => {
      const user = request.user!
      const { id } = request.params as { id: string }
      const body = request.body as {
        title?: string
        description?: string
        preconditions?: string
        notes?: string
        steps?: Array<{ order: number; action: string; expectedResult: string }>
        priorityId?: string
        typeId?: string
        automationScriptRef?: string | null
        assigneeIds?: string[]
      }

      return testCaseService.update(id, {
        title: body.title,
        description: body.description,
        preconditions: body.preconditions,
        notes: body.notes,
        steps: body.steps,
        priorityId: body.priorityId,
        typeId: body.typeId,
        automationScriptRef: body.automationScriptRef,
        assigneeIds: body.assigneeIds,
      }, user.userId)
    }
  )

  app.get<{ Params: { id: string } }>(
    "/cases/:id/steps",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Get steps for a test case",
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
                order: { type: "number" },
                action: { type: "string" },
                expectedResult: { type: "string" },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const testCase = await testCaseService.findById(id)
      if (!testCase) {
        throw new Error("Test case not found")
      }
      return (testCase.steps as Array<{ order: number; action: string; expectedResult: string }>) ?? []
    }
  )

  app.put<{ Params: { id: string } }>(
    "/cases/:id/steps",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Replace steps for a test case",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "array",
          items: {
            type: "object",
            required: ["order", "action", "expectedResult"],
            properties: {
              order: { type: "number" },
              action: { type: "string" },
              expectedResult: { type: "string" },
            },
          },
        },
        response: { 200: { type: "object", additionalProperties: true } },
      },
    },
    async (request) => {
      const user = request.user!
      const { id } = request.params as { id: string }
      const steps = request.body as Array<{ order: number; action: string; expectedResult: string }>
      return testCaseService.update(id, { steps }, user.userId)
    }
  )

  app.delete<{ Params: { id: string } }>(
    "/cases/:id",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Delete test case",
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
      await testCaseService.delete(id)
      return reply.status(204).send()
    }
  )

  app.post<{ Params: { id: string }; Body: { targetSuiteId: string } }>(
    "/cases/:id/copy",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Copy test case to another suite",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["targetSuiteId"],
          properties: {
            targetSuiteId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const { id } = request.params as { id: string }
      const { targetSuiteId } = request.body as { targetSuiteId: string }

      const copiedCase = await testCaseService.copy(id, targetSuiteId, user.userId)
      return reply.status(201).send(copiedCase)
    }
  )

  app.patch<{ Params: { id: string }; Body: { targetSuiteId: string } }>(
    "/cases/:id/move",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Move test case to another suite",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["targetSuiteId"],
          properties: {
            targetSuiteId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { targetSuiteId } = request.body as { targetSuiteId: string }

      const movedCase = await testCaseService.move(id, targetSuiteId)
      return reply.send(movedCase)
    }
  )

  app.post<{ Params: { suiteId: string; caseId: string }; Body: { userId: string } }>(
    "/suites/:suiteId/cases/:caseId/assignees",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Assign a user to a test case",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
            caseId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["userId"],
          properties: {
            userId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { caseId } = request.params as { suiteId: string; caseId: string }
      const { userId } = request.body as { userId: string }

      const assignee = await testCaseService.addAssignee(caseId, userId)
      return reply.status(201).send(assignee)
    }
  )

  app.delete<{ Params: { suiteId: string; caseId: string; userId: string } }>(
    "/suites/:suiteId/cases/:caseId/assignees/:userId",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Remove assignee from test case",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
            caseId: { type: "string" },
            userId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { caseId, userId } = request.params as { suiteId: string; caseId: string; userId: string }

      await testCaseService.removeAssignee(caseId, userId)
      return reply.status(204).send()
    }
  )

  app.get<{ Params: { suiteId: string; caseId: string } }>(
    "/suites/:suiteId/cases/:caseId/assignees",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Get all assignees for a test case",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
            caseId: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { caseId } = request.params as { suiteId: string; caseId: string }

      return testCaseService.getAssignees(caseId)
    }
  )

  app.post<{ Params: { suiteId: string }; Body: { caseIds: string[] } }>(
    "/suites/:suiteId/cases/bulk-delete",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Delete multiple test cases",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["caseIds"],
          properties: {
            caseIds: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    async (request, reply) => {
      const { caseIds } = request.body as { caseIds: string[] }

      const result = await testCaseService.bulkDelete(caseIds)
      return reply.send(result)
    }
  )

  app.post<{ Params: { suiteId: string }; Body: { caseIds: string[]; targetSuiteId: string } }>(
    "/suites/:suiteId/cases/bulk-move",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Move multiple test cases to another suite",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["caseIds", "targetSuiteId"],
          properties: {
            caseIds: { type: "array", items: { type: "string" } },
            targetSuiteId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { caseIds, targetSuiteId } = request.body as { caseIds: string[]; targetSuiteId: string }

      const result = await testCaseService.bulkMove(caseIds, targetSuiteId)
      return reply.send(result)
    }
  )

  app.post<{ Params: { suiteId: string }; Body: { caseIds: string[]; userIds: string[] } }>(
    "/suites/:suiteId/cases/bulk-assign",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Assign users to multiple test cases",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["caseIds", "userIds"],
          properties: {
            caseIds: { type: "array", items: { type: "string" } },
            userIds: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    async (request, reply) => {
      const { caseIds, userIds } = request.body as { caseIds: string[]; userIds: string[] }

      const result = await testCaseService.bulkAssign(caseIds, userIds)
      return reply.send(result)
    }
  )

  app.get<{ Params: { suiteId: string; caseId: string } }>(
    "/suites/:suiteId/cases/:caseId/versions",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Get all versions of a test case",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
            caseId: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { caseId } = request.params as { suiteId: string; caseId: string }
      return testCaseService.getVersions(caseId)
    }
  )

  app.get<{ Params: { suiteId: string; caseId: string; version: string } }>(
    "/suites/:suiteId/cases/:caseId/versions/:version",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Get a specific version of a test case",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
            caseId: { type: "string" },
            version: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { caseId, version } = request.params as { suiteId: string; caseId: string; version: string }
      const versionNum = parseInt(version, 10)
      if (isNaN(versionNum)) {
        throw new Error("Invalid version number")
      }
      const testCaseVersion = await testCaseService.getVersion(caseId, versionNum)
      if (!testCaseVersion) {
        throw new Error(`Version ${versionNum} not found`)
      }
      return testCaseVersion
    }
  )

  app.post<{ Params: { suiteId: string; caseId: string; version: string } }>(
    "/suites/:suiteId/cases/:caseId/versions/:version/restore",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Restore a test case to a specific version",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
            caseId: { type: "string" },
            version: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const { caseId, version } = request.params as { suiteId: string; caseId: string; version: string }
      const versionNum = parseInt(version, 10)
      if (isNaN(versionNum)) {
        throw new Error("Invalid version number")
      }

      const restored = await testCaseService.restoreVersion(caseId, versionNum, user.userId)
      return reply.send(restored)
    }
  )

  app.get<{ Params: { suiteId: string; caseId: string } }>(
    "/suites/:suiteId/cases/:caseId/evidence",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Get all evidence for a test case",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
            caseId: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { caseId } = request.params as { suiteId: string; caseId: string }
      return evidenceService.getByEntity("test_case", caseId)
    }
  )

  app.delete<{ Params: { suiteId: string; caseId: string; attachmentId: string } }>(
    "/suites/:suiteId/cases/:caseId/evidence/:attachmentId",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Delete evidence from a test case",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
            caseId: { type: "string" },
            attachmentId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { attachmentId } = request.params as { suiteId: string; caseId: string; attachmentId: string }
      await evidenceService.delete(attachmentId)
      return reply.status(204).send()
    }
  )
}
