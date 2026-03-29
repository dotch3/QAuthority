import { describe, it, expect } from 'vitest'
import { MermaidExportService } from '../../src/services/MermaidExportService'

const workflow = {
  name: 'Sprint QA Process',
  blocks: [
    { id: 'b1', type: 'BRAINSTORMING', label: 'Brainstorming', posX: 0, posY: 0 },
    { id: 'b2', type: 'RISK_ANALYSIS', label: 'Risk Analysis', posX: 200, posY: 0 },
    { id: 'b3', type: 'SIGN_OFF', label: 'Sign Off', posX: 400, posY: 0 },
  ],
  edges: [
    { id: 'e1', sourceBlockId: 'b1', targetBlockId: 'b2', label: null },
    { id: 'e2', sourceBlockId: 'b2', targetBlockId: 'b3', label: 'approved' },
  ],
}

describe('MermaidExportService', () => {
  const service = new MermaidExportService()

  it('generates valid Mermaid flowchart syntax', () => {
    const result = service.toMermaid(workflow as any)
    expect(result).toContain('flowchart TD')
    expect(result).toContain('b1["Brainstorming"]')
    expect(result).toContain('b2[/"Risk Analysis"\\]')
    expect(result).toContain('b1 --> b2')
    expect(result).toContain('b2 --"approved"--> b3')
  })

  it('uses correct Mermaid shapes per block type', () => {
    const result = service.toMermaid(workflow as any)
    expect(result).toContain('b3(("Sign Off"))')
  })

  it('exports to JSON with blocks and edges', () => {
    const json = service.toJSON(workflow as any)
    const parsed = JSON.parse(json)
    expect(parsed.name).toBe('Sprint QA Process')
    expect(parsed.blocks).toHaveLength(3)
    expect(parsed.edges).toHaveLength(2)
  })
})
