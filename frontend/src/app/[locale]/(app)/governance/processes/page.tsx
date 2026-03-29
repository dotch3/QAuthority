"use client"
import { useEffect, useState } from 'react'
import { useProject } from '@/contexts/ProjectContext'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Workflow, Plus, Download, Edit } from 'lucide-react'

interface QAWorkflow {
  id: string
  name: string
  description?: string
  blocks?: any[]
  edges?: any[]
  createdAt: string
  updatedAt: string
}

export default function ProcessesPage() {
  const { selectedProject } = useProject()
  const [workflows, setWorkflows] = useState<QAWorkflow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (selectedProject) {
      fetchWorkflows()
    } else {
      setWorkflows([])
      setIsLoading(false)
    }
  }, [selectedProject])

  const fetchWorkflows = async () => {
    if (!selectedProject) return
    setIsLoading(true)
    try {
      const data = await api.get<QAWorkflow[]>(`/workflows/project/${selectedProject.id}`)
      setWorkflows(data)
    } catch (err) {
      console.error('Failed to fetch workflows:', err)
      toast.error('Failed to load workflows')
    } finally {
      setIsLoading(false)
    }
  }

  const createNew = async () => {
    if (!selectedProject) {
      toast.error('Select a project first')
      return
    }
    try {
      const res = await api.post<QAWorkflow>('/workflows', {
        name: 'New QA Process',
        projectId: selectedProject.id,
        blocks: [],
        edges: [],
      })
      router.push(`/governance/processes/${res.id}`)
    } catch (err) {
      console.error('Failed to create workflow:', err)
      toast.error('Failed to create workflow')
    }
  }

  const exportMermaid = (id: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'
    const token = localStorage.getItem('access_token')
    window.open(`${baseUrl}/workflows/${id}/export/mermaid?token=${token}`, '_blank')
  }

  if (!selectedProject) {
    return (
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-4">QA Process Designer</h1>
        <p className="text-muted-foreground">Select a project to view and manage QA processes.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="h-6 w-6" />
            QA Process Designer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize and design your quality assurance workflow
          </p>
        </div>
        <Button onClick={createNew}>
          <Plus className="h-4 w-4 mr-1" />
          New Process
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No processes yet. Create one to start designing your QA workflow.
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map(wf => (
            <div key={wf.id} className="border rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium">{wf.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {wf.blocks?.length ?? 0} blocks • {wf.edges?.length ?? 0} connections
                  • Updated {new Date(wf.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportMermaid(wf.id)}>
                  <Download className="h-4 w-4 mr-1" />
                  Mermaid
                </Button>
                <Button size="sm" onClick={() => router.push(`/governance/processes/${wf.id}`)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
