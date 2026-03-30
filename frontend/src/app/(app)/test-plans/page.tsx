"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslations } from "next-intl"
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
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useProject } from "@/contexts/ProjectContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { NoProjectSelected } from "@/components/ui/NoProjectSelected"
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
  _count: {
    suites: number
    cases: number
    executions: number
  }
  latestExecution?: {
    passed: number
    failed: number
    status: string
  }
}

interface TestPlanFormData {
  name: string
  description: string
  statusId: string
  startDate?: string
  endDate?: string
}

interface FormErrors {
  name?: string
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-500/10", text: "text-green-600", label: "Active" },
  draft: { bg: "bg-gray-500/10", text: "text-gray-600", label: "Draft" },
  archived: { bg: "bg-yellow-500/10", text: "text-yellow-600", label: "Archived" },
  completed: { bg: "bg-blue-500/10", text: "text-blue-600", label: "Completed" },
}

function TestPlansSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function CreateTestPlanDialog({
  onSubmit,
  trigger,
}: {
  onSubmit: (data: TestPlanFormData) => Promise<void>
  trigger?: React.ReactNode
}) {
  const t = useTranslations("testPlans")
  const tCommon = useTranslations("common")
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<TestPlanFormData>({
    name: "",
    description: "",
    statusId: "seed-test_plan_status-active",
    startDate: "",
    endDate: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = t("fields.name") + " is required"
    } else if (formData.name.length < 3) {
      newErrors.name = "Name must be at least 3 characters"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      setIsOpen(false)
      setFormData({ name: "", description: "", statusId: "seed-test_plan_status-active", startDate: "", endDate: "" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create test plan")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("create.title")}</DialogTitle>
            <DialogDescription>{t("create.description")}</DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                {t("fields.name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: undefined })
                }}
                placeholder={t("fields.namePlaceholder")}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{t("fields.nameHelp")}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{t("fields.objectives")}</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("fields.objectivesPlaceholder")}
                rows={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground">{t("fields.objectivesHelp")}</p>
            </div>

            <div className="grid gap-3 pt-1 border-t">
              <div>
                <Label className="text-sm font-medium">{t("fields.schedule")}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t("fields.scheduleHelp")}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate" className="text-sm">{t("fields.startDate")}</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate || ""}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">{t("fields.startDateHelp")}</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate" className="text-sm">{t("fields.endDate")}</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate || ""}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">{t("fields.endDateHelp")}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tCommon("loading") : t("create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditTestPlanDialog({
  plan,
  onSubmit,
  children,
}: {
  plan: TestPlan
  onSubmit: (data: TestPlanFormData) => Promise<void>
  children: React.ReactNode
}) {
  const t = useTranslations("testPlans")
  const tCommon = useTranslations("common")
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<TestPlanFormData>({
    name: plan.name,
    description: plan.description || "",
    statusId: plan.statusId || "seed-test_plan_status-active",
    startDate: plan.startDate?.split("T")[0] || "",
    endDate: plan.endDate?.split("T")[0] || "",
  })
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    setFormData({
      name: plan.name,
      description: plan.description || "",
      statusId: plan.statusId || "seed-test_plan_status-active",
      startDate: plan.startDate?.split("T")[0] || "",
      endDate: plan.endDate?.split("T")[0] || "",
    })
  }, [plan])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = t("fields.name") + " is required"
    } else if (formData.name.length < 3) {
      newErrors.name = "Name must be at least 3 characters"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update test plan")
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusOptions = [
    { value: "seed-test_plan_status-draft", label: t("status.draft") },
    { value: "seed-test_plan_status-active", label: t("status.active") },
    { value: "seed-test_plan_status-completed", label: t("status.completed") },
    { value: "seed-test_plan_status-archived", label: t("status.archived") },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div onClick={() => setIsOpen(true)}>{children}</div>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("edit.title")}</DialogTitle>
            <DialogDescription>{t("edit.description")}</DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                {t("fields.name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: undefined })
                }}
                placeholder={t("fields.namePlaceholder")}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{t("fields.nameHelp")}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">{t("fields.objectives")}</Label>
              <textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("fields.objectivesPlaceholder")}
                rows={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground">{t("fields.objectivesHelp")}</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-status">{t("fields.status")}</Label>
              <select
                id="edit-status"
                value={formData.statusId}
                onChange={(e) => setFormData({ ...formData, statusId: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 pt-1 border-t">
              <div>
                <Label className="text-sm font-medium">{t("fields.schedule")}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t("fields.scheduleHelp")}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-startDate" className="text-sm">{t("fields.startDate")}</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={formData.startDate || ""}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">{t("fields.startDateHelp")}</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-endDate" className="text-sm">{t("fields.endDate")}</Label>
                  <Input
                    id="edit-endDate"
                    type="date"
                    value={formData.endDate || ""}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">{t("fields.endDateHelp")}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tCommon("loading") : t("edit.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function TestPlansPage() {
  const { selectedProject } = useProject()
  const t = useTranslations("testPlans")
  const tCommon = useTranslations("common")
  const [testPlans, setTestPlans] = useState<TestPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingPlan, setEditingPlan] = useState<TestPlan | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<TestPlan | null>(null)
  const [sortField, setSortField] = useState<"name" | "status" | "createdAt">("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const loadTestPlans = useCallback(async () => {
    if (!selectedProject) {
      setTestPlans([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const data = await api.get<any[]>(`/projects/${selectedProject.id}/test-plans`)
      setTestPlans(data.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        status: plan.status?.value || plan.statusId?.split('-').pop() || 'draft',
        statusId: plan.statusId,
        startDate: plan.startDate,
        endDate: plan.endDate,
        createdAt: plan.createdAt,
        _count: {
          suites: plan._count?.suites || 0,
          cases: plan._count?.cases || 0,
          executions: plan._count?.executions || 0
        },
        latestExecution: plan.latestExecution,
      })))
    } catch (err) {
      console.error("Failed to load test plans:", err)
      setTestPlans([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedProject])

  useEffect(() => {
    loadTestPlans()
  }, [loadTestPlans])

  const handleCreate = async (data: TestPlanFormData) => {
    if (!selectedProject) return

    const newPlan = await api.post<any>(`/projects/${selectedProject.id}/test-plans`, {
      name: data.name,
      description: data.description,
      statusId: "seed-test_plan_status-active",
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
    })

    setTestPlans([{
      id: newPlan.id,
      name: data.name,
      description: data.description,
      status: "active",
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
      createdAt: newPlan.createdAt || new Date().toISOString(),
      _count: { suites: 0, cases: 0, executions: 0 },
    }, ...testPlans])
    toast.success(t("toasts.created"))
  }

  const handleUpdate = async (data: TestPlanFormData) => {
    if (!editingPlan) return

    await api.patch<any>(`/test-plans/${editingPlan.id}`, {
      name: data.name,
      description: data.description,
      statusId: data.statusId,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
    })

    setTestPlans(testPlans.map((p) =>
      p.id === editingPlan.id
        ? {
            ...p,
            name: data.name,
            description: data.description,
            status: data.statusId.split('-').pop() || 'draft',
            statusId: data.statusId,
            startDate: data.startDate || undefined,
            endDate: data.endDate || undefined,
          }
        : p
    ))
    setEditingPlan(null)
    toast.success(t("toasts.updated"))
  }

  const handleDelete = async (plan: TestPlan) => {
    setDeletingId(plan.id)
    try {
      await api.delete(`/test-plans/${plan.id}`)
      setTestPlans(testPlans.filter((p) => p.id !== plan.id))
      toast.success(t("toasts.deleted"))
    } catch (err) {
      console.error("Failed to delete test plan:", err)
      toast.error(t("toasts.deleteFailed"))
    } finally {
      setDeletingId(null)
    }
  }

  const filteredPlans = testPlans.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedPlans = useMemo(() => {
    return [...filteredPlans].sort((a, b) => {
      let cmp = 0
      if (sortField === "name") {
        cmp = (a.name || "").localeCompare(b.name || "")
      } else if (sortField === "status") {
        cmp = (a.status || "").localeCompare(b.status || "")
      } else if (sortField === "createdAt") {
        cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filteredPlans, sortField, sortDir])

  const getPlanKey = (plan: TestPlan, index: number) => plan?.id ?? `plan-${index}`

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("selectProject")}</p>
        </div>
        <NoProjectSelected description={t("selectProjectDescription")} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {selectedProject.name} / {t("title")}
          </p>
        </div>
        <TestPlansSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">
          {selectedProject.name} / {t("title")}
        </p>
      </div>

      <div className="flex justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
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
              const [f, d] = e.target.value.split("-") as ["name" | "status" | "createdAt", "asc" | "desc"]
              setSortField(f)
              setSortDir(d)
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="name-asc">Name A→Z</option>
            <option value="name-desc">Name Z→A</option>
            <option value="status-asc">Status A→Z</option>
            <option value="createdAt-desc">Newest first</option>
            <option value="createdAt-asc">Oldest first</option>
          </select>
        </div>
        <CreateTestPlanDialog
          onSubmit={handleCreate}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("createButton")}
            </Button>
          }
        />
      </div>

      {sortedPlans.length === 0 && !searchQuery ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<FolderKanban className="h-8 w-8 text-muted-foreground" />}
              title={t("noPlansYet")}
              description={t("noPlansDescription")}
              action={
                <CreateTestPlanDialog
                  onSubmit={handleCreate}
                  trigger={
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      {t("createButton")}
                    </Button>
                  }
                />
              }
            />
          </CardContent>
        </Card>
      ) : sortedPlans.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">{t("noPlansFound")}</p>
            {searchQuery && (
              <Button
                variant="link"
                onClick={() => setSearchQuery("")}
                className="mt-2"
              >
                {tCommon("search")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedPlans.map((plan, idx) => {
            const status = statusColors[plan.status] || statusColors.draft
            return (
              <Card
                key={getPlanKey(plan, idx)}
                className="transition-all hover:shadow-md hover:border-primary/50 group"
              >
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
                    <Badge
                      variant="secondary"
                      className={`${status.bg} ${status.text} ml-2`}
                    >
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
                    <span>{plan._count.suites} {t("suites")}</span>
                    <span>{plan._count.cases} {t("cases")}</span>
                  </div>

                  {plan.latestExecution && (
                    <div className="flex items-center justify-between p-3 rounded-md bg-muted/50 mb-4">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          {plan.latestExecution.passed}
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          {plan.latestExecution.failed}
                        </span>
                      </div>
                      <Link
                        href={`/test-plans/${plan.id}`}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Run <PlayCircle className="h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t">
                    <Link href={`/test-plans/${plan.id}`}>
                      <Button variant="ghost" size="sm">
                        {t("viewDetails")}
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <EditTestPlanDialog plan={plan} onSubmit={handleUpdate}>
                          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setEditingPlan(plan) }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        </EditTestPlanDialog>
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
