-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('BRAINSTORMING', 'RISK_ANALYSIS', 'RACI_MATRIX', 'ORACLE_DEFINITION', 'SANITY_SMOKE', 'ENVIRONMENT_SETUP', 'SIGN_OFF', 'NOTE', 'DECISION', 'SUBPROCESS');

-- CreateTable
CREATE TABLE "qa_workflows" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qa_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_blocks" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "label" TEXT NOT NULL,
    "posX" DOUBLE PRECISION NOT NULL,
    "posY" DOUBLE PRECISION NOT NULL,
    "config" JSONB,

    CONSTRAINT "workflow_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_edges" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "sourceBlockId" TEXT NOT NULL,
    "targetBlockId" TEXT NOT NULL,
    "label" TEXT,

    CONSTRAINT "workflow_edges_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "qa_workflows" ADD CONSTRAINT "qa_workflows_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_blocks" ADD CONSTRAINT "workflow_blocks_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "qa_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "qa_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_sourceBlockId_fkey" FOREIGN KEY ("sourceBlockId") REFERENCES "workflow_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_targetBlockId_fkey" FOREIGN KEY ("targetBlockId") REFERENCES "workflow_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
