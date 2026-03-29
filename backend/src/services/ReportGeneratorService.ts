import { PrismaClient } from '@prisma/client'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx'
import path from 'path'
import fs from 'fs'

export class ReportGeneratorService {
  constructor(
    private prisma: PrismaClient,
    private outputDir: string = process.env.REPORT_OUTPUT_DIR ?? './reports'
  ) {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }

  buildFilePath(jobId: string, format: string): string {
    const extMap: Record<string, string> = {
      PDF: 'pdf',
      DOCX: 'docx',
      EXCEL: 'xlsx',
      CSV: 'csv',
      JSON: 'json',
    }
    const ext = extMap[format.toUpperCase()] ?? format.toLowerCase()
    return path.join(this.outputDir, `${jobId}.${ext}`)
  }

  async generateExcelExecutionSummary(projectId: string): Promise<Buffer> {
    const executions = await this.prisma.testExecution.findMany({
      where: { testCase: { suite: { testPlan: { projectId } } } },
      include: {
        testCase: { include: { suite: { include: { testPlan: true } } } },
        status: true,
        executedBy: true,
      },
      orderBy: { executedAt: 'desc' },
      take: 500,
    })

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Execution Summary')

    ws.columns = [
      { header: 'Test Case', key: 'title', width: 40 },
      { header: 'Suite', key: 'suite', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Executed At', key: 'executedAt', width: 25 },
      { header: 'Duration (ms)', key: 'duration', width: 15 },
      { header: 'Executor', key: 'executor', width: 20 },
    ]

    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    for (const exec of executions) {
      ws.addRow({
        title: exec.testCase?.title ?? '—',
        suite: exec.testCase?.suite?.name ?? '—',
        status: exec.status?.value ?? exec.statusId ?? '—',
        executedAt: exec.executedAt?.toISOString() ?? '—',
        duration: exec.durationMs ?? '—',
        executor: exec.executedBy?.email ?? '—',
      })
    }

    return await wb.xlsx.writeBuffer() as unknown as Buffer
  }

  async generatePDFExecutionSummary(projectId: string): Promise<Buffer> {
    const executions = await this.prisma.testExecution.findMany({
      where: { testCase: { suite: { testPlan: { projectId } } } },
      include: { testCase: true, status: true },
      orderBy: { executedAt: 'desc' },
      take: 200,
    })

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 })
      const chunks: Buffer[] = []
      doc.on('data', c => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      doc.fontSize(20).font('Helvetica-Bold').text('QAuthority — Execution Summary', { align: 'center' })
      doc.moveDown()
      doc.fontSize(10).font('Helvetica').text(`Project ID: ${projectId}`)
      doc.text(`Generated: ${new Date().toISOString()}`)
      doc.text(`Total executions: ${executions.length}`)
      doc.moveDown()

      const passed = executions.filter(e => e.status?.systemKey === 'passed' || e.status?.value === 'passed').length
      const failed = executions.filter(e => e.status?.systemKey === 'failed' || e.status?.value === 'failed').length
      doc.font('Helvetica-Bold').text('Summary:')
      doc.font('Helvetica').text(`  Passed: ${passed}`)
      doc.text(`  Failed: ${failed}`)
      doc.text(`  Pass Rate: ${executions.length > 0 ? ((passed / executions.length) * 100).toFixed(1) : 0}%`)

      doc.moveDown()
      doc.font('Helvetica-Bold').text('Recent Executions:')
      doc.font('Helvetica')

      for (const exec of executions.slice(0, 50)) {
        const statusVal = exec.status?.systemKey ?? exec.status?.value ?? 'unknown'
        const statusSymbol = statusVal === 'passed' ? '[PASS]' : statusVal === 'failed' ? '[FAIL]' : '[OTHER]'
        doc.text(`${statusSymbol} ${exec.testCase?.title ?? 'Unknown'} - ${exec.executedAt?.toLocaleString() ?? ''}`)
      }

      doc.end()
    })
  }

  async generateDOCXExecutiveBriefing(projectId: string): Promise<Buffer> {
    const defects = await this.prisma.defect.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        priority: true,
        status: true,
        severity: true,
      },
    })

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'QAuthority — Executive Briefing', bold: true, size: 32 })],
          }),
          new Paragraph({ children: [new TextRun({ text: `Project: ${projectId}` })] }),
          new Paragraph({ children: [new TextRun({ text: `Date: ${new Date().toLocaleDateString()}` })] }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Paragraph({
            children: [new TextRun({ text: 'Defect Overview', bold: true, size: 24 })],
          }),
          new Table({
            rows: [
              new TableRow({
                children: ['Title', 'Severity', 'Status', 'Priority'].map(t =>
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })] })
                ),
              }),
              ...defects.slice(0, 20).map(b =>
                new TableRow({
                  children: [
                    b.title,
                    b.severity?.value ?? b.severity?.label ?? '—',
                    b.status?.value ?? b.status?.label ?? '—',
                    b.priority?.value ?? b.priority?.label ?? '—',
                  ].map(t =>
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(t) })] })] })
                  ),
                })
              ),
            ],
          }),
        ],
      }],
    })

    return await Packer.toBuffer(doc)
  }

  async generateCSVExecutionSummary(projectId: string): Promise<string> {
    const executions = await this.prisma.testExecution.findMany({
      where: { testCase: { suite: { testPlan: { projectId } } } },
      include: { testCase: { include: { suite: true } }, status: true },
      orderBy: { executedAt: 'desc' },
      take: 1000,
    })

    const header = 'Test Case,Suite,Status,Executed At,Duration (ms),Notes'
    const rows = executions.map(e => [
      `"${(e.testCase?.title ?? '').replace(/"/g, '""')}"`,
      `"${(e.testCase?.suite?.name ?? '').replace(/"/g, '""')}"`,
      e.status?.value ?? e.statusId ?? '',
      e.executedAt?.toISOString() ?? '',
      e.durationMs?.toString() ?? '',
      `"${(e.notes ?? '').replace(/"/g, '""')}"`,
    ].join(','))

    return [header, ...rows].join('\n')
  }

  async generateJSONMetricsExport(projectId?: string): Promise<object> {
    const where = projectId ? { projectId } : {}
    const snapshots = await this.prisma.metricSnapshot.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
    })

    const byProject: Record<string, any[]> = {}
    for (const s of snapshots) {
      const pid = s.projectId ?? 'org'
      if (!byProject[pid]) byProject[pid] = []
      byProject[pid].push({
        metricType: s.metricType,
        value: s.value,
        recordedAt: s.recordedAt,
        metadata: s.metadata,
      })
    }

    return { exportedAt: new Date().toISOString(), projectId: projectId ?? 'all', metrics: byProject }
  }
}
