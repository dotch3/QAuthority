import { PermissionMatrixService } from '../../services/PermissionMatrixService.js'
import { ModuleType } from '@prisma/client'
import { prisma } from '../database/prisma.js'

type PermAction = 'create' | 'read' | 'update' | 'delete' | 'export'

export function requirePermission(module: ModuleType, action: PermAction) {
  return async (req: any, reply: any) => {
    const userId = req.user?.id
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const service = new PermissionMatrixService(prisma)
    const allowed = await service.can(userId, module, action)
    if (!allowed) return reply.code(403).send({ error: 'Forbidden: insufficient permissions' })
  }
}
