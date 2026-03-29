import { PrismaClient, BuildStatus } from '@prisma/client'
import { JUnitParserService } from './JUnitParserService'

interface BuildEventInput {
  integrationId: string
  projectId: string
  buildNumber: string
  branch: string
  status: string
  triggeredAt: string
  completedAt?: string
  testResults?: string
}

export class CIBuildSyncService {
  private parser = new JUnitParserService()

  constructor(private prisma: PrismaClient) {}

  async receiveBuildEvent(input: BuildEventInput) {
    const build = await this.prisma.cIBuild.create({
      data: {
        integrationId: input.integrationId,
        projectId: input.projectId,
        buildNumber: input.buildNumber,
        branch: input.branch,
        status: input.status as BuildStatus,
        triggeredAt: new Date(input.triggeredAt),
        completedAt: input.completedAt ? new Date(input.completedAt) : undefined,
        testResultsPayload: input.testResults ? this.parseTestPayload(input.testResults) : undefined,
      },
    })

    if (input.testResults && (input.status === 'SUCCESS' || input.status === 'FAILED')) {
      await this.syncTestResults(build.id, input.projectId, input.testResults)
    }

    return build
  }

  private parseTestPayload(testResults: string): any {
    const trimmed = testResults.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed)
      } catch {
        return {}
      }
    }
    return {}
  }

  private async syncTestResults(buildId: string, projectId: string, rawResults: string) {
    let parsed
    try {
      parsed = this.parser.parse(rawResults)
    } catch {
      return
    }

    for (const result of parsed) {
      const testCase = await this.prisma.testCase.findFirst({
        where: {
          title: { contains: result.name, mode: 'insensitive' },
          suite: {
            testPlan: {
              projectId,
            },
          },
        },
      })

      if (testCase) {
        const activePlan = await this.prisma.testPlan.findFirst({
          where: {
            projectId,
            status: {
              systemKey: 'active',
            },
          },
        })

        if (activePlan) {
          const passedStatus = await this.prisma.enumValue.findFirst({
            where: {
              enumType: { name: 'execution_status' },
              systemKey: { in: ['passed', 'PASSED'] },
            },
          })

          const failedStatus = await this.prisma.enumValue.findFirst({
            where: {
              enumType: { name: 'execution_status' },
              systemKey: { in: ['failed', 'FAILED'] },
            },
          })

          const statusId = result.status === 'PASSED' 
            ? passedStatus?.id 
            : result.status === 'SKIPPED' 
              ? passedStatus?.id 
              : failedStatus?.id

          if (statusId) {
            const defaultUser = await this.prisma.user.findFirst({
              where: { email: 'system@qauthority.local' },
            })

            await this.prisma.testExecution.create({
              data: {
                testCaseId: testCase.id,
                testPlanId: activePlan.id,
                statusId,
                executedById: defaultUser?.id ?? '00000000-0000-0000-0000-000000000000',
                executedAt: new Date(),
                durationMs: result.durationMs,
                notes: result.errorMessage ?? null,
                ciRunId: buildId,
              },
            })
          }
        }
      }
    }
  }
}
