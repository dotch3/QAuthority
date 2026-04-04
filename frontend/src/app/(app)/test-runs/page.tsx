"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { useProject } from "@/contexts/ProjectContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Search, PlayCircle, CheckCircle, XCircle, Clock, AlertCircle, BarChart2 } from "lucide-react"

interface TestRunProgress {
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
  testPlan: { id: string; name: string }
  createdBy: { id: string; name?: string; email: string }
  createdAt: string
  startedAt?: string
  completedAt?: string
  _count: { cases: number }
  progress: TestRunProgress
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  not_started: { label: "Not Started", className: "bg-gray-500/10 text-gray-600 border-gray-500/20", icon: Clock },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: PlayCircle },
  completed: { label: "Completed", className: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle },
  aborted: { label: "Aborted", className: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
}

function ProgressBar({ progress }: { progress: TestRunProgress }) {
  if (progress.total === 0) return <span className="text-xs text-muted-foreground">No cases</span>
  const pct = Math.round((progress.completed / progress.total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[60px]">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {progress.completed}/{progress.total}
      </span>
    </div>
  )
}

export default function TestRunsPage() {
  const router = useRouter()
  const { selectedProject } = useProject()
  const [runs, setRuns] = useState<TestRun[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const loadRuns = useCallback(async () => {
    if (!selectedProject) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)
      const data = await api.get<{ data: TestRun[]; total: number }>(
        `/projects/${selectedProject.id}/test-runs?${params}`
      )
      setRuns(data.data)
      setTotal(data.total)
    } catch (err) {
      console.error("Failed to load runs:", err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedProject, search, statusFilter])

  useEffect(() => { loadRuns() }, [loadRuns])

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Runs</h1>
          <p className="text-muted-foreground mt-1">Execute and track test case results</p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select a project from the header to continue</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Runs</h1>
          <p className="text-muted-foreground mt-1">Execute and track test case results</p>
        </div>
        <div className="flex gap-2">
          <Link href="/test-runs/analytics">
            <Button variant="outline">
              <BarChart2 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Button onClick={() => router.push("/test-runs/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Run
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search runs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="aborted">Aborted</option>
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-3 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<PlayCircle className="h-8 w-8 text-muted-foreground" />}
              title="No test runs yet"
              description={search ? "No runs match your search" : "Create a run to start executing test cases"}
              action={
                <Button onClick={() => router.push("/test-runs/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Run
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => {
                const cfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.not_started
                const StatusIcon = cfg.icon
                return (
                  <TableRow
                    key={run.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/test-runs/${run.id}`)}
                  >
                    <TableCell>
                      <p className="font-medium">{run.name}</p>
                      <p className="text-xs text-muted-foreground">{run.createdBy.name || run.createdBy.email}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{run.testPlan.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cfg.className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {run.environment ? (
                        <span className="text-sm text-muted-foreground">{run.environment}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <ProgressBar progress={run.progress} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(run.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
