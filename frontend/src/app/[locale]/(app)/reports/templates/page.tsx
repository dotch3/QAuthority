"use client"

import { useEffect, useState } from "react"
import { useProject } from "@/contexts/ProjectContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { FileText, Plus, RefreshCw, Loader2 } from "lucide-react"

const FORMAT_OPTIONS = [
  { value: "PDF", label: "PDF" },
  { value: "DOCX", label: "Word" },
  { value: "EXCEL", label: "Excel" },
  { value: "CSV", label: "CSV" },
]

const TYPE_OPTIONS = [
  { value: "EXECUTION_SUMMARY", label: "Execution Summary" },
  { value: "TEST_COVERAGE", label: "Test Coverage" },
  { value: "DEFECT_ANALYSIS", label: "Defect Analysis" },
  { value: "KPI_SUMMARY", label: "KPI Summary" },
  { value: "OKR_PROGRESS", label: "OKR Progress" },
  { value: "EXECUTIVE_BRIEFING", label: "Executive Briefing" },
]

interface ReportTemplate {
  id: string
  name: string
  type: string
  scope: string
  projectId?: string
  createdAt: string
}

interface GenerationState {
  templateId: string
  format: string
}

export default function ReportTemplatesPage() {
  const { selectedProject } = useProject()
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [generating, setGenerating] = useState<GenerationState | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    type: "EXECUTION_SUMMARY",
    scope: "PROJECT",
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setIsLoading(true)
    try {
      const data = await api.get<ReportTemplate[]>("/reports/templates")
      setTemplates(data)
    } catch (err) {
      console.error("Failed to fetch templates:", err)
      toast.error("Failed to load templates")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) {
      toast.error("Please enter a template name")
      return
    }

    try {
      await api.post("/reports/templates", {
        ...newTemplate,
        projectId: selectedProject?.id ?? null,
      })
      toast.success("Template created")
      setShowCreate(false)
      setNewTemplate({ name: "", type: "EXECUTION_SUMMARY", scope: "PROJECT" })
      fetchTemplates()
    } catch (err) {
      console.error("Failed to create template:", err)
      toast.error("Failed to create template")
    }
  }

  const generateReport = async (templateId: string, format: string) => {
    setGenerating({ templateId, format })
    try {
      const res = await api.post<{ jobId: string; status: string }>("/reports/generate", {
        templateId,
        format,
        projectIds: selectedProject ? [selectedProject.id] : null,
      })
      toast.success(`Report queued — Job ID: ${res.jobId}`)
    } catch (err) {
      console.error("Failed to queue report:", err)
      toast.error("Failed to queue report")
    } finally {
      setGenerating(null)
    }
  }

  const getTypeLabel = (type: string) => {
    return TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Report Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage report templates for your project
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTemplates}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Template
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-4">
          <h3 className="font-medium">Create New Template</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 rounded-md border bg-background"
                placeholder="e.g., Sprint Execution Report"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full mt-1 px-3 py-2 rounded-md border bg-background"
                value={newTemplate.type}
                onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value })}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Scope</label>
              <select
                className="w-full mt-1 px-3 py-2 rounded-md border bg-background"
                value={newTemplate.scope}
                onChange={(e) => setNewTemplate({ ...newTemplate, scope: e.target.value })}
              >
                <option value="PROJECT">Project</option>
                <option value="ORGANIZATION">Organization</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreateTemplate}>Create</Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No templates yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{t.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">{getTypeLabel(t.type)}</Badge>
                    <Badge variant="secondary">{t.scope}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {FORMAT_OPTIONS.map((fmt) => (
                    <Button
                      key={fmt.value}
                      size="sm"
                      variant="outline"
                      disabled={
                        generating?.templateId === t.id && generating?.format === fmt.value
                      }
                      onClick={() => generateReport(t.id, fmt.value)}
                    >
                      {generating?.templateId === t.id && generating?.format === fmt.value ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        fmt.label
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
