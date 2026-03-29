-- CreateEnum
CREATE TYPE "BuildStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ExternalProvider" AS ENUM ('JIRA', 'GITHUB', 'GITLAB', 'JENKINS');

-- AlterTable
ALTER TABLE "integrations" ADD COLUMN     "webhookSecret" TEXT;

-- CreateTable
CREATE TABLE "ci_builds" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "buildNumber" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "status" "BuildStatus" NOT NULL,
    "testResultsPayload" JSONB,
    "triggeredAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ci_builds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_issues" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "provider" "ExternalProvider" NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "linkedBugId" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_issues_integrationId_externalId_key" ON "external_issues"("integrationId", "externalId");

-- AddForeignKey
ALTER TABLE "ci_builds" ADD CONSTRAINT "ci_builds_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ci_builds" ADD CONSTRAINT "ci_builds_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_issues" ADD CONSTRAINT "external_issues_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_issues" ADD CONSTRAINT "external_issues_linkedBugId_fkey" FOREIGN KEY ("linkedBugId") REFERENCES "defects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
