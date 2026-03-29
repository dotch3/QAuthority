import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OKRService } from '../../src/services/OKRService'

const mockPrisma = {
  oKR: {
    findMany: vi.fn(), findUnique: vi.fn(),
    create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  },
  keyResult: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}

describe('OKRService', () => {
  const service = new OKRService(mockPrisma as any)

  beforeEach(() => { vi.clearAllMocks() })

  it('adoptOrgOKR creates a project-scoped copy with parentOkrId set', async () => {
    mockPrisma.oKR.findUnique.mockResolvedValue({
      id: 'org-okr-1', scope: 'ORGANIZATION', title: 'Reduce bugs 90%',
      quarter: 1, year: 2026, status: 'ON_TRACK', description: null,
      keyResults: [],
    })
    mockPrisma.oKR.create.mockResolvedValue({ id: 'proj-okr-1' })

    await service.adoptOrgOKR('org-okr-1', 'proj-1', 'user-1')

    expect(mockPrisma.oKR.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scope: 'PROJECT',
          projectId: 'proj-1',
          parentOkrId: 'org-okr-1',
          isAdopted: true,
        }),
      })
    )
  })

  it('throws when adopting a non-org OKR', async () => {
    mockPrisma.oKR.findUnique.mockResolvedValue({
      id: 'proj-okr-1', scope: 'PROJECT', keyResults: [],
    })
    await expect(service.adoptOrgOKR('proj-okr-1', 'proj-2', 'user-1'))
      .rejects.toThrow('Can only adopt organization-level OKRs')
  })
})
