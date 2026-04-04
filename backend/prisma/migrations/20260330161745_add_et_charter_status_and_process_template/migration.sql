-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MetricType" ADD VALUE 'AUTOMATION_RATE';
ALTER TYPE "MetricType" ADD VALUE 'EXECUTION_VELOCITY';
ALTER TYPE "MetricType" ADD VALUE 'FLOW_EFFICIENCY';
ALTER TYPE "MetricType" ADD VALUE 'CYCLE_TIME_DAYS';
ALTER TYPE "MetricType" ADD VALUE 'CODE_COVERAGE';

-- AlterTable
ALTER TABLE "et_charters" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'NOT_STARTED';

-- CreateTable
CREATE TABLE "process_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_templates_pkey" PRIMARY KEY ("id")
);
