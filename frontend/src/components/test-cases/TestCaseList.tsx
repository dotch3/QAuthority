"use client"

import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useProject } from "@/contexts/ProjectContext"
import { useEnums } from "@/hooks/useEnums"
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  AlertCircle,
  Search,
  X,
  Copy,
  Move,
  CheckSquare,
  Square,
  UserPlus,
  Eye,
  Paperclip,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CopyMoveCaseDialog } from "./CopyMoveCaseDialog"
import { EvidenceManager } from "@/components/evidence/EvidenceManager"

export interface TestCaseRow {
  id: string
  title: string
  description?: string
  preconditions?: string
  notes?: string
  steps?: Array<{ order: number; action: string; expectedResult: string }>
  priority: {
    id: string
    value: string
    label: string
    color?: string
  }
  type: {
    id: string
    value: string
    label: string
  }
  assignees?: Array<{ id: string; userId: string; user: { id: string; name: string | null; email: string; avatarUrl?: string } }>
  _count?: {
    executions: number
  }
}

interface TestCaseFormData {
  title: string
  description: string
  preconditions: string
  notes: string
  priorityId: string
  typeId: string
  steps: Array<{ order: number; action: string; expectedResult: string }>
  assigneeIds: string[]
}

interface TestCaseFormErrors {
  title?: string
  priorityId?: string
  typeId?: string
}

function DeleteTestCaseDialog({
  isOpen,
  testCase,
  onClose,
  onConfirm,
  isDeleting,
}: {
  isOpen: boolean
  testCase: TestCaseRow | null
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Test Case</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{testCase?.title}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface TestCaseListProps {
  suiteId: string
  cases: TestCaseRow[]
  isLoading: boolean
  error?: string
  onRefresh: () => void
  onSelect?: (testCase: TestCaseRow) => void
}

function EvidenceManagerForTestCase({ caseId, suiteId }: { caseId: string; suiteId: string }) {
  const { selectedProject } = useProject()
  if (!selectedProject) return null
  
  if (!caseId) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Save the test case first, then you can add attachments
        </p>
      </div>
    )
  }
  
  return (
    <EvidenceManager
      entityType="test_case"
      entityId={caseId}
      projectId={selectedProject.id}
      suiteId={suiteId}
    />
  )
}

function TestCaseFormDialog({
  isOpen,
  onClose,
  onSubmit,
  testCase,
  isSubmitting,
  error,
  suiteId,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TestCaseFormData, pendingFiles?: File[]) => Promise<void>
  testCase?: TestCaseRow | null
  isSubmitting: boolean
  error?: string
  suiteId: string
  projectId?: string
}) {
  const [formData, setFormData] = useState<TestCaseFormData>({
    title: testCase?.title || "",
    description: testCase?.description || "",
    preconditions: testCase?.preconditions || "",
    notes: testCase?.notes || "",
    priorityId: testCase?.priority?.id || "seed-test_priority-medium",
    typeId: testCase?.type?.id || "seed-test_type-manual",
    steps: testCase?.steps?.map((s, i) => ({ ...s, order: i + 1 })) || [{ order: 1, action: "", expectedResult: "" }],
    assigneeIds: testCase?.assignees?.map(a => a.userId) || [],
  })
  const [errors, setErrors] = useState<TestCaseFormErrors>({})
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [projectMembers, setProjectMembers] = useState<Array<{ id: string; name: string; email: string; avatarUrl?: string }>>([])
  const { enums: caseEnums } = useEnums(["test_priority", "test_type"])
  const priorities = caseEnums["test_priority"] ?? []
  const types = caseEnums["test_type"] ?? []

  useEffect(() => {
    if (projectId) {
      api.get<any[]>(`/projects/${projectId}/members`)
        .then(data => setProjectMembers(data.map((m: any) => m.user)))
        .catch(() => setProjectMembers([]))
    } else {
      setProjectMembers([])
    }
  }, [projectId])

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: testCase?.title || "",
        description: testCase?.description || "",
        preconditions: testCase?.preconditions || "",
        notes: testCase?.notes || "",
        priorityId: testCase?.priority?.id || "seed-test_priority-medium",
        typeId: testCase?.type?.id || "seed-test_type-manual",
        steps: testCase?.steps?.map((s, i) => ({ ...s, order: i + 1 })) || [{ order: 1, action: "", expectedResult: "" }],
        assigneeIds: testCase?.assignees?.map(a => a.userId) || [],
      })
      setErrors({})
      setPendingFiles([])
    }
  }, [isOpen, testCase])

  const validate = (): boolean => {
    const newErrors: TestCaseFormErrors = {}
    if (!formData.title.trim()) {
      newErrors.title = "Title is required"
    } else if (formData.title.length < 5) {
      newErrors.title = "Title must be at least 5 characters"
    }
    if (!formData.priorityId) {
      newErrors.priorityId = "Priority is required"
    }
    if (!formData.typeId) {
      newErrors.typeId = "Type is required"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const validSteps = formData.steps.filter(s => s.action.trim() || s.expectedResult.trim())
    await onSubmit({ ...formData, steps: validSteps }, pendingFiles)
  }

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { order: formData.steps.length + 1, action: "", expectedResult: "" }]
    })
  }

  const removeStep = (index: number) => {
    if (formData.steps.length > 1) {
      setFormData({
        ...formData,
        steps: formData.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }))
      })
    }
  }

  const updateStep = (index: number, field: "action" | "expectedResult", value: string) => {
    const newSteps = [...formData.steps]
    newSteps[index][field] = value
    setFormData({ ...formData, steps: newSteps })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {testCase ? "Edit Test Case" : "Create Test Case"}
            </DialogTitle>
            {testCase && (
              <p className="text-sm text-muted-foreground font-mono">
                ID: TC-{testCase.id.substring(0, 8).toUpperCase()}
              </p>
            )}
            <DialogDescription>
              {testCase
                ? "Update the test case details."
                : "Add a new test case to this suite."}
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
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value })
                  if (errors.title) setErrors({ ...errors, title: undefined })
                }}
                placeholder="Verify user login functionality"
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
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
                placeholder="Describe the test case..."
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="preconditions">Preconditions</Label>
              <textarea
                id="preconditions"
                value={formData.preconditions}
                onChange={(e) =>
                  setFormData({ ...formData, preconditions: e.target.value })
                }
                placeholder="Any setup or prerequisites needed..."
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes / Observations</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Add any notes, observations, or attachments references..."
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label>Attachments / Evidence</Label>
              {!testCase ? (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt,.log,.xlsx,.xls"
                    className="hidden"
                    id="pending-files"
                    onChange={(e) => {
                      console.log("[TestCase] File input changed, files:", e.target.files?.length || 0)
                      if (e.target.files) {
                        const files = Array.from(e.target.files)
                        console.log("[TestCase] Selected files:", files.map(f => f.name))
                        setPendingFiles(files)
                      }
                    }}
                  />
                  <label htmlFor="pending-files" className="cursor-pointer flex flex-col items-center">
                    <Paperclip className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Click to attach files
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Images, PDF, documents, logs, spreadsheets
                    </span>
                  </label>
                  {pendingFiles.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {pendingFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                          <span className="truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setPendingFiles(pendingFiles.filter((_, i) => i !== idx))}
                            className="text-destructive hover:text-destructive/80"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <EvidenceManagerForTestCase 
                  caseId={testCase.id} 
                  suiteId={suiteId} 
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">
                  Priority <span className="text-destructive">*</span>
                </Label>
                <select
                  id="priority"
                  value={formData.priorityId}
                  onChange={(e) => {
                    setFormData({ ...formData, priorityId: e.target.value })
                    if (errors.priorityId)
                      setErrors({ ...errors, priorityId: undefined })
                  }}
                  className={`w-full h-10 px-3 rounded-md border bg-background text-sm ${
                    errors.priorityId ? "border-destructive" : "border-input"
                  }`}
                >
                  <option value="">Select priority</option>
                  {priorities.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                {errors.priorityId && (
                  <p className="text-sm text-destructive">{errors.priorityId}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">
                  Type <span className="text-destructive">*</span>
                </Label>
                <select
                  id="type"
                  value={formData.typeId}
                  onChange={(e) => {
                    setFormData({ ...formData, typeId: e.target.value })
                    if (errors.typeId)
                      setErrors({ ...errors, typeId: undefined })
                  }}
                  className={`w-full h-10 px-3 rounded-md border bg-background text-sm ${
                    errors.typeId ? "border-destructive" : "border-input"
                  }`}
                >
                  <option value="">Select type</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {errors.typeId && (
                  <p className="text-sm text-destructive">{errors.typeId}</p>
                )}
              </div>
            </div>

            {projectMembers.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="assignees">Assignees</Label>
                <div className="border rounded-md max-h-32 overflow-y-auto p-2 space-y-1">
                  {projectMembers.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.assigneeIds.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              assigneeIds: [...formData.assigneeIds, member.id],
                            })
                          } else {
                            setFormData({
                              ...formData,
                              assigneeIds: formData.assigneeIds.filter(
                                (id) => id !== member.id
                              ),
                            })
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">
                        {member.name || member.email}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Test Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="mr-1 h-3 w-3" /> Add Step
                </Button>
              </div>
              <div className="space-y-2">
                {formData.steps.map((step, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-xs flex items-center justify-center mt-2">
                      {index + 1}
                    </span>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <textarea
                        value={step.action}
                        onChange={(e) => updateStep(index, "action", e.target.value)}
                        placeholder="Action (e.g., Click submit)"
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                      />
                      <textarea
                        value={step.expectedResult}
                        onChange={(e) => updateStep(index, "expectedResult", e.target.value)}
                        placeholder="Expected result"
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                      />
                    </div>
                    {formData.steps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(index)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : testCase
                  ? "Save Changes"
                  : "Create Test Case"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TestCaseSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Executions</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-8 mx-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border bg-card p-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Plus className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">No test cases yet</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Create your first test case to get started.
      </p>
      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Create Test Case
      </Button>
    </div>
  )
}

interface BulkMoveDialogProps {
  isOpen: boolean
  testCases: Array<{ id: string; title: string }>
  suiteId: string
  onClose: () => void
  onComplete: () => void
}

function BulkMoveDialog({ isOpen, testCases, suiteId, onClose, onComplete }: BulkMoveDialogProps) {
  const [suites, setSuites] = useState<Array<{ id: string; name: string; testPlanName?: string }>>([])
  const [testPlans, setTestPlans] = useState<Array<{ id: string; name: string }>>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [plansRes, suitesRes] = await Promise.all([
        api.get<any[]>("/projects/current/test-plans").catch(() => []),
        api.get<any[]>(`/suites/${suiteId}`).then(s => {
          if (s && typeof s === 'object' && 'id' in s) {
            return [s]
          }
          return []
        }).catch(() => [])
      ])

      setTestPlans(Array.isArray(plansRes) ? plansRes.map((p: any) => ({ id: p.id, name: p.name })) : [])
      
      if (Array.isArray(suitesRes)) {
        setSuites(suitesRes.map((s: any) => ({ 
          id: s.id, 
          name: s.name,
          testPlanName: s.testPlan?.name 
        })))
      }
    } catch (err) {
      console.error("Failed to load data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSuitesForPlan = async (planId: string) => {
    try {
      const suitesRes = await api.get<any[]>(`/test-plans/${planId}/suites`)
      setSuites(suitesRes.map((s: any) => ({ 
        id: s.id, 
        name: s.name,
        testPlanName: testPlans.find(p => p.id === planId)?.name
      })))
    } catch (err) {
      console.error("Failed to load suites:", err)
      setSuites([])
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      loadData()
    } else {
      handleClose()
    }
  }

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId)
    setSelectedSuiteId("")
    loadSuitesForPlan(planId)
  }

  const handleSubmit = async () => {
    if (!selectedSuiteId) return

    setIsSubmitting(true)
    try {
      await api.post(`/suites/${suiteId}/cases/bulk-move`, {
        caseIds: testCases.map(c => c.id),
        targetSuiteId: selectedSuiteId,
      })
      onComplete()
      handleClose()
    } catch (err) {
      console.error("Failed to move cases:", err)
      alert("Failed to move test cases. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedPlanId("")
    setSelectedSuiteId("")
    setSearchQuery("")
    setSuites([])
    onClose()
  }

  const filteredPlans = testPlans.filter((plan) =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredSuites = suites.filter((suite) =>
    suite.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move Test Cases</DialogTitle>
          <DialogDescription>
            Move {testCases.length} selected test case{testCases.length !== 1 ? "s" : ""} to another suite.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-24 mt-4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="bulk-plan-search">Target Test Plan</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="bulk-plan-search"
                    placeholder="Search test plans..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="max-h-[150px] overflow-y-auto rounded-md border">
                {filteredPlans.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No test plans found
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredPlans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => handlePlanSelect(plan.id)}
                        className={`w-full p-3 text-left hover:bg-muted/50 ${
                          selectedPlanId === plan.id ? "bg-muted" : ""
                        }`}
                      >
                        <div className="font-medium">{plan.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPlanId && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="bulk-suite-search">Target Test Suite</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="bulk-suite-search"
                        placeholder="Search suites..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="max-h-[150px] overflow-y-auto rounded-md border">
                    {filteredSuites.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No suites found in this plan
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredSuites.map((suite) => (
                          <button
                            key={suite.id}
                            onClick={() => setSelectedSuiteId(suite.id)}
                            disabled={suite.id === suiteId}
                            className={`w-full p-3 text-left hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed ${
                              selectedSuiteId === suite.id ? "bg-muted" : ""
                            }`}
                          >
                            <div className="font-medium">{suite.name}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedSuiteId || isSubmitting || isLoading}
          >
            {isSubmitting ? "Moving..." : `Move ${testCases.length} Case${testCases.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface BulkAssignDialogProps {
  isOpen: boolean
  testCases: Array<{ id: string; title: string }>
  suiteId: string
  onClose: () => void
  onComplete: () => void
}

function BulkAssignDialog({ isOpen, testCases, suiteId, onClose, onComplete }: BulkAssignDialogProps) {
  const [users, setUsers] = useState<Array<{ id: string; name?: string | null; email: string }>>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const usersRes = await api.get<any[]>("/users").catch(() => [])
      setUsers(Array.isArray(usersRes) ? usersRes.map((u: any) => ({ 
        id: u.id, 
        name: u.name,
        email: u.email 
      })) : [])
    } catch (err) {
      console.error("Failed to load users:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      loadUsers()
    } else {
      handleClose()
    }
  }

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async () => {
    if (selectedUserIds.length === 0) return

    setIsSubmitting(true)
    try {
      await api.post(`/suites/${suiteId}/cases/bulk-assign`, {
        caseIds: testCases.map(c => c.id),
        userIds: selectedUserIds,
      })
      onComplete()
      handleClose()
    } catch (err) {
      console.error("Failed to assign users:", err)
      alert("Failed to assign users. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedUserIds([])
    setSearchQuery("")
    setUsers([])
    onClose()
  }

  const filteredUsers = users.filter((user) =>
    (user.name || user.email).toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Users</DialogTitle>
          <DialogDescription>
            Assign users to {testCases.length} selected test case{testCases.length !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="user-search">Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="user-search"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="max-h-[200px] overflow-y-auto rounded-md border">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleToggleUser(user.id)}
                        className={`w-full p-3 text-left hover:bg-muted/50 flex items-center gap-3 ${
                          selectedUserIds.includes(user.id) ? "bg-muted" : ""
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedUserIds.includes(user.id) 
                            ? "bg-primary border-primary" 
                            : "border-muted-foreground"
                        }`}>
                          {selectedUserIds.includes(user.id) && (
                            <CheckSquare className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{user.name || "Unnamed User"}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedUserIds.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedUserIds.length} user{selectedUserIds.length !== 1 ? "s" : ""} selected
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedUserIds.length === 0 || isSubmitting || isLoading}
          >
            {isSubmitting ? "Assigning..." : `Assign to ${testCases.length} Case${testCases.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface BulkDeleteDialogProps {
  isOpen: boolean
  testCases: Array<{ id: string; title: string }>
  suiteId: string
  onClose: () => void
  onComplete: () => void
}

function BulkDeleteDialog({ isOpen, testCases, suiteId, onClose, onComplete }: BulkDeleteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await api.post(`/suites/${suiteId}/cases/bulk-delete`, {
        caseIds: testCases.map(c => c.id),
      })
      onComplete()
      onClose()
    } catch (err) {
      console.error("Failed to delete cases:", err)
      alert("Failed to delete test cases. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Test Cases</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {testCases.length} selected test case{testCases.length !== 1 ? "s" : ""}? 
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[200px] overflow-y-auto rounded-md border bg-muted/50 p-4">
          <ul className="space-y-1">
            {testCases.map((c) => (
              <li key={c.id} className="text-sm truncate">• {c.title}</li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Deleting..." : `Delete ${testCases.length} Case${testCases.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TestCaseList({
  suiteId,
  cases,
  isLoading,
  error,
  onRefresh,
  onSelect,
}: TestCaseListProps) {
  const { selectedProject } = useProject()
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCase, setEditingCase] = useState<TestCaseRow | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingCase, setDeletingCase] = useState<TestCaseRow | null>(null)
  const [copyMoveCase, setCopyMoveCase] = useState<{ testCase: TestCaseRow; mode: "copy" | "move" } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false)
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [sortField, setSortField] = useState<"title" | "priority" | "type">("title")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const PRIORITY_ORDER: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  }

  const filteredCases = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedCases = useMemo(() => {
    return [...filteredCases].sort((a, b) => {
      let cmp = 0
      if (sortField === "title") {
        cmp = a.title.localeCompare(b.title)
      } else if (sortField === "priority") {
        const ao = PRIORITY_ORDER[a.priority.value] ?? 99
        const bo = PRIORITY_ORDER[b.priority.value] ?? 99
        cmp = ao - bo
      } else if (sortField === "type") {
        cmp = a.type.label.localeCompare(b.type.label)
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filteredCases, sortField, sortDir])

  const toggleSort = (field: "title" | "priority" | "type") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const SortIcon = ({ field }: { field: "title" | "priority" | "type" }) => {
    if (sortField !== field) return <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
    return sortDir === "asc" ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
  }

  const selectedCases = cases.filter(c => selectedIds.has(c.id))
  const selectedCount = selectedIds.size
  const isAllSelected = sortedCases.length > 0 && sortedCases.every(c => selectedIds.has(c.id))

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedCases.map(c => c.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleBulkDeleteComplete = () => {
    handleClearSelection()
  }

  const handleBulkMoveComplete = () => {
    handleClearSelection()
  }

  const handleBulkAssignComplete = () => {
    handleClearSelection()
  }

  const handleCreate = async (data: TestCaseFormData, pendingFiles?: File[]) => {
    console.log("========================================")
    console.log("[handleCreate] CALLED with files:", pendingFiles?.length || 0)
    console.log("========================================")
    
    setFormError("")
    setIsSubmitting(true)
    let attachmentsFailed = false
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"
      
      console.log("[TestCase] Creating with files:", pendingFiles?.length || 0)
      
      const response = await api.post<{ id: string; externalId: string }>(`/suites/${suiteId}/cases`, data)
      console.log("[TestCase] API Response:", response)
      console.log("[TestCase] Created with ID:", response?.id, "externalId:", response?.externalId, "Files to upload:", pendingFiles?.length || 0)
      
      const newCaseId = response?.id
      const newCaseExternalId = response?.externalId
      
      if (pendingFiles && pendingFiles.length > 0 && newCaseId) {
        console.log("[TestCase] Starting file uploads...")
        for (const file of pendingFiles) {
          console.log("[TestCase] Uploading file:", file.name, "to case:", newCaseId, "size:", file.size)
          const fileFormData = new FormData()
          fileFormData.append("file", file)
          fileFormData.append("entityType", "test_case")
          fileFormData.append("entityId", newCaseId)
          if (selectedProject) {
            console.log("[TestCase] Using projectId:", selectedProject.id)
            fileFormData.append("projectId", selectedProject.id)
          }

          const uploadResponse = await fetch(`${API_URL}/evidence/upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
            body: fileFormData,
          })
          
          console.log("[TestCase] Upload response:", uploadResponse.status, uploadResponse.statusText)
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text()
            console.error("[TestCase] Upload failed:", errorText)
            attachmentsFailed = true
          } else {
            console.log("[TestCase] Upload SUCCESS!")
          }
        }
      } else {
        console.log("[TestCase] No files to upload or no case ID")
      }
      
      setIsCreateOpen(false)
      
      if (attachmentsFailed) {
        toast.warning("Test case created, but some attachments failed to upload")
      } else {
        toast.success("Test case created successfully")
      }
      
      onRefresh()
    } catch (err) {
      console.error("[TestCase] Create error:", err)
      const message = err instanceof Error ? err.message : "Failed to create test case"
      setFormError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (data: TestCaseFormData) => {
    if (!editingCase) return
    setFormError("")
    setIsSubmitting(true)
    try {
      await api.patch(`/cases/${editingCase.id}`, data)
      setEditingCase(null)
      toast.success("Test case updated successfully")
      onRefresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update test case"
      setFormError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingCase) return
    setDeletingId(deletingCase.id)
    try {
      await api.delete(`/cases/${deletingCase.id}`)
      toast.success("Test case deleted successfully")
      onRefresh()
      setDeletingCase(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete test case"
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return <TestCaseSkeleton />
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search test cases..."
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
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Test Case
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            Retry
          </Button>
        </div>
      )}

      {cases.length === 0 && !searchQuery ? (
        <EmptyState onCreate={() => setIsCreateOpen(true)} />
      ) : filteredCases.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No test cases match your search.</p>
          {searchQuery && (
            <Button
              variant="link"
              onClick={() => setSearchQuery("")}
              className="mt-2"
            >
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {selectedCount > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
              <span className="text-sm font-medium">
                {selectedCount} selected
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkAssignOpen(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkMoveOpen(true)}
                >
                  <Move className="mr-2 h-4 w-4" />
                  Move
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center justify-center"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead className="w-[calc(40%-120px)]">
                    <button className="flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("title")}>
                      Title <SortIcon field="title" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("priority")}>
                      Priority <SortIcon field="priority" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("type")}>
                      Type <SortIcon field="type" />
                    </button>
                  </TableHead>
                  <TableHead className="text-center">Executions</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCases.map((testCase) => (
                  <TableRow
                    key={testCase.id}
                    className={`cursor-pointer ${selectedIds.has(testCase.id) ? "bg-muted/50" : ""}`}
                    onClick={() => onSelect?.(testCase)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleSelectOne(testCase.id)}
                        className="flex items-center justify-center"
                      >
                        {selectedIds.has(testCase.id) ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono text-muted-foreground">TC-{testCase.id.substring(0, 8).toUpperCase()}</span>
                    </TableCell>
                    <TableCell
                      className="font-medium cursor-pointer hover:text-primary transition-colors max-w-[250px]"
                      onClick={() => onSelect ? onSelect(testCase) : setEditingCase(testCase)}
                    >
                      <span className="block truncate" title={testCase.title}>{testCase.title}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: testCase.priority.color,
                          color: testCase.priority.color,
                        }}
                      >
                        {testCase.priority.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{testCase.type.label}</TableCell>
                    <TableCell>
                      {testCase.assignees && testCase.assignees.length > 0 ? (
                        <div className="flex -space-x-2">
                          {testCase.assignees.slice(0, 3).map((a) => (
                            <div
                              key={a.id}
                              className="h-6 w-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-xs font-medium"
                              title={a.user.name || a.user.email}
                            >
                              {a.user.name?.[0]?.toUpperCase() || a.user.email[0]?.toUpperCase()}
                            </div>
                          ))}
                          {testCase.assignees.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                              +{testCase.assignees.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {testCase._count?.executions ?? 0}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onSelect ? onSelect(testCase) : setEditingCase(testCase)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onSelect?.(testCase)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setCopyMoveCase({ testCase, mode: "copy" })}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy to Suite
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setCopyMoveCase({ testCase, mode: "move" })}>
                            <Move className="mr-2 h-4 w-4" />
                            Move to Suite
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingCase(testCase)}
                            disabled={deletingId === testCase.id}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingId === testCase.id ? "Deleting..." : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <TestCaseFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        error={formError}
        suiteId={suiteId}
        projectId={selectedProject?.id}
      />

      <TestCaseFormDialog
        isOpen={!!editingCase}
        onClose={() => setEditingCase(null)}
        onSubmit={handleUpdate}
        testCase={editingCase}
        isSubmitting={isSubmitting}
        error={formError}
        suiteId={suiteId}
        projectId={selectedProject?.id}
      />

      <CopyMoveCaseDialog
        isOpen={!!copyMoveCase}
        mode={copyMoveCase?.mode || "copy"}
        testCase={copyMoveCase?.testCase}
        suiteId={suiteId}
        onClose={() => setCopyMoveCase(null)}
        onComplete={() => {
          onRefresh()
          setCopyMoveCase(null)
        }}
      />

      <BulkMoveDialog
        isOpen={bulkMoveOpen}
        testCases={selectedCases}
        suiteId={suiteId}
        onClose={() => setBulkMoveOpen(false)}
        onComplete={() => {
          handleBulkMoveComplete()
          onRefresh()
        }}
      />

      <BulkAssignDialog
        isOpen={bulkAssignOpen}
        testCases={selectedCases}
        suiteId={suiteId}
        onClose={() => setBulkAssignOpen(false)}
        onComplete={() => {
          handleBulkAssignComplete()
          onRefresh()
        }}
      />

      <BulkDeleteDialog
        isOpen={bulkDeleteOpen}
        testCases={selectedCases}
        suiteId={suiteId}
        onClose={() => setBulkDeleteOpen(false)}
        onComplete={() => {
          handleBulkDeleteComplete()
          onRefresh()
        }}
      />

      <DeleteTestCaseDialog
        isOpen={!!deletingCase}
        testCase={deletingCase}
        onClose={() => setDeletingCase(null)}
        onConfirm={handleDelete}
        isDeleting={!!deletingId}
      />
    </div>
  )
}
