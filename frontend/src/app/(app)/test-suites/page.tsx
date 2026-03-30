"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import {
  Plus,
  Search,
  X,
  Folder,
  MoreHorizontal,
  Pencil,
  Trash2,
  TestTubes,
  AlertCircle,
  Copy,
  Move,
  Filter,
  FolderKanban,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { CopyMoveDialog } from "@/components/test-suites/CopyMoveDialog"
import { useProject } from "@/contexts/ProjectContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
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
}

interface TestSuite {
  id: string
  name: string
  description?: string
  projectId: string
  projectName: string
  testPlanId?: string
  testPlanName?: string
  createdAt?: string
  _count: {
    cases: number
  }
}

interface SuiteFormData {
  name: string
  description: string
  testPlanId: string
}

interface FormErrors {
  name?: string
  testPlanId?: string
}

function SuitesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between pt-4 border-t">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function CreateSuiteDialog({
  onSubmit,
  trigger,
  testPlans,
  defaultPlanId,
}: {
  onSubmit: (data: SuiteFormData) => Promise<void>
  trigger?: React.ReactNode
  testPlans: TestPlan[]
  defaultPlanId?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<SuiteFormData>({
    name: "",
    description: "",
    testPlanId: defaultPlanId || "",
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = "Suite name is required"
    } else if (formData.name.length < 3) {
      newErrors.name = "Name must be at least 3 characters"
    }
    if (!formData.testPlanId) {
      newErrors.testPlanId = "Please select a test plan"
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
      setFormData({ name: "", description: "", testPlanId: defaultPlanId || "" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create suite")
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
            <DialogTitle>Create Test Suite</DialogTitle>
            <DialogDescription>
              Create a new test suite to organize related test cases.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="testPlan">
                Test Plan <span className="text-destructive">*</span>
              </Label>
              <select
                id="testPlan"
                value={formData.testPlanId}
                onChange={(e) => {
                  setFormData({ ...formData, testPlanId: e.target.value })
                  if (errors.testPlanId) setErrors({ ...errors, testPlanId: undefined })
                }}
                className={`w-full h-10 px-3 rounded-md border bg-background text-sm ${
                  errors.testPlanId ? "border-destructive" : "border-input"
                }`}
              >
                <option value="">Select a test plan</option>
                {testPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
              {errors.testPlanId && (
                <p className="text-sm text-destructive">{errors.testPlanId}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">
                Suite Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: undefined })
                }}
                placeholder="e.g., Authentication Tests"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the purpose of this test suite..."
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Suite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditSuiteDialog({
  suite,
  testPlans,
  onSubmit,
  children,
}: {
  suite: TestSuite
  testPlans: TestPlan[]
  onSubmit: (data: SuiteFormData) => Promise<void>
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<SuiteFormData>({
    name: suite.name,
    description: suite.description || "",
    testPlanId: suite.testPlanId || "",
  })
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    setFormData({
      name: suite.name,
      description: suite.description || "",
      testPlanId: suite.testPlanId || "",
    })
  }, [suite])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = "Suite name is required"
    } else if (formData.name.length < 3) {
      newErrors.name = "Name must be at least 3 characters"
    }
    if (!formData.testPlanId) {
      newErrors.testPlanId = "Please select a test plan"
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
      setError(err instanceof Error ? err.message : "Failed to update suite")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div onClick={() => setIsOpen(true)}>{children}</div>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Test Suite</DialogTitle>
            <DialogDescription>
              Update the test suite details.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: undefined })
                }}
                placeholder="e.g., Authentication Tests"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the purpose of this test suite..."
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-testPlan">
                Test Plan <span className="text-destructive">*</span>
              </Label>
              <select
                id="edit-testPlan"
                value={formData.testPlanId}
                onChange={(e) => {
                  setFormData({ ...formData, testPlanId: e.target.value })
                  if (errors.testPlanId) setErrors({ ...errors, testPlanId: undefined })
                }}
                className={`w-full h-10 px-3 rounded-md border bg-background text-sm ${
                  errors.testPlanId ? "border-destructive" : "border-input"
                }`}
              >
                <option value="">Select a test plan</option>
                {testPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
              {errors.testPlanId && (
                <p className="text-sm text-destructive">{errors.testPlanId}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function TestSuitesPage() {
  const { selectedProject } = useProject()
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [testPlans, setTestPlans] = useState<TestPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<TestSuite | null>(null)
  const [copyMoveSuite, setCopyMoveSuite] = useState<{ suite: TestSuite; mode: "copy" | "move" } | null>(null)
  const [sortField, setSortField] = useState<"name" | "createdAt">("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const loadSuites = useCallback(async () => {
    if (!selectedProject) {
      setSuites([])
      setTestPlans([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const plansData = await api.get<any[]>(`/projects/${selectedProject.id}/test-plans`)

      const plans: TestPlan[] = plansData.map(plan => ({
        id: plan.id,
        name: plan.name,
      }))

      const allSuites: TestSuite[] = []
      for (const plan of plansData) {
        try {
          const suites = await api.get<any[]>(`/test-plans/${plan.id}/suites`)
          suites.forEach(suite => {
            allSuites.push({
              id: suite.id,
              name: suite.name,
              description: suite.description,
              projectId: selectedProject.id,
              projectName: selectedProject.name,
              testPlanId: plan.id,
              testPlanName: plan.name,
              _count: { cases: suite._count?.cases || 0 },
            })
          })
        } catch (e) {
          console.error(`Failed to load suites for plan ${plan.id}:`, e)
        }
      }

      setSuites(allSuites)
      setTestPlans(plans)
    } catch (err) {
      console.error("Failed to load suites:", err)
      setSuites([])
      setTestPlans([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedProject])

  useEffect(() => {
    loadSuites()
  }, [loadSuites])

  const handleCreate = async (data: SuiteFormData) => {
    const newSuite = await api.post<any>(`/test-plans/${data.testPlanId}/suites`, {
      name: data.name,
      description: data.description,
    })
    
    const plan = testPlans.find((p) => p.id === data.testPlanId)
    setSuites([{
      id: newSuite.id,
      name: data.name,
      description: data.description,
      projectId: selectedProject?.id || "",
      projectName: selectedProject?.name || "",
      testPlanId: data.testPlanId,
      testPlanName: plan?.name,
      _count: { cases: 0 },
    }, ...suites])
    toast.success("Test suite created successfully")
  }

  const handleUpdate = async (data: SuiteFormData) => {
    if (!editingSuite) return

    await api.patch<any>(`/suites/${editingSuite.id}`, {
      name: data.name,
      description: data.description,
    })

    const plan = testPlans.find((p) => p.id === data.testPlanId)
    setSuites(suites.map((s) =>
      s.id === editingSuite.id
        ? {
            ...s,
            name: data.name,
            description: data.description,
            testPlanId: data.testPlanId,
            testPlanName: plan?.name,
          }
        : s
    ))
    setEditingSuite(null)
    toast.success("Test suite updated successfully")
  }

  const handleDelete = async (suite: TestSuite) => {
    setDeletingId(suite.id)
    try {
      await api.delete(`/suites/${suite.id}`)
      setSuites(suites.filter((s) => s.id !== suite.id))
      toast.success("Test suite deleted successfully")
    } catch (err) {
      console.error("Failed to delete suite:", err)
      toast.error(err instanceof Error ? err.message : "Failed to delete suite. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  const handleCopyMoveComplete = async (newPlanId: string) => {
    if (!copyMoveSuite) return
    
    try {
      if (copyMoveSuite.mode === "copy") {
        const newSuite = await api.post<any>(`/suites/${copyMoveSuite.suite.id}/copy`, {
          targetPlanId: newPlanId,
        })
        const targetPlan = testPlans.find((p) => p.id === newPlanId)
        setSuites([{
          ...copyMoveSuite.suite,
          id: newSuite.id,
          name: newSuite.name,
          testPlanId: newPlanId,
          testPlanName: targetPlan?.name,
        }, ...suites])
        toast.success("Test suite copied successfully")
      } else {
        await api.patch(`/suites/${copyMoveSuite.suite.id}/move`, {
          targetPlanId: newPlanId,
        })
        const targetPlan = testPlans.find((p) => p.id === newPlanId)
        setSuites(
          suites.map((s) =>
            s.id === copyMoveSuite.suite.id
              ? { ...s, testPlanId: newPlanId, testPlanName: targetPlan?.name }
              : s
          )
        )
        toast.success("Test suite moved successfully")
      }
    } catch (err) {
      console.error(`Failed to ${copyMoveSuite.mode} suite:`, err)
      toast.error(`Failed to ${copyMoveSuite.mode} suite. Please try again.`)
    }
    setCopyMoveSuite(null)
  }

  const filteredSuites = suites.filter(
    (s) =>
      (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  ).filter((s) => !selectedPlanId || s.testPlanId === selectedPlanId)

  const sortedSuites = useMemo(() => {
    return [...filteredSuites].sort((a, b) => {
      let cmp = 0
      if (sortField === "name") {
        cmp = (a.name || "").localeCompare(b.name || "")
      } else if (sortField === "createdAt") {
        cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filteredSuites, sortField, sortDir])

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Suites</h1>
          <p className="text-muted-foreground mt-1">
            Select a project to view test suites
          </p>
        </div>
        <NoProjectSelected description="Please select a project from the header to view and manage test suites." />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Suites</h1>
          <p className="text-muted-foreground mt-1">
            {selectedProject.name} / Test Suites
          </p>
        </div>
        <SuitesSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Suites</h1>
        <p className="text-muted-foreground mt-1">
          {selectedProject.name} / Test Suites
        </p>
      </div>

      <div className="flex justify-between gap-4 flex-wrap">
        <div className="flex gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search suites..."
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                {selectedPlanId
                  ? testPlans.find((p) => p.id === selectedPlanId)?.name || "Filter"
                  : "All Plans"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setSelectedPlanId(null)}>
                All Test Plans
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {testPlans.map((plan) => (
                <DropdownMenuItem
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  {plan.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <select
            value={`${sortField}-${sortDir}`}
            onChange={(e) => {
              const [f, d] = e.target.value.split("-") as ["name" | "createdAt", "asc" | "desc"]
              setSortField(f)
              setSortDir(d)
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="name-asc">Name A→Z</option>
            <option value="name-desc">Name Z→A</option>
            <option value="createdAt-desc">Newest first</option>
            <option value="createdAt-asc">Oldest first</option>
          </select>
        </div>
        <CreateSuiteDialog
          onSubmit={handleCreate}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Suite
            </Button>
          }
          testPlans={testPlans}
          defaultPlanId={selectedPlanId || undefined}
        />
      </div>

      {sortedSuites.length === 0 && !searchQuery ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Folder className="h-8 w-8 text-muted-foreground" />}
              title="No test suites yet"
              description="Create test suites to organize your test cases by feature or module."
              action={
                <CreateSuiteDialog
                  onSubmit={handleCreate}
                  testPlans={testPlans}
                  defaultPlanId={selectedPlanId || undefined}
                  trigger={
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Test Suite
                    </Button>
                  }
                />
              }
            />
          </CardContent>
        </Card>
      ) : sortedSuites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No suites match your search.</p>
            {searchQuery && (
              <Button
                variant="link"
                onClick={() => setSearchQuery("")}
                className="mt-2"
              >
                Clear search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedSuites.map((suite) => (
            <Card
              key={suite.id}
              className="transition-all hover:shadow-md hover:border-primary/50 group"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="rounded-lg bg-primary/10 p-2 mt-0.5 shrink-0">
                    <Folder className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/test-suites/${suite.id}`}
                      className="text-lg font-semibold hover:text-primary transition-colors line-clamp-2"
                    >
                      {suite.name}
                    </Link>
                    {suite.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {suite.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
                  {suite.testPlanName && (
                    <span className="flex items-center gap-1">
                      <FolderKanban className="h-3 w-3" />
                      {suite.testPlanName}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <TestTubes className="h-3 w-3" />
                    {suite._count.cases} cases
                  </span>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <Link href={`/test-suites/${suite.id}`}>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <EditSuiteDialog suite={suite} testPlans={testPlans} onSubmit={handleUpdate}>
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setEditingSuite(suite) }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </EditSuiteDialog>
                      <DropdownMenuItem onClick={() => setCopyMoveSuite({ suite, mode: "copy" })}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy to Plan
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setCopyMoveSuite({ suite, mode: "move" })}>
                        <Move className="mr-2 h-4 w-4" />
                        Move to Plan
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteConfirm(suite)}
                        disabled={deletingId === suite.id}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deletingId === suite.id ? "Deleting..." : "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CopyMoveDialog
        isOpen={!!copyMoveSuite}
        mode={copyMoveSuite?.mode || "copy"}
        suite={copyMoveSuite?.suite}
        testPlans={testPlans}
        onClose={() => setCopyMoveSuite(null)}
        onComplete={handleCopyMoveComplete}
      />

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}
        title="Delete Test Suite"
        description={deleteConfirm ? `Delete "${deleteConfirm.name}"? This cannot be undone.` : ""}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
      />
    </div>
  )
}
