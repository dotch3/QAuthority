interface Block { id: string; type: string; label: string; posX: number; posY: number; config?: any }
interface Edge { id: string; sourceBlockId: string; targetBlockId: string; label?: string | null }
interface Workflow { name: string; blocks: Block[]; edges: Edge[] }

const BLOCK_SHAPES: Record<string, [string, string]> = {
  BRAINSTORMING: ['[', ']'],
  RISK_ANALYSIS: ['[/', '\\]'],
  RACI_MATRIX: ['[', ']'],
  ORACLE_DEFINITION: ['[(', ')]'],
  SANITY_SMOKE: ['(', ')'],
  ENVIRONMENT_SETUP: ['[[', ']]'],
  SIGN_OFF: ['((', '))'],
  NOTE: ['>', ']'],
  DECISION: ['{', '}'],
  SUBPROCESS: ['[[', ']]'],
}

export class MermaidExportService {
  toMermaid(workflow: Workflow): string {
    const lines: string[] = ['flowchart TD']

    for (const block of workflow.blocks) {
      const [open, close] = BLOCK_SHAPES[block.type] ?? ['[', ']']
      const safeLabel = block.label.replace(/"/g, "'")
      lines.push(`  ${block.id}${open}"${safeLabel}"${close}`)
    }

    lines.push('')

    for (const edge of workflow.edges) {
      if (edge.label) {
        lines.push(`  ${edge.sourceBlockId} --"${edge.label}"--> ${edge.targetBlockId}`)
      } else {
        lines.push(`  ${edge.sourceBlockId} --> ${edge.targetBlockId}`)
      }
    }

    return lines.join('\n')
  }

  toJSON(workflow: Workflow): string {
    return JSON.stringify(
      {
        name: workflow.name,
        blocks: workflow.blocks.map(b => ({
          id: b.id,
          type: b.type,
          label: b.label,
          posX: b.posX,
          posY: b.posY,
        })),
        edges: workflow.edges.map(e => ({
          sourceBlockId: e.sourceBlockId,
          targetBlockId: e.targetBlockId,
          label: e.label ?? null,
        })),
      },
      null,
      2
    )
  }

  fromJSON(json: string): { blocks: Omit<Block, 'id'>[]; edges: Omit<Edge, 'id'>[] } {
    const parsed = JSON.parse(json)
    return {
      blocks: parsed.blocks ?? [],
      edges: parsed.edges ?? [],
    }
  }
}
