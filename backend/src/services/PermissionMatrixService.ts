import { PrismaClient, ModuleType } from '@prisma/client'

type PermAction = 'create' | 'read' | 'update' | 'delete' | 'export'

interface EffectivePermission {
  canCreate: boolean
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
  canExport: boolean
}

export class PermissionMatrixService {
  constructor(private prisma: PrismaClient) {}

  async getEffectivePermissions(userId: string, module: ModuleType): Promise<EffectivePermission> {
    const memberships = await this.prisma.userGroupMember.findMany({
      where: { userId },
    })

    if (memberships.length === 0) {
      return { canCreate: false, canRead: false, canUpdate: false, canDelete: false, canExport: false }
    }

    const groupIds = memberships.map(m => m.groupId)
    const perms = await this.prisma.modulePermission.findMany({
      where: { groupId: { in: groupIds }, module },
    })

    // Most permissive wins — OR across all groups
    return {
      canCreate: perms.some(p => p.canCreate),
      canRead: perms.some(p => p.canRead),
      canUpdate: perms.some(p => p.canUpdate),
      canDelete: perms.some(p => p.canDelete),
      canExport: perms.some(p => p.canExport),
    }
  }

  async can(userId: string, module: ModuleType, action: PermAction): Promise<boolean> {
    const perms = await this.getEffectivePermissions(userId, module)
    const key = `can${action.charAt(0).toUpperCase()}${action.slice(1)}` as keyof EffectivePermission
    return perms[key]
  }

  async getFullMatrix(userId: string): Promise<Record<string, EffectivePermission>> {
    const modules = Object.values(ModuleType)
    const matrix: Record<string, EffectivePermission> = {}
    await Promise.all(
      modules.map(async mod => {
        matrix[mod] = await this.getEffectivePermissions(userId, mod)
      })
    )
    return matrix
  }
}
