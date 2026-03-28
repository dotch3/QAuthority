import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { seedGroups } from '../utils/seedGroups.js'
import { validatePassword } from '../utils/passwordPolicy.js'

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

    const passwordValidation = validatePassword(input.adminPassword)
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join('. '))
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Get or create admin role
      let adminRole = await tx.role.findFirst({ where: { name: 'admin' } })
      if (!adminRole) {
        adminRole = await tx.role.create({
          data: { name: 'admin', label: 'Administrator', isSystem: true },
        })
      }

      // 2. Create admin user with hashed password
      const passwordHash = await bcrypt.hash(input.adminPassword, 12)
      const adminUser = await tx.user.create({
        data: {
          email: input.adminEmail,
          name: input.adminName,
          passwordHash,
          roleId: adminRole.id,
        },
      })

      // 3. Seed default groups
      await seedGroups(tx)

      // 4. Add admin to System Admin group
      const systemAdminGroup = await tx.userGroup.findFirst({
        where: { name: 'System Admin' },
      })
      if (!systemAdminGroup) {
        throw new Error("'System Admin' group not found after seeding — seeding may have failed")
      }
      await tx.userGroupMember.create({
        data: { userId: adminUser.id, groupId: systemAdminGroup.id },
      })

      return { ok: true, adminUserId: adminUser.id }
    })
  }
}
