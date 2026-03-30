import type { FastifyInstance } from "fastify"
import { etCharterService } from "../../../services/ETCharterService.js"
import { evidenceService } from "../../../services/EvidenceService.js"

export async function etCharterRoutes(app: FastifyInstance) {
  // List ET Charters by suite
  app.get<{ Params: { suiteId: string } }>(
    "/suites/:suiteId/et-charters",
    {
      schema: {
        tags: ["ET Charters"],
        summary: "List ET Charters for a suite",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { suiteId } = request.params as { suiteId: string }
      return etCharterService.findBySuite(suiteId)
    }
  )

  // Create ET Charter
  app.post<{ Params: { suiteId: string } }>(
    "/suites/:suiteId/et-charters",
    {
      schema: {
        tags: ["ET Charters"],
        summary: "Create an ET Charter",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["charter"],
          properties: {
            charter: { type: "string", minLength: 1 },
            areas: { type: "array", items: { type: "string" } },
            startDate: { type: "string" },
            endDate: { type: "string" },
            status: { type: "string" },
            testerId: { type: "string" },
            duration: { type: "string" },
            testDesignPercentage: { type: "number" },
            bugInvestigationPercentage: { type: "number" },
            sessionSetupPercentage: { type: "number" },
            charterVsOpportunity: { type: "number" },
            dataFiles: { type: "array", items: { type: "string" } },
            testNotes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  bullets: { type: "array", items: { type: "string" } },
                },
              },
            },
            opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  bullets: { type: "array", items: { type: "string" } },
                },
              },
            },
            bugs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  steps: { type: "array", items: { type: "string" } },
                  expected: { type: "string" },
                  actual: { type: "string" },
                },
              },
            },
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                },
              },
            },
            heuristicIds: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
        response: { 201: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const { suiteId } = request.params as { suiteId: string }
      const body = request.body as {
        charter: string
        areas?: string[]
        startDate?: string
        testerId?: string
        duration?: string
        testDesignPercentage?: number
        bugInvestigationPercentage?: number
        sessionSetupPercentage?: number
        charterVsOpportunity?: number
        dataFiles?: string[]
        testNotes?: Array<{ action: string; bullets: string[] }>
        opportunities?: Array<{ action: string; bullets: string[] }>
        bugs?: Array<{ name: string; steps: string[]; expected: string; actual: string }>
        issues?: Array<{ description: string }>
        heuristicIds?: string[]
      }

      const charter = await etCharterService.create({
        suiteId,
        charter: body.charter,
        areas: body.areas,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        testerId: body.testerId,
        duration: body.duration,
        testDesignPercentage: body.testDesignPercentage,
        bugInvestigationPercentage: body.bugInvestigationPercentage,
        sessionSetupPercentage: body.sessionSetupPercentage,
        charterVsOpportunity: body.charterVsOpportunity,
        dataFiles: body.dataFiles,
        testNotes: body.testNotes,
        opportunities: body.opportunities,
        bugs: body.bugs,
        issues: body.issues,
        heuristicIds: body.heuristicIds,
        createdById: user.userId,
      })

      return reply.status(201).send(charter)
    }
  )

  // Get ET Charter by ID
  app.get<{ Params: { id: string } }>(
    "/et-charters/:id",
    {
      schema: {
        tags: ["ET Charters"],
        summary: "Get ET Charter details",
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
      const charter = await etCharterService.findById(id)
      if (!charter) throw new Error("ET Charter not found")
      return charter
    }
  )

  // Update ET Charter
  app.patch<{ Params: { id: string } }>(
    "/et-charters/:id",
    {
      schema: {
        tags: ["ET Charters"],
        summary: "Update ET Charter",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            charter: { type: "string" },
            areas: { type: "array", items: { type: "string" } },
            startDate: { type: "string", nullable: true },
            endDate: { type: "string", nullable: true },
            status: { type: "string" },
            testerId: { type: "string", nullable: true },
            duration: { type: "string" },
            testDesignPercentage: { type: "number" },
            bugInvestigationPercentage: { type: "number" },
            sessionSetupPercentage: { type: "number" },
            charterVsOpportunity: { type: "number" },
            dataFiles: { type: "array", items: { type: "string" } },
            testNotes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  bullets: { type: "array", items: { type: "string" } },
                },
              },
            },
            opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  bullets: { type: "array", items: { type: "string" } },
                },
              },
            },
            bugs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  steps: { type: "array", items: { type: "string" } },
                  expected: { type: "string" },
                  actual: { type: "string" },
                },
              },
            },
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                },
              },
            },
            heuristicIds: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const body = request.body as {
        charter?: string
        areas?: string[]
        startDate?: string | null
        testerId?: string | null
        duration?: string
        testDesignPercentage?: number
        bugInvestigationPercentage?: number
        sessionSetupPercentage?: number
        charterVsOpportunity?: number
        dataFiles?: string[]
        testNotes?: Array<{ action: string; bullets: string[] }>
        opportunities?: Array<{ action: string; bullets: string[] }>
        bugs?: Array<{ name: string; steps: string[]; expected: string; actual: string }>
        issues?: Array<{ description: string }>
        heuristicIds?: string[]
      }

      return etCharterService.update(id, {
        charter: body.charter,
        areas: body.areas,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        testerId: body.testerId,
        duration: body.duration,
        testDesignPercentage: body.testDesignPercentage,
        bugInvestigationPercentage: body.bugInvestigationPercentage,
        sessionSetupPercentage: body.sessionSetupPercentage,
        charterVsOpportunity: body.charterVsOpportunity,
        dataFiles: body.dataFiles,
        testNotes: body.testNotes,
        opportunities: body.opportunities,
        bugs: body.bugs,
        issues: body.issues,
        heuristicIds: body.heuristicIds,
      })
    }
  )

  // Delete ET Charter
  app.delete<{ Params: { id: string } }>(
    "/et-charters/:id",
    {
      schema: {
        tags: ["ET Charters"],
        summary: "Delete ET Charter",
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
      await etCharterService.delete(id)
      return reply.status(204).send()
    }
  )

  // Copy ET Charter
  app.post<{ Params: { id: string }; Body: { targetSuiteId: string } }>(
    "/et-charters/:id/copy",
    {
      schema: {
        tags: ["ET Charters"],
        summary: "Copy ET Charter to another suite",
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
        response: { 201: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const { id } = request.params as { id: string }
      const { targetSuiteId } = request.body as { targetSuiteId: string }

      const copied = await etCharterService.copy(id, targetSuiteId, user.userId)
      return reply.status(201).send(copied)
    }
  )

  // Move ET Charter
  app.patch<{ Params: { id: string }; Body: { targetSuiteId: string } }>(
    "/et-charters/:id/move",
    {
      schema: {
        tags: ["ET Charters"],
        summary: "Move ET Charter to another suite",
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
    async (request) => {
      const { id } = request.params as { id: string }
      const { targetSuiteId } = request.body as { targetSuiteId: string }

      return etCharterService.move(id, targetSuiteId)
    }
  )

  // Link Bug to ET Charter
  app.post<{ Params: { id: string }; Body: { bugId: string } }>(
    "/et-charters/:id/bugs",
    {
      schema: {
        tags: ["ET Charters"],
        summary: "Link bug to ET Charter",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["bugId"],
          properties: {
            bugId: { type: "string" },
          },
        },
        response: { 201: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { bugId } = request.body as { bugId: string }

      const link = await etCharterService.linkBug(id, bugId)
      return reply.status(201).send(link)
    }
  )

  // Unlink Bug from ET Charter
  app.delete<{ Params: { id: string; bugId: string } }>(
    "/et-charters/:id/bugs/:bugId",
    {
      schema: {
        tags: ["ET Charters"],
        summary: "Unlink bug from ET Charter",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
            bugId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id, bugId } = request.params as { id: string; bugId: string }
      await etCharterService.unlinkBug(id, bugId)
      return reply.status(204).send()
    }
  )

  // Link Test Case to ET Charter
  app.post<{ Params: { id: string }; Body: { testCaseId: string } }>(
    "/et-charters/:id/test-cases",
    {
      schema: {
        tags: ["ET Charters"],
        summary: "Link test case to ET Charter",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["testCaseId"],
          properties: {
            testCaseId: { type: "string" },
          },
        },
        response: { 201: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { testCaseId } = request.body as { testCaseId: string }

      const link = await etCharterService.linkTestCase(id, testCaseId)
      return reply.status(201).send(link)
    }
  )

  // Get evidence for ET Charter
  app.get<{ Params: { id: string } }>(
    "/et-charters/:id/evidence",
    {
      schema: {
        tags: ["ET Charters"],
        summary: "Get all evidence for an ET Charter",
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
      return evidenceService.getByEntity("et_charter", id)
    }
  )

  // Delete evidence from ET Charter
  app.delete<{ Params: { id: string; attachmentId: string } }>(
    "/et-charters/:id/evidence/:attachmentId",
    {
      schema: {
        tags: ["ET Charters"],
        summary: "Delete evidence from an ET Charter",
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

  // Unlink Test Case from ET Charter
  app.delete<{ Params: { id: string; testCaseId: string } }>(
    "/et-charters/:id/test-cases/:testCaseId",
    {
      schema: {
        tags: ["ET Charters"],
        summary: "Unlink test case from ET Charter",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
            testCaseId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id, testCaseId } = request.params as { id: string; testCaseId: string }
      await etCharterService.unlinkTestCase(id, testCaseId)
      return reply.status(204).send()
    }
  )
}
