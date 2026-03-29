import { PrismaClient, BlockType } from '@prisma/client'

interface SaveWorkflowInput {
  name: string
  description?: string
  projectId: string
  createdById: string
  blocks: {
    id?: string
    type: BlockType
    label: string
    posX: number
    posY: number
    config?: any
  }[]
  edges: {
    sourceBlockId: string
    targetBlockId: string
    label?: string
  }[]
}

export class WorkflowService {
  constructor(private prisma: PrismaClient) {}

  async listForProject(projectId: string) {
    return this.prisma.qAWorkflow.findMany({
      where: { projectId },
      include: { blocks: true, edges: true },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async getWorkflow(id: string) {
    const workflow = await this.prisma.qAWorkflow.findUnique({
      where: { id },
      include: { blocks: true, edges: true },
    })
    if (!workflow) throw new Error('Workflow not found')
    return workflow
  }

  async createWorkflow(input: SaveWorkflowInput) {
    return this.prisma.qAWorkflow.create({
      data: {
        name: input.name,
        description: input.description,
        projectId: input.projectId,
        createdById: input.createdById,
        blocks: {
          create: input.blocks.map(b => ({
            type: b.type,
            label: b.label,
            posX: b.posX,
            posY: b.posY,
            config: b.config ?? {},
          })),
        },
      },
      include: { blocks: true, edges: true },
    })
  }

  async saveWorkflow(id: string, input: Partial<SaveWorkflowInput> & { blocks?: any[]; edges?: any[] }) {
    await this.prisma.workflowEdge.deleteMany({ where: { workflowId: id } })
    await this.prisma.workflowBlock.deleteMany({ where: { workflowId: id } })

    const blockIdMap: Record<string, string> = {}
    if (input.blocks) {
      for (const b of input.blocks) {
        const created = await this.prisma.workflowBlock.create({
          data: {
            workflowId: id,
            type: b.type as BlockType,
            label: b.label,
            posX: b.posX ?? b.position?.x ?? 0,
            posY: b.posY ?? b.position?.y ?? 0,
            config: b.config ?? {},
          },
        })
        blockIdMap[b.id] = created.id
      }
    }

    if (input.edges) {
      for (const e of input.edges) {
        const sourceId = blockIdMap[e.sourceBlockId ?? e.source]
        const targetId = blockIdMap[e.targetBlockId ?? e.target]
        if (sourceId && targetId) {
          await this.prisma.workflowEdge.create({
            data: {
              workflowId: id,
              sourceBlockId: sourceId,
              targetBlockId: targetId,
              label: e.label ?? null,
            },
          })
        }
      }
    }

    if (input.name || input.description !== undefined) {
      await this.prisma.qAWorkflow.update({
        where: { id },
        data: { name: input.name, description: input.description },
      })
    }

    return this.getWorkflow(id)
  }

  async deleteWorkflow(id: string) {
    return this.prisma.qAWorkflow.delete({ where: { id } })
  }
}
