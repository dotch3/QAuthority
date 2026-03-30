"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search,
  X,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Bug,
  Calendar,
  PlayCircle,
} from "lucide-react"
import { api } from "@/lib/api"
import { useProject } from "@/contexts/ProjectContext"
import { HierarchySelector, HierarchyBreadcrumb } from "@/components/hierarchy/HierarchySelector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Execution {
  id: string
  testCaseId: string
  testCaseTitle: string
  testPlanId: string
  testPlanName: string
  status: { value: string; label: string; color: string }
  executedByName: string
  executedAt: string
  durationMs?: number
  environment?: string
  platform?: string
  notes?: string
}

interface HierarchySelection {
  planId: string
  planName: string
  suiteId: string
  suiteName: string
}

const statusColors: Record<string, string> = {
  pass: "bg-green-500/10 text-green-600 border-green-500/20",
  fail: "bg-red-500/10 text-red-600 border-red-500/20",
  blocked: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  not_run: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  skipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
}

function ExecutionsSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Test Case</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Executed By</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Platform</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </TableCell>
              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default function ExecutionsPage() {
  const { selectedProject } = useProject()
  const [executions, setExecutions] = useState<Execution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [hierarchySelection, setHierarchySelection] = useState<HierarchySelection | null>(null)

  const loadExecutions = useCallback(async () => {
    if (!hierarchySelection) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await api.get<any[]>(`/test-plans/${hierarchySelection.planId}/executions`)

      const mapped: Execution[] = data.map((e: any) => ({
        id: e.id,
        testCaseId: e.testCaseId,
        testCaseTitle: e.testCase?.title || "Unknown",
        testPlanId: e.testPlanId,
        testPlanName: hierarchySelection.planName,
        status: e.status
          ? { value: e.status.value, label: e.status.label, color: e.status.color }
          : { value: "not_run", label: "Not Run", color: "#6b7280" },
        executedByName: e.executedBy?.name || "Unknown",
        executedAt: e.executedAt,
        durationMs: e.durationMs,
        environment: e.environment,
        platform: e.platform,
        notes: e.notes,
      }))

      setExecutions(mapped)
    } catch (err) {
      console.error("Failed to load executions:", err)
      setError(err instanceof Error ? err.message : "Failed to load executions")
      setExecutions([])
    } finally {
      setIsLoading(false)
    }
  }, [hierarchySelection])

  useEffect(() => {
    loadExecutions()
  }, [loadExecutions])

  const handleHierarchySelect = (planId: string, planName: string, suiteId: string, suiteName: string) => {
    setHierarchySelection({ planId, planName, suiteId, suiteName })
  }

  const filteredExecutions = executions.filter((e) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      e.testCaseTitle.toLowerCase().includes(query) ||
      e.executedByName.toLowerCase().includes(query)
    )
  })

  const formatDuration = (ms?: number) => {
    if (!ms) return "-"
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executions</h1>
          <p className="text-muted-foreground mt-1">
            Track test execution results
          </p>
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

  if (!hierarchySelection) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executions</h1>
          <p className="text-muted-foreground mt-1">
            Select a test plan to view executions
          </p>
        </div>
        <HierarchySelector onSelect={handleHierarchySelect} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Executions</h1>
        <div className="mt-1">
          <HierarchyBreadcrumb
            projectName={selectedProject.name}
            planName={hierarchySelection.planName}
            suiteName={hierarchySelection.suiteName}
            onChange={() => setHierarchySelection(null)}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search executions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <ExecutionsSkeleton />
      ) : filteredExecutions.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<PlayCircle className="h-8 w-8 text-muted-foreground" />}
              title="No executions yet"
              description={searchQuery ? "No executions match your search" : "No executions have been run for this plan"}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Case</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Executed By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Platform</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExecutions.map((exec) => (
                <TableRow key={exec.id}>
                  <TableCell>
                    <p className="font-medium">{exec.testCaseTitle}</p>
                    {exec.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{exec.notes}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[exec.status.value] || statusColors.not_run}>
                      {exec.status.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{exec.executedByName}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(exec.executedAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatDuration(exec.durationMs)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {exec.platform && <span>{exec.platform}</span>}
                      {exec.environment && <span>({exec.environment})</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
