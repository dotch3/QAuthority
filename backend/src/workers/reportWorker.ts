import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { ReportGeneratorService } from '../services/ReportGeneratorService'
import fs from 'fs'
import path from 'path'

interface ReportJobData {
  jobId: string
  projectId?: string
  format: string
  type: string
}

export function createReportWorker(prisma: PrismaClient, redisUrl: string) {
  const outputDir = process.env.REPORT_OUTPUT_DIR ?? './reports'
  const generator = new ReportGeneratorService(prisma, outputDir)

  return new Worker<ReportJobData>(
    'reports',
    async (job: Job<ReportJobData>) => {
      const { jobId, projectId, format, type } = job.data

      await prisma.reportJob.update({
        where: { id: jobId },
        data: { status: 'RUNNING' },
      })

      try {
        let buffer: Buffer | string
        const filePath = generator.buildFilePath(jobId, format)

        if (format === 'EXCEL') {
          buffer = await generator.generateExcelExecutionSummary(projectId!)
        } else if (format === 'PDF') {
          buffer = await generator.generatePDFExecutionSummary(projectId!)
        } else if (format === 'DOCX') {
          buffer = await generator.generateDOCXExecutiveBriefing(projectId!)
        } else if (format === 'CSV') {
          buffer = await generator.generateCSVExecutionSummary(projectId!)
        } else if (format === 'JSON') {
          buffer = JSON.stringify(await generator.generateJSONMetricsExport(projectId), null, 2)
        } else {
          throw new Error(`Unsupported format: ${format}`)
        }

        const dir = path.dirname(filePath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }

        if (typeof buffer === 'string') {
          fs.writeFileSync(filePath, buffer, 'utf-8')
        } else {
          fs.writeFileSync(filePath, buffer)
        }

        await prisma.reportJob.update({
          where: { id: jobId },
          data: { status: 'DONE', filePath, completedAt: new Date() },
        })

        return { success: true, filePath }
      } catch (err: any) {
        await prisma.reportJob.update({
          where: { id: jobId },
          data: { status: 'FAILED', errorMsg: err.message, completedAt: new Date() },
        })
        throw err
      }
    },
    {
      connection: { url: redisUrl },
      concurrency: 3,
    }
  )
}
