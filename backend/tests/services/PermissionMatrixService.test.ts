import { describe, it, expect, vi } from 'vitest'
import { PermissionMatrixService } from '../../src/services/PermissionMatrixService'

const mockPrisma = {
  userGroupMember: {
    findMany: vi.fn(),
  },
  modulePermission: {
    findMany: vi.fn(),
  },
}

describe('PermissionMatrixService', () => {
  const service = new PermissionMatrixService(mockPrisma as any)

  it('returns false for all actions if user has no groups', async () => {
    mockPrisma.userGroupMember.findMany.mockResolvedValue([])
    mockPrisma.modulePermission.findMany.mockResolvedValue([])
    const result = await service.getEffectivePermissions('user1', 'TEST_PLANS')
    expect(result.canRead).toBe(false)
    expect(result.canCreate).toBe(false)
  })

  it('merges permissions across groups (most permissive wins)', async () => {
    mockPrisma.userGroupMember.findMany.mockResolvedValue([
      { groupId: 'g1' }, { groupId: 'g2' }
    ])
    mockPrisma.modulePermission.findMany.mockResolvedValue([
      { groupId: 'g1', module: 'TEST_PLANS', canRead: true, canCreate: false, canUpdate: false, canDelete: false, canExport: false },
      { groupId: 'g2', module: 'TEST_PLANS', canRead: true, canCreate: true, canUpdate: false, canDelete: false, canExport: false },
    ])
    const result = await service.getEffectivePermissions('user1', 'TEST_PLANS')
    expect(result.canCreate).toBe(true)
    expect(result.canRead).toBe(true)
    expect(result.canUpdate).toBe(false)
  })

  it('can checks work correctly', async () => {
    mockPrisma.userGroupMember.findMany.mockResolvedValue([{ groupId: 'g1' }])
    mockPrisma.modulePermission.findMany.mockResolvedValue([
      { groupId: 'g1', module: 'BUGS', canRead: true, canCreate: true, canUpdate: false, canDelete: false, canExport: false },
    ])
    expect(await service.can('user1', 'BUGS', 'create')).toBe(true)
    expect(await service.can('user1', 'BUGS', 'delete')).toBe(false)
  })
})
