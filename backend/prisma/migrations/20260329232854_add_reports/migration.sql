-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('EXECUTION_SUMMARY', 'TEST_COVERAGE', 'DEFECT_ANALYSIS', 'KPI_SUMMARY', 'OKR_PROGRESS', 'EXECUTIVE_BRIEFING');

-- CreateEnum
CREATE TYPE "ReportScope" AS ENUM ('PROJECT', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'DOCX', 'EXCEL', 'CSV', 'JSON');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "scope" "ReportScope" NOT NULL,
    "projectId" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_jobs" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "format" "ReportFormat" NOT NULL,
    "filePath" TEXT,
    "projectIds" JSONB,
    "errorMsg" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "report_jobs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "report_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
