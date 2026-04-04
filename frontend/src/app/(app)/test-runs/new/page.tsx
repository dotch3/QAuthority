"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { useProject } from "@/contexts/ProjectContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  ChevronRight,
  ChevronLeft,
  Search,
  CheckSquare,
  Square,
  Users,
  Loader2,
  PlayCircle,
  X,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TestPlan {
  id: string
  name: string
}

interface Suite {
  id: string
  name: string
}

interface TestCase {
  id: string
  title: string
  externalId?: string
  type: { label: string; value: string }
  priority: { label: string; value: string; color?: string }
  suite: { id: string; name: string }
}

interface ProjectMember {
  userId: string
  user: { id: string; name?: string; email: string }
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-blue-600",
  medium: "text-yellow-600",
  high: "text-orange-600",
  critical: "text-red-600",
}

export default function NewTestRunPage() {
  const router = useRouter()
  const { selectedProject } = useProject()

  // Step 1 — metadata
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [environment, setEnvironment] = useState("")
  const [testPlanId, setTestPlanId] = useState("")
  const [testPlans, setTestPlans] = useState<TestPlan[]>([])

  // Step 2 — case selection
  const [suites, setSuites] = useState<Suite[]>([])
  const [suiteFilter, setSuiteFilter] = useState("")
  const [searchFilter, setSearchFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [cases, setCases] = useState<TestCase[]>([])
  const [loadingCases, setLoadingCases] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [assignees, setAssignees] = useState<Record<string, string>>({}) // caseId → userId
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [bulkAssignee, setBulkAssignee] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load plans
  useEffect(() => {
    if (!selectedProject) return
    api.get<TestPlan[]>(`/projects/${selectedProject.id}/test-plans`).then(setTestPlans).catch(console.error)
    api.get<ProjectMember[]>(`/projects/${selectedProject.id}/members`).then(setMembers).catch(console.error)
  }, [selectedProject])

  // Load suites when plan selected
  useEffect(() => {
    if (!testPlanId) { setSuites([]); return }
    api.get<any[]>(`/test-plans/${testPlanId}/suites`)
      .then((data) => {
        const flat: Suite[] = []
        const flatten = (nodes: any[], depth = 0) => {
          for (const n of nodes) {
            flat.push({ id: n.id, name: "  ".repeat(depth) + n.name })
            if (n.children?.length) flatten(n.children, depth + 1)
          }
        }
        flatten(data)
        setSuites(flat)
      })
      .catch(console.error)
  }, [testPlanId])

  // Load cases based on filters
  const loadCases = useCallback(async () => {
    if (!suiteFilter) { setCases([]); return }
    setLoadingCases(true)
    try {
      const params = new URLSearchParams()
      if (searchFilter) params.set("search", searchFilter)
      if (typeFilter) params.set("typeId", typeFilter)
      if (priorityFilter) params.set("priorityId", priorityFilter)
      params.set("limit", "200")
      const result = await api.get<{ data: TestCase[] }>(`/suites/${suiteFilter}/cases?${params}`)
      setCases(result.data ?? [])
    } catch (err) {
      console.error("Failed to load cases:", err)
    } finally {
      setLoadingCases(false)
    }
  }, [suiteFilter, searchFilter, typeFilter, priorityFilter])

  useEffect(() => { loadCases() }, [loadCases])

  const allVisibleSelected = cases.length > 0 && cases.every((c) => selectedIds.has(c.id))

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const next = new Set(selectedIds)
      cases.forEach((c) => next.delete(c.id))
      setSelectedIds(next)
    } else {
      const next = new Set(selectedIds)
      cases.forEach((c) => next.add(c.id))
      setSelectedIds(next)
    }
  }

  const toggleCase = (id: string) => {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }

  const applyBulkAssignee = () => {
    if (!bulkAssignee) return
    const next = { ...assignees }
    selectedIds.forEach((id) => { next[id] = bulkAssignee })
    setAssignees(next)
  }

  const handleSubmit = async () => {
    if (!selectedProject || !name.trim() || !testPlanId || selectedIds.size === 0) return
    setIsSubmitting(true)
    try {
      const run = await api.post<{ id: string }>(`/projects/${selectedProject.id}/test-runs`, {
        testPlanId,
        name: name.trim(),
        description: description || undefined,
        environment: environment || undefined,
        caseIds: Array.from(selectedIds),
      })

      // Apply per-case assignees if any
      const assigneeEntries = Object.entries(assignees).filter(([id]) => selectedIds.has(id))
      if (assigneeEntries.length > 0) {
        // Group by assigneeId for bulk assign
        const byAssignee: Record<string, string[]> = {}
        for (const [caseId, userId] of assigneeEntries) {
          if (!byAssignee[userId]) byAssignee[userId] = []
          byAssignee[userId].push(caseId)
        }
        for (const [userId, caseIds] of Object.entries(byAssignee)) {
          await api.patch(`/test-runs/${run.id}/cases/bulk-assign`, { caseIds, assigneeId: userId })
        }
      }

      toast.success("Test run created")
      router.push(`/test-runs/${run.id}`)
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create run")
    } finally {
      setIsSubmitting(false)
    }
  }

  const canGoToStep2 = name.trim().length > 0 && testPlanId.length > 0

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/test-runs" className="hover:text-foreground">Test Runs</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">New Run</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight">New Test Run</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 text-sm font-medium ${step === 1 ? "text-primary" : "text-muted-foreground"}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? "bg-primary text-primary-foreground" : step > 1 ? "bg-green-500 text-white" : "bg-muted"}`}>
            {step > 1 ? "✓" : "1"}
          </span>
          Setup
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className={`flex items-center gap-2 text-sm font-medium ${step === 2 ? "text-primary" : "text-muted-foreground"}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>2</span>
          Select Cases
        </div>
      </div>

      {/* Step 1: Metadata */}
      {step === 1 && (
        <div className="border rounded-lg p-6 space-y-5 bg-card">
          <div className="space-y-2">
            <Label htmlFor="run-name">Run Name *</Label>
            <Input
              id="run-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint 12 Smoke Tests"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="run-desc">Description</Label>
            <textarea
              id="run-desc"
              className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope and goals of this run..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="run-plan">Test Plan *</Label>
              <select
                id="run-plan"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={testPlanId}
                onChange={(e) => setTestPlanId(e.target.value)}
              >
                <option value="">Select a plan...</option>
                {testPlans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="run-env">Environment</Label>
              <Input
                id="run-env"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                placeholder="e.g. staging, Chrome 120, prod"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!canGoToStep2}>
              Next: Select Cases
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Case selection */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="border rounded-lg p-4 bg-card space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Filter cases to select</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <Label className="text-xs">Suite *</Label>
                <select
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm mt-1"
                  value={suiteFilter}
                  onChange={(e) => { setSuiteFilter(e.target.value); setSelectedIds(new Set()) }}
                >
                  <option value="">Select suite...</option>
                  {suites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Search</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="h-9 pl-8 text-sm"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search..."
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Input
                  className="h-9 text-sm mt-1"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  placeholder="e.g. smoke, regression"
                />
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Input
                  className="h-9 text-sm mt-1"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  placeholder="e.g. high, critical"
                />
              </div>
            </div>
          </div>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <div className="flex items-center gap-2 ml-auto">
                <Users className="h-4 w-4 text-muted-foreground" />
                <select
                  className="h-8 px-2 rounded-md border border-input bg-background text-sm"
                  value={bulkAssignee}
                  onChange={(e) => setBulkAssignee(e.target.value)}
                >
                  <option value="">Bulk assign to...</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>{m.user.name || m.user.email}</option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={applyBulkAssignee} disabled={!bulkAssignee}>
                  Apply
                </Button>
              </div>
            </div>
          )}

          {/* Cases table */}
          <div className="border rounded-lg bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <button onClick={toggleSelectAll} className="flex items-center">
                      {allVisibleSelected
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4 text-muted-foreground" />
                      }
                    </button>
                  </TableHead>
                  <TableHead>Test Case</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!suiteFilter ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                      Select a suite to view cases
                    </TableCell>
                  </TableRow>
                ) : loadingCases ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    </TableRow>
                  ))
                ) : cases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                      No cases found
                    </TableCell>
                  </TableRow>
                ) : (
                  cases.map((c) => (
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer ${selectedIds.has(c.id) ? "bg-primary/5" : ""}`}
                      onClick={() => toggleCase(c.id)}
                    >
                      <TableCell>
                        {selectedIds.has(c.id)
                          ? <CheckSquare className="h-4 w-4 text-primary" />
                          : <Square className="h-4 w-4 text-muted-foreground" />
                        }
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{c.title}</p>
                        {c.externalId && <p className="text-xs text-muted-foreground">{c.externalId}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{c.type.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${PRIORITY_COLORS[c.priority.value] || ""}`}>
                          {c.priority.label}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <select
                          className="h-7 px-2 rounded-md border border-input bg-background text-xs"
                          value={assignees[c.id] || ""}
                          onChange={(e) => setAssignees({ ...assignees, [c.id]: e.target.value })}
                          disabled={!selectedIds.has(c.id)}
                        >
                          <option value="">Unassigned</option>
                          {members.map((m) => (
                            <option key={m.userId} value={m.userId}>{m.user.name || m.user.email}</option>
                          ))}
                        </select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <span className="text-sm text-muted-foreground">{selectedIds.size} cases selected</span>
              )}
              <Button
                onClick={handleSubmit}
                disabled={selectedIds.size === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</>
                ) : (
                  <><PlayCircle className="h-4 w-4 mr-2" />Start Run</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
