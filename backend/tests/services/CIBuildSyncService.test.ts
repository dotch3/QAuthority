import { describe, it, expect, vi } from 'vitest'
import { CIBuildSyncService } from '../../src/services/CIBuildSyncService'

const mockPrisma = {
  cIBuild: { create: vi.fn(), update: vi.fn() },
  testCase: { findFirst: vi.fn() },
  testExecution: { create: vi.fn() },
  executionStepResult: { create: vi.fn() },
}

describe('CIBuildSyncService', () => {
  const service = new CIBuildSyncService(mockPrisma as any)

  it('creates a CIBuild record from a webhook payload', async () => {
    mockPrisma.cIBuild.create.mockResolvedValue({ id: 'build-1' })
    await service.receiveBuildEvent({
      integrationId: 'int-1',
      projectId: 'proj-1',
      buildNumber: '42',
      branch: 'main',
      status: 'SUCCESS',
      triggeredAt: new Date().toISOString(),
    })
    expect(mockPrisma.cIBuild.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ buildNumber: '42', status: 'SUCCESS' }),
      })
    )
  })
})
