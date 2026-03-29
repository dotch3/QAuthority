-- CreateEnum
CREATE TYPE "OKRScope" AS ENUM ('PROJECT', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "OKRStatus" AS ENUM ('DRAFT', 'ON_TRACK', 'AT_RISK', 'ACHIEVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AggregationStrategy" AS ENUM ('SUM', 'AVG', 'MIN', 'MAX');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('DORA_DEPLOY_FREQUENCY', 'DORA_LEAD_TIME_HOURS', 'DORA_CHANGE_FAIL_RATE', 'DORA_MTTR_HOURS', 'QUALITY_REQUIREMENT_COVERAGE', 'QUALITY_DEFECT_DENSITY', 'QUALITY_ESCAPED_DEFECTS', 'EXECUTION_BURNDOWN', 'EXECUTION_PASS_RATE');

-- AlterTable
ALTER TABLE "defects" RENAME CONSTRAINT "bugs_pkey" TO "defects_pkey";

-- CreateTable
CREATE TABLE "okrs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "quarter" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "OKRStatus" NOT NULL DEFAULT 'DRAFT',
    "scope" "OKRScope" NOT NULL,
    "projectId" TEXT,
    "parentOkrId" TEXT,
    "isAdopted" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "okrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "key_results" (
    "id" TEXT NOT NULL,
    "okrId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "aggregationStrategy" "AggregationStrategy" NOT NULL DEFAULT 'AVG',

    CONSTRAINT "key_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "metricType" "MetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pbc_snapshots" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "metricType" "MetricType" NOT NULL,
    "dataPoints" JSONB NOT NULL,
    "centralLine" DOUBLE PRECISION NOT NULL,
    "upperLimit" DOUBLE PRECISION NOT NULL,
    "lowerLimit" DOUBLE PRECISION NOT NULL,
    "signals" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pbc_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "executive_dashboards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "executive_dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metric_snapshots_projectId_metricType_recordedAt_idx" ON "metric_snapshots"("projectId", "metricType", "recordedAt");

-- RenameForeignKey
ALTER TABLE "defects" RENAME CONSTRAINT "bugs_assignedToId_fkey" TO "defects_assignedToId_fkey";

-- RenameForeignKey
ALTER TABLE "defects" RENAME CONSTRAINT "bugs_priorityId_fkey" TO "defects_priorityId_fkey";

-- RenameForeignKey
ALTER TABLE "defects" RENAME CONSTRAINT "bugs_projectId_fkey" TO "defects_projectId_fkey";

-- RenameForeignKey
ALTER TABLE "defects" RENAME CONSTRAINT "bugs_reportedById_fkey" TO "defects_reportedById_fkey";

-- RenameForeignKey
ALTER TABLE "defects" RENAME CONSTRAINT "bugs_severityId_fkey" TO "defects_severityId_fkey";

-- RenameForeignKey
ALTER TABLE "defects" RENAME CONSTRAINT "bugs_sourceId_fkey" TO "defects_sourceId_fkey";

-- RenameForeignKey
ALTER TABLE "defects" RENAME CONSTRAINT "bugs_statusId_fkey" TO "defects_statusId_fkey";

-- AddForeignKey
ALTER TABLE "okrs" ADD CONSTRAINT "okrs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "okrs" ADD CONSTRAINT "okrs_parentOkrId_fkey" FOREIGN KEY ("parentOkrId") REFERENCES "okrs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_okrId_fkey" FOREIGN KEY ("okrId") REFERENCES "okrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pbc_snapshots" ADD CONSTRAINT "pbc_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
