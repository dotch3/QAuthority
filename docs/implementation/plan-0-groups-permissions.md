# Plan 0: Groups & Permissions + Setup Wizard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat Role/Permission model with a group-based permissions system and add a first-run Setup Wizard.

**Architecture:** Add `UserGroup`, `UserGroupMember`, and `ModulePermission` tables as the user-facing permission layer. Existing `Role`/`Permission` tables remain for API enforcement — groups map to roles under the hood. A `SetupWizardService` handles guided first-run configuration.

**Tech Stack:** Prisma 6 (migration), Fastify 5 routes, Vitest 2, Next.js 16 + shadcn/ui

---

## ⚠️ Path & URL Convention — Read This First

All new pages live under `frontend/src/app/[locale]/(app)/`. The `[locale]` in the file path is **NOT visible in URLs** — the middleware uses `localePrefix: 'never'`, so `/admin/groups` is the actual URL (not `/en/admin/groups`). Do NOT change `frontend/src/middleware.ts`.

**Exception — Setup Wizard** (no auth): `frontend/src/app/[locale]/setup/page.tsx` → URL: `/setup`

Always use `Link` from `next-intl` (not `next/link`) with clean hrefs like `href="/admin/groups"`.

---

## File Map

### Backend — New Files
- `backend/prisma/migrations/XXXXXX_add_groups_permissions/migration.sql`
- `backend/src/services/GroupService.ts`
- `backend/src/services/PermissionMatrixService.ts`
- `backend/src/services/SetupWizardService.ts`
- `backend/src/interfaces/http/routes/groups.ts`
- `backend/src/interfaces/http/routes/permissionMatrix.ts`
- `backend/src/interfaces/http/routes/setupWizard.ts`
- `backend/prisma/seed/groups.ts`
- `backend/tests/services/GroupService.test.ts`
- `backend/tests/services/PermissionMatrixService.test.ts`

### Backend — Modified Files
- `backend/prisma/schema.prisma` — add UserGroup, UserGroupMember, ModulePermission models
- `backend/src/infrastructure/auth/authMiddleware.ts` — add module permission check
- `backend/src/interfaces/http/routes/index.ts` — register new routes
- `backend/prisma/seed.ts` — call groups seed

### Frontend — New Files
- `frontend/src/app/[locale]/(app)/admin/groups/page.tsx`
- `frontend/src/app/[locale]/(app)/admin/groups/[id]/page.tsx`
- `frontend/src/app/setup/page.tsx`
- `frontend/src/components/admin/groups/GroupList.tsx`
- `frontend/src/components/admin/groups/GroupForm.tsx`
- `frontend/src/components/admin/groups/PermissionsMatrix.tsx`
- `frontend/src/components/setup/SetupWizard.tsx`

### Frontend — Modified Files
- `frontend/src/app/[locale]/(app)/admin/layout.tsx` — add Groups nav item
- `frontend/src/lib/api.ts` — add group/permission API calls

---

## Task 1: Prisma Schema — Add Groups & Permissions Models

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add models to schema**

Append to `backend/prisma/schema.prisma`:

```prisma
enum ModuleType {
  TEST_PLANS
  TEST_SUITES
  TEST_CASES
  EXECUTIONS
  BUGS
  ET_CHARTERS
  HEURISTICS
  QA_GOVERNANCE
  REPORTING
  PROCESS_DESIGNER
  AI_CODEGEN
  INTEGRATIONS
  USERS_GROUPS
  ADMIN
}

model UserGroup {
  id          String             @id @default(uuid())
  name        String             @unique
  description String?
  isSystem    Boolean            @default(false)
  projectId   String?
  project     Project?           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  members     UserGroupMember[]
  permissions ModulePermission[]
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
}

model UserGroupMember {
  userId    String
  groupId   String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  group     UserGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  createdAt DateTime  @default(now())

  @@id([userId, groupId])
}

model ModulePermission {
  id        String     @id @default(uuid())
  groupId   String
  group     UserGroup  @relation(fields: [groupId], references: [id], onDelete: Cascade)
  module    ModuleType
  canCreate Boolean    @default(false)
  canRead   Boolean    @default(true)
  canUpdate Boolean    @default(false)
  canDelete Boolean    @default(false)
  canExport Boolean    @default(false)

  @@unique([groupId, module])
}
```

Also add to `User` model:
```prisma
  groupMemberships UserGroupMember[]
```

Also add to `Project` model:
```prisma
  userGroups UserGroup[]
```

- [ ] **Step 2: Generate migration**

```bash
cd backend
npx prisma migrate dev --name add_groups_permissions
```

Expected: migration file created under `prisma/migrations/`, no errors.

- [ ] **Step 3: Verify migration runs clean**

```bash
npx prisma migrate status
```

Expected: `All migrations have been applied`

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add UserGroup, UserGroupMember, ModulePermission models"
```

---

## Task 2: Seed Default Groups

**Files:**
- Create: `backend/prisma/seed/groups.ts`
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Create groups seed file**

Create `backend/prisma/seed/groups.ts`:

```typescript
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
    const created = await prisma.userGroup.upsert({
      where: { name: groupData.name },
      update: {},
      create: groupData,
    })

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
```

- [ ] **Step 2: Call seed from main seed file**

In `backend/prisma/seed.ts`, add:

```typescript
import { seedGroups } from './seed/groups'

// inside main():
await seedGroups(prisma)
```

- [ ] **Step 3: Run seed**

```bash
cd backend
npx prisma db seed
```

Expected: `✓ Default groups seeded`

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/seed/groups.ts backend/prisma/seed.ts
git commit -m "feat(seed): add default QA groups with module permissions"
```

---

## Task 3: GroupService

**Files:**
- Create: `backend/src/services/GroupService.ts`
- Create: `backend/tests/services/GroupService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/services/GroupService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GroupService } from '../../src/services/GroupService'

const mockPrisma = {
  userGroup: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  userGroupMember: {
    create: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
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
      include: { permissions: true, members: { include: { user: true } } },
    })
  })

  it('createGroup rejects duplicate name', async () => {
    mockPrisma.userGroup.findUnique.mockResolvedValue({ id: '1', name: 'Existing' })
    await expect(service.createGroup({ name: 'Existing', description: null }))
      .rejects.toThrow('Group name already exists')
  })

  it('addMember throws if already member', async () => {
    mockPrisma.userGroupMember.findMany.mockResolvedValue([{ userId: 'u1', groupId: 'g1' }])
    await expect(service.addMember('g1', 'u1')).rejects.toThrow('User is already a member')
  })

  it('deleteGroup throws if isSystem=true', async () => {
    mockPrisma.userGroup.findUnique.mockResolvedValue({ id: '1', isSystem: true })
    await expect(service.deleteGroup('1')).rejects.toThrow('Cannot delete a system group')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
npx vitest run tests/services/GroupService.test.ts
```

Expected: FAIL — `GroupService` not found.

- [ ] **Step 3: Implement GroupService**

Create `backend/src/services/GroupService.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/services/GroupService.test.ts
```

Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/GroupService.ts backend/tests/services/GroupService.test.ts
git commit -m "feat(service): add GroupService with CRUD and member management"
```

---

## Task 4: PermissionMatrixService

**Files:**
- Create: `backend/src/services/PermissionMatrixService.ts`
- Create: `backend/tests/services/PermissionMatrixService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/services/PermissionMatrixService.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run tests/services/PermissionMatrixService.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement PermissionMatrixService**

Create `backend/src/services/PermissionMatrixService.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/services/PermissionMatrixService.test.ts
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/PermissionMatrixService.ts backend/tests/services/PermissionMatrixService.test.ts
git commit -m "feat(service): add PermissionMatrixService with cross-group merge logic"
```

---

## Task 5: Groups & Permissions Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/groups.ts`
- Modify: `backend/src/interfaces/http/routes/index.ts`

- [ ] **Step 1: Create groups router**

Create `backend/src/interfaces/http/routes/groups.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { GroupService } from '../../../services/GroupService'
import { PrismaClient } from '@prisma/client'

export async function groupsRoutes(app: FastifyInstance) {
  const prisma: PrismaClient = app.prisma
  const groupService = new GroupService(prisma)

  // GET /groups
  app.get('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const groups = await groupService.listGroups()
    return reply.send(groups)
  })

  // GET /groups/:id
  app.get('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const group = await groupService.getGroup(id)
    return reply.send(group)
  })

  // POST /groups
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    const body = req.body as { name: string; description?: string; projectId?: string }
    const group = await groupService.createGroup(body)
    return reply.code(201).send(group)
  })

  // PUT /groups/:id
  app.put('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as { name?: string; description?: string }
    const group = await groupService.updateGroup(id, body)
    return reply.send(group)
  })

  // DELETE /groups/:id
  app.delete('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await groupService.deleteGroup(id)
    return reply.code(204).send()
  })

  // POST /groups/:id/members
  app.post('/:id/members', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId } = req.body as { userId: string }
    await groupService.addMember(id, userId)
    return reply.code(201).send({ ok: true })
  })

  // DELETE /groups/:id/members/:userId
  app.delete('/:id/members/:userId', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id, userId } = req.params as { id: string; userId: string }
    await groupService.removeMember(id, userId)
    return reply.code(204).send()
  })

  // PUT /groups/:id/permissions
  app.put('/:id/permissions', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { permissions } = req.body as { permissions: any[] }
    await groupService.setPermissions(id, permissions)
    return reply.send({ ok: true })
  })
}
```

- [ ] **Step 2: Register route in index**

In `backend/src/interfaces/http/routes/index.ts`, add:

```typescript
import { groupsRoutes } from './groups'

// inside registerRoutes():
app.register(groupsRoutes, { prefix: '/groups' })
```

- [ ] **Step 3: Test route manually**

```bash
cd backend && npm run dev
curl -X GET http://localhost:3001/groups \
  -H "Authorization: Bearer <token>"
```

Expected: JSON array of groups.

- [ ] **Step 4: Commit**

```bash
git add backend/src/interfaces/http/routes/groups.ts backend/src/interfaces/http/routes/index.ts
git commit -m "feat(routes): add /groups CRUD and member/permission management endpoints"
```

---

## Task 6: SetupWizardService + Route

**Files:**
- Create: `backend/src/services/SetupWizardService.ts`
- Create: `backend/src/interfaces/http/routes/setupWizard.ts`

- [ ] **Step 1: Implement SetupWizardService**

Create `backend/src/services/SetupWizardService.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import { seedGroups } from '../../infrastructure/seed/groups'
import bcrypt from 'bcrypt'

interface SetupInput {
  orgName: string
  adminEmail: string
  adminPassword: string
  adminName: string
  language: string
  locale: string
}

export class SetupWizardService {
  constructor(private prisma: PrismaClient) {}

  async isSetupComplete(): Promise<boolean> {
    const adminCount = await this.prisma.user.count({
      where: { role: { name: 'admin' } },
    })
    return adminCount > 0
  }

  async checkSystemHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { database: 'ok', migrations: 'ok' }
    } catch {
      return { database: 'error', migrations: 'unknown' }
    }
  }

  async runSetup(input: SetupInput) {
    if (await this.isSetupComplete()) {
      throw new Error('Setup has already been completed')
    }

    // 1. Get or create admin role
    let adminRole = await this.prisma.role.findFirst({ where: { name: 'admin' } })
    if (!adminRole) {
      adminRole = await this.prisma.role.create({ data: { name: 'admin', description: 'System administrator' } })
    }

    // 2. Create admin user
    const passwordHash = await bcrypt.hash(input.adminPassword, 12)
    const adminUser = await this.prisma.user.create({
      data: {
        email: input.adminEmail,
        name: input.adminName,
        passwordHash,
        roleId: adminRole.id,
        isActive: true,
      },
    })

    // 3. Seed default groups
    await seedGroups(this.prisma)

    // 4. Add admin to System Admin group
    const systemAdminGroup = await this.prisma.userGroup.findFirst({
      where: { name: 'System Admin' },
    })
    if (systemAdminGroup) {
      await this.prisma.userGroupMember.create({
        data: { userId: adminUser.id, groupId: systemAdminGroup.id },
      })
    }

    return { ok: true, adminUserId: adminUser.id }
  }
}
```

- [ ] **Step 2: Create setup wizard route**

Create `backend/src/interfaces/http/routes/setupWizard.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { SetupWizardService } from '../../../services/SetupWizardService'

export async function setupWizardRoutes(app: FastifyInstance) {
  const service = new SetupWizardService(app.prisma)

  // GET /setup/status
  app.get('/status', async (_req, reply) => {
    const complete = await service.isSetupComplete()
    const health = await service.checkSystemHealth()
    return reply.send({ complete, health })
  })

  // POST /setup/run
  app.post('/run', async (req, reply) => {
    const body = req.body as {
      orgName: string
      adminEmail: string
      adminPassword: string
      adminName: string
      language: string
      locale: string
    }
    const result = await service.runSetup(body)
    return reply.code(201).send(result)
  })
}
```

- [ ] **Step 3: Register route**

In `backend/src/interfaces/http/routes/index.ts`:

```typescript
import { setupWizardRoutes } from './setupWizard'

app.register(setupWizardRoutes, { prefix: '/setup' })
```

- [ ] **Step 4: Test setup status endpoint**

```bash
curl http://localhost:3001/setup/status
```

Expected: `{"complete": false, "health": {"database": "ok", "migrations": "ok"}}`

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/SetupWizardService.ts backend/src/interfaces/http/routes/setupWizard.ts
git commit -m "feat(service): add SetupWizardService and /setup routes for first-run configuration"
```

---

## Task 7: Frontend — Groups Admin Page

**Files:**
- Create: `frontend/src/components/admin/groups/GroupList.tsx`
- Create: `frontend/src/components/admin/groups/GroupForm.tsx`
- Create: `frontend/src/components/admin/groups/PermissionsMatrix.tsx`
- Create: `frontend/src/app/[locale]/(app)/admin/groups/page.tsx`
- Create: `frontend/src/app/[locale]/(app)/admin/groups/[id]/page.tsx`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add API methods**

In `frontend/src/lib/api.ts`, add:

```typescript
// Groups API
export const groupsApi = {
  list: () => api.get('/groups'),
  get: (id: string) => api.get(`/groups/${id}`),
  create: (data: { name: string; description?: string }) => api.post('/groups', data),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.put(`/groups/${id}`, data),
  delete: (id: string) => api.delete(`/groups/${id}`),
  addMember: (groupId: string, userId: string) =>
    api.post(`/groups/${groupId}/members`, { userId }),
  removeMember: (groupId: string, userId: string) =>
    api.delete(`/groups/${groupId}/members/${userId}`),
  setPermissions: (groupId: string, permissions: any[]) =>
    api.put(`/groups/${groupId}/permissions`, { permissions }),
}
```

- [ ] **Step 2: Create PermissionsMatrix component**

Create `frontend/src/components/admin/groups/PermissionsMatrix.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

const MODULES = [
  { key: 'TEST_PLANS', label: 'Test Plans' },
  { key: 'TEST_SUITES', label: 'Test Suites' },
  { key: 'TEST_CASES', label: 'Test Cases' },
  { key: 'EXECUTIONS', label: 'Executions' },
  { key: 'BUGS', label: 'Bugs' },
  { key: 'ET_CHARTERS', label: 'ET Charters' },
  { key: 'HEURISTICS', label: 'Heuristics' },
  { key: 'QA_GOVERNANCE', label: 'QA Governance' },
  { key: 'REPORTING', label: 'Reporting' },
  { key: 'PROCESS_DESIGNER', label: 'Process Designer' },
  { key: 'AI_CODEGEN', label: 'AI Code Gen' },
  { key: 'INTEGRATIONS', label: 'Integrations' },
  { key: 'USERS_GROUPS', label: 'Users & Groups' },
  { key: 'ADMIN', label: 'Admin' },
]

const ACTIONS = ['canRead', 'canCreate', 'canUpdate', 'canDelete', 'canExport'] as const

interface Props {
  permissions: Record<string, Record<string, boolean>>
  onChange: (permissions: any[]) => void
  disabled?: boolean
}

export function PermissionsMatrix({ permissions, onChange, disabled }: Props) {
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(() => {
    const initial: Record<string, Record<string, boolean>> = {}
    for (const mod of MODULES) {
      initial[mod.key] = {
        canRead: false, canCreate: false, canUpdate: false, canDelete: false, canExport: false,
        ...permissions[mod.key],
      }
    }
    return initial
  })

  const toggle = (module: string, action: string) => {
    const updated = {
      ...matrix,
      [module]: { ...matrix[module], [action]: !matrix[module][action] },
    }
    setMatrix(updated)
    const flat = MODULES.map(m => ({ module: m.key, ...updated[m.key] }))
    onChange(flat)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 w-40">Module</th>
            {ACTIONS.map(a => (
              <th key={a} className="text-center p-2 w-20">
                {a.replace('can', '')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map(mod => (
            <tr key={mod.key} className="border-b hover:bg-muted/30">
              <td className="p-2 font-medium">{mod.label}</td>
              {ACTIONS.map(action => (
                <td key={action} className="p-2 text-center">
                  <Checkbox
                    checked={matrix[mod.key]?.[action] ?? false}
                    onCheckedChange={() => toggle(mod.key, action)}
                    disabled={disabled}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Create Groups list page**

Create `frontend/src/app/[locale]/(app)/admin/groups/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { groupsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    groupsApi.list().then(r => setGroups(r.data))
  }, [])

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) return toast.error('Cannot delete a system group')
    await groupsApi.delete(id)
    setGroups(prev => prev.filter(g => g.id !== id))
    toast.success('Group deleted')
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Button onClick={() => router.push('/admin/groups/new')}>New Group</Button>
      </div>
      <div className="space-y-2">
        {groups.map(group => (
          <div key={group.id} className="flex items-center justify-between border rounded p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{group.name}</span>
                {group.isSystem && <Badge variant="secondary">System</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{group.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {group.members?.length ?? 0} members
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push(`/admin/groups/${group.id}`)}>
                Configure
              </Button>
              {!group.isSystem && (
                <Button variant="destructive" size="sm" onClick={() => handleDelete(group.id, group.isSystem)}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create Group detail/edit page**

Create `frontend/src/app/[locale]/(app)/admin/groups/[id]/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { groupsApi } from '@/lib/api'
import { PermissionsMatrix } from '@/components/admin/groups/PermissionsMatrix'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [group, setGroup] = useState<any>(null)
  const [pendingPerms, setPendingPerms] = useState<any[]>([])

  useEffect(() => {
    groupsApi.get(id).then(r => {
      setGroup(r.data)
      const permMap: Record<string, Record<string, boolean>> = {}
      for (const p of r.data.permissions) {
        permMap[p.module] = p
      }
      setPendingPerms(r.data.permissions)
    })
  }, [id])

  const savePermissions = async () => {
    await groupsApi.setPermissions(id, pendingPerms)
    toast.success('Permissions saved')
  }

  if (!group) return <div className="p-6">Loading...</div>

  const permMap: Record<string, Record<string, boolean>> = {}
  for (const p of group.permissions) permMap[p.module] = p

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{group.name}</h1>
      <p className="text-muted-foreground">{group.description}</p>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Module Permissions</h2>
        <PermissionsMatrix
          permissions={permMap}
          onChange={setPendingPerms}
          disabled={group.isSystem}
        />
        {!group.isSystem && (
          <Button onClick={savePermissions}>Save Permissions</Button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/[locale]/(app)/admin/groups/ frontend/src/components/admin/groups/ frontend/src/lib/api.ts
git commit -m "feat(ui): add Groups admin page with PermissionsMatrix"
```

---

## Task 8: Frontend — Setup Wizard

**Files:**
- Create: `frontend/src/components/setup/SetupWizard.tsx`
- Create: `frontend/src/app/setup/page.tsx`

- [ ] **Step 1: Create SetupWizard component**

Create `frontend/src/components/setup/SetupWizard.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import api from '@/lib/api'

const STEPS = ['System Check', 'Language & Locale', 'Admin Account', 'Review & Finish']

export function SetupWizard({ health }: { health: { database: string } }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    orgName: '',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
    language: 'en',
    locale: 'en-US',
  })

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const submit = async () => {
    try {
      await api.post('/setup/run', form)
      toast.success('QAuthority setup complete!')
      router.push('/login')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Setup failed')
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Progress */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex-1 h-1 rounded ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>
      <h2 className="text-xl font-semibold">{STEPS[step]}</h2>

      {step === 0 && (
        <div className="space-y-3">
          <div className={`p-3 rounded border ${health.database === 'ok' ? 'border-green-500' : 'border-red-500'}`}>
            Database: {health.database}
          </div>
          <Button onClick={() => setStep(1)} disabled={health.database !== 'ok'}>Continue</Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label>Language</Label>
            <Select value={form.language} onValueChange={v => update('language', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Organization Name</Label>
            <Input value={form.orgName} onChange={e => update('orgName', e.target.value)} />
          </div>
          <Button onClick={() => setStep(2)}>Continue</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <Label>Admin Name</Label>
            <Input value={form.adminName} onChange={e => update('adminName', e.target.value)} />
          </div>
          <div>
            <Label>Admin Email</Label>
            <Input type="email" value={form.adminEmail} onChange={e => update('adminEmail', e.target.value)} />
          </div>
          <div>
            <Label>Admin Password</Label>
            <Input type="password" value={form.adminPassword} onChange={e => update('adminPassword', e.target.value)} />
          </div>
          <Button onClick={() => setStep(3)}>Continue</Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="border rounded p-4 space-y-2 text-sm">
            <p><strong>Organization:</strong> {form.orgName}</p>
            <p><strong>Language:</strong> {form.language}</p>
            <p><strong>Admin:</strong> {form.adminName} ({form.adminEmail})</p>
          </div>
          <Button onClick={submit} className="w-full">Complete Setup</Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create setup page**

Create `frontend/src/app/setup/page.tsx`:

```typescript
import { SetupWizard } from '@/components/setup/SetupWizard'

async function getSetupStatus() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/setup/status`, { cache: 'no-store' })
  return res.json()
}

export default async function SetupPage() {
  const status = await getSetupStatus()
  if (status.complete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Setup already complete. <a href="/login" className="underline">Go to login</a></p>
      </div>
    )
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-xl">
        <h1 className="text-3xl font-bold mb-2">QAuthority Setup</h1>
        <p className="text-muted-foreground mb-8">Enterprise QA Command Center — First Run Configuration</p>
        <SetupWizard health={status.health} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/setup/ frontend/src/components/setup/
git commit -m "feat(ui): add Setup Wizard for first-run QAuthority configuration"
```

---

## Task 9: Auth Middleware — Module Permission Guard

**Files:**
- Modify: `backend/src/infrastructure/auth/authMiddleware.ts`

- [ ] **Step 1: Add module permission hook to Fastify**

In `backend/src/infrastructure/auth/authMiddleware.ts`, export a helper to create a permission guard:

```typescript
import { PermissionMatrixService } from '../../services/PermissionMatrixService'
import { ModuleType } from '@prisma/client'

type PermAction = 'create' | 'read' | 'update' | 'delete' | 'export'

export function requirePermission(module: ModuleType, action: PermAction) {
  return async (req: any, reply: any) => {
    const userId = req.user?.id
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const service = new PermissionMatrixService(req.server.prisma)
    const allowed = await service.can(userId, module, action)
    if (!allowed) return reply.code(403).send({ error: 'Forbidden: insufficient permissions' })
  }
}
```

Usage in any route:
```typescript
import { requirePermission } from '../../../infrastructure/auth/authMiddleware'

app.post('/', {
  onRequest: [app.authenticate, requirePermission('TEST_PLANS', 'create')]
}, handler)
```

- [ ] **Step 2: Apply guard to groups route**

In `backend/src/interfaces/http/routes/groups.ts`, update POST/PUT/DELETE to require `USERS_GROUPS` permissions:

```typescript
import { requirePermission } from '../../../infrastructure/auth/authMiddleware'

app.post('/', {
  onRequest: [app.authenticate, requirePermission('USERS_GROUPS', 'create')]
}, async (req, reply) => { ... })

app.delete('/:id', {
  onRequest: [app.authenticate, requirePermission('USERS_GROUPS', 'delete')]
}, async (req, reply) => { ... })
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/infrastructure/auth/authMiddleware.ts backend/src/interfaces/http/routes/groups.ts
git commit -m "feat(auth): add requirePermission guard using ModulePermission model"
```

---

## Final Task: Integration Test

- [ ] **Step 1: Start full stack**

```bash
docker-compose up -d db redis
cd backend && npm run dev &
cd frontend && npm run dev &
```

- [ ] **Step 2: Run setup wizard**

Open `http://localhost:3000/setup` — complete all 4 wizard steps.

Expected: Redirected to `/login` after completion.

- [ ] **Step 3: Log in and verify groups**

Log in with the admin credentials you created. Navigate to Admin → Groups.

Expected: 7 system groups listed (System Admin, QA Manager, QA Lead, QA Engineer, Automation Engineer, Analyst, Stakeholder).

- [ ] **Step 4: Verify permissions matrix**

Click "Configure" on "QA Manager" group. Expected: all modules except ADMIN have full permissions.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat(plan-0): complete Groups & Permissions + Setup Wizard"
```
