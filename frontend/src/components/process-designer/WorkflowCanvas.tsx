'use client'
import { useCallback, useRef, useState } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Connection,
  Node,
  Edge,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { BlockPalette } from './BlockPalette'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const BLOCK_COLORS: Record<string, string> = {
  BRAINSTORMING:     '#e9d5ff',
  RISK_ANALYSIS:     '#fecaca',
  RACI_MATRIX:       '#bfdbfe',
  ORACLE_DEFINITION: '#fef08a',
  SANITY_SMOKE:      '#bbf7d0',
  ENVIRONMENT_SETUP: '#e5e7eb',
  SIGN_OFF:          '#6ee7b7',
  NOTE:              '#fed7aa',
  DECISION:          '#a5f3fc',
  SUBPROCESS:        '#c7d2fe',
}

function makeNodeStyle(type: string) {
  return {
    background: BLOCK_COLORS[type] ?? '#f3f4f6',
    border: '1px solid #9ca3af',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    color: '#111827',
    minWidth: '140px',
  }
}

interface Props {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  workflowName?: string
  onSave: (nodes: Node[], edges: Edge[]) => Promise<void> | void
  onSaveAs?: (name: string, nodes: Node[], edges: Edge[]) => Promise<void> | void
}

let idCounter = Date.now()
function nextId() {
  return `block-${++idCounter}`
}

// ── Inner component (needs ReactFlowProvider context) ────────────────────────

function WorkflowCanvasInner({ initialNodes, initialEdges, workflowName, onSave, onSaveAs }: Required<Props>) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [saving, setSaving] = useState(false)
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')
  const [savingAs, setSavingAs] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { project } = useReactFlow()

  // ── Connect ───────────────────────────────────────────────────────────────
  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges(eds =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds,
        ),
      ),
    [setEdges],
  )

  // ── Add block (click from palette) ───────────────────────────────────────
  const addBlock = useCallback(
    (type: string, label: string, position?: { x: number; y: number }) => {
      const id = nextId()
      const pos = position ?? {
        x: 120 + (nodes.length % 4) * 200,
        y: 80 + Math.floor(nodes.length / 4) * 140,
      }
      setNodes(ns => [
        ...ns,
        {
          id,
          type: 'default',
          position: pos,
          data: { label, blockType: type },
          style: makeNodeStyle(type),
        },
      ])
    },
    [nodes.length, setNodes],
  )

  // ── Drag over / drop from palette ────────────────────────────────────────
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/rf-block-type')
      const label = event.dataTransfer.getData('application/rf-block-label')
      if (!type || !wrapperRef.current) return

      const bounds = wrapperRef.current.getBoundingClientRect()
      const position = project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })
      addBlock(type, label, position)
    },
    [project, addBlock],
  )

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(nodes, edges)
    } finally {
      setSaving(false)
    }
  }

  const openSaveAs = () => {
    setSaveAsName(workflowName ? `Copy of ${workflowName}` : 'New Workflow')
    setSaveAsOpen(true)
  }

  const handleSaveAs = async () => {
    if (!saveAsName.trim()) return
    setSavingAs(true)
    try {
      await onSaveAs(saveAsName.trim(), nodes, edges)
      setSaveAsOpen(false)
    } finally {
      setSavingAs(false)
    }
  }

  return (
    <>
      <div className="flex h-full">
        <BlockPalette onAdd={addBlock} />
        <div className="flex-1 flex flex-col">
          <div className="flex justify-end p-2 border-b gap-2 bg-background">
            <Button size="sm" variant="outline" onClick={openSaveAs}>
              Save As…
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
          <div className="flex-1" ref={wrapperRef}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              deleteKeyCode={['Backspace', 'Delete']}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>
        </div>
      </div>

      <Dialog open={saveAsOpen} onOpenChange={(open) => { if (!open) setSaveAsOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save As New Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="save-as-name">Name</Label>
            <Input
              id="save-as-name"
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAs() }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveAsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAs} disabled={savingAs || !saveAsName.trim()}>
              {savingAs ? 'Saving…' : 'Save As'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Public export (wraps with ReactFlowProvider) ─────────────────────────────

export function WorkflowCanvas({ initialNodes = [], initialEdges = [], workflowName = '', onSave, onSaveAs }: Props) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        workflowName={workflowName}
        onSave={onSave}
        onSaveAs={onSaveAs ?? (async () => {})}
      />
    </ReactFlowProvider>
  )
}
