import { PrismaClient, ModuleType } from '@prisma/client'

interface CreateGroupInput {
  name: string
  description: string | null
  projectId?: string
}

interface SetPermissionsInput {
  module: ModuleType
  canCreate: boolean
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
  canExport: boolean
}

export class GroupService {
  constructor(private prisma: PrismaClient) {}

  async listGroups(projectId?: string) {
    return this.prisma.userGroup.findMany({
      where: projectId ? { projectId } : {},
      include: {
        permissions: true,
        members: { include: { user: true } },
      },
    })
  }

  async getGroup(id: string) {
    const group = await this.prisma.userGroup.findUnique({
      where: { id },
      include: {
        permissions: true,
        members: { include: { user: true } },
      },
    })
    if (!group) throw new Error('Group not found')
    return group
  }

  async createGroup(input: CreateGroupInput) {
    const existing = await this.prisma.userGroup.findUnique({ where: { name: input.name } })
    if (existing) throw new Error('Group name already exists')
    return this.prisma.userGroup.create({ data: input })
  }

  async updateGroup(id: string, input: Partial<CreateGroupInput>) {
    await this.getGroup(id)
    return this.prisma.userGroup.update({ where: { id }, data: input })
  }

  async deleteGroup(id: string) {
    const group = await this.prisma.userGroup.findUnique({ where: { id } })
    if (!group) throw new Error('Group not found')
    if (group.isSystem) throw new Error('Cannot delete a system group')
    return this.prisma.userGroup.delete({ where: { id } })
  }

  async addMember(groupId: string, userId: string) {
    const existing = await this.prisma.userGroupMember.findMany({
      where: { groupId, userId },
    })
    if (existing.length > 0) throw new Error('User is already a member')
    return this.prisma.userGroupMember.create({ data: { groupId, userId } })
  }

  async removeMember(groupId: string, userId: string) {
    return this.prisma.userGroupMember.delete({
      where: { userId_groupId: { userId, groupId } },
    })
  }

  async setPermissions(groupId: string, permissions: SetPermissionsInput[]) {
    await this.getGroup(groupId)
    await this.prisma.modulePermission.deleteMany({ where: { groupId } })
    return Promise.all(
      permissions.map(p =>
        this.prisma.modulePermission.create({
          data: { groupId, ...p },
        })
      )
    )
  }
}
