import { XMLParser } from 'fast-xml-parser'

interface ParsedTestResult {
  suiteName: string
  name: string
  status: 'PASSED' | 'FAILED' | 'SKIPPED'
  durationMs: number
  errorMessage?: string
}

export class JUnitParserService {
  private xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

  detectFormat(content: string): 'junit' | 'playwright' | 'unknown' {
    const trimmed = content.trim()
    if (trimmed.startsWith('<')) return 'junit'
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.suites) return 'playwright'
    } catch {
      // not JSON
    }
    return 'unknown'
  }

  parseJUnitXML(xml: string): ParsedTestResult[] {
    const parsed = this.xmlParser.parse(xml)
    const results: ParsedTestResult[] = []

    const suites = parsed.testsuites?.testsuite
    if (!suites) return results

    const suiteList = Array.isArray(suites) ? suites : [suites]
    for (const suite of suiteList) {
      const suiteName: string = suite['@_name'] ?? 'Unknown Suite'
      const cases = suite.testcase
      if (!cases) continue
      const caseList = Array.isArray(cases) ? cases : [cases]

      for (const tc of caseList) {
        const name: string = tc['@_name'] ?? 'Unknown Test'
        const durationMs = Math.round((Number(tc['@_time'] ?? 0)) * 1000)
        let status: ParsedTestResult['status'] = 'PASSED'
        let errorMessage: string | undefined

        if (tc.failure) {
          status = 'FAILED'
          errorMessage = typeof tc.failure === 'string'
            ? tc.failure
            : tc.failure['#text'] ?? tc.failure['@_message'] ?? 'Test failed'
        } else if (tc.skipped !== undefined) {
          status = 'SKIPPED'
        }

        results.push({ suiteName, name, status, durationMs, errorMessage })
      }
    }
    return results
  }

  parsePlaywrightJSON(json: any): ParsedTestResult[] {
    const results: ParsedTestResult[] = []
    const suites = json.suites ?? []

    for (const suite of suites) {
      const suiteName: string = suite.title ?? 'Unknown Suite'
      const specs = suite.specs ?? []

      for (const spec of specs) {
        const name: string = spec.title ?? 'Unknown Test'
        const testResult = spec.tests?.[0]?.results?.[0]
        if (!testResult) continue

        const status: ParsedTestResult['status'] =
          testResult.status === 'passed' ? 'PASSED'
          : testResult.status === 'skipped' ? 'SKIPPED'
          : 'FAILED'

        results.push({
          suiteName,
          name,
          status,
          durationMs: testResult.duration ?? 0,
          errorMessage: testResult.error?.message,
        })
      }
    }
    return results
  }

  parse(content: string): ParsedTestResult[] {
    const format = this.detectFormat(content)
    if (format === 'junit') return this.parseJUnitXML(content)
    if (format === 'playwright') return this.parsePlaywrightJSON(JSON.parse(content))
    throw new Error(`Unknown test result format`)
  }
}
