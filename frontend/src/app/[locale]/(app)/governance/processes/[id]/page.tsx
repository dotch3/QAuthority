"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { WorkflowCanvas } from '@/components/process-designer/WorkflowCanvas'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Node, Edge } from 'reactflow'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface QAWorkflow {
  id: string
  name: string
  description?: string
  blocks: {
    id: string
    type: string
    label: string
    posX: number
    posY: number
  }[]
  edges: {
    id: string
    sourceBlockId: string
    targetBlockId: string
    label?: string
  }[]
}

export default function ProcessEditorPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [workflow, setWorkflow] = useState<QAWorkflow | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        const data = await api.get<QAWorkflow>(`/workflows/${id}`)
        setWorkflow(data)
      } catch (err) {
        console.error('Failed to fetch workflow:', err)
        toast.error('Failed to load workflow')
        router.push('/governance/processes')
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchWorkflow()
    }
  }, [id, router])

  const handleSave = async (nodes: Node[], edges: Edge[]) => {
    try {
      await api.put(`/workflows/${id}`, {
        name: workflow?.name,
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
    } catch (err) {
      console.error('Failed to save workflow:', err)
      toast.error('Failed to save workflow')
    }
  }

  if (isLoading || !workflow) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

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
      <div className="p-4 border-b flex items-center gap-4 bg-background">
        <Link
          href="/governance/processes"
          className="p-2 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold">{workflow.name}</h1>
          <p className="text-sm text-muted-foreground">Visual QA Process Designer</p>
        </div>
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
