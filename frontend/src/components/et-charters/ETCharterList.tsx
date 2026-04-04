"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Plus,
  Search,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  Compass,
  AlertCircle,
  Loader2,
  Copy,
  Move,
  User,
  Calendar,
  Clock,
  Bug,
  FileText,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { HeuristicPicker } from "@/components/heuristics/HeuristicList"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useProject } from "@/contexts/ProjectContext"
import { EvidenceManager } from "@/components/evidence/EvidenceManager"

interface TestCase {
  id: string
  title: string
  description?: string
  priority: { value: string; label: string; color: string }
  type: { value: string; label: string }
  suite: { id: string; name: string }
  status: string
  tags: Array<{ id: string; name: string; color: string }>
  assignees: Array<{ id: string; name?: string; email: string }>
  lastExecution?: { status: { value: string; label: string; color: string }; executedAt: string }
  _count: { executions: number }
}

interface User {
  id: string
  name?: string
  email: string
}

interface Heuristic {
  id: string
  name: string
  template: string
  personas: Array<{ id: string; name: string; description?: string }>
}

interface ETCharter {
  id: string
  charter: string
  areas: string[]
  startDate?: string
  endDate?: string
  status: string // NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED
  testerId?: string
  tester?: { id: string; name?: string; email: string }
  duration?: string
  testDesignPercentage?: number
  bugInvestigationPercentage?: number
  sessionSetupPercentage?: number
  charterVsOpportunity?: number
  dataFiles: string[]
  testNotes: Array<{ action: string; bullets: string[] }>
  opportunities: Array<{ action: string; bullets: string[] }>
  bugs: Array<{ name: string; steps: string[]; expected: string; actual: string }>
  issues: Array<{ description: string }>
  createdAt: string
  updatedAt: string
  linkedHeuristics: Array<{ heuristic: Heuristic }>
  _count: { bugs: number; testCases: number }
}

interface ETCharterListProps {
  suiteId: string
  suiteName: string
  cases: TestCase[]
  onRefresh: () => void
}

const priorityColors: Record<string, string> = {
  critical: "border-red-500 text-red-500",
  high: "border-orange-500 text-orange-500",
  medium: "border-yellow-500 text-yellow-500",
  low: "border-blue-500 text-blue-500",
}

const statusColors: Record<string, string> = {
  pass: "bg-green-500/10 text-green-600 border-green-500/20",
  fail: "bg-red-500/10 text-red-600 border-red-500/20",
  blocked: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  not_run: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  skipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
}

const durationOptions = [
  { value: "short", label: "Short (60 min)", minutes: 60 },
  { value: "normal", label: "Normal (90 min)", minutes: 90 },
  { value: "long", label: "Long (120 min)", minutes: 120 },
]

function pctToMins(pct: string, duration: string): string {
  const total = durationOptions.find((d) => d.value === duration)?.minutes ?? 90
  return `${Math.round((parseInt(pct) / 100) * total)} min`
}

export function ETCharterList({ suiteId, suiteName, cases, onRefresh }: ETCharterListProps) {
  const [charters, setCharters] = useState<ETCharter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingCharter, setEditingCharter] = useState<ETCharter | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<ETCharter | null>(null)
  const [copyMoveCharter, setCopyMoveCharter] = useState<{ charter: ETCharter; mode: "copy" | "move" } | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [expandedCharter, setExpandedCharter] = useState<string | null>(null)
  const { selectedProject } = useProject()

  const loadCharters = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.get<any[]>(`/suites/${suiteId}/et-charters`)
      const mappedCharters: ETCharter[] = data.map((c: any) => ({
        id: c.id,
        charter: c.charter,
        areas: c.areas || [],
        startDate: c.startDate,
        endDate: c.endDate,
        status: c.status || "NOT_STARTED",
        testerId: c.testerId,
        tester: c.tester,
        duration: c.duration,
        testDesignPercentage: c.testDesignPercentage,
        bugInvestigationPercentage: c.bugInvestigationPercentage,
        sessionSetupPercentage: c.sessionSetupPercentage,
        charterVsOpportunity: c.charterVsOpportunity,
        dataFiles: c.dataFiles || [],
        testNotes: c.testNotes || [],
        opportunities: c.opportunities || [],
        bugs: c.bugs || [],
        linkedHeuristics: c.linkedHeuristics || [],
        issues: c.issues || [],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        _count: { bugs: c._count?.bugs || 0, testCases: c._count?.testCases || 0 },
      }))
      setCharters(mappedCharters)
    } catch (err) {
      console.error("Failed to load ET Charters:", err)
    } finally {
      setIsLoading(false)
    }
  }, [suiteId])

  const loadUsers = useCallback(async () => {
    try {
      let data
      if (selectedProject) {
        data = await api.get<User[]>(`/projects/${selectedProject.id}/members`)
        data = data.map((m: any) => ({ id: m.user.id, name: m.user.name, email: m.user.email }))
      } else {
        data = await api.get<User[]>("/users")
      }
      setUsers(data)
    } catch (err) {
      console.error("Failed to load users:", err)
    }
  }, [selectedProject])

  useEffect(() => {
    loadCharters()
    loadUsers()
  }, [loadCharters, loadUsers])

  const handleCreateCharter = async (data: {
    charter: string
    areas?: string[]
    startDate?: string
    endDate?: string
    status?: string
    testerId?: string
    duration?: string
    testDesignPercentage?: number
    bugInvestigationPercentage?: number
    sessionSetupPercentage?: number
    charterVsOpportunity?: number
    dataFiles?: string[]
    testNotes?: Array<{ action: string; bullets: string[] }>
    opportunities?: Array<{ action: string; bullets: string[] }>
    bugs?: Array<{ name: string; steps: string[]; expected: string; actual: string }>
    issues?: Array<{ description: string }>
  }) => {
    setIsCreating(true)
    try {
      await api.post(`/suites/${suiteId}/et-charters`, {
        charter: data.charter,
        areas: data.areas,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        testerId: data.testerId,
        duration: data.duration,
        testDesignPercentage: data.testDesignPercentage,
        bugInvestigationPercentage: data.bugInvestigationPercentage,
        sessionSetupPercentage: data.sessionSetupPercentage,
        charterVsOpportunity: data.charterVsOpportunity,
        dataFiles: data.dataFiles,
        testNotes: data.testNotes,
        opportunities: data.opportunities,
        bugs: data.bugs,
        issues: data.issues,
      })
      setIsCreateOpen(false)
      loadCharters()
      onRefresh()
    } catch (err) {
      console.error("Failed to create charter:", err)
      alert(err instanceof Error ? err.message : "Failed to create ET Charter")
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateCharter = async (data: {
    charter: string
    areas?: string[]
    startDate?: string
    testerId?: string
    duration?: string
    testDesignPercentage?: number
    bugInvestigationPercentage?: number
    sessionSetupPercentage?: number
    charterVsOpportunity?: number
    dataFiles?: string[]
    testNotes?: Array<{ action: string; bullets: string[] }>
    opportunities?: Array<{ action: string; bullets: string[] }>
    bugs?: Array<{ name: string; steps: string[]; expected: string; actual: string }>
    issues?: Array<{ description: string }>
    endDate?: string
    status?: string
  }) => {
    if (!editingCharter) return
    try {
      await api.patch(`/et-charters/${editingCharter.id}`, {
        charter: data.charter,
        areas: data.areas,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        testerId: data.testerId,
        duration: data.duration,
        testDesignPercentage: data.testDesignPercentage,
        bugInvestigationPercentage: data.bugInvestigationPercentage,
        sessionSetupPercentage: data.sessionSetupPercentage,
        charterVsOpportunity: data.charterVsOpportunity,
        dataFiles: data.dataFiles,
        testNotes: data.testNotes,
        opportunities: data.opportunities,
        bugs: data.bugs,
        issues: data.issues,
      })
      setEditingCharter(null)
      loadCharters()
      onRefresh()
    } catch (err) {
      console.error("Failed to update charter:", err)
      alert(err instanceof Error ? err.message : "Failed to update ET Charter")
    }
  }

  const handleDeleteCharter = async (charter: ETCharter) => {
    setDeletingId(charter.id)
    try {
      await api.delete(`/et-charters/${charter.id}`)
      setCharters(charters.filter((c) => c.id !== charter.id))
      onRefresh()
    } catch (err) {
      console.error("Failed to delete charter:", err)
      alert(err instanceof Error ? err.message : "Failed to delete ET Charter")
    } finally {
      setDeletingId(null)
    }
  }

  const handleCopyMove = async (targetSuiteId: string) => {
    if (!copyMoveCharter) return
    try {
      if (copyMoveCharter.mode === "copy") {
        await api.post(`/et-charters/${copyMoveCharter.charter.id}/copy`, {
          targetSuiteId,
        })
      } else {
        await api.patch(`/et-charters/${copyMoveCharter.charter.id}/move`, {
          targetSuiteId,
        })
      }
      setCopyMoveCharter(null)
      loadCharters()
      onRefresh()
    } catch (err) {
      console.error(`Failed to ${copyMoveCharter.mode} charter:`, err)
      alert(`Failed to ${copyMoveCharter.mode} charter. Please try again.`)
    }
  }

  const filteredCharters = charters.filter((c) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      c.charter.toLowerCase().includes(query) ||
      c.areas.some((a) => a.toLowerCase().includes(query)) ||
      c.tester?.name?.toLowerCase().includes(query) ||
      c.tester?.email.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-4 flex-wrap items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search charters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-blue-500/20"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")} 
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>

        <CharterDialog
          users={users}
          onSubmit={handleCreateCharter}
          isSubmitting={isCreating}
          trigger={
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
              <Plus className="mr-2 h-4 w-4" />
              Create ET Charter
            </Button>
          }
          onOpenChange={(open) => {
            setIsCreateOpen(open)
            if (open) loadUsers()
          }}
          open={isCreateOpen}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredCharters.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <CardContent className="p-12 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950 mx-auto mb-4">
              <Compass className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {searchQuery ? "No charters found" : "No ET Charters Yet"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              {searchQuery 
                ? "Try adjusting your search terms" 
                : "Create your first exploratory testing charter to document your testing session"}
            </p>
            {!searchQuery && (
              <CharterDialog
                users={users}
                onSubmit={handleCreateCharter}
                isSubmitting={isCreating}
                trigger={
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                    <Plus className="mr-2 h-4 w-4" />
                    Create ET Charter
                  </Button>
                }
                onOpenChange={(open) => {
                  setIsCreateOpen(open)
                  if (open) loadUsers()
                }}
                open={isCreateOpen}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredCharters.map((charter) => (
            <CharterCard
              key={charter.id}
              charter={charter}
              users={users}
              isExpanded={expandedCharter === charter.id}
              onToggle={() => setExpandedCharter(expandedCharter === charter.id ? null : charter.id)}
              onEdit={() => setEditingCharter(charter)}
              onDelete={() => setDeleteConfirm(charter)}
              onCopy={() => setCopyMoveCharter({ charter, mode: "copy" })}
              onMove={() => setCopyMoveCharter({ charter, mode: "move" })}
              isDeleting={deletingId === charter.id}
            />
          ))}
        </div>
      )}

      {editingCharter && (
        <CharterDialog
          users={users}
          onSubmit={handleUpdateCharter}
          isSubmitting={false}
          trigger={<span />}
          onOpenChange={(open) => !open && setEditingCharter(null)}
          open={true}
          charter={editingCharter}
        />
      )}

      {copyMoveCharter && (
        <CopyMoveCharterDialog
          mode={copyMoveCharter.mode}
          charter={copyMoveCharter.charter}
          onClose={() => setCopyMoveCharter(null)}
          onSelect={handleCopyMove}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}
        title="Delete ET Charter"
        description={deleteConfirm ? `Delete ET Charter "${deleteConfirm.charter}"? This cannot be undone.` : ""}
        onConfirm={() => deleteConfirm && handleDeleteCharter(deleteConfirm)}
      />
    </div>
  )
}

interface CharterCardProps {
  charter: ETCharter
  users: User[]
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onCopy: () => void
  onMove: () => void
  isDeleting: boolean
}

function CharterCard({
  charter,
  users,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onCopy,
  onMove,
  isDeleting,
}: CharterCardProps) {
  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-2 mt-0.5">
              <Compass className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold leading-tight text-slate-900 dark:text-slate-100">
                {charter.charter}
              </h3>
              {charter.areas.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {charter.areas.slice(0, 3).map((area, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary" 
                      className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      {area}
                    </Badge>
                  ))}
                  {charter.areas.length > 3 && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      +{charter.areas.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm">
                {charter.status && (
                  <Badge 
                    variant={
                      charter.status === 'COMPLETED' ? 'default' :
                      charter.status === 'IN_PROGRESS' ? 'default' :
                      charter.status === 'CANCELLED' ? 'secondary' :
                      'outline'
                    }
                    className={
                      charter.status === 'COMPLETED' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                      charter.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                      charter.status === 'CANCELLED' ? 'bg-gray-500/10 text-gray-600 border-gray-500/20' :
                      ''
                    }
                  >
                    {charter.status === 'NOT_STARTED' ? 'Not Started' :
                     charter.status === 'IN_PROGRESS' ? 'In Progress' :
                     charter.status === 'COMPLETED' ? 'Completed' :
                     charter.status === 'CANCELLED' ? 'Cancelled' : charter.status}
                  </Badge>
                )}
                {charter.tester && (
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <User className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[120px]">{charter.tester.name || charter.tester.email}</span>
                  </span>
                )}
                {charter.startDate && (
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(charter.startDate).toLocaleDateString()}
                    {charter.endDate && ` → ${new Date(charter.endDate).toLocaleDateString()}`}
                  </span>
                )}
                {charter.duration && (
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    {durationOptions.find((d) => d.value === charter.duration)?.label.split(" ")[0] || charter.duration}
                  </span>
                )}
                {charter.bugs.length > 0 && (
                  <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-medium">
                    <Bug className="h-3.5 w-3.5" />
                    {charter.bugs.length} bugs
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopy() }}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Suite
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove() }}>
                  <Move className="mr-2 h-4 w-4" />
                  Move to Suite
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete() }}
                  disabled={isDeleting}
                  className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="grid gap-5">
            {charter.testNotes.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Test Notes
                </h4>
                <div className="space-y-3 pl-5">
                  {charter.testNotes.map((note, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs mr-2">
                          {i + 1}
                        </span>
                        {note.action}
                      </p>
                      {note.bullets.length > 0 && (
                        <ul className="list-disc list-inside text-sm text-slate-500 dark:text-slate-400 mt-2 ml-7">
                          {note.bullets.map((bullet, j) => (
                            <li key={j}>{bullet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {charter.opportunities.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Opportunities
                </h4>
                <div className="space-y-3 pl-5">
                  {charter.opportunities.map((opp, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 text-xs mr-2">
                          {i + 1}
                        </span>
                        {opp.action}
                      </p>
                      {opp.bullets.length > 0 && (
                        <ul className="list-disc list-inside text-sm text-slate-500 dark:text-slate-400 mt-2 ml-7">
                          {opp.bullets.map((bullet, j) => (
                            <li key={j}>{bullet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {charter.bugs.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <Bug className="h-4 w-4" />
                  Bugs Found ({charter.bugs.length})
                </h4>
                <div className="space-y-3 pl-5">
                  {charter.bugs.map((bug, i) => (
                    <Card key={i} className="p-4 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-300 text-xs mr-2">
                          {i + 1}
                        </span>
                        {bug.name}
                      </p>
                      {bug.steps.length > 0 && (
                        <div className="mt-3 ml-7">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Steps to Reproduce</p>
                          <ol className="list-decimal list-inside text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {bug.steps.map((step, j) => (
                              <li key={j}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {bug.expected && (
                        <p className="text-xs mt-3 ml-7">
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">Expected: </span>
                          <span className="text-slate-600 dark:text-slate-400">{bug.expected}</span>
                        </p>
                      )}
                      {bug.actual && (
                        <p className="text-xs mt-1 ml-7">
                          <span className="font-medium text-red-600 dark:text-red-400">Actual: </span>
                          <span className="text-slate-600 dark:text-slate-400">{bug.actual}</span>
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {charter.issues.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Issues
                </h4>
                <div className="space-y-2 pl-5">
                  {charter.issues.map((issue, i) => (
                    <div 
                      key={i} 
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 bg-red-50 dark:bg-red-950/30 rounded-lg p-3 border border-red-200 dark:border-red-900/50"
                    >
                      <span className="font-medium text-red-600 dark:text-red-400">{i + 1}.</span>
                      <span>{issue.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {charter.testDesignPercentage !== undefined && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Test Design</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">{charter.testDesignPercentage}%</p>
                </div>
                {charter.bugInvestigationPercentage !== undefined && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Bug Investigation</p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-1">{charter.bugInvestigationPercentage}%</p>
                  </div>
                )}
                {charter.sessionSetupPercentage !== undefined && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Session Setup</p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">{charter.sessionSetupPercentage}%</p>
                  </div>
                )}
                {charter.charterVsOpportunity !== undefined && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Charter vs Opportunity</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{charter.charterVsOpportunity}%</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

interface CharterDialogProps {
  users: User[]
  onSubmit: (data: {
    charter: string
    areas?: string[]
    startDate?: string
    endDate?: string
    status?: string
    testerId?: string
    duration?: string
    testDesignPercentage?: number
    bugInvestigationPercentage?: number
    sessionSetupPercentage?: number
    charterVsOpportunity?: number
    dataFiles?: string[]
    testNotes?: Array<{ action: string; bullets: string[] }>
    opportunities?: Array<{ action: string; bullets: string[] }>
    bugs?: Array<{ name: string; steps: string[]; expected: string; actual: string }>
    issues?: Array<{ description: string }>
    heuristicIds?: string[]
  }) => Promise<void>
  isSubmitting: boolean
  trigger: React.ReactNode
  onOpenChange: (open: boolean) => void
  open: boolean
  charter?: ETCharter
}

function CharterDialog({ users, onSubmit, isSubmitting, trigger, onOpenChange, open, charter }: CharterDialogProps) {
  const { selectedProject } = useProject()
  const [charterText, setCharterText] = useState(charter?.charter || "")
  const [areas, setAreas] = useState<string[]>(charter?.areas || [""])
  const [startDate, setStartDate] = useState(charter?.startDate?.split("T")[0] || "")
  const [endDate, setEndDate] = useState(charter?.endDate?.split("T")[0] || "")
  const [status, setStatus] = useState(charter?.status || "NOT_STARTED")
  const [selectedHeuristicIds, setSelectedHeuristicIds] = useState<string[]>(
    charter?.linkedHeuristics?.map((lh) => lh.heuristic.id) || []
  )
  const [testerId, setTesterId] = useState(charter?.testerId || "")
  const [duration, setDuration] = useState(charter?.duration || "normal")
  const [testDesignPercentage, setTestDesignPercentage] = useState(charter?.testDesignPercentage?.toString() || "40")
  const [bugInvestigationPercentage, setBugInvestigationPercentage] = useState(charter?.bugInvestigationPercentage?.toString() || "30")
  const [sessionSetupPercentage, setSessionSetupPercentage] = useState(charter?.sessionSetupPercentage?.toString() || "10")
  const [charterVsOpportunity, setCharterVsOpportunity] = useState(charter?.charterVsOpportunity?.toString() || "80")
  const [dataFiles, setDataFiles] = useState<string[]>(charter?.dataFiles || [""])
  const [testNotes, setTestNotes] = useState<Array<{ action: string; bullets: string[] }>>(
    charter?.testNotes || [{ action: "", bullets: [""] }]
  )
  const [opportunities, setOpportunities] = useState<Array<{ action: string; bullets: string[] }>>(
    charter?.opportunities || [{ action: "", bullets: [""] }]
  )
  const [bugs, setBugs] = useState<Array<{ name: string; steps: string[]; expected: string; actual: string }>>(
    charter?.bugs || [{ name: "", steps: [""], expected: "", actual: "" }]
  )
  const [issues, setIssues] = useState<Array<{ description: string }>>(
    charter?.issues || [{ description: "" }]
  )
  const [error, setError] = useState("")
  const [charterError, setCharterError] = useState("")
  const [activeTab, setActiveTab] = useState("charter")

  const isEditing = !!charter

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setCharterError("")

    if (!charterText.trim()) {
      setCharterError("Charter is required")
      setActiveTab("charter")
      return
    }

    try {
      await onSubmit({
        charter: charterText.trim(),
        areas: areas.filter((a) => a.trim()),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: status || "NOT_STARTED",
        testerId: testerId || undefined,
        duration: duration || undefined,
        testDesignPercentage: testDesignPercentage ? parseInt(testDesignPercentage) : undefined,
        bugInvestigationPercentage: bugInvestigationPercentage ? parseInt(bugInvestigationPercentage) : undefined,
        sessionSetupPercentage: sessionSetupPercentage ? parseInt(sessionSetupPercentage) : undefined,
        charterVsOpportunity: charterVsOpportunity ? parseInt(charterVsOpportunity) : undefined,
        dataFiles: dataFiles.filter((f) => f.trim()),
        testNotes: testNotes.filter((n) => n.action.trim()).map((n) => ({
          action: n.action,
          bullets: n.bullets.filter((b) => b.trim()),
        })),
        opportunities: opportunities.filter((o) => o.action.trim()).map((o) => ({
          action: o.action,
          bullets: o.bullets.filter((b) => b.trim()),
        })),
        bugs: bugs.filter((b) => b.name.trim()),
        issues: issues.filter((i) => i.description.trim()),
        heuristicIds: selectedHeuristicIds,
      })

      if (!isEditing) {
        setCharterText("")
        setAreas([""])
        setStartDate("")
        setTesterId("")
        setDuration("normal")
        setActiveTab("charter")
        setTestDesignPercentage("40")
        setBugInvestigationPercentage("30")
        setSessionSetupPercentage("10")
        setCharterVsOpportunity("80")
        setDataFiles([""])
        setTestNotes([{ action: "", bullets: [""] }])
        setOpportunities([{ action: "", bullets: [""] }])
        setBugs([{ name: "", steps: [""], expected: "", actual: "" }])
        setIssues([{ description: "" }])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save ET Charter")
    }
  }

  const addArea = () => setAreas([...areas, ""])
  const removeArea = (index: number) => setAreas(areas.filter((_, i) => i !== index))
  const updateArea = (index: number, value: string) => {
    const newAreas = [...areas]
    newAreas[index] = value
    setAreas(newAreas)
  }

  const updateTestNote = (index: number, field: "action", value: string) => {
    const newNotes = [...testNotes]
    newNotes[index][field] = value
    setTestNotes(newNotes)
  }

  const updateTestNoteBullet = (noteIndex: number, bulletIndex: number, value: string) => {
    const newNotes = [...testNotes]
    newNotes[noteIndex].bullets[bulletIndex] = value
    setTestNotes(newNotes)
  }

  const addTestNoteBullet = (noteIndex: number) => {
    const newNotes = [...testNotes]
    newNotes[noteIndex].bullets.push("")
    setTestNotes(newNotes)
  }

  const removeTestNoteBullet = (noteIndex: number, bulletIndex: number) => {
    const newNotes = [...testNotes]
    newNotes[noteIndex].bullets = newNotes[noteIndex].bullets.filter((_, i) => i !== bulletIndex)
    setTestNotes(newNotes)
  }

  const addTestNote = () => setTestNotes([...testNotes, { action: "", bullets: [""] }])
  const removeTestNote = (index: number) => setTestNotes(testNotes.filter((_, i) => i !== index))

  const updateOpportunity = (index: number, field: "action", value: string) => {
    const newOpps = [...opportunities]
    newOpps[index][field] = value
    setOpportunities(newOpps)
  }

  const updateOppBullet = (oppIndex: number, bulletIndex: number, value: string) => {
    const newOpps = [...opportunities]
    newOpps[oppIndex].bullets[bulletIndex] = value
    setOpportunities(newOpps)
  }

  const addOppBullet = (oppIndex: number) => {
    const newOpps = [...opportunities]
    newOpps[oppIndex].bullets.push("")
    setOpportunities(newOpps)
  }

  const removeOppBullet = (oppIndex: number, bulletIndex: number) => {
    const newOpps = [...opportunities]
    newOpps[oppIndex].bullets = newOpps[oppIndex].bullets.filter((_, i) => i !== bulletIndex)
    setOpportunities(newOpps)
  }

  const addOpportunity = () => setOpportunities([...opportunities, { action: "", bullets: [""] }])
  const removeOpportunity = (index: number) => setOpportunities(opportunities.filter((_, i) => i !== index))

  const updateBug = (index: number, field: "name" | "steps" | "expected" | "actual", value: any) => {
    const newBugs = [...bugs]
    if (field === "steps" && typeof value === "string") {
      newBugs[index].steps = value ? [value] : []
    } else {
      newBugs[index][field] = value
    }
    setBugs(newBugs)
  }

  const addBug = () => setBugs([...bugs, { name: "", steps: [""], expected: "", actual: "" }])
  const removeBug = (index: number) => setBugs(bugs.filter((_, i) => i !== index))

  const updateIssue = (index: number, value: string) => {
    const newIssues = [...issues]
    newIssues[index].description = value
    setIssues(newIssues)
  }

  const addIssue = () => setIssues([...issues, { description: "" }])
  const removeIssue = (index: number) => setIssues(issues.filter((_, i) => i !== index))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit ET Charter" : "Create ET Charter"}</DialogTitle>
            <DialogDescription>
              Document your exploratory testing session
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="charter" className="relative">
                Charter
                {charterError && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-destructive" />}
              </TabsTrigger>
              <TabsTrigger value="session">Session</TabsTrigger>
              <TabsTrigger value="findings">Findings</TabsTrigger>
            </TabsList>

            {/* TAB 1: Charter — what you're testing and how */}
            <TabsContent value="charter" className="space-y-4 pt-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="charter">
                    Charter <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="charter"
                    value={charterText}
                    onChange={(e) => { setCharterText(e.target.value); if (charterError) setCharterError("") }}
                    placeholder="e.g., Verify checkout flow with multiple items in cart."
                    className={charterError ? "border-destructive" : ""}
                  />
                  {charterError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {charterError}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Areas Covered</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addArea}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                  {areas.map((area, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={area}
                        onChange={(e) => updateArea(i, e.target.value)}
                        placeholder="e.g., Shopping cart page"
                        className="flex-1"
                      />
                      {areas.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeArea(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid gap-2 pt-2 border-t">
                  <Label className="text-sm font-medium">Heuristics</Label>
                  <p className="text-xs text-muted-foreground">
                    Select testing heuristics to guide this session. Heuristics suggest what to look for and how to approach exploration.
                  </p>
                  <HeuristicPicker
                    selectedHeuristicIds={selectedHeuristicIds}
                    onToggle={(id) => {
                      if (selectedHeuristicIds.includes(id)) {
                        setSelectedHeuristicIds(selectedHeuristicIds.filter((hId) => hId !== id))
                      } else {
                        setSelectedHeuristicIds([...selectedHeuristicIds, id])
                      }
                    }}
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Session — who, when, how long, files, time split */}
            <TabsContent value="session" className="space-y-4 pt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="NOT_STARTED">Not Started</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tester">Tester</Label>
                    <select
                      id="tester"
                      value={testerId}
                      onChange={(e) => setTesterId(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Select tester</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duration</Label>
                    <select
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {durationOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 pt-2 border-t">
                  <div>
                    <p className="text-sm font-medium">Time split across activities</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Estimate how your session time was (or will be) distributed. The three activities must total 100%.
                    </p>
                  </div>

                  {(() => {
                    const tdePct = parseInt(testDesignPercentage)
                    const birPct = parseInt(bugInvestigationPercentage)
                    const ssPct = parseInt(sessionSetupPercentage)
                    const totalAllocated = tdePct + birPct + ssPct
                    const remaining = Math.max(0, 100 - totalAllocated)
                    const tdeMax = tdePct + remaining
                    const birMax = birPct + remaining
                    const ssMax  = ssPct  + remaining
                    return (
                      <>
                        {totalAllocated > 0 && (
                          <p className={`text-xs ${remaining === 0 ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                            {remaining === 0
                              ? "100% allocated — reduce a slider to reallocate"
                              : `${totalAllocated}% allocated · ${remaining}% remaining`}
                          </p>
                        )}

                        <div className="grid gap-2">
                          <div className="flex justify-between items-start">
                            <Label htmlFor="testDesign" className="text-sm">
                              Test Design & Execution
                              <span className="block text-xs font-normal text-muted-foreground">Exploring, testing ideas, running checks</span>
                            </Label>
                            <span className="text-sm font-medium tabular-nums text-right min-w-[52px]">
                              {pctToMins(testDesignPercentage, duration)}
                            </span>
                          </div>
                          <Input
                            id="testDesign"
                            type="range"
                            min="0"
                            max={tdeMax}
                            step="5"
                            value={testDesignPercentage}
                            onChange={(e) => setTestDesignPercentage(e.target.value)}
                            className="w-full"
                          />
                        </div>

                        <div className="grid gap-2">
                          <div className="flex justify-between items-start">
                            <Label htmlFor="bugInvest" className="text-sm">
                              Bug Investigation & Reporting
                              <span className="block text-xs font-normal text-muted-foreground">Reproducing, documenting, reporting defects</span>
                            </Label>
                            <span className="text-sm font-medium tabular-nums text-right min-w-[52px]">
                              {pctToMins(bugInvestigationPercentage, duration)}
                            </span>
                          </div>
                          <Input
                            id="bugInvest"
                            type="range"
                            min="0"
                            max={birMax}
                            step="5"
                            value={bugInvestigationPercentage}
                            onChange={(e) => setBugInvestigationPercentage(e.target.value)}
                            className="w-full"
                          />
                        </div>

                        <div className="grid gap-2">
                          <div className="flex justify-between items-start">
                            <Label htmlFor="sessionSetup" className="text-sm">
                              Session Setup
                              <span className="block text-xs font-normal text-muted-foreground">Reading docs, configuring environment, preparations</span>
                            </Label>
                            <span className="text-sm font-medium tabular-nums text-right min-w-[52px]">
                              {pctToMins(sessionSetupPercentage, duration)}
                            </span>
                          </div>
                          <Input
                            id="sessionSetup"
                            type="range"
                            min="0"
                            max={ssMax}
                            step="5"
                            value={sessionSetupPercentage}
                            onChange={(e) => setSessionSetupPercentage(e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </>
                    )
                  })()}

                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <Label htmlFor="charterVsOpp" className="text-sm">
                        On-Charter vs Opportunity
                        <span className="block text-xs font-normal text-muted-foreground">
                          How closely you followed the charter vs exploring unexpected areas
                        </span>
                      </Label>
                      <span className="text-sm font-medium tabular-nums">{charterVsOpportunity}% / {100 - parseInt(charterVsOpportunity)}%</span>
                    </div>
                    <Input
                      id="charterVsOpp"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={charterVsOpportunity}
                      onChange={(e) => setCharterVsOpportunity(e.target.value)}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>← All charter</span>
                      <span>All opportunity →</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Findings — notes, opportunities, bugs, issues */}
            <TabsContent value="findings" className="space-y-6 pt-4">
              {!isEditing && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                  These fields are filled in during or after your testing session. You can leave them empty now and update later.
                </p>
              )}

              {/* Session Artifacts */}
              <div className="space-y-2">
                <div>
                  <Label>Session Artifacts</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Recordings, screenshots, logs collected during testing</p>
                </div>
                <EvidenceManager
                  entityType="et_charter"
                  entityId={charter?.id || "pending-new"}
                  projectId={selectedProject?.id || ""}
                />
              </div>

              {/* Test Notes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Test Notes</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addTestNote}>
                    <Plus className="h-3 w-3 mr-1" /> Add Note
                  </Button>
                </div>
                {testNotes.map((note, noteIndex) => (
                  <Card key={noteIndex} className="p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-xs flex items-center justify-center mt-2">
                        {noteIndex + 1}
                      </span>
                      <Input
                        value={note.action}
                        onChange={(e) => updateTestNote(noteIndex, "action", e.target.value)}
                        placeholder="Action (e.g., Navigated to homepage)"
                        className="flex-1"
                      />
                      {testNotes.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeTestNote(noteIndex)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="pl-8 space-y-1">
                      {note.bullets.map((bullet, bulletIndex) => (
                        <div key={bulletIndex} className="flex items-center gap-2">
                          <span className="text-muted-foreground text-sm">–</span>
                          <Input
                            value={bullet}
                            onChange={(e) => updateTestNoteBullet(noteIndex, bulletIndex, e.target.value)}
                            placeholder="Observation"
                            className="flex-1 text-sm"
                          />
                          {note.bullets.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeTestNoteBullet(noteIndex, bulletIndex)}>
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="ghost" size="sm" onClick={() => addTestNoteBullet(noteIndex)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Bullet
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Opportunities */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label>Opportunities <span className="text-xs font-normal text-muted-foreground">(unexpected findings)</span></Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOpportunity}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                {opportunities.map((opp, oppIndex) => (
                  <Card key={oppIndex} className="p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs flex items-center justify-center mt-2">
                        {oppIndex + 1}
                      </span>
                      <Input
                        value={opp.action}
                        onChange={(e) => updateOpportunity(oppIndex, "action", e.target.value)}
                        placeholder="Unexpected finding"
                        className="flex-1"
                      />
                      {opportunities.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeOpportunity(oppIndex)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="pl-8 space-y-1">
                      {opp.bullets.map((bullet, bulletIndex) => (
                        <div key={bulletIndex} className="flex items-center gap-2">
                          <span className="text-yellow-600 dark:text-yellow-400 text-sm">–</span>
                          <Input
                            value={bullet}
                            onChange={(e) => updateOppBullet(oppIndex, bulletIndex, e.target.value)}
                            placeholder="Details"
                            className="flex-1 text-sm"
                          />
                          {opp.bullets.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeOppBullet(oppIndex, bulletIndex)}>
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="ghost" size="sm" onClick={() => addOppBullet(oppIndex)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Bullet
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Bugs */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bugs Found</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Quick notes captured during testing. Link formal bug reports from the charter detail view.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addBug}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                {bugs.map((bug, bugIndex) => (
                  <Card key={bugIndex} className="p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs flex items-center justify-center mt-2">
                        {bugIndex + 1}
                      </span>
                      <Input
                        value={bug.name}
                        onChange={(e) => updateBug(bugIndex, "name", e.target.value)}
                        placeholder="Bug name"
                        className="flex-1"
                      />
                      {bugs.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeBug(bugIndex)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="pl-8 space-y-3">
                      <div>
                        <Label className="text-xs">Steps to Reproduce</Label>
                        <Input
                          value={bug.steps[0] || ""}
                          onChange={(e) => updateBug(bugIndex, "steps", e.target.value)}
                          placeholder="Step-by-step instructions"
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Expected Result</Label>
                          <Input
                            value={bug.expected}
                            onChange={(e) => updateBug(bugIndex, "expected", e.target.value)}
                            placeholder="What should happen"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Actual Result</Label>
                          <Input
                            value={bug.actual}
                            onChange={(e) => updateBug(bugIndex, "actual", e.target.value)}
                            placeholder="What actually happens"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Issues */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Issues</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Link bugs found during this session. Use Bug IDs (e.g. BUG-1234) or describe the issue.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addIssue}>
                    <Plus className="h-3 w-3 mr-1" /> Add Issue
                  </Button>
                </div>
                {issues.map((issue, issueIndex) => (
                  <div key={issueIndex} className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs flex items-center justify-center">
                      {issueIndex + 1}
                    </span>
                    <Input
                      value={issue.description}
                      onChange={(e) => updateIssue(issueIndex, e.target.value)}
                      placeholder="e.g. BUG-1234 — payment crash on checkout"
                      className="flex-1"
                      title="Enter a Bug ID (e.g. BUG-1234) to associate a reported bug, or describe the issue found"
                    />
                    {issues.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeIssue(issueIndex)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Charter"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface CopyMoveCharterDialogProps {
  mode: "copy" | "move"
  charter: ETCharter
  onClose: () => void
  onSelect: (targetSuiteId: string) => void
}

function CopyMoveCharterDialog({ mode, charter, onClose, onSelect }: CopyMoveCharterDialogProps) {
  const [suites, setSuites] = useState<Array<{ id: string; name: string; testPlanName?: string }>>([])
  const [selectedSuiteId, setSelectedSuiteId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useState(() => {
    loadSuites()
  })

  const loadSuites = async () => {
    setIsLoading(true)
    try {
      const data = await api.get<any[]>("/suites")
      const mappedSuites = data.map((s: any) => ({
        id: s.id,
        name: s.name,
        testPlanName: s.testPlan?.name,
      }))
      setSuites(mappedSuites)
    } catch (err) {
      console.error("Failed to load suites:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSuiteId) return

    setIsSubmitting(true)
    try {
      await onSelect(selectedSuiteId)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === "copy" ? "Copy" : "Move"} ET Charter</DialogTitle>
            <DialogDescription>
              Select a target test suite for "{charter.charter}"
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-2">
                {suites.map((suite) => (
                  <div
                    key={suite.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSuiteId === suite.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/50"
                    }`}
                    onClick={() => setSelectedSuiteId(suite.id)}
                  >
                    <div className="flex-shrink-0">
                      <input
                        type="radio"
                        checked={selectedSuiteId === suite.id}
                        onChange={() => setSelectedSuiteId(suite.id)}
                        className="accent-primary"
                      />
                    </div>
                    <div>
                      <p className="font-medium">{suite.name}</p>
                      {suite.testPlanName && (
                        <p className="text-sm text-muted-foreground">{suite.testPlanName}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedSuiteId || isSubmitting}>
              {isSubmitting ? "Processing..." : mode === "copy" ? "Copy Charter" : "Move Charter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TestCaseListComponent({
  suiteId,
  cases,
}: {
  suiteId: string
  cases: TestCase[]
}) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Title</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Executions</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((caseItem) => (
            <TableRow key={caseItem.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{caseItem.title}</p>
                  {caseItem.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {caseItem.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={priorityColors[caseItem.priority.value] || "border-gray-500 text-gray-500"}
                >
                  {caseItem.priority.label}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm">{caseItem.type.label}</span>
              </TableCell>
              <TableCell>
                {caseItem.lastExecution ? (
                  <Badge
                    variant="outline"
                    className={statusColors[caseItem.lastExecution.status.value] || statusColors.not_run}
                  >
                    {caseItem.lastExecution.status.label}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm">{caseItem._count.executions}</span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
