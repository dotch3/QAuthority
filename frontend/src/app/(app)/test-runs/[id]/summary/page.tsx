"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronRight, CheckCircle2, XCircle, MinusCircle, SkipForward, Clock, ArrowLeft } from "lucide-react"

interface RunCase {
  id: string
  status: string
  assignee?: { name?: string; email: string } | null
  testCase: { title: string; externalId?: string; suite: { name: string } }
  executions: Array<{ notes?: string; durationMs?: number; executedAt: string; executedBy?: { name?: string; email: string } }>
}

interface TestRun {
  id: string
  name: string
  status: string
  environment?: string
  testPlan: { name: string }
  createdAt: string
  startedAt?: string
  completedAt?: string
  cases: RunCase[]
}

const STATUS_ICON: Record<string, any> = {
  passed: CheckCircle2,
  failed: XCircle,
  blocked: MinusCircle,
  skipped: SkipForward,
  not_run: Clock,
  in_progress: Clock,
}

const STATUS_CLASS: Record<string, string> = {
  passed: "bg-green-500/10 text-green-600 border-green-500/20",
  failed: "bg-red-500/10 text-red-600 border-red-500/20",
  blocked: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  skipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  not_run: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-sm mt-0.5 opacity-80">{label}</p>
    </div>
  )
}

export default function RunSummaryPage() {
  const { id } = useParams<{ id: string }>()
  const [run, setRun] = useState<TestRun | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.get<TestRun>(`/test-runs/${id}`)
      .then(setRun)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-32 w-full" /></div>
  }

  if (!run) return <div className="p-8 text-muted-foreground">Run not found</div>

  const total = run.cases.length
  const passed = run.cases.filter((c) => c.status === "passed").length
  const failed = run.cases.filter((c) => c.status === "failed").length
  const blocked = run.cases.filter((c) => c.status === "blocked").length
  const skipped = run.cases.filter((c) => c.status === "skipped").length
  const notRun = run.cases.filter((c) => c.status === "not_run").length
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

  const duration = run.startedAt && run.completedAt
    ? Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000 / 60)
    : null

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/test-runs" className="hover:text-foreground">Test Runs</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/test-runs/${id}`} className="hover:text-foreground">{run.name}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Summary</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{run.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
            <span>{run.testPlan.name}</span>
            {run.environment && <span>· {run.environment}</span>}
            {duration !== null && <span>· {duration} min</span>}
          </div>
        </div>
        <Link href={`/test-runs/${id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Runner
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <StatCard label="Passed" count={passed} color="bg-green-500/5 border-green-500/20 text-green-700" />
        <StatCard label="Failed" count={failed} color="bg-red-500/5 border-red-500/20 text-red-700" />
        <StatCard label="Blocked" count={blocked} color="bg-yellow-500/5 border-yellow-500/20 text-yellow-700" />
        <StatCard label="Skipped" count={skipped} color="bg-purple-500/5 border-purple-500/20 text-purple-700" />
        <StatCard label="Not Run" count={notRun} color="bg-gray-500/5 border-gray-200 text-gray-600" />
      </div>

      <div className="rounded-lg border p-4 bg-card flex items-center gap-6">
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Pass Rate</span>
            <span className="text-muted-foreground">{passRate}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${passRate}%` }} />
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p className="font-medium text-foreground text-lg">{passed}/{total}</p>
          <p>cases passed</p>
        </div>
      </div>

      {/* Case list */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="text-sm font-semibold">All Cases</h2>
        </div>
        <div className="divide-y">
          {run.cases.sort((a, b) => {
            const order = ["failed", "blocked", "not_run", "in_progress", "skipped", "passed"]
            return order.indexOf(a.status) - order.indexOf(b.status)
          }).map((c) => {
            const Icon = STATUS_ICON[c.status] || Clock
            const cls = STATUS_CLASS[c.status] || STATUS_CLASS.not_run
            const lastExec = c.executions[0]
            return (
              <div key={c.id} className="px-4 py-3 flex items-start gap-3">
                <Badge variant="outline" className={`${cls} flex-shrink-0 mt-0.5`}>
                  <Icon className="h-3 w-3 mr-1" />
                  {c.status.replace("_", " ")}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.testCase.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span>{c.testCase.suite.name}</span>
                    {c.assignee && <span>· {c.assignee.name || c.assignee.email}</span>}
                    {lastExec?.durationMs && <span>· {Math.round(lastExec.durationMs / 1000)}s</span>}
                    {lastExec?.executedBy && <span>· by {lastExec.executedBy.name || lastExec.executedBy.email}</span>}
                  </div>
                  {lastExec?.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">{lastExec.notes}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
