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
        <div className="flex justify-end p-2 border-b gap-2 bg-background">
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
