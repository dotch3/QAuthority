"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { useProject } from "@/contexts/ProjectContext"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, BarChart2, CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react"

interface RunProgress {
  total: number
  completed: number
  passed: number
  failed: number
  blocked: number
  skipped: number
  notRun: number
}

interface TestRun {
  id: string
  name: string
  status: string
  environment?: string
  testPlan: { name: string }
  createdAt: string
  completedAt?: string
  progress: RunProgress
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function passRate(p: RunProgress) {
  if (!p.completed) return 0
  return Math.round((p.passed / p.completed) * 100)
}

function passRateColor(pct: number) {
  if (pct >= 90) return "bg-green-500"
  if (pct >= 70) return "bg-yellow-400"
  return "bg-red-500"
}

function StatCard({ label, value, sub, color = "text-foreground" }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// ── Trend bar chart ────────────────────────────────────────────────────────────

function TrendChart({ runs }: { runs: TestRun[] }) {
  const completed = runs
    .filter((r) => r.status === "completed" && r.progress.completed > 0)
    .slice(-20) // last 20 completed runs
    .sort((a, b) => new Date(a.completedAt ?? a.createdAt).getTime() - new Date(b.completedAt ?? b.createdAt).getTime())

  if (completed.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No completed runs yet</p>
  }

  return (
    <div className="flex items-end gap-1 h-28">
      {completed.map((run) => {
        const pct = passRate(run.progress)
        const color = passRateColor(pct)
        return (
          <Link key={run.id} href={`/test-runs/${run.id}/summary`} className="flex-1 flex flex-col items-center gap-1 group">
            <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {pct}%
            </span>
            <div
              className={`w-full rounded-t ${color} transition-all`}
              style={{ height: `${Math.max(pct, 4)}%`, maxHeight: "80px", minHeight: "4px" }}
              title={`${run.name}: ${pct}% pass rate`}
            />
          </Link>
        )
      })}
    </div>
  )
}

// ── Environment breakdown ──────────────────────────────────────────────────────

function EnvBreakdown({ runs }: { runs: TestRun[] }) {
  const completed = runs.filter((r) => r.status === "completed" && r.progress.completed > 0)

  const byEnv = new Map<string, { passed: number; total: number }>()
  for (const run of completed) {
    const env = run.environment || "(no environment)"
    const entry = byEnv.get(env) ?? { passed: 0, total: 0 }
    entry.passed += run.progress.passed
    entry.total += run.progress.completed
    byEnv.set(env, entry)
  }

  if (byEnv.size === 0) return <p className="text-sm text-muted-foreground py-2">No data</p>

  return (
    <div className="space-y-2">
      {[...byEnv.entries()].sort((a, b) => b[1].total - a[1].total).map(([env, { passed, total }]) => {
        const pct = Math.round((passed / total) * 100)
        return (
          <div key={env}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground truncate max-w-[160px]" title={env}>{env}</span>
              <span className="font-medium text-xs">{pct}% · {total} exec</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${passRateColor(pct)}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Recent completed runs ──────────────────────────────────────────────────────

function RecentRuns({ runs }: { runs: TestRun[] }) {
  const recent = runs
    .filter((r) => r.status === "completed")
    .sort((a, b) => new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime())
    .slice(0, 10)

  if (recent.length === 0) return <p className="text-sm text-muted-foreground py-2">No completed runs</p>

  return (
    <div className="divide-y">
      {recent.map((run) => {
        const pct = passRate(run.progress)
        return (
          <Link
            key={run.id}
            href={`/test-runs/${run.id}/summary`}
            className="flex items-center justify-between py-2.5 hover:bg-muted/30 px-1 rounded transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{run.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{run.testPlan.name}</span>
                {run.environment && <><span>·</span><span>{run.environment}</span></>}
                <span>·</span>
                <span>{new Date(run.completedAt ?? run.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
              <span className="text-xs text-muted-foreground">{run.progress.passed}/{run.progress.completed}</span>
              <div className="flex items-center gap-1">
                <span className={`text-sm font-semibold ${pct >= 70 ? "text-green-600" : "text-red-600"}`}>{pct}%</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TestRunsAnalyticsPage() {
  const { selectedProject } = useProject()
  const [runs, setRuns] = useState<TestRun[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    if (!selectedProject) return
    setIsLoading(true)
    try {
      // Fetch up to 200 runs for analytics
      const data = await api.get<{ data: TestRun[] }>(
        `/projects/${selectedProject.id}/test-runs?limit=200`
      )
      setRuns(data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedProject])

  useEffect(() => { load() }, [load])

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Run Analytics</h1>
        <Card><CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select a project to view analytics</p>
        </CardContent></Card>
      </div>
    )
  }

  // ── Aggregate stats ──────────────────────────────────────────────────────────
  const completed = runs.filter((r) => r.status === "completed")
  const totalExec = completed.reduce((s, r) => s + r.progress.completed, 0)
  const totalPassed = completed.reduce((s, r) => s + r.progress.passed, 0)
  const totalFailed = completed.reduce((s, r) => s + r.progress.failed, 0)
  const overallPassRate = totalExec > 0 ? Math.round((totalPassed / totalExec) * 100) : 0

  const avgPassRate = completed.length > 0
    ? Math.round(completed.reduce((s, r) => s + passRate(r.progress), 0) / completed.length)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/test-runs" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart2 className="h-7 w-7" />
              Run Analytics
            </h1>
            <p className="text-muted-foreground mt-1">Aggregate results across all test runs</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Runs" value={runs.length} sub={`${completed.length} completed`} />
            <StatCard label="Overall Pass Rate" value={`${overallPassRate}%`} sub={`${totalPassed} of ${totalExec}`} color={overallPassRate >= 70 ? "text-green-600" : "text-red-600"} />
            <StatCard label="Avg Pass Rate" value={`${avgPassRate}%`} sub="per completed run" color={avgPassRate >= 70 ? "text-green-600" : "text-red-600"} />
            <StatCard label="Total Failures" value={totalFailed} sub="across all runs" color={totalFailed > 0 ? "text-red-600" : "text-foreground"} />
          </div>

          {/* Status breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Not Started", status: "not_started", cls: "text-gray-500" },
              { label: "In Progress", status: "in_progress", cls: "text-blue-600" },
              { label: "Completed", status: "completed", cls: "text-green-600" },
              { label: "Aborted", status: "aborted", cls: "text-red-500" },
            ].map(({ label, status, cls }) => (
              <div key={status} className="rounded-lg border bg-card px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={`text-lg font-bold ${cls}`}>
                  {runs.filter((r) => r.status === status).length}
                </span>
              </div>
            ))}
          </div>

          {/* Trend + env side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold">Pass Rate Trend</h2>
              <p className="text-xs text-muted-foreground">Last 20 completed runs (click bar to see summary)</p>
              <TrendChart runs={runs} />
            </div>
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold">By Environment</h2>
              <p className="text-xs text-muted-foreground">Pass rate across completed runs grouped by environment</p>
              <EnvBreakdown runs={runs} />
            </div>
          </div>

          {/* Recent completed runs */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Recent Completed Runs</h2>
            <RecentRuns runs={runs} />
          </div>
        </>
      )}
    </div>
  )
}
