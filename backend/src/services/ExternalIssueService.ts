import { PrismaClient, ExternalProvider } from '@prisma/client'

interface SyncIssueInput {
  integrationId: string
  externalId: string
  provider: ExternalProvider
  title: string
  status: string
  url: string
}

export class ExternalIssueService {
  constructor(private prisma: PrismaClient) {}

  async syncIssue(input: SyncIssueInput) {
    return this.prisma.externalIssue.upsert({
      where: {
        integrationId_externalId: {
          integrationId: input.integrationId,
          externalId: input.externalId,
        },
      },
      update: { title: input.title, status: input.status, syncedAt: new Date() },
      create: { ...input },
    })
  }

  async linkToBug(externalIssueId: string, bugId: string) {
    return this.prisma.externalIssue.update({
      where: { id: externalIssueId },
      data: { linkedBugId: bugId },
    })
  }

  async unlinkFromBug(externalIssueId: string) {
    return this.prisma.externalIssue.update({
      where: { id: externalIssueId },
      data: { linkedBugId: null },
    })
  }

  async listForProject(projectId: string) {
    return this.prisma.externalIssue.findMany({
      where: { integration: { projectId } },
      include: { bug: true },
      orderBy: { syncedAt: 'desc' },
    })
  }

  async listForBug(bugId: string) {
    return this.prisma.externalIssue.findMany({ where: { linkedBugId: bugId } })
  }
}
