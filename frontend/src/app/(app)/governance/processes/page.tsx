"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronRight, Workflow, CheckCircle2, Zap, GitBranch, ShieldCheck, ArrowLeftRight, BarChart3 } from "lucide-react"

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
  agile:        { label: "Agile",       icon: CheckCircle2,  color: "bg-green-500/10 text-green-700 border-green-500/20" },
  waterfall:    { label: "Waterfall",   icon: GitBranch,     color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  cicd:         { label: "CI/CD",       icon: Zap,           color: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
  "shift-left": { label: "Shift-Left",  icon: ArrowLeftRight,color: "bg-orange-500/10 text-orange-700 border-orange-500/20" },
  "shift-right":{ label: "Shift-Right", icon: ArrowLeftRight,color: "bg-teal-500/10 text-teal-700 border-teal-500/20" },
  rbt:          { label: "Risk-Based",  icon: ShieldCheck,   color: "bg-red-500/10 text-red-700 border-red-500/20" },
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
            <Badge variant="outline" className={`text-xs ${cfg.color}`}>
              {cfg.label}
            </Badge>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{template.steps.length} steps</span>
            {expanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />
            }
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

export default function ProcessesPage() {
  const [templates, setTemplates] = useState<ProcessTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.get<ProcessTemplate[]>("/process-templates")
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setIsLoading(false))
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
          QA Process Templates
        </h1>
        <p className="text-muted-foreground mt-1">
          Standard testing methodologies and workflow blueprints
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No process templates found
          </CardContent>
        </Card>
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
      )}
    </div>
  )
}
