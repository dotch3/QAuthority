import { describe, it, expect, vi } from 'vitest'
import { CodeGeneratorService } from '../../src/services/CodeGeneratorService'

const mockPrisma = {
  testCase: {
    findUnique: vi.fn(),
  },
  generatedTestCode: {
    create: vi.fn(),
  },
}

global.fetch = vi.fn()

describe('CodeGeneratorService', () => {
  const service = new CodeGeneratorService(mockPrisma as any)

  it('throws if test case not found', async () => {
    mockPrisma.testCase.findUnique.mockResolvedValue(null)
    await expect(
      service.generate({
        testCaseId: 'tc-999',
        framework: 'PLAYWRIGHT',
        provider: { provider: 'ANTHROPIC', apiKey: 'key', model: 'claude-haiku-4-5-20251001' } as any
      })
    ).rejects.toThrow('Test case not found')
  })

  it('calls correct Anthropic endpoint and saves result', async () => {
    mockPrisma.testCase.findUnique.mockResolvedValue({
      id: 'tc-1',
      title: 'Login test',
      description: null,
      steps: [{ order: 1, description: 'Go to /login', expectedResult: 'Login page shown' }],
    })

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: 'const code = "generated playwright code"' }],
      }),
    })

    mockPrisma.generatedTestCode.create.mockResolvedValue({ id: 'gen-1' })

    const result = await service.generate({
      testCaseId: 'tc-1',
      framework: 'PLAYWRIGHT',
      provider: { provider: 'ANTHROPIC', apiKey: 'test-key', model: 'claude-haiku-4-5-20251001' } as any,
      createdById: 'user-1',
    })

    expect(result).toContain('generated playwright code')
    expect(mockPrisma.generatedTestCode.create).toHaveBeenCalled()
  })
})
