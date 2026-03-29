import { describe, it, expect, vi } from 'vitest'
import { DORACalculatorService } from '../../src/services/DORACalculatorService'

const mockPrisma = {
  ciCDBuild: { findMany: vi.fn() },
}

describe('DORACalculatorService', () => {
  const service = new DORACalculatorService(mockPrisma as any)

  it('calculates deploy frequency as deploys per week', async () => {
    mockPrisma.ciCDBuild.findMany.mockResolvedValue([
      { completedAt: new Date('2026-01-01'), status: 'SUCCESS' },
      { completedAt: new Date('2026-01-03'), status: 'SUCCESS' },
      { completedAt: new Date('2026-01-07'), status: 'SUCCESS' },
      { completedAt: new Date('2026-01-08'), status: 'SUCCESS' },
    ])
    const result = await service.calculateDeployFrequency('proj1', 14)
    expect(result).toBeGreaterThan(0)
  })

  it('calculates change failure rate as failed/total deploys', async () => {
    mockPrisma.ciCDBuild.findMany.mockResolvedValue([
      { status: 'SUCCESS' },
      { status: 'SUCCESS' },
      { status: 'FAILED' },
      { status: 'FAILED' },
    ])
    const result = await service.calculateChangeFailureRate('proj1', 30)
    expect(result).toBe(50)
  })
})
