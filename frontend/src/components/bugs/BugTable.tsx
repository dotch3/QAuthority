"use client"

import { useTranslations } from "next-intl"
import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import type { Bug, BugStats, CreateBugInput, UpdateBugInput } from "@/types/bug"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import { EvidenceManager } from "@/components/evidence/EvidenceManager"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Plus,
  Search,
  ExternalLink,
  Edit,
  Trash2,
  Bug as BugIcon,
  Link,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useEnums } from "@/hooks/useEnums"

const priorityColors: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  critical: "bg-red-500/10 text-red-600 border-red-500/20",
}

interface BugTableProps {
  projectId: string
  executionId?: string
  onRefresh?: () => void
  onCreateBug?: (bug: Bug) => void
}

function BugTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 max-w-sm" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Priority</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Severity</th>
              <th className="px-4 py-3 text-center text-sm font-medium">Executions</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Reported By</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b">
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function BugTable({ projectId, executionId, onRefresh, onCreateBug }: BugTableProps) {
  const t = useTranslations("common")
  const { enums: bugEnums } = useEnums(["bug_status", "bug_priority", "bug_severity", "bug_source"])
  const BUG_STATUSES = bugEnums["bug_status"] ?? []
  const BUG_PRIORITIES = bugEnums["bug_priority"] ?? []
  const BUG_SEVERITIES = bugEnums["bug_severity"] ?? []
  const BUG_SOURCES = bugEnums["bug_source"] ?? []
  const [bugs, setBugs] = useState<Bug[]>([])
  const [stats, setStats] = useState<BugStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newBugId, setNewBugId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<UpdateBugInput>({})
  const [createForm, setCreateForm] = useState<CreateBugInput>({
    title: "",
    description: "",
    statusId: "seed-bug_status-open",
    priorityId: "seed-bug_priority-medium",
    severityId: "seed-bug_severity-major",
    sourceId: "seed-bug_source-internal",
  })
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [availableExecutions, setAvailableExecutions] = useState<any[]>([])
  const [linkedExecutionIds, setLinkedExecutionIds] = useState<string[]>([])
  const [isLoadingExecutions, setIsLoadingExecutions] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Bug | null>(null)

  const loadBugs = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await api.get<Bug[]>(`/projects/${projectId}/bugs`)
      setBugs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bugs")
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const loadStats = useCallback(async () => {
    try {
      const data = await api.get<BugStats>(`/projects/${projectId}/bugs/stats`)
      setStats(data)
    } catch (err) {
      console.error("Failed to load bug stats:", err)
    }
  }, [projectId])

  useEffect(() => {
    loadBugs()
    loadStats()
  }, [loadBugs, loadStats])

  const handleCreateBug = async () => {
    try {
      const bug = await api.post<Bug>(`/projects/${projectId}/bugs`, createForm)
      if (executionId) {
        await api.post(`/bugs/${bug.id}/executions/${executionId}`)
      }
      setBugs([bug, ...bugs])
      setNewBugId(bug.id)
      setCreateForm({
        title: "",
        description: "",
        statusId: "seed-bug_status-open",
        priorityId: "seed-bug_priority-medium",
        severityId: "seed-bug_severity-major",
        sourceId: "seed-bug_source-internal",
        actualResult: "",
        expectedResult: "",
      })
      onCreateBug?.(bug)
      onRefresh?.()
      toast.success("Bug created successfully")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bug")
      toast.error("Failed to create bug")
    }
  }

  const loadExecutions = async () => {
    setIsLoadingExecutions(true)
    try {
      const data = await api.get<any[]>(`/projects/${projectId}/executions`)
      setAvailableExecutions(data)
      const linkedIds = selectedBug?.executions?.map((e) => e.id) || []
      setLinkedExecutionIds(linkedIds)
    } catch (err) {
      console.error("Failed to load executions:", err)
    } finally {
      setIsLoadingExecutions(false)
    }
  }

  const handleOpenLinkDialog = () => {
    loadExecutions()
    setIsLinkDialogOpen(true)
  }

  const handleLinkExecution = async (executionId: string) => {
    if (!selectedBug) return
    try {
      if (linkedExecutionIds.includes(executionId)) {
        await api.delete(`/bugs/${selectedBug.id}/executions/${executionId}`)
        setLinkedExecutionIds(linkedExecutionIds.filter((id) => id !== executionId))
      } else {
        await api.post(`/bugs/${selectedBug.id}/executions/${executionId}`)
        setLinkedExecutionIds([...linkedExecutionIds, executionId])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link execution")
    }
  }

  const handleUpdateBug = async () => {
    if (!selectedBug) return
    try {
      const updated = await api.patch<Bug>(`/bugs/${selectedBug.id}`, editForm)
      setBugs(bugs.map((b) => (b.id === updated.id ? updated : b)))
      setSelectedBug(updated)
      setIsEditDialogOpen(false)
      setEditForm({})
      onRefresh?.()
      toast.success("Bug updated successfully")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update bug")
      toast.error("Failed to update bug")
    }
  }

  const handleDeleteBug = async (bug: Bug) => {
    try {
      await api.delete(`/bugs/${bug.id}`)
      setBugs(bugs.filter((b) => b.id !== bug.id))
      if (selectedBug?.id === bug.id) {
        setSelectedBug(null)
      }
      onRefresh?.()
      toast.success("Bug deleted successfully")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bug")
      toast.error("Failed to delete bug")
    }
  }

  const [sortField, setSortField] = useState<"title" | "status" | "priority" | "severity">("title")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const SEVERITY_ORDER: Record<string, number> = { blocker: 0, critical: 1, major: 2, minor: 3, trivial: 4 }

  const filteredBugs = bugs.filter(
    (bug) =>
      bug.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bug.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bug.externalId?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedBugs = useMemo(() => {
    return [...filteredBugs].sort((a, b) => {
      let cmp = 0
      if (sortField === "title") {
        cmp = a.title.localeCompare(b.title)
      } else if (sortField === "status") {
        cmp = (a.status?.label ?? "").localeCompare(b.status?.label ?? "")
      } else if (sortField === "priority") {
        cmp = (PRIORITY_ORDER[a.priority?.value ?? ""] ?? 99) - (PRIORITY_ORDER[b.priority?.value ?? ""] ?? 99)
      } else if (sortField === "severity") {
        cmp = (SEVERITY_ORDER[a.severity?.value ?? ""] ?? 99) - (SEVERITY_ORDER[b.severity?.value ?? ""] ?? 99)
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filteredBugs, sortField, sortDir])

  const toggleSort = (field: "title" | "status" | "priority" | "severity") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const SortIcon = ({ field }: { field: "title" | "status" | "priority" | "severity" }) => {
    if (sortField !== field) return <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
    return sortDir === "asc" ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
  }

  if (isLoading) {
    return <BugTableSkeleton />
  }

  if (error && bugs.length === 0) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-4">
          <div className="text-destructive">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bugs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("create")} Bug
        </Button>
      </div>

      {stats && stats.byStatus && (
        <div className="flex gap-4 text-sm">
          <div className="px-3 py-1.5 rounded-md bg-muted">
            Total: <strong>{stats.total}</strong>
          </div>
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <div key={status} className="px-3 py-1.5 rounded-md bg-muted">
              {status}: <strong>{count}</strong>
            </div>
          ))}
        </div>
      )}

      {filteredBugs.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<BugIcon className="h-8 w-8 text-muted-foreground" />}
              title="No bugs yet"
              description={searchQuery ? "No bugs match your search" : "Create your first bug to start tracking issues"}
              action={
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Bug
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <button className="flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("title")}>
                    Title <SortIcon field="title" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <button className="flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("status")}>
                    Status <SortIcon field="status" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <button className="flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("priority")}>
                    Priority <SortIcon field="priority" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <button className="flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("severity")}>
                    Severity <SortIcon field="severity" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium">Executions</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Reported By</th>
                <th className="px-4 py-3 text-right text-sm font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedBugs.map((bug) => (
                <tr key={bug.id} className="border-b">
                  <td className="px-4 py-3 max-w-[250px]">
                    <button
                      onClick={() => setSelectedBug(bug)}
                      className="text-left hover:underline w-full"
                    >
                      <div className="font-medium truncate" title={bug.title}>{bug.title}</div>
                      {bug.externalId && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>{bug.externalId}</span>
                          {bug.externalUrl && (
                            <a
                              href={bug.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      style={{
                        backgroundColor: `${bug.status?.color || '#6b7280'}20`,
                        color: bug.status?.color || '#6b7280',
                        borderColor: `${bug.status?.color || '#6b7280'}40`,
                      }}
                      variant="outline"
                    >
                      {bug.status?.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={priorityColors[bug.priority.value] || ""}
                      variant="outline"
                    >
                      {bug.priority.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{bug.severity.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {bug._count?.executions ?? 0}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {bug.reportedBy.name || bug.reportedBy.email}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBug(bug)
                          setEditForm({})
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(bug)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selectedBug} onOpenChange={() => setSelectedBug(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bug Details</DialogTitle>
            <DialogDescription>{selectedBug?.title}</DialogDescription>
          </DialogHeader>
          {selectedBug && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge
                    style={{
                      backgroundColor: `${selectedBug.status.color}20`,
                      color: selectedBug.status.color,
                      borderColor: `${selectedBug.status.color}40`,
                    }}
                    variant="outline"
                  >
                    {selectedBug.status.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <Badge
                    className={
                      priorityColors[selectedBug.priority.value] || ""
                    }
                    variant="outline"
                  >
                    {selectedBug.priority.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Severity</p>
                  <p>{selectedBug.severity.label}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p>{selectedBug.source?.label ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reported By</p>
                  <p>{selectedBug.reportedBy.name || selectedBug.reportedBy.email}</p>
                </div>
                {selectedBug.assignedTo && (
                  <div>
                    <p className="text-muted-foreground">Assigned To</p>
                    <p>{selectedBug.assignedTo.name || selectedBug.assignedTo.email}</p>
                  </div>
                )}
              </div>
              {selectedBug.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm mt-1">{selectedBug.description}</p>
                </div>
              )}
              {selectedBug.externalUrl && (
                <div>
                  <a
                    href={selectedBug.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-500 hover:underline"
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    View in {selectedBug.source?.label ?? "external tracker"}
                  </a>
                </div>
              )}
              {selectedBug.executions && selectedBug.executions.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Linked Executions</p>
                  <div className="space-y-1">
                    {selectedBug.executions.map((exec) => (
                      <div
                        key={exec.id}
                        className="flex items-center justify-between p-2 rounded-md border text-sm"
                      >
                        <span>{exec.testCase.title}</span>
                        <Badge
                          style={{
                            backgroundColor: `${exec.status.color}20`,
                            color: exec.status.color,
                          }}
                          variant="outline"
                        >
                          {exec.status.label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bug</DialogTitle>
            <DialogDescription>
              {selectedBug?.externalId
                ? `Update bug ${selectedBug.externalId}`
                : "Update the bug details, status, and evidence."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editForm.title ?? selectedBug?.title ?? ""}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <textarea
                id="edit-description"
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editForm.description ?? selectedBug?.description ?? ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="Detailed steps to reproduce..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={editForm.statusId ?? selectedBug?.statusId ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, statusId: e.target.value })}
                >
                  {BUG_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <select
                  id="edit-priority"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={editForm.priorityId ?? selectedBug?.priorityId ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, priorityId: e.target.value })}
                >
                  {BUG_PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="edit-severity">Severity</Label>
                <select
                  id="edit-severity"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={editForm.severityId ?? selectedBug?.severityId ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, severityId: e.target.value })}
                >
                  {BUG_SEVERITIES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="edit-source">Source</Label>
                <select
                  id="edit-source"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={editForm.sourceId ?? selectedBug?.sourceId ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, sourceId: e.target.value })}
                >
                  {BUG_SOURCES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={handleOpenLinkDialog}>
                <Link className="mr-2 h-4 w-4" />
                Link Executions
              </Button>
              {linkedExecutionIds.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {linkedExecutionIds.length} execution(s) linked
                </p>
              )}
            </div>
            {selectedBug && (
              <div className="grid gap-2">
                <Label>Evidence</Label>
                <EvidenceManager
                  entityType="bug"
                  entityId={selectedBug.id}
                  projectId={projectId}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBug}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Link Executions</DialogTitle>
            <DialogDescription>Select executions to link to this bug.</DialogDescription>
          </DialogHeader>
          {isLoadingExecutions ? (
            <div className="flex justify-center py-8">Loading...</div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {availableExecutions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No executions found</p>
              ) : (
                availableExecutions.map((exec) => (
                  <button
                    key={exec.id}
                    onClick={() => handleLinkExecution(exec.id)}
                    className={`w-full p-3 text-left rounded-md border ${
                      linkedExecutionIds.includes(exec.id) ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{exec.testCase?.title || "Unknown"}</span>
                      {linkedExecutionIds.includes(exec.id) ? (
                        <Badge variant="outline" className="text-xs">Linked</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-muted">+ Link</Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsLinkDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        if (!open) { setNewBugId(null) }
        setIsCreateDialogOpen(open)
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {!newBugId ? (
            <>
              <DialogHeader>
                <DialogTitle>Create Bug</DialogTitle>
                <DialogDescription>Report a new bug.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="create-title">Title *</Label>
                  <Input
                    id="create-title"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="Brief description of the bug"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="create-description">Description</Label>
                  <textarea
                    id="create-description"
                    className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={createForm.description ?? ""}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, description: e.target.value })
                    }
                    placeholder="Detailed steps to reproduce..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="create-expected">Expected Result</Label>
                    <textarea
                      id="create-expected"
                      className="mt-1 min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={createForm.expectedResult ?? ""}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, expectedResult: e.target.value })
                      }
                      placeholder="What should have happened..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-actual">Actual Result</Label>
                    <textarea
                      id="create-actual"
                      className="mt-1 min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={createForm.actualResult ?? ""}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, actualResult: e.target.value })
                      }
                      placeholder="What actually happened..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="create-status">Status</Label>
                    <select
                      id="create-status"
                      className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={createForm.statusId}
                      onChange={(e) => setCreateForm({ ...createForm, statusId: e.target.value })}
                    >
                      {BUG_STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="create-priority">Priority</Label>
                    <select
                      id="create-priority"
                      className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={createForm.priorityId}
                      onChange={(e) => setCreateForm({ ...createForm, priorityId: e.target.value })}
                    >
                      {BUG_PRIORITIES.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="create-severity">Severity</Label>
                    <select
                      id="create-severity"
                      className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={createForm.severityId}
                      onChange={(e) => setCreateForm({ ...createForm, severityId: e.target.value })}
                    >
                      {BUG_SEVERITIES.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="create-source">Source</Label>
                    <select
                      id="create-source"
                      className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={createForm.sourceId}
                      onChange={(e) => setCreateForm({ ...createForm, sourceId: e.target.value })}
                    >
                      {BUG_SOURCES.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBug} disabled={!createForm.title}>
                  Create Bug
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Add Evidence</DialogTitle>
                <DialogDescription>
                  Bug created. Optionally attach screenshots, logs, or other files before closing.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <EvidenceManager
                  entityType="bug"
                  entityId={newBugId}
                  projectId={projectId}
                />
              </div>
              <DialogFooter>
                <Button onClick={() => { setNewBugId(null); setIsCreateDialogOpen(false) }}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}
        title="Delete Bug"
        description={`Are you sure you want to delete this bug? This action cannot be undone.`}
        onConfirm={() => deleteConfirm && handleDeleteBug(deleteConfirm)}
      />
    </div>
  )
}
