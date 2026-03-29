import { describe, it, expect } from 'vitest'
import { JUnitParserService } from '../../src/services/JUnitParserService'

const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="LoginSuite" tests="3" failures="1" errors="0" time="1.5">
    <testcase name="should login with valid credentials" time="0.5"/>
    <testcase name="should reject invalid password" time="0.3">
      <failure message="Expected 401">AssertionError: expected 200 to equal 401</failure>
    </testcase>
    <testcase name="should redirect after login" time="0.7"/>
  </testsuite>
</testsuites>`

const samplePlaywrightJSON = {
  suites: [{
    title: 'LoginSuite',
    specs: [
      { title: 'login works', ok: true, tests: [{ results: [{ status: 'passed', duration: 500 }] }] },
      { title: 'rejects bad password', ok: false, tests: [{ results: [{ status: 'failed', duration: 300, error: { message: 'Expected 401' } }] }] },
    ],
  }],
}

describe('JUnitParserService', () => {
  const service = new JUnitParserService()

  it('parses JUnit XML into test results', () => {
    const results = service.parseJUnitXML(sampleXML)
    expect(results).toHaveLength(3)
    expect(results[0].name).toBe('should login with valid credentials')
    expect(results[0].status).toBe('PASSED')
    expect(results[1].status).toBe('FAILED')
    expect(results[1].errorMessage).toContain('AssertionError')
  })

  it('parses Playwright JSON into test results', () => {
    const results = service.parsePlaywrightJSON(samplePlaywrightJSON)
    expect(results).toHaveLength(2)
    expect(results[0].status).toBe('PASSED')
    expect(results[1].status).toBe('FAILED')
    expect(results[1].errorMessage).toBe('Expected 401')
  })

  it('detects format from content', () => {
    expect(service.detectFormat(sampleXML)).toBe('junit')
    expect(service.detectFormat(JSON.stringify(samplePlaywrightJSON))).toBe('playwright')
  })
})
