"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useProject } from "@/contexts/ProjectContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import {
  ChevronDown, ChevronRight, Workflow, CheckCircle2, Zap, GitBranch,
  ShieldCheck, ArrowLeftRight, BarChart3, Plus, Edit, Trash2, Download,
} from "lucide-react"

// ── Process Template types & config ─────────────────────────────────────────

interface ProcessStep {
  order: number
  name: string
  description: string
  type: string
}

interface ProcessTemplate {
  id: string
  name: string
  description?: string
  category: string
  steps: ProcessStep[]
  isSystem: boolean
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  agile:         { label: "Agile",       icon: CheckCircle2,   color: "bg-green-500/10 text-green-700 border-green-500/20" },
  waterfall:     { label: "Waterfall",   icon: GitBranch,      color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  cicd:          { label: "CI/CD",       icon: Zap,            color: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
  "shift-left":  { label: "Shift-Left",  icon: ArrowLeftRight, color: "bg-orange-500/10 text-orange-700 border-orange-500/20" },
  "shift-right": { label: "Shift-Right", icon: ArrowLeftRight, color: "bg-teal-500/10 text-teal-700 border-teal-500/20" },
  rbt:           { label: "Risk-Based",  icon: ShieldCheck,    color: "bg-red-500/10 text-red-700 border-red-500/20" },
}

const STEP_TYPE_COLOR: Record<string, string> = {
  meeting:     "bg-blue-500/10 text-blue-600",
  analysis:    "bg-yellow-500/10 text-yellow-700",
  planning:    "bg-indigo-500/10 text-indigo-600",
  execution:   "bg-green-500/10 text-green-700",
  testing:     "bg-teal-500/10 text-teal-700",
  review:      "bg-gray-500/10 text-gray-600",
  design:      "bg-purple-500/10 text-purple-700",
  automated:   "bg-cyan-500/10 text-cyan-700",
  trigger:     "bg-orange-500/10 text-orange-700",
  gate:        "bg-red-500/10 text-red-700",
  release:     "bg-green-600/10 text-green-800",
  monitoring:  "bg-slate-500/10 text-slate-600",
  approval:    "bg-amber-500/10 text-amber-700",
  development: "bg-violet-500/10 text-violet-700",
  reporting:   "bg-rose-500/10 text-rose-700",
}

function ProcessCard({ template }: { template: ProcessTemplate }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = CATEGORY_CONFIG[template.category] ?? { label: template.category, icon: Workflow, color: "bg-gray-500/10 text-gray-600 border-gray-500/20" }
  const Icon = cfg.icon

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer select-none py-4 hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-md bg-muted flex-shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">{template.name}</CardTitle>
              {template.description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{template.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{template.steps.length} steps</span>
            {expanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-4">
          {template.description && (
            <p className="text-sm text-muted-foreground mb-4 border-t pt-3">{template.description}</p>
          )}
          <ol className="space-y-2">
            {template.steps.map((step) => (
              <li key={step.order} className="flex gap-3 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground mt-0.5">
                  {step.order}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{step.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STEP_TYPE_COLOR[step.type] ?? "bg-gray-100 text-gray-600"}`}>
                      {step.type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      )}
    </Card>
  )
}

// ── My Workflows ─────────────────────────────────────────────────────────────

interface QAWorkflow {
  id: string
  name: string
  description?: string
  blocks?: any[]
  edges?: any[]
  updatedAt: string
}

function MyWorkflowsTab({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<QAWorkflow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    api.get<QAWorkflow[]>(`/workflows/project/${projectId}`)
      .then(setWorkflows)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [projectId])

  const createNew = async () => {
    try {
      const res = await api.post<QAWorkflow>("/workflows", {
        name: "New QA Workflow",
        projectId,
        blocks: [],
        edges: [],
      })
      router.push(`/governance/processes/${res.id}`)
    } catch {
      toast.error("Failed to create workflow")
    }
  }

  const deleteWorkflow = async (id: string) => {
    setDeleting(id)
    try {
      await api.delete(`/workflows/${id}`)
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
      toast.success("Workflow deleted")
    } catch {
      toast.error("Failed to delete workflow")
    } finally {
      setDeleting(null)
    }
  }

  const exportMermaid = (id: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"
    const token = localStorage.getItem("access_token")
    window.open(`${baseUrl}/workflows/${id}/export/mermaid?token=${token}`, "_blank")
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={createNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      {workflows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Workflow className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">No workflows yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create a custom drag-and-drop QA workflow diagram for this project
            </p>
            <Button onClick={createNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {workflows.map((wf) => (
            <div key={wf.id} className="border rounded-lg p-4 flex items-center justify-between gap-4 bg-card">
              <div className="min-w-0">
                <p className="font-medium truncate">{wf.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {wf.blocks?.length ?? 0} blocks · {wf.edges?.length ?? 0} connections
                  · Updated {new Date(wf.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => exportMermaid(wf.id)}>
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Mermaid
                </Button>
                <Button size="sm" variant="outline" onClick={() => router.push(`/governance/processes/${wf.id}`)}>
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={deleting === wf.id}
                  onClick={() => deleteWorkflow(wf.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ProcessesPage() {
  const { selectedProject } = useProject()
  const [templates, setTemplates] = useState<ProcessTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [tab, setTab] = useState<"templates" | "workflows">("templates")

  useEffect(() => {
    api.get<ProcessTemplate[]>("/process-templates")
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setIsLoadingTemplates(false))
  }, [])

  const byCategory = templates.reduce<Record<string, ProcessTemplate[]>>((acc, t) => {
    acc[t.category] = acc[t.category] ?? []
    acc[t.category].push(t)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-7 w-7" />
          QA Processes
        </h1>
        <p className="text-muted-foreground mt-1">
          Standard methodology templates and custom workflow diagrams
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["templates", "workflows"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "templates" ? "Methodology Templates" : "My Workflows"}
          </button>
        ))}
      </div>

      {/* Templates tab */}
      {tab === "templates" && (
        isLoadingTemplates ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byCategory).map(([category, group]) => {
              const cfg = CATEGORY_CONFIG[category]
              return (
                <div key={category} className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {cfg?.label ?? category}
                  </h2>
                  <div className="space-y-2">
                    {group.map((t) => <ProcessCard key={t.id} template={t} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* My Workflows tab */}
      {tab === "workflows" && (
        selectedProject ? (
          <MyWorkflowsTab projectId={selectedProject.id} />
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Workflow className="h-10 w-10 mx-auto mb-3" />
              <p>Select a project to view and create custom workflows</p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  )
}
