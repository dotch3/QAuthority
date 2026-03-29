import { describe, it, expect } from 'vitest'
import { PBCCalculatorService } from '../../src/services/PBCCalculatorService'

describe('PBCCalculatorService', () => {
  const service = new PBCCalculatorService()

  it('computes central line as mean of values', () => {
    const result = service.computeXmR([
      { date: '2026-01-01', value: 4 },
      { date: '2026-01-08', value: 6 },
      { date: '2026-01-15', value: 5 },
    ])
    expect(result.centralLine).toBeCloseTo(5, 1)
  })

  it('computes UNPL and LNPL using 2.66 * mR-bar', () => {
    const values = [4, 6, 4, 6, 4, 6, 4, 6].map((v, i) => ({
      date: `2026-01-0${i + 1}`,
      value: v,
    }))
    const result = service.computeXmR(values)
    expect(result.upperLimit).toBeCloseTo(10.32, 1)
    expect(result.lowerLimit).toBeCloseTo(-0.32, 1)
  })

  it('detects OUTSIDE_LIMIT signal', () => {
    // 7 stable points then a massive spike — mean ~21, mRBar ~12.9, UNPL ~55 → 100 clearly outside
    const values = [10, 10, 10, 10, 10, 10, 10, 100].map((v, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      value: v,
    }))
    const result = service.computeXmR(values)
    const signals = service.detectSignals(values, result)
    expect(signals.some(s => s.type === 'OUTSIDE_LIMIT')).toBe(true)
  })

  it('detects RUN signal (8 points same side)', () => {
    const values = [5, 6, 6, 6, 6, 6, 6, 6, 6, 4].map((v, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      value: v,
    }))
    const result = service.computeXmR(values)
    const signals = service.detectSignals(values, result)
    expect(signals.some(s => s.type === 'RUN')).toBe(true)
  })
})
