import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GroupService } from '../../src/services/GroupService'

const mockPrisma = {
  userGroup: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  userGroupMember: {
    create: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  },
  modulePermission: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
}

describe('GroupService', () => {
  let service: GroupService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new GroupService(mockPrisma as any)
  })

  it('listGroups returns all groups with permissions', async () => {
    mockPrisma.userGroup.findMany.mockResolvedValue([
      { id: '1', name: 'QA Manager', permissions: [], members: [] },
    ])
    const result = await service.listGroups()
    expect(result).toHaveLength(1)
    expect(mockPrisma.userGroup.findMany).toHaveBeenCalledWith({
      where: {},
      include: { permissions: true, members: { include: { user: true } } },
    })
  })

  it('createGroup rejects duplicate name', async () => {
    mockPrisma.userGroup.findFirst.mockResolvedValue({ id: '1', name: 'Existing' })
    await expect(service.createGroup({ name: 'Existing', description: null }))
      .rejects.toThrow('Group name already exists')
  })

  it('addMember throws if already member', async () => {
    mockPrisma.userGroupMember.findUnique.mockResolvedValue({ userId: 'u1', groupId: 'g1' })
    await expect(service.addMember('g1', 'u1')).rejects.toThrow('User is already a member')
  })

  it('deleteGroup throws if isSystem=true', async () => {
    mockPrisma.userGroup.findUnique.mockResolvedValue({ id: '1', isSystem: true })
    await expect(service.deleteGroup('1')).rejects.toThrow('Cannot delete a system group')
  })

  it('setPermissions upserts all provided permissions', async () => {
    mockPrisma.userGroup.findUnique.mockResolvedValue({ id: 'g1', isSystem: false, permissions: [], members: [] })
    mockPrisma.modulePermission.upsert.mockResolvedValue({})

    const permissions = [
      { module: 'TEST_PLANS' as any, canCreate: true, canRead: true, canUpdate: true, canDelete: false, canExport: false },
    ]
    await service.setPermissions('g1', permissions)

    expect(mockPrisma.modulePermission.upsert).toHaveBeenCalledTimes(1)
    expect(mockPrisma.modulePermission.upsert).toHaveBeenCalledWith({
      where: { groupId_module: { groupId: 'g1', module: 'TEST_PLANS' } },
      update: { canCreate: true, canRead: true, canUpdate: true, canDelete: false, canExport: false },
      create: { groupId: 'g1', module: 'TEST_PLANS', canCreate: true, canRead: true, canUpdate: true, canDelete: false, canExport: false },
    })
  })
})
