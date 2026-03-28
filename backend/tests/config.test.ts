import { describe, it, expect } from 'vitest'
import { config } from '../src/config'

describe('config', () => {
  it('provides default values', () => {
    expect(config.LOG_LEVEL).toBe('info')
    expect(config.STORAGE_PROVIDER).toBe('local')
    expect(config.AUTH_MODE).toBe('local')
  })

  it('has DATABASE_URL defined in test environment', () => {
    expect(config.DATABASE_URL).toBeTruthy()
  })
})
