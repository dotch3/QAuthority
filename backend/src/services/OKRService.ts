import { PrismaClient, OKRScope, OKRStatus } from '@prisma/client'
import { NotFoundError, BadRequestError } from '../utils/errors.js'

interface CreateOKRInput {
  title: string
  description?: string
  quarter: number
  year: number
  scope: OKRScope
  projectId?: string
  createdById: string
}

export class OKRService {
  constructor(private prisma: PrismaClient) {}

  async listOrgOKRs() {
    return this.prisma.oKR.findMany({
      where: { scope: 'ORGANIZATION' },
      include: { keyResults: true, adopted: { include: { keyResults: true } } },
    })
  }

  async listProjectOKRs(projectId: string) {
    return this.prisma.oKR.findMany({
      where: { projectId },
      include: { keyResults: true, parent: true },
    })
  }

  async createOKR(input: CreateOKRInput) {
    return this.prisma.oKR.create({
      data: { ...input, status: 'DRAFT' },
      include: { keyResults: true },
    })
  }

  async updateOKRStatus(id: string, status: OKRStatus) {
    return this.prisma.oKR.update({ where: { id }, data: { status } })
  }

  async deleteOKR(id: string) {
    return this.prisma.oKR.delete({ where: { id } })
  }

  async adoptOrgOKR(orgOkrId: string, projectId: string, userId: string) {
    const orgOKR = await this.prisma.oKR.findUnique({
      where: { id: orgOkrId },
      include: { keyResults: true },
    })
    if (!orgOKR) throw new NotFoundError('OKR not found')
    if (orgOKR.scope !== 'ORGANIZATION') {
      throw new BadRequestError('Can only adopt organization-level OKRs')
    }

    const adopted = await this.prisma.oKR.create({
      data: {
        title: orgOKR.title,
        description: orgOKR.description,
        quarter: orgOKR.quarter,
        year: orgOKR.year,
        status: 'DRAFT',
        scope: 'PROJECT',
        projectId,
        parentOkrId: orgOkrId,
        isAdopted: true,
        createdById: userId,
      },
    })

    await Promise.all(
      orgOKR.keyResults.map(kr =>
        this.prisma.keyResult.create({
          data: {
            okrId: adopted.id,
            title: kr.title,
            targetValue: kr.targetValue,
            currentValue: 0,
            unit: kr.unit,
            aggregationStrategy: kr.aggregationStrategy,
          },
        })
      )
    )

    return adopted
  }

  async updateKeyResult(id: string, currentValue: number) {
    return this.prisma.keyResult.update({ where: { id }, data: { currentValue } })
  }

  async computeOrgRollup(orgOkrId: string) {
    const orgOKR = await this.prisma.oKR.findUnique({
      where: { id: orgOkrId },
      include: { keyResults: true, adopted: { include: { keyResults: true } } },
    })
    if (!orgOKR) throw new NotFoundError('OKR not found')

    return orgOKR.keyResults.map(kr => {
      const projectValues = orgOKR.adopted.flatMap(a =>
        a.keyResults.filter(pkr => pkr.title === kr.title).map(pkr => pkr.currentValue)
      )
      if (projectValues.length === 0) return { ...kr, rolledUpValue: 0 }

      let rolledUpValue: number
      switch (kr.aggregationStrategy) {
        case 'SUM': rolledUpValue = projectValues.reduce((s, v) => s + v, 0); break
        case 'MIN': rolledUpValue = Math.min(...projectValues); break
        case 'MAX': rolledUpValue = Math.max(...projectValues); break
        default: rolledUpValue = projectValues.reduce((s, v) => s + v, 0) / projectValues.length
      }
      return { ...kr, rolledUpValue }
    })
  }
}
