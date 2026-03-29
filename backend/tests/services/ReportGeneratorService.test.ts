import { describe, it, expect, vi } from 'vitest'
import { ReportGeneratorService } from '../../src/services/ReportGeneratorService'

const mockPrisma = {
  testExecution: { findMany: vi.fn() },
  testCase: { count: vi.fn() },
  defect: { findMany: vi.fn() },
  metricSnapshot: { findMany: vi.fn() },
}

describe('ReportGeneratorService', () => {
  const service = new ReportGeneratorService(mockPrisma as any, '/tmp/test-reports')

  it('buildFilePath creates correct path', () => {
    const p = service.buildFilePath('job123', 'PDF')
    expect(p).toContain('job123')
    expect(p).toContain('.pdf')
  })

  it('buildFilePath handles different formats', () => {
    expect(service.buildFilePath('test', 'EXCEL')).toContain('.xlsx')
    expect(service.buildFilePath('test', 'DOCX')).toContain('.docx')
  })
})
