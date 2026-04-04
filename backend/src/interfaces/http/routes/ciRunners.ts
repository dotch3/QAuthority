import type { FastifyInstance } from "fastify"
import { prisma } from "../../../infrastructure/database/prisma.js"
import { ciDispatchService } from "../../../services/CIDispatchService.js"
import { testRunService } from "../../../services/TestRunService.js"
import { JUnitParserService } from "../../../services/JUnitParserService.js"
import { testRunEventBus } from "../../../services/TestRunEventBus.js"
import { NotFoundError, BadRequestError } from "../../../utils/errors.js"
import { requireAuth } from "../middleware/requireAuth.js"

const junitParser = new JUnitParserService()

/** Extract @TC-EXTERNALID tag from a JUnit test name. */
function extractExternalId(testName: string): string | null {
  const match = testName.match(/@([A-Z0-9]+-[A-Z]+-\d+|[A-Z]+-\d+)/i)
  return match ? match[1].toUpperCase() : null
}

export async function ciRunnerRoutes(app: FastifyInstance) {
  // ── CI Runner Config CRUD ──────────────────────────────────────────────────

  app.get(
    "/projects/:projectId/ci-runner-configs",
    {
      preHandler: [requireAuth()],
      schema: {
        tags: ["CI Runners"],
        summary: "List CI runner configs for a project",
        params: { type: "object", properties: { projectId: { type: "string" } } },
      },
    },
    async (request) => {
      const { projectId } = request.params as { projectId: string }
      return prisma.cIRunnerConfig.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      })
    }
  )

  app.post(
    "/projects/:projectId/ci-runner-configs",
    {
      preHandler: [requireAuth()],
      schema: {
        tags: ["CI Runners"],
        summary: "Create a CI runner config",
        params: { type: "object", properties: { projectId: { type: "string" } } },
        body: {
          type: "object",
          required: ["name", "type", "framework"],
          properties: {
            name: { type: "string", minLength: 1 },
            type: { type: "string", enum: ["jenkins", "github_actions", "gitlab_ci", "custom_webhook"] },
            framework: { type: "string", enum: ["playwright", "cypress", "jest", "selenium"] },
            baseUrl: { type: "string" },
            credential: { type: "string" },
            config: { type: "object", additionalProperties: true },
            scriptTemplate: { type: "string" },
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
        type: string
        framework: string
        baseUrl?: string
        credential?: string
        config?: Record<string, unknown>
        scriptTemplate?: string
      }
      const runner = await prisma.cIRunnerConfig.create({
        data: {
          projectId,
          createdById: user.userId,
          name: body.name,
          type: body.type,
          framework: body.framework,
          baseUrl: body.baseUrl ?? null,
          credential: body.credential ?? null,
          config: (body.config ?? {}) as any,
          scriptTemplate: body.scriptTemplate ?? null,
        },
      })
      return reply.status(201).send(runner)
    }
  )

  app.patch(
    "/ci-runner-configs/:id",
    {
      preHandler: [requireAuth()],
      schema: {
        tags: ["CI Runners"],
        summary: "Update a CI runner config",
        params: { type: "object", properties: { id: { type: "string" } } },
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            type: { type: "string", enum: ["jenkins", "github_actions", "gitlab_ci", "custom_webhook"] },
            framework: { type: "string", enum: ["playwright", "cypress", "jest", "selenium"] },
            baseUrl: { type: "string" },
            credential: { type: "string" },
            config: { type: "object", additionalProperties: true },
            scriptTemplate: { type: "string" },
            active: { type: "boolean" },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const body = request.body as Record<string, unknown>
      return prisma.cIRunnerConfig.update({ where: { id }, data: body })
    }
  )

  app.delete(
    "/ci-runner-configs/:id",
    {
      preHandler: [requireAuth()],
      schema: {
        tags: ["CI Runners"],
        summary: "Delete a CI runner config",
        params: { type: "object", properties: { id: { type: "string" } } },
        response: { 204: { type: "null" } },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      await prisma.cIRunnerConfig.delete({ where: { id } })
      return reply.status(204).send()
    }
  )

  // ── Dispatch ───────────────────────────────────────────────────────────────

  app.post(
    "/test-runs/:id/dispatch",
    {
      preHandler: [requireAuth()],
      schema: {
        tags: ["CI Runners"],
        summary: "Dispatch CI job for a test run",
        params: { type: "object", properties: { id: { type: "string" } } },
        body: {
          type: "object",
          required: ["runnerId"],
          properties: {
            runnerId: { type: "string" },
          },
        },
        response: { 202: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { runnerId } = request.body as { runnerId: string }

      const protocol = request.headers["x-forwarded-proto"] ?? "http"
      const host = request.headers["x-forwarded-host"] ?? request.hostname
      const webhookBase = `${protocol}://${host}`

      const result = await ciDispatchService.dispatch(id, runnerId, webhookBase)

      testRunEventBus.emit(id, {
        type: "ci_status",
        payload: { ciStatus: "pending", jobUrl: result.jobUrl ?? null },
      })

      return reply.status(202).send({ dispatched: true, ...result })
    }
  )

  // ── CI Callback (webhook from CI) ──────────────────────────────────────────

  app.post(
    "/ci/callback",
    {
      config: { skipAuth: true },
      schema: {
        tags: ["CI Runners"],
        summary: "Webhook: CI posts JUnit XML results back to QAuthority",
        querystring: {
          type: "object",
          required: ["runId", "token"],
          properties: {
            runId: { type: "string" },
            token: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { runId, token } = request.query as { runId: string; token: string }

      const run = await prisma.testRun.findUnique({
        where: { id: runId },
        include: {
          cases: {
            include: { testCase: { select: { id: true, externalId: true } } },
          },
        },
      })
      if (!run) return reply.status(404).send({ error: "Run not found" })
      if (run.callbackToken !== token) return reply.status(401).send({ error: "Invalid token" })

      // Parse the multipart file OR raw body
      let xmlContent: string
      try {
        const data = await request.file()
        if (data) {
          const chunks: Buffer[] = []
          for await (const chunk of data.file) chunks.push(chunk)
          xmlContent = Buffer.concat(chunks).toString("utf8")
        } else {
          xmlContent = JSON.stringify(request.body)
        }
      } catch {
        xmlContent = typeof request.body === "string" ? request.body : JSON.stringify(request.body)
      }

      if (!xmlContent || xmlContent.trim() === "") {
        return reply.status(400).send({ error: "No result file provided" })
      }

      let parsed
      try {
        parsed = junitParser.parse(xmlContent)
      } catch (e: any) {
        return reply.status(400).send({ error: `Failed to parse results: ${e.message}` })
      }

      // Build lookup: externalId (uppercased) → TestRunCase id
      const caseByExternalId = new Map<string, string>()
      for (const rc of run.cases) {
        if (rc.testCase.externalId) {
          caseByExternalId.set(rc.testCase.externalId.toUpperCase(), rc.id)
        }
      }

      let matched = 0
      for (const result of parsed) {
        const externalId = extractExternalId(result.name)
        if (!externalId) continue
        const runCaseId = caseByExternalId.get(externalId)
        if (!runCaseId) continue

        const status = result.status === "PASSED" ? "passed"
          : result.status === "FAILED" ? "failed"
          : "skipped"

        await testRunService.recordResult(
          runCaseId,
          { status: status as any, notes: result.errorMessage, durationMs: result.durationMs },
          null,
        )

        testRunEventBus.emit(runId, {
          type: "case_updated",
          payload: { runCaseId, status, durationMs: result.durationMs },
        })

        matched++
      }

      // Update CI status to completed
      await prisma.testRun.update({
        where: { id: runId },
        data: { ciStatus: "completed" },
      })

      testRunEventBus.emit(runId, {
        type: "ci_status",
        payload: { ciStatus: "completed", matched, total: parsed.length },
      })

      return reply.send({ ok: true, matched, total: parsed.length })
    }
  )

  // ── SSE: live run events ───────────────────────────────────────────────────

  app.get(
    "/test-runs/:id/events",
    {
      config: { skipAuth: true },
      schema: {
        tags: ["CI Runners"],
        summary: "SSE stream for live test run progress",
        params: { type: "object", properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const raw = reply.raw
      raw.setHeader("Content-Type", "text/event-stream")
      raw.setHeader("Cache-Control", "no-cache")
      raw.setHeader("Connection", "keep-alive")
      raw.setHeader("X-Accel-Buffering", "no")
      raw.flushHeaders()

      const send = (event: import("../../../services/TestRunEventBus.js").TestRunEvent) => {
        raw.write(`event: ${event.type}\n`)
        raw.write(`data: ${JSON.stringify(event.payload)}\n\n`)
      }

      // Send initial ping so the client knows the connection is open
      send({ type: "ping", payload: { runId: id } })

      const unsubscribe = testRunEventBus.subscribe(id, send)

      // Keep-alive ping every 25 s to prevent proxy timeouts
      const keepAlive = setInterval(() => {
        try {
          raw.write(": keep-alive\n\n")
        } catch {
          clearInterval(keepAlive)
        }
      }, 25_000)

      request.raw.on("close", () => {
        clearInterval(keepAlive)
        unsubscribe()
      })

      // Fastify must not send its own response
      await new Promise<void>((resolve) => {
        request.raw.on("close", resolve)
      })
    }
  )

  // ── Preview: generated script ──────────────────────────────────────────────

  app.get(
    "/test-runs/:id/ci-script",
    {
      preHandler: [requireAuth()],
      schema: {
        tags: ["CI Runners"],
        summary: "Preview the CI script that would be generated for this run",
        params: { type: "object", properties: { id: { type: "string" } } },
        querystring: {
          type: "object",
          required: ["runnerId"],
          properties: { runnerId: { type: "string" } },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const { runnerId } = request.query as { runnerId: string }

      const runner = await prisma.cIRunnerConfig.findUnique({ where: { id: runnerId } })
      if (!runner) throw new NotFoundError("CI runner config not found")

      const run = await prisma.testRun.findUnique({
        where: { id },
        include: {
          cases: { include: { testCase: { select: { externalId: true } } } },
        },
      })
      if (!run) throw new NotFoundError("Test run not found")

      const externalIds = run.cases
        .map((c) => c.testCase.externalId)
        .filter((eid): eid is string => !!eid)

      const { CIScriptGeneratorService } = await import("../../../services/CIScriptGeneratorService.js")
      const gen = new CIScriptGeneratorService()
      const script = gen.generate({
        framework: runner.framework as any,
        externalIds,
        runId: id,
        webhookUrl: "<WEBHOOK_URL>",
        scriptTemplate: runner.scriptTemplate ?? undefined,
      })

      const callbackSnippet = gen.buildCallbackSnippet("<WEBHOOK_URL>", `results/run-${id}.xml`)

      return { script, callbackSnippet, externalIds, framework: runner.framework }
    }
  )
}
