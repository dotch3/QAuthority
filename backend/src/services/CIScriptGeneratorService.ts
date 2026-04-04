/**
 * Generates the CLI command for each supported test framework.
 *
 * Convention: test code must tag each test with the QAuthority external ID
 * so results can be matched back.
 *
 * Playwright: test("title @TC-CHK-0001", ...)  or  test.describe("@TC-CHK-0001", ...)
 * Cypress:    it("title @TC-CHK-0001", ...)
 * Jest:       test("title @TC-CHK-0001", ...)
 * Selenium:   test name contains @TC-CHK-0001
 */

export type Framework = "playwright" | "cypress" | "jest" | "selenium"

export interface GenerateScriptOptions {
  framework: Framework
  externalIds: string[]   // ["TC-CHK-0001", "TC-CHK-0002"]
  runId: string
  webhookUrl: string      // where CI posts results back
  scriptTemplate?: string // optional override from CIRunnerConfig
}

export class CIScriptGeneratorService {
  generate(opts: GenerateScriptOptions): string {
    if (opts.scriptTemplate) {
      return this.applyTemplate(opts.scriptTemplate, opts)
    }

    switch (opts.framework) {
      case "playwright":
        return this.playwright(opts)
      case "cypress":
        return this.cypress(opts)
      case "jest":
        return this.jest(opts)
      case "selenium":
        return this.selenium(opts)
      default:
        throw new Error(`Unsupported framework: ${opts.framework}`)
    }
  }

  /**
   * Builds the grep pattern: @TC-CHK-0001|@TC-CHK-0002|...
   */
  private grepPattern(ids: string[]): string {
    return ids.map((id) => `@${id}`).join("|")
  }

  private playwright(opts: GenerateScriptOptions): string {
    const grep = this.grepPattern(opts.externalIds)
    // Produces JUnit XML at results/run-{runId}.xml
    return [
      `npx playwright test`,
      `  --grep "${grep}"`,
      `  --reporter=junit`,
      `  --output="results/run-${opts.runId}.xml"`,
    ].join(" \\\n")
  }

  private cypress(opts: GenerateScriptOptions): string {
    const grep = this.grepPattern(opts.externalIds)
    return [
      `npx cypress run`,
      `  --env grep="${grep}"`,
      `  --reporter junit`,
      `  --reporter-options "mochaFile=results/run-${opts.runId}.xml"`,
    ].join(" \\\n")
  }

  private jest(opts: GenerateScriptOptions): string {
    const grep = this.grepPattern(opts.externalIds)
    return [
      `npx jest`,
      `  --testNamePattern="${grep}"`,
      `  --reporters="default" --reporters="jest-junit"`,
      `  --testResultsProcessor="jest-junit"`,
    ].join(" \\\n") +
      `\n# env: JEST_JUNIT_OUTPUT_FILE=results/run-${opts.runId}.xml`
  }

  private selenium(opts: GenerateScriptOptions): string {
    const grep = this.grepPattern(opts.externalIds)
    // Generic — user typically overrides with scriptTemplate
    return [
      `mvn test`,
      `  -Dtest="${grep}"`,
      `  -Dsurefire.outputDirectory=results/run-${opts.runId}`,
    ].join(" \\\n")
  }

  /**
   * Apply a custom script template.
   * Tokens: {GREP}, {RUNID}, {WEBHOOK_URL}, {IDS_CSV}
   */
  private applyTemplate(template: string, opts: GenerateScriptOptions): string {
    return template
      .replace(/{GREP}/g, this.grepPattern(opts.externalIds))
      .replace(/{RUNID}/g, opts.runId)
      .replace(/{WEBHOOK_URL}/g, opts.webhookUrl)
      .replace(/{IDS_CSV}/g, opts.externalIds.join(","))
  }

  /**
   * Builds the shell snippet the CI job must run AFTER the tests to post
   * results back to QAuthority. The CI template in the user's repo should
   * call this as its last step.
   */
  buildCallbackSnippet(webhookUrl: string, resultsFile: string): string {
    return [
      `# Post results to QAuthority (run even on failure)`,
      `curl -sf -X POST "${webhookUrl}" \\`,
      `  -F "file=@${resultsFile}" \\`,
      `  -F "format=junit" || echo "Warning: failed to post results to QAuthority"`,
    ].join("\n")
  }
}

export const ciScriptGenerator = new CIScriptGeneratorService()
