import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { seedGroups } from '../utils/seedGroups.js'

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
      adminRole = await this.prisma.role.create({
        data: { name: 'admin', label: 'Administrator', isSystem: true },
      })
    }

    // 2. Create admin user with hashed password
    const passwordHash = await bcrypt.hash(input.adminPassword, 12)
    const adminUser = await this.prisma.user.create({
      data: {
        email: input.adminEmail,
        name: input.adminName,
        passwordHash,
        roleId: adminRole.id,
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
