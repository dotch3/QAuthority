-- AlterTable
ALTER TABLE "defects" ADD COLUMN     "actualResult" TEXT,
ADD COLUMN     "expectedResult" TEXT;

-- AlterTable
ALTER TABLE "test_executions" ADD COLUMN     "suiteId" TEXT,
ADD COLUMN     "testRunCaseId" TEXT;

-- AlterTable
ALTER TABLE "test_plans" ADD COLUMN     "bugPrefix" TEXT,
ADD COLUMN     "idInitialNumber" INTEGER DEFAULT 1,
ADD COLUMN     "idPrefix" TEXT;

-- CreateTable
CREATE TABLE "ci_runner_configs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "baseUrl" TEXT,
    "credential" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "scriptTemplate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ci_runner_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_runs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "testPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "environment" TEXT,
    "ciRunnerId" TEXT,
    "ciJobId" TEXT,
    "ciStatus" TEXT,
    "ciJobUrl" TEXT,
    "callbackToken" TEXT,
    "generatedScript" TEXT,
    "createdById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_run_cases" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_run',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_run_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_run_cases_testRunId_testCaseId_key" ON "test_run_cases"("testRunId", "testCaseId");

-- AddForeignKey
ALTER TABLE "test_executions" ADD CONSTRAINT "test_executions_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "test_suites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_executions" ADD CONSTRAINT "test_executions_testRunCaseId_fkey" FOREIGN KEY ("testRunCaseId") REFERENCES "test_run_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ci_runner_configs" ADD CONSTRAINT "ci_runner_configs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ci_runner_configs" ADD CONSTRAINT "ci_runner_configs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_testPlanId_fkey" FOREIGN KEY ("testPlanId") REFERENCES "test_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_ciRunnerId_fkey" FOREIGN KEY ("ciRunnerId") REFERENCES "ci_runner_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run_cases" ADD CONSTRAINT "test_run_cases_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "test_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run_cases" ADD CONSTRAINT "test_run_cases_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_run_cases" ADD CONSTRAINT "test_run_cases_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
