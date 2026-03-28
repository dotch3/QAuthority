# Plan 5: Visual QA Process Designer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let QA teams visually design their quality process as a flowchart — drag-and-drop blocks on a canvas, connect them with edges, and export the diagram as Mermaid.js or JSON.

**Architecture:** `QAWorkflow`, `WorkflowBlock`, and `WorkflowEdge` store the graph. `MermaidExportService` serializes to Mermaid flowchart syntax. Frontend uses `reactflow` library for the drag-and-drop canvas. `WorkflowImportService` parses Mermaid/JSON back into DB records.

**Tech Stack:** Fastify 5, Prisma 6, `reactflow` (frontend), Next.js 16, Vitest 2

**Depends on:** Plan 0 (permissions for PROCESS_DESIGNER module)

---

## ⚠️ Path & URL Convention — Read This First

Pages live under `frontend/src/app/[locale]/(app)/`. The `[locale]` segment is **NOT in the URL** — the app uses `localePrefix: 'never'` in `middleware.ts`. URL is `/governance/processes` not `/en/governance/processes`. Use `Link` from `next-intl` with clean hrefs.

---

## File Map

### Backend — New
- `backend/prisma/migrations/XXXXXX_add_workflows/migration.sql`
- `backend/src/services/WorkflowService.ts`
- `backend/src/services/MermaidExportService.ts`
- `backend/src/interfaces/http/routes/workflows.ts`
- `backend/tests/services/MermaidExportService.test.ts`

### Backend — Modified
- `backend/prisma/schema.prisma`
- `backend/src/interfaces/http/routes/index.ts`

### Frontend — New
- `frontend/src/app/[locale]/(app)/governance/processes/page.tsx`
- `frontend/src/app/[locale]/(app)/governance/processes/[id]/page.tsx`
- `frontend/src/components/process-designer/WorkflowCanvas.tsx`
- `frontend/src/components/process-designer/BlockPalette.tsx`
- `frontend/src/components/process-designer/WorkflowList.tsx`

### Frontend — Modified
- `frontend/package.json` (add reactflow)

---

## Task 1: Install Dependencies

- [ ] **Step 1: Install reactflow**

```bash
cd frontend && npm install reactflow
```

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add reactflow for process designer canvas"
```

---

## Task 2: Prisma Schema

- [ ] **Step 1: Add workflow models**

Append to `backend/prisma/schema.prisma`:

```prisma
enum BlockType {
  BRAINSTORMING
  RISK_ANALYSIS
  RACI_MATRIX
  ORACLE_DEFINITION
  SANITY_SMOKE
  ENVIRONMENT_SETUP
  SIGN_OFF
  NOTE
  DECISION
  SUBPROCESS
}

model QAWorkflow {
  id          String          @id @default(uuid())
  projectId   String
  name        String
  description String?
  project     Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  blocks      WorkflowBlock[]
  edges       WorkflowEdge[]
  createdById String
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

model WorkflowBlock {
  id         String        @id @default(uuid())
  workflowId String
  type       BlockType
  label      String
  posX       Float
  posY       Float
  config     Json?
  workflow   QAWorkflow    @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  outgoing   WorkflowEdge[] @relation("EdgeSource")
  incoming   WorkflowEdge[] @relation("EdgeTarget")
}

model WorkflowEdge {
  id            String        @id @default(uuid())
  workflowId    String
  sourceBlockId String
  targetBlockId String
  label         String?
  workflow      QAWorkflow    @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  source        WorkflowBlock @relation("EdgeSource", fields: [sourceBlockId], references: [id], onDelete: Cascade)
  target        WorkflowBlock @relation("EdgeTarget", fields: [targetBlockId], references: [id], onDelete: Cascade)
}
```

Add to `Project` model:
```prisma
  workflows QAWorkflow[]
```

- [ ] **Step 2: Run migration**

```bash
cd backend && npx prisma migrate dev --name add_qa_workflows
```

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add QAWorkflow, WorkflowBlock, and WorkflowEdge models"
```

---

## Task 3: MermaidExportService

**Files:**
- Create: `backend/src/services/MermaidExportService.ts`
- Create: `backend/tests/services/MermaidExportService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/services/MermaidExportService.test.ts`:

```typescript
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
    expect(result).toContain('b1[Brainstorming]')
    expect(result).toContain('b2[Risk Analysis]')
    expect(result).toContain('b1 --> b2')
    expect(result).toContain('b2 -->|approved| b3')
  })

  it('uses correct Mermaid shapes per block type', () => {
    const result = service.toMermaid(workflow as any)
    expect(result).toContain('b3((Sign Off))')
  })

  it('exports to JSON with blocks and edges', () => {
    const json = service.toJSON(workflow as any)
    const parsed = JSON.parse(json)
    expect(parsed.name).toBe('Sprint QA Process')
    expect(parsed.blocks).toHaveLength(3)
    expect(parsed.edges).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Implement MermaidExportService**

Create `backend/src/services/MermaidExportService.ts`:

```typescript
interface Block { id: string; type: string; label: string; posX: number; posY: number; config?: any }
interface Edge { id: string; sourceBlockId: string; targetBlockId: string; label?: string | null }
interface Workflow { name: string; blocks: Block[]; edges: Edge[] }

// Mermaid shape mapping per block type
const BLOCK_SHAPES: Record<string, [string, string]> = {
  BRAINSTORMING:    ['[', ']'],       // rectangle
  RISK_ANALYSIS:    ['[/', '/]'],     // parallelogram
  RACI_MATRIX:      ['[', ']'],       // rectangle
  ORACLE_DEFINITION:['[(', ')]'],     // cylinder
  SANITY_SMOKE:     ['(', ')'],       // rounded rectangle
  ENVIRONMENT_SETUP:['[[', ']]'],     // subroutine
  SIGN_OFF:         ['((', '))'],     // circle
  NOTE:             ['>', ']'],       // asymmetric
  DECISION:         ['{', '}'],       // rhombus
  SUBPROCESS:       ['[[', ']]'],     // subroutine
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
        lines.push(`  ${edge.sourceBlockId} -->|${edge.label}| ${edge.targetBlockId}`)
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
```

- [ ] **Step 3: Run tests**

```bash
cd backend && npx vitest run tests/services/MermaidExportService.test.ts
```

Expected: PASS — 3 tests passing.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/MermaidExportService.ts backend/tests/services/MermaidExportService.test.ts
git commit -m "feat(service): add MermaidExportService for workflow → Mermaid/JSON export"
```

---

## Task 4: WorkflowService

**Files:**
- Create: `backend/src/services/WorkflowService.ts`

- [ ] **Step 1: Implement WorkflowService**

Create `backend/src/services/WorkflowService.ts`:

```typescript
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
    // Delete existing blocks + edges, re-create from scratch (simplest approach for canvas saves)
    await this.prisma.workflowEdge.deleteMany({ where: { workflowId: id } })
    await this.prisma.workflowBlock.deleteMany({ where: { workflowId: id } })

    // Re-create blocks
    const blockIdMap: Record<string, string> = {} // old reactflow id → new db id
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

    // Re-create edges using mapped block IDs
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

    if (input.name || input.description) {
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/WorkflowService.ts
git commit -m "feat(service): add WorkflowService for CRUD and canvas save operations"
```

---

## Task 5: Workflow Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/workflows.ts`

- [ ] **Step 1: Create workflows router**

Create `backend/src/interfaces/http/routes/workflows.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { WorkflowService } from '../../../services/WorkflowService'
import { MermaidExportService } from '../../../services/MermaidExportService'
import { requirePermission } from '../../../infrastructure/auth/authMiddleware'

export async function workflowRoutes(app: FastifyInstance) {
  const workflowService = new WorkflowService(app.prisma)
  const mermaidService = new MermaidExportService()
  const auth = [app.authenticate, requirePermission('PROCESS_DESIGNER', 'read')]
  const authWrite = [app.authenticate, requirePermission('PROCESS_DESIGNER', 'create')]

  app.get('/project/:projectId', { onRequest: auth }, async (req, reply) => {
    const { projectId } = req.params as { projectId: string }
    return reply.send(await workflowService.listForProject(projectId))
  })

  app.get('/:id', { onRequest: auth }, async (req, reply) => {
    const { id } = req.params as { id: string }
    return reply.send(await workflowService.getWorkflow(id))
  })

  app.post('/', { onRequest: authWrite }, async (req, reply) => {
    const body = req.body as any
    const workflow = await workflowService.createWorkflow({
      ...body,
      createdById: (req.user as any).id,
    })
    return reply.code(201).send(workflow)
  })

  app.put('/:id', { onRequest: authWrite }, async (req, reply) => {
    const { id } = req.params as { id: string }
    return reply.send(await workflowService.saveWorkflow(id, req.body as any))
  })

  app.delete('/:id', { onRequest: [app.authenticate, requirePermission('PROCESS_DESIGNER', 'delete')] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await workflowService.deleteWorkflow(id)
    return reply.code(204).send()
  })

  // GET /workflows/:id/export/mermaid
  app.get('/:id/export/mermaid', { onRequest: auth }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const workflow = await workflowService.getWorkflow(id)
    const mermaid = mermaidService.toMermaid(workflow)
    reply.header('Content-Type', 'text/plain')
    return reply.send(mermaid)
  })

  // GET /workflows/:id/export/json
  app.get('/:id/export/json', { onRequest: auth }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const workflow = await workflowService.getWorkflow(id)
    const json = mermaidService.toJSON(workflow)
    reply.header('Content-Type', 'application/json')
    reply.header('Content-Disposition', `attachment; filename="workflow-${id}.json"`)
    return reply.send(json)
  })
}
```

- [ ] **Step 2: Register routes**

In `backend/src/interfaces/http/routes/index.ts`:
```typescript
import { workflowRoutes } from './workflows'
app.register(workflowRoutes, { prefix: '/workflows' })
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/interfaces/http/routes/workflows.ts
git commit -m "feat(routes): add /workflows CRUD with Mermaid and JSON export endpoints"
```

---

## Task 6: Frontend — Process Designer Canvas

**Files:**
- Create: `frontend/src/components/process-designer/BlockPalette.tsx`
- Create: `frontend/src/components/process-designer/WorkflowCanvas.tsx`

- [ ] **Step 1: Create BlockPalette**

Create `frontend/src/components/process-designer/BlockPalette.tsx`:

```typescript
'use client'

const BLOCK_TYPES = [
  { type: 'BRAINSTORMING', label: 'Brainstorming', color: 'bg-purple-100 border-purple-400' },
  { type: 'RISK_ANALYSIS', label: 'Risk Analysis', color: 'bg-red-100 border-red-400' },
  { type: 'RACI_MATRIX', label: 'RACI Matrix', color: 'bg-blue-100 border-blue-400' },
  { type: 'ORACLE_DEFINITION', label: 'Oracle Definition', color: 'bg-yellow-100 border-yellow-400' },
  { type: 'SANITY_SMOKE', label: 'Sanity / Smoke', color: 'bg-green-100 border-green-400' },
  { type: 'ENVIRONMENT_SETUP', label: 'Environment Setup', color: 'bg-gray-100 border-gray-400' },
  { type: 'SIGN_OFF', label: 'Sign Off', color: 'bg-emerald-100 border-emerald-400' },
  { type: 'NOTE', label: 'Note', color: 'bg-orange-100 border-orange-400' },
  { type: 'DECISION', label: 'Decision', color: 'bg-cyan-100 border-cyan-400' },
  { type: 'SUBPROCESS', label: 'Subprocess', color: 'bg-indigo-100 border-indigo-400' },
]

export function BlockPalette({ onAdd }: { onAdd: (type: string, label: string) => void }) {
  return (
    <div className="w-48 border-r p-3 space-y-1 overflow-y-auto">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Blocks
      </p>
      {BLOCK_TYPES.map(b => (
        <button
          key={b.type}
          onClick={() => onAdd(b.type, b.label)}
          className={`w-full text-left text-xs px-2 py-1.5 rounded border ${b.color} hover:opacity-80 transition-opacity`}
        >
          {b.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create WorkflowCanvas**

Create `frontend/src/components/process-designer/WorkflowCanvas.tsx`:

```typescript
'use client'
import { useCallback, useState } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { BlockPalette } from './BlockPalette'
import { Button } from '@/components/ui/button'

const BLOCK_COLORS: Record<string, string> = {
  BRAINSTORMING: '#e9d5ff',
  RISK_ANALYSIS: '#fecaca',
  RACI_MATRIX: '#bfdbfe',
  ORACLE_DEFINITION: '#fef08a',
  SANITY_SMOKE: '#bbf7d0',
  ENVIRONMENT_SETUP: '#e5e7eb',
  SIGN_OFF: '#6ee7b7',
  NOTE: '#fed7aa',
  DECISION: '#a5f3fc',
  SUBPROCESS: '#c7d2fe',
}

interface Props {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  onSave: (nodes: Node[], edges: Edge[]) => void
}

export function WorkflowCanvas({ initialNodes = [], initialEdges = [], onSave }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [nodeCounter, setNodeCounter] = useState(initialNodes.length)

  const onConnect = useCallback(
    (connection: Connection) => setEdges(eds => addEdge(connection, eds)),
    [setEdges]
  )

  const addBlock = (type: string, label: string) => {
    const id = `block-${nodeCounter + 1}`
    setNodeCounter(c => c + 1)
    const newNode: Node = {
      id,
      type: 'default',
      position: { x: 100 + (nodeCounter % 5) * 180, y: 100 + Math.floor(nodeCounter / 5) * 100 },
      data: {
        label,
        blockType: type,
      },
      style: {
        background: BLOCK_COLORS[type] ?? '#f3f4f6',
        border: '1px solid #9ca3af',
        borderRadius: '6px',
        padding: '8px 12px',
        fontSize: '12px',
      },
    }
    setNodes(ns => [...ns, newNode])
  }

  const handleSave = () => {
    onSave(nodes, edges)
  }

  return (
    <div className="flex h-full">
      <BlockPalette onAdd={addBlock} />
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end p-2 border-b gap-2">
          <Button size="sm" onClick={handleSave}>Save Workflow</Button>
        </div>
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/process-designer/
git commit -m "feat(ui): add WorkflowCanvas with drag-and-drop blocks and BlockPalette"
```

---

## Task 7: Frontend — Process Designer Pages

- [ ] **Step 1: Create workflows list page**

Create `frontend/src/app/[locale]/(app)/governance/processes/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function ProcessesPage() {
  const { activeProject } = useNavigationStore()
  const [workflows, setWorkflows] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    if (activeProject) {
      api.get(`/workflows/project/${activeProject}`).then(r => setWorkflows(r.data))
    }
  }, [activeProject])

  const createNew = async () => {
    if (!activeProject) return toast.error('Select a project first')
    const res = await api.post('/workflows', {
      name: 'New QA Process',
      projectId: activeProject,
      blocks: [],
      edges: [],
    })
    router.push(`/governance/processes/${res.data.id}`)
  }

  const exportMermaid = (id: string) => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/workflows/${id}/export/mermaid`, '_blank')
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">QA Process Designer</h1>
        <Button onClick={createNew}>New Process</Button>
      </div>
      <div className="space-y-2">
        {workflows.map(wf => (
          <div key={wf.id} className="border rounded p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{wf.name}</p>
              <p className="text-xs text-muted-foreground">
                {wf.blocks?.length ?? 0} blocks • {wf.edges?.length ?? 0} connections
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => exportMermaid(wf.id)}>
                Export Mermaid
              </Button>
              <Button size="sm" onClick={() => router.push(`/governance/processes/${wf.id}`)}>
                Edit
              </Button>
            </div>
          </div>
        ))}
        {workflows.length === 0 && (
          <p className="text-muted-foreground text-sm">No processes yet. Create one to start designing your QA workflow.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create workflow editor page**

Create `frontend/src/app/[locale]/(app)/governance/processes/[id]/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { WorkflowCanvas } from '@/components/process-designer/WorkflowCanvas'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Node, Edge } from 'reactflow'

export default function ProcessEditorPage() {
  const { id } = useParams<{ id: string }>()
  const [workflow, setWorkflow] = useState<any>(null)

  useEffect(() => {
    api.get(`/workflows/${id}`).then(r => setWorkflow(r.data))
  }, [id])

  const handleSave = async (nodes: Node[], edges: Edge[]) => {
    await api.put(`/workflows/${id}`, {
      blocks: nodes.map(n => ({
        id: n.id,
        type: n.data.blockType,
        label: n.data.label,
        posX: n.position.x,
        posY: n.position.y,
      })),
      edges: edges.map(e => ({
        sourceBlockId: e.source,
        targetBlockId: e.target,
        label: e.label?.toString() ?? null,
      })),
    })
    toast.success('Workflow saved')
  }

  if (!workflow) return <div className="p-6">Loading...</div>

  // Convert DB blocks/edges to ReactFlow format
  const initialNodes: Node[] = workflow.blocks.map((b: any) => ({
    id: b.id,
    position: { x: b.posX, y: b.posY },
    data: { label: b.label, blockType: b.type },
    style: { fontSize: '12px', padding: '8px 12px', borderRadius: '6px' },
  }))

  const initialEdges: Edge[] = workflow.edges.map((e: any) => ({
    id: e.id,
    source: e.sourceBlockId,
    target: e.targetBlockId,
    label: e.label,
  }))

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b flex items-center gap-4">
        <h1 className="text-lg font-bold">{workflow.name}</h1>
        <span className="text-sm text-muted-foreground">Visual QA Process Designer</span>
      </div>
      <div className="flex-1">
        <WorkflowCanvas
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          onSave={handleSave}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/[locale]/(app)/governance/processes/
git commit -m "feat(ui): add Process Designer pages with workflow list and ReactFlow canvas editor"
```

---

## Final: Integration Verification

- [ ] **Step 1: Create a workflow via UI**

Open `http://localhost:3000/governance/processes`, select a project, click "New Process".

Expected: Redirected to canvas editor with empty canvas.

- [ ] **Step 2: Add blocks and save**

Drag "Brainstorming" and "Risk Analysis" from the palette. Connect them. Click "Save Workflow".

Expected: Toast "Workflow saved". Refresh page — blocks and edge persist.

- [ ] **Step 3: Export Mermaid**

From the workflow list, click "Export Mermaid" on your workflow.

Expected: Mermaid flowchart text like:
```
flowchart TD
  block-1["Brainstorming"]
  block-2[/"Risk Analysis"/]

  block-1 --> block-2
```

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(plan-5): complete Visual QA Process Designer with drag-and-drop canvas and Mermaid export"
```
