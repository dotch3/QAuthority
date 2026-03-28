// Mirrors prisma/seed/groups.ts but lives inside src/ to satisfy TypeScript's rootDir constraint.
import { PrismaClient, ModuleType } from '@prisma/client'

const ALL_MODULES = Object.values(ModuleType)

const FULL_CRUD = { canCreate: true, canRead: true, canUpdate: true, canDelete: true, canExport: true }
const READ_EXPORT = { canCreate: false, canRead: true, canUpdate: false, canDelete: false, canExport: true }
const CRUD_NO_DELETE = { canCreate: true, canRead: true, canUpdate: true, canDelete: false, canExport: true }
const READ_ONLY = { canCreate: false, canRead: true, canUpdate: false, canDelete: false, canExport: false }
const NO_ACCESS = { canCreate: false, canRead: false, canUpdate: false, canDelete: false, canExport: false }

export async function seedGroups(prisma: PrismaClient) {
  const groups = [
    {
      name: 'System Admin',
      description: 'Full access to all modules including system administration',
      isSystem: true,
      permissions: ALL_MODULES.map(module => ({ module, ...FULL_CRUD })),
    },
    {
      name: 'QA Manager',
      description: 'Full access to all QA modules except system admin settings',
      isSystem: true,
      permissions: ALL_MODULES.map(module =>
        module === 'ADMIN' ? { module, ...NO_ACCESS } : { module, ...FULL_CRUD }
      ),
    },
    {
      name: 'QA Lead',
      description: 'CRUD on test management and governance read access',
      isSystem: true,
      permissions: ALL_MODULES.map(module => {
        if (['ADMIN', 'USERS_GROUPS'].includes(module)) return { module, ...NO_ACCESS }
        if (module === 'QA_GOVERNANCE') return { module, ...READ_EXPORT }
        if (module === 'REPORTING') return { module, ...READ_EXPORT }
        return { module, ...CRUD_NO_DELETE }
      }),
    },
    {
      name: 'QA Engineer',
      description: 'CRUD on test cases, executions, and bugs. Read-only on plans and suites',
      isSystem: true,
      permissions: ALL_MODULES.map(module => {
        if (['ADMIN', 'USERS_GROUPS', 'QA_GOVERNANCE', 'AI_CODEGEN', 'INTEGRATIONS'].includes(module))
          return { module, ...NO_ACCESS }
        if (['TEST_PLANS', 'TEST_SUITES'].includes(module)) return { module, ...READ_ONLY }
        return { module, ...CRUD_NO_DELETE }
      }),
    },
    {
      name: 'Automation Engineer',
      description: 'CRUD on test cases, AI code generation, and integration read access',
      isSystem: true,
      permissions: ALL_MODULES.map(module => {
        if (['ADMIN', 'USERS_GROUPS', 'QA_GOVERNANCE'].includes(module)) return { module, ...NO_ACCESS }
        if (['AI_CODEGEN', 'TEST_CASES', 'EXECUTIONS'].includes(module)) return { module, ...FULL_CRUD }
        if (module === 'INTEGRATIONS') return { module, ...READ_ONLY }
        return { module, ...READ_ONLY }
      }),
    },
    {
      name: 'Analyst',
      description: 'Read and export access across all modules',
      isSystem: true,
      permissions: ALL_MODULES.map(module =>
        ['ADMIN', 'USERS_GROUPS'].includes(module)
          ? { module, ...NO_ACCESS }
          : { module, ...READ_EXPORT }
      ),
    },
    {
      name: 'Stakeholder',
      description: 'Read-only access to governance and reports',
      isSystem: true,
      permissions: ALL_MODULES.map(module =>
        ['QA_GOVERNANCE', 'REPORTING'].includes(module)
          ? { module, ...READ_ONLY }
          : { module, ...NO_ACCESS }
      ),
    },
  ]

  for (const group of groups) {
    const { permissions, ...groupData } = group

    let created = await prisma.userGroup.findFirst({
      where: { name: groupData.name, projectId: null },
    })
    if (!created) {
      created = await prisma.userGroup.create({ data: groupData })
    }

    for (const perm of permissions) {
      await prisma.modulePermission.upsert({
        where: { groupId_module: { groupId: created.id, module: perm.module } },
        update: perm,
        create: { groupId: created.id, ...perm },
      })
    }
  }

  console.log('✓ Default groups seeded')
}
