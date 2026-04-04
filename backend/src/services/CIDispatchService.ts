/**
 * Dispatches a CI job to an external runner (Jenkins, GitHub Actions, GitLab CI,
 * or a custom webhook) with the generated test command and webhook callback URL.
 *
 * Config JSON shapes per type:
 *   jenkins:        { jobName: string }
 *   github_actions: { owner: string, repo: string, workflowId: string, ref?: string }
 *   gitlab_ci:      { projectId: string, ref?: string }
 *   custom_webhook: { url: string }
 */

import { CIScriptGeneratorService, type Framework } from "./CIScriptGeneratorService.js"
import { prisma } from "../infrastructure/database/prisma.js"
import { BadRequestError, NotFoundError } from "../utils/errors.js"

const scriptGen = new CIScriptGeneratorService()

export interface DispatchResult {
  jobId?: string
  jobUrl?: string
  raw?: unknown
}

export class CIDispatchService {
  async dispatch(testRunId: string, runnerId: string, webhookBase: string): Promise<DispatchResult> {
    const runner = await prisma.cIRunnerConfig.findUnique({ where: { id: runnerId } })
    if (!runner) throw new NotFoundError("CI runner config not found")

    const run = await prisma.testRun.findUnique({
      where: { id: testRunId },
      include: {
        cases: {
          include: { testCase: { select: { externalId: true } } },
        },
      },
    })
    if (!run) throw new NotFoundError("Test run not found")

    const externalIds = run.cases
      .map((c) => c.testCase.externalId)
      .filter((id): id is string => !!id)

    if (externalIds.length === 0) {
      throw new BadRequestError("No test cases with externalId found in this run")
    }

    const webhookUrl = `${webhookBase}/api/v1/ci/callback?runId=${testRunId}&token=${run.callbackToken}`

    const script = scriptGen.generate({
      framework: runner.framework as Framework,
      externalIds,
      runId: testRunId,
      webhookUrl,
      scriptTemplate: runner.scriptTemplate ?? undefined,
    })

    const config = (runner.config ?? {}) as Record<string, string>

    let result: DispatchResult
    switch (runner.type) {
      case "jenkins":
        result = await this.dispatchJenkins(runner.baseUrl!, runner.credential!, config, script, webhookUrl)
        break
      case "github_actions":
        result = await this.dispatchGitHub(runner.credential!, config, script, webhookUrl)
        break
      case "gitlab_ci":
        result = await this.dispatchGitLab(runner.baseUrl!, runner.credential!, config, script, webhookUrl)
        break
      case "custom_webhook":
        result = await this.dispatchCustom(config.url, runner.credential, script, webhookUrl, testRunId, externalIds)
        break
      default:
        throw new BadRequestError(`Unsupported runner type: ${runner.type}`)
    }

    // Persist the generated script and CI job reference on the run
    await prisma.testRun.update({
      where: { id: testRunId },
      data: {
        generatedScript: script,
        ciRunnerId: runnerId,
        ciJobId: result.jobId ?? null,
        ciJobUrl: result.jobUrl ?? null,
        ciStatus: "pending",
      },
    })

    return result
  }

  // ── Jenkins ────────────────────────────────────────────────────────────────
  private async dispatchJenkins(
    baseUrl: string,
    token: string,
    config: Record<string, string>,
    script: string,
    webhookUrl: string,
  ): Promise<DispatchResult> {
    const jobName = config.jobName
    if (!jobName) throw new BadRequestError("Jenkins config missing jobName")

    const url = `${baseUrl.replace(/\/$/, "")}/job/${encodeURIComponent(jobName)}/buildWithParameters`
    const params = new URLSearchParams({
      TEST_COMMAND: script,
      QAUTHORITY_WEBHOOK: webhookUrl,
    })

    const res = await fetch(`${url}?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${token}`, // user:apitoken base64
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Jenkins dispatch failed (${res.status}): ${text}`)
    }

    // Jenkins returns Location header with the queue item URL
    const location = res.headers.get("Location") ?? undefined
    return { jobUrl: location }
  }

  // ── GitHub Actions ────────────────────────────────────────────────────────
  private async dispatchGitHub(
    token: string,
    config: Record<string, string>,
    script: string,
    webhookUrl: string,
  ): Promise<DispatchResult> {
    const { owner, repo, workflowId, ref = "main" } = config
    if (!owner || !repo || !workflowId) {
      throw new BadRequestError("GitHub Actions config missing owner, repo, or workflowId")
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref,
        inputs: {
          test_command: script,
          webhook_url: webhookUrl,
        },
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`GitHub Actions dispatch failed (${res.status}): ${text}`)
    }

    const jobUrl = `https://github.com/${owner}/${repo}/actions`
    return { jobUrl }
  }

  // ── GitLab CI ─────────────────────────────────────────────────────────────
  private async dispatchGitLab(
    baseUrl: string,
    token: string,
    config: Record<string, string>,
    script: string,
    webhookUrl: string,
  ): Promise<DispatchResult> {
    const { projectId, ref = "main" } = config
    if (!projectId) throw new BadRequestError("GitLab CI config missing projectId")

    const url = `${baseUrl.replace(/\/$/, "")}/api/v4/projects/${projectId}/pipeline`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "PRIVATE-TOKEN": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref,
        variables: [
          { key: "TEST_COMMAND", value: script },
          { key: "QAUTHORITY_WEBHOOK", value: webhookUrl },
        ],
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`GitLab CI dispatch failed (${res.status}): ${text}`)
    }

    const data = (await res.json()) as { id?: number; web_url?: string }
    return { jobId: String(data.id ?? ""), jobUrl: data.web_url }
  }

  // ── Custom webhook ────────────────────────────────────────────────────────
  private async dispatchCustom(
    url: string,
    credential: string | null,
    script: string,
    webhookUrl: string,
    runId: string,
    externalIds: string[],
  ): Promise<DispatchResult> {
    if (!url) throw new BadRequestError("Custom webhook config missing url")

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (credential) headers["Authorization"] = `Bearer ${credential}`

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        runId,
        script,
        webhookUrl,
        externalIds,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Custom webhook dispatch failed (${res.status}): ${text}`)
    }

    return {}
  }
}

export const ciDispatchService = new CIDispatchService()
