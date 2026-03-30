"use client"

import { useState, useEffect, useCallback, useMemo, use } from "react"
import Link from "next/link"
import {
  Plus,
  Search,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  PlayCircle,
  Calendar,
  CheckCircle2,
  XCircle,
  FolderKanban,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface TestPlan {
  id: string
  name: string
  description?: string
  status: string
  statusId?: string
  startDate?: string
  endDate?: string
  createdAt: string
  _count: { suites: number; cases: number; executions: number }
}

interface TestPlanFormData {
  name: string
  description: string
  statusId: string
  startDate?: string
  endDate?: string
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  active:    { bg: "bg-green-500/10",  text: "text-green-600",  label: "Active" },
  draft:     { bg: "bg-gray-500/10",   text: "text-gray-600",   label: "Draft" },
  archived:  { bg: "bg-yellow-500/10", text: "text-yellow-600", label: "Archived" },
  completed: { bg: "bg-blue-500/10",   text: "text-blue-600",   label: "Completed" },
}

function CreatePlanDialog({ onSubmit }: { onSubmit: (data: TestPlanFormData) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState<TestPlanFormData>({
    name: "",
    description: "",
    statusId: "seed-test_plan_status-active",
  })
  const [nameError, setNameError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.name.trim() || form.name.length < 3) {
      setNameError("Name must be at least 3 characters")
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(form)
      setOpen(false)
      setForm({ name: "", description: "", statusId: "seed-test_plan_status-active" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create test plan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Create Test Plan</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Test Plan</DialogTitle>
            <DialogDescription>Create a new test plan for this project.</DialogDescription>
          </DialogHeader>
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tp-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="tp-name"
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); setNameError("") }}
                placeholder="e.g. Sprint 1 Testing"
                className={nameError ? "border-destructive" : ""}
              />
              {nameError && <p className="text-sm text-destructive">{nameError}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tp-desc">Objectives</Label>
              <textarea
                id="tp-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                placeholder="What are the testing objectives?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tp-start">Start Date</Label>
                <Input id="tp-start" type="date" value={form.startDate || ""}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tp-end">End Date</Label>
                <Input id="tp-end" type="date" value={form.endDate || ""}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditPlanDialog({
  plan,
  onSubmit,
  children,
}: {
  plan: TestPlan
  onSubmit: (data: TestPlanFormData) => Promise<void>
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState<TestPlanFormData>({
    name: plan.name,
    description: plan.description || "",
    statusId: plan.statusId || "seed-test_plan_status-active",
    startDate: plan.startDate?.split("T")[0] || "",
    endDate: plan.endDate?.split("T")[0] || "",
  })

  const statusOptions = [
    { value: "seed-test_plan_status-draft",     label: "Draft" },
    { value: "seed-test_plan_status-active",    label: "Active" },
    { value: "seed-test_plan_status-completed", label: "Completed" },
    { value: "seed-test_plan_status-archived",  label: "Archived" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      await onSubmit(form)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update test plan")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{children}</div>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Test Plan</DialogTitle>
            <DialogDescription>Update the test plan details.</DialogDescription>
          </DialogHeader>
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ep-name">Name <span className="text-destructive">*</span></Label>
              <Input id="ep-name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ep-desc">Objectives</Label>
              <textarea id="ep-desc" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ep-status">Status</Label>
              <select id="ep-status" value={form.statusId}
                onChange={(e) => setForm({ ...form, statusId: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ep-start">Start Date</Label>
                <Input id="ep-start" type="date" value={form.startDate || ""}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ep-end">End Date</Label>
                <Input id="ep-end" type="date" value={form.endDate || ""}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProjectTestPlansPage({ params }: PageProps) {
  const { id: projectId } = use(params)
  const [projectName, setProjectName] = useState("")
  const [plans, setPlans] = useState<TestPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<"name" | "status" | "createdAt">("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<TestPlan | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [project, data] = await Promise.all([
        api.get<{ id: string; name: string }>(`/projects/${projectId}`),
        api.get<any[]>(`/projects/${projectId}/test-plans`),
      ])
      setProjectName(project.name)
      setPlans(
        data.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status?.value || p.statusId?.split("-").pop() || "draft",
          statusId: p.statusId,
          startDate: p.startDate,
          endDate: p.endDate,
          createdAt: p.createdAt,
          _count: {
            suites: p._count?.suites || 0,
            cases: p._count?.cases || 0,
            executions: p._count?.executions || 0,
          },
        }))
      )
    } catch (err) {
      console.error("Failed to load:", err)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async (data: TestPlanFormData) => {
    const newPlan = await api.post<any>(`/projects/${projectId}/test-plans`, {
      name: data.name,
      description: data.description,
      statusId: "seed-test_plan_status-active",
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
    })
    setPlans((prev) => [
      {
        id: newPlan.id,
        name: data.name,
        description: data.description,
        status: "active",
        startDate: data.startDate,
        endDate: data.endDate,
        createdAt: newPlan.createdAt || new Date().toISOString(),
        _count: { suites: 0, cases: 0, executions: 0 },
      },
      ...prev,
    ])
    toast.success("Test plan created")
  }

  const handleUpdate = async (plan: TestPlan, data: TestPlanFormData) => {
    await api.patch(`/test-plans/${plan.id}`, {
      name: data.name,
      description: data.description,
      statusId: data.statusId,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
    })
    setPlans((prev) =>
      prev.map((p) =>
        p.id === plan.id
          ? {
              ...p,
              name: data.name,
              description: data.description,
              status: data.statusId.split("-").pop() || "draft",
              statusId: data.statusId,
              startDate: data.startDate,
              endDate: data.endDate,
            }
          : p
      )
    )
    toast.success("Test plan updated")
  }

  const handleDelete = async (plan: TestPlan) => {
    setDeletingId(plan.id)
    try {
      await api.delete(`/test-plans/${plan.id}`)
      setPlans((prev) => prev.filter((p) => p.id !== plan.id))
      toast.success("Test plan deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setDeletingId(null)
    }
  }

  const sortedPlans = useMemo(() => {
    const filtered = plans.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortField === "name") cmp = (a.name || "").localeCompare(b.name || "")
      else if (sortField === "status") cmp = (a.status || "").localeCompare(b.status || "")
      else if (sortField === "createdAt")
        cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [plans, searchQuery, sortField, sortDir])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
          <Link href="/projects" className="hover:text-foreground transition-colors">Projects</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href={`/projects/${projectId}`} className="hover:text-foreground transition-colors">
            {projectName}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">Test Plans</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Test Plans</h1>
        <p className="text-muted-foreground mt-1">{projectName}</p>
      </div>

      <div className="flex flex-wrap justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search test plans..."
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
        <div className="flex items-center gap-2">
          <select
            value={`${sortField}-${sortDir}`}
            onChange={(e) => {
              const [f, d] = e.target.value.split("-") as [typeof sortField, typeof sortDir]
              setSortField(f)
              setSortDir(d)
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="name-asc">Name A→Z</option>
            <option value="name-desc">Name Z→A</option>
            <option value="status-asc">Status</option>
            <option value="createdAt-desc">Newest first</option>
            <option value="createdAt-asc">Oldest first</option>
          </select>
          <CreatePlanDialog onSubmit={handleCreate} />
        </div>
      </div>

      {sortedPlans.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<FolderKanban className="h-8 w-8 text-muted-foreground" />}
              title={searchQuery ? "No test plans found" : "No test plans yet"}
              description={
                searchQuery
                  ? "No plans match your search"
                  : "Create the first test plan for this project"
              }
              action={
                !searchQuery ? <CreatePlanDialog onSubmit={handleCreate} /> : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedPlans.map((plan) => {
            const status = statusColors[plan.status] || statusColors.draft
            return (
              <Card key={plan.id} className="transition-all hover:shadow-md hover:border-primary/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/test-plans/${plan.id}`}
                        className="text-lg font-semibold hover:text-primary transition-colors line-clamp-2"
                      >
                        {plan.name}
                      </Link>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className={`${status.bg} ${status.text} ml-2`}>
                      {status.label}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {plan.startDate
                        ? new Date(plan.startDate).toLocaleDateString()
                        : new Date(plan.createdAt).toLocaleDateString()}
                    </span>
                    <span>{plan._count.suites} suites</span>
                    <span>{plan._count.cases} cases</span>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <Link href={`/test-plans/${plan.id}`}>
                      <Button variant="ghost" size="sm">View Details</Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <EditPlanDialog plan={plan} onSubmit={(data) => handleUpdate(plan, data)}>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        </EditPlanDialog>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirm(plan)}
                          disabled={deletingId === plan.id}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingId === plan.id ? "Deleting..." : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}
        title="Delete Test Plan"
        description={deleteConfirm ? `Delete "${deleteConfirm.name}"? This cannot be undone.` : ""}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
      />
    </div>
  )
}
