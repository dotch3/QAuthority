"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ClipboardList,
  TestTubes,
  PlayCircle,
  Bug,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Activity,
  Loader2,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { LoadingSpinner, LoadingPage } from "@/components/ui/loading"
import { useProject } from "@/contexts/ProjectContext"
import { api } from "@/lib/api"

interface ProjectStats {
  testPlans: number
  testSuites: number
  testCases: number
  executions: number
  openBugs: number
  bugsByStatus: Record<string, number>
}

interface DashboardStats {
  testPlans: number
  testCases: number
  executionsThisWeek: number
  openBugs: number
}

interface ExecutionStats {
  total: number
  passed: number
  failed: number
  blocked: number
  notRun: number
}

interface RecentExecution {
  id: string
  testPlanName: string
  status: string
  passedCount: number
  failedCount: number
  executedAt: string
}

export default function DashboardPage() {
  const { selectedProject } = useProject()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [executionStats, setExecutionStats] = useState<ExecutionStats | null>(null)
  const [recentExecutions, setRecentExecutions] = useState<RecentExecution[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    if (!selectedProject) {
      setStats({ testPlans: 0, testCases: 0, executionsThisWeek: 0, openBugs: 0 })
      setExecutionStats({ total: 0, passed: 0, failed: 0, blocked: 0, notRun: 0 })
      setRecentExecutions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const projectId = selectedProject.id

      const [projectStats, plans] = await Promise.all([
        api.get<ProjectStats>(`/projects/${projectId}/stats`),
        api.get<any[]>(`/projects/${projectId}/test-plans`),
      ])

      const recentExecutionsData: any[] = []
      for (const plan of plans) {
        const executions = await api.get<any[]>(`/test-plans/${plan.id}/executions`)
        for (const exec of executions) {
          recentExecutionsData.push({ ...exec, planName: plan.name })
        }
      }
      recentExecutionsData.sort((a, b) =>
        new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
      )

      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const thisWeekExecutions = recentExecutionsData.filter(
        (e: any) => new Date(e.executedAt) >= oneWeekAgo
      )

      const passed = recentExecutionsData.filter((e: any) => (e.status?.value || e.statusId) === "pass").length
      const failed = recentExecutionsData.filter((e: any) => (e.status?.value || e.statusId) === "fail").length
      const blocked = recentExecutionsData.filter((e: any) => (e.status?.value || e.statusId) === "blocked").length
      const notRun = recentExecutionsData.filter((e: any) => (e.status?.value || e.statusId) === "not_run").length

      setStats({
        testPlans: projectStats.testPlans,
        testCases: projectStats.testCases,
        executionsThisWeek: thisWeekExecutions.length,
        openBugs: projectStats.openBugs,
      })

      setExecutionStats({
        total: recentExecutionsData.length,
        passed,
        failed,
        blocked,
        notRun,
      })

      setRecentExecutions(recentExecutionsData.slice(0, 5).map((e: any) => ({
        id: e.id,
        testPlanName: e.planName,
        status: e.status?.value || e.statusId || "not_run",
        passedCount: e.passedCount || 0,
        failedCount: e.failedCount || 0,
        executedAt: formatRelativeTime(new Date(e.executedAt)),
      })))
    } catch (err) {
      console.error("Failed to load dashboard:", err)
      setError(err instanceof Error ? err.message : "Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }, [selectedProject])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">
            Select a project to view dashboard
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Please select a project to view the dashboard</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your test management activities
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-destructive">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
            <p>{error}</p>
            <Button onClick={loadDashboard} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your test management activities
          </p>
        </div>
        <LoadingPage text="Loading dashboard..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your test management activities
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Test Plans"
          value={stats?.testPlans}
          isLoading={isLoading}
          icon={ClipboardList}
          description="Total plans"
          href="/test-plans"
          color="blue"
        />
        <StatCard
          title="Test Cases"
          value={stats?.testCases}
          isLoading={isLoading}
          icon={TestTubes}
          description="Total cases"
          href="/test-cases"
          color="purple"
        />
        <StatCard
          title="Executions"
          value={stats?.executionsThisWeek}
          isLoading={isLoading}
          icon={PlayCircle}
          description="This week"
          href="/executions"
          color="green"
        />
        <StatCard
          title="Open Bugs"
          value={stats?.openBugs}
          isLoading={isLoading}
          icon={Bug}
          description="Requires attention"
          href="/bugs"
          color="red"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentExecutionsCard
          executions={recentExecutions}
          isLoading={isLoading}
        />
        <ExecutionStatusCard stats={executionStats} isLoading={isLoading} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <QuickActionCard
          title="Create Test Plan"
          description="Start a new test plan for your project"
          href="/test-plans"
          icon={ClipboardList}
        />
        <QuickActionCard
          title="Run Tests"
          description="Execute test cases and track results"
          href="/executions"
          icon={PlayCircle}
        />
        <QuickActionCard
          title="View Reports"
          description="Analyze test coverage and trends"
          href="/reports/dashboard"
          icon={TrendingUp}
        />
      </div>
    </div>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

const colorMap = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-600", border: "border-purple-500/20" },
  green: { bg: "bg-green-500/10", text: "text-green-600", border: "border-green-500/20" },
  red: { bg: "bg-red-500/10", text: "text-red-600", border: "border-red-500/20" },
}

function StatCard({
  title,
  value,
  isLoading,
  icon: Icon,
  description,
  href,
  color,
}: {
  title: string
  value?: number
  isLoading: boolean
  icon: React.ComponentType<{ className?: string }>
  description: string
  href: string
  color: keyof typeof colorMap
}) {
  const colors = colorMap[color]

  return (
    <Link href={href}>
      <div className={`rounded-lg border bg-card p-6 transition-all hover:shadow-md hover:border-primary/50 ${isLoading ? "opacity-50" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{value?.toLocaleString() ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`rounded-full ${colors.bg} p-3`}>
            <Icon className={`h-5 w-5 ${colors.text}`} />
          </div>
        </div>
      </div>
    </Link>
  )
}

function RecentExecutionsCard({
  executions,
  isLoading,
}: {
  executions: RecentExecution[]
  isLoading: boolean
}) {
  const statusColors: Record<string, string> = {
    pass: "bg-green-500/10 text-green-600 border-green-500/20",
    fail: "bg-red-500/10 text-red-600 border-red-500/20",
    blocked: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    not_run: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    skipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  }

  const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    pass: CheckCircle2,
    fail: XCircle,
    blocked: Clock,
    not_run: Clock,
    skipped: Activity,
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pass: "Passed",
      fail: "Failed",
      blocked: "Blocked",
      not_run: "Not Run",
      skipped: "Skipped",
    }
    return labels[status] || status
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Recent Executions</h2>
        <Link href="/executions" className="text-sm text-primary hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))
        ) : executions.length === 0 ? (
          <div className="text-center py-8">
            <PlayCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No recent executions</p>
          </div>
        ) : (
          executions.map((execution) => {
            const StatusIcon = statusIcons[execution.status] || Clock
            return (
              <div
                key={execution.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium text-sm">{execution.testPlanName}</p>
                  <p className="text-xs text-muted-foreground">{execution.executedAt}</p>
                </div>
                <div className="flex items-center gap-2">
                  {execution.status !== "not_run" && (
                    <span className="text-xs text-muted-foreground">
                      {execution.passedCount}/{execution.passedCount + execution.failedCount}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${statusColors[execution.status] || statusColors.not_run}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {getStatusLabel(execution.status)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function ExecutionStatusCard({
  stats,
  isLoading,
}: {
  stats: ExecutionStats | null
  isLoading: boolean
}) {
  const total = stats?.total || 0
  const passed = stats?.passed || 0
  const failed = stats?.failed || 0
  const blocked = stats?.blocked || 0
  const notRun = stats?.notRun || 0
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Overall Status</h2>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : total === 0 ? (
        <div className="text-center py-8">
          <Activity className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No executions yet</p>
        </div>
      ) : (
        <>
          <div className="text-center mb-4">
            <div className="text-4xl font-bold text-primary">{passRate}%</div>
            <p className="text-sm text-muted-foreground">Pass Rate</p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Passed</span>
                </div>
                <span className="font-medium">{passed}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${total > 0 ? (passed / total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>Failed</span>
                </div>
                <span className="font-medium">{failed}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all"
                  style={{ width: `${total > 0 ? (failed / total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span>Blocked</span>
                </div>
                <span className="font-medium">{blocked}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all"
                  style={{ width: `${total > 0 ? (blocked / total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span>Not Run</span>
                </div>
                <span className="font-medium">{notRun}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-500 rounded-full transition-all"
                  style={{ width: `${total > 0 ? (notRun / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {failed > 0 && (
            <div className="mt-4 p-3 rounded-md bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-600">
                    {failed} test{failed > 1 ? "s" : ""} failed
                  </p>
                  <Link
                    href="/bugs"
                    className="text-xs text-red-600 hover:underline"
                  >
                    View and track bugs →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Link href={href}>
      <div className="group rounded-lg border bg-card p-6 transition-all hover:shadow-md hover:border-primary/50">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-muted p-3 group-hover:bg-primary/10 transition-colors">
            <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div>
            <h3 className="font-medium group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </Link>
  )
}
