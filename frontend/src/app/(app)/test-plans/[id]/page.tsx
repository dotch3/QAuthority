"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Search, X } from "lucide-react"
import { useProject } from "@/contexts/ProjectContext"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { SuiteTree, type SuiteNode } from "@/components/test-suites/SuiteTree"
import { TestCaseList, type TestCaseRow } from "@/components/test-cases/TestCaseList"
import { NoProjectSelected } from "@/components/ui/NoProjectSelected"
import { Plus, FolderKanban } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TestCaseFilters {
  search: string
  typeId: string
  priorityId: string
  assigneeId: string
  executed: string
}

export default function TestPlanDetailPage() {
  const params = useParams()
  const planId = params.id as string
  const { selectedProject } = useProject()
  const [plan, setPlan] = useState<{
    id: string
    name: string
    description?: string
    createdAt: string
    idPrefix?: string | null
    idInitialNumber?: number | null
    bugPrefix?: string | null
  } | null>(null)
  const [suites, setSuites] = useState<SuiteNode[]>([])
  const [selectedSuite, setSelectedSuite] = useState<SuiteNode | null>(null)
  const [cases, setCases] = useState<TestCaseRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddSuiteOpen, setIsAddSuiteOpen] = useState(false)
  
  // Filters and pagination for All Cases
  const [filters, setFilters] = useState<TestCaseFilters>({
    search: "",
    typeId: "",
    priorityId: "",
    assigneeId: "",
    executed: "",
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [users, setUsers] = useState<{ id: string; name?: string; email: string }[]>([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [total, setTotal] = useState(0)
  const [isLoadingCases, setIsLoadingCases] = useState(false)

  useEffect(() => {
    if (!selectedProject) return
    loadPlan()
    loadSuites()
  }, [planId, selectedProject])

  // Load cases when suite, filters, page, or limit changes
  useEffect(() => {
    if (selectedSuite) {
      loadCases(selectedSuite.id)
    }
  }, [selectedSuite, appliedFilters, page, limit])

  // Load users for assignee filter
  useEffect(() => {
    if (selectedProject) {
      loadUsers()
    }
  }, [selectedProject])

  const loadPlan = async () => {
    try {
      const data = await api.get(`/test-plans/${planId}`)
      setPlan(data as typeof plan)
    } catch (err) {
      console.error("Failed to load plan:", err)
    }
  }

  const saveSettings = async () => {
    if (!plan) return
    try {
      await api.patch(`/test-plans/${plan.id}`, {
        idPrefix: plan.idPrefix,
        idInitialNumber: plan.idInitialNumber,
        bugPrefix: plan.bugPrefix,
      })
      toast.success("Settings saved successfully")
    } catch (err) {
      console.error("Failed to save settings:", err)
      toast.error("Failed to save settings")
    }
  }

  const loadSuites = async () => {
    try {
      const data = await api.get<SuiteNode[]>(`/test-plans/${planId}/suites`)
      setSuites(data)
    } catch (err) {
      console.error("Failed to load suites:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    setAppliedFilters(filters)
    setPage(1)
  }

  const loadCases = async (suiteId: string) => {
    setIsLoadingCases(true)
    try {
      const params = new URLSearchParams()
      if (appliedFilters.search) params.set("search", appliedFilters.search)
      if (appliedFilters.typeId) params.set("typeId", appliedFilters.typeId)
      if (appliedFilters.priorityId) params.set("priorityId", appliedFilters.priorityId)
      if (appliedFilters.assigneeId) params.set("assigneeId", appliedFilters.assigneeId)
      params.set("page", page.toString())
      params.set("limit", limit.toString())
      
      const query = params.toString() ? `?${params.toString()}` : ""
      const url = `/suites/${suiteId}/cases${query}`
      console.log("Loading cases from:", url)
      const data = await api.get<{ data: TestCaseRow[]; total: number }>(url)
      console.log("Cases loaded:", data)
      if (!data || !data.data) {
        console.error("API returned invalid data:", data)
        setCases([])
        setTotal(0)
      } else {
        setCases(data.data)
        setTotal(data.total)
      }
    } catch (err) {
      console.error("Error loading cases:", err)
      setCases([])
      setTotal(0)
    } finally {
      setIsLoadingCases(false)
    }
  }

  const loadUsers = async () => {
    try {
      const data = await api.get<{ id: string; name?: string; email: string }[]>("/users")
      setUsers(data)
    } catch (err) {
      console.error("Failed to load users:", err)
    }
  }

  const handleSelectSuite = (suite: SuiteNode) => {
    setSelectedSuite(suite)
  }

  const handleCreateSuite = async (data: { name: string; description: string }) => {
    try {
      await api.post(`/test-plans/${planId}/suites`, data)
      await loadSuites()
      setIsAddSuiteOpen(false)
      toast.success("Test suite created successfully")
    } catch (err) {
      console.error("Failed to create suite:", err)
      toast.error("Failed to create test suite")
    }
  }

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Plan</h1>
          <p className="text-muted-foreground mt-1">
            View test plan details
          </p>
        </div>
        <NoProjectSelected description="Please select a project from the header to view test plan details." />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/test-plans" className="hover:text-foreground">
            {selectedProject.name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span>Test Plans</span>
        </div>
        <div className="rounded-lg border bg-card p-12 text-center">
          <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Test plan not found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            This test plan may have been deleted or you may not have access.
          </p>
          <Button asChild>
            <Link href="/test-plans">Back to Test Plans</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/test-plans" className="hover:text-foreground">
            {selectedProject.name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/test-plans" className="hover:text-foreground">Test Plans</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{plan.name}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground ml-1"
            asChild
          >
            <Link href="/test-plans">Change</Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{plan.name}</h1>
        {plan.description && (
          <p className="text-muted-foreground mt-1">{plan.description}</p>
        )}
      </div>

      <Tabs defaultValue="suites">
        <TabsList>
          <TabsTrigger value="suites">Suites</TabsTrigger>
          <TabsTrigger value="cases">All Cases</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="suites" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsAddSuiteOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Suite
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-card">
              <div className="border-b p-4 font-medium">Test Suites</div>
              <div className="p-2">
                <SuiteTree
                  suites={suites}
                  selectedSuiteId={selectedSuite?.id}
                  onSelect={handleSelectSuite}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-card">
              <div className="border-b p-4 font-medium">
                {selectedSuite
                  ? `Cases in "${selectedSuite.name}"`
                  : "Select a suite to view cases"}
              </div>
              <div className="p-4">
                {selectedSuite ? (
                  <TestCaseList
                    suiteId={selectedSuite.id}
                    cases={cases || []}
                    isLoading={isLoadingCases}
                    onRefresh={() => {
                      console.log("Refreshing cases for suite:", selectedSuite.id)
                      loadCases(selectedSuite.id)
                      loadSuites()
                    }}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Select a suite from the tree to view its test cases
                  </p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cases">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            {/* Filters - Row 1 */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Title or ID..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && setPage(1)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-[150px]">
                <Label className="text-xs">Type</Label>
                <select
                  value={filters.typeId}
                  onChange={(e) => setFilters({ ...filters, typeId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">All Types</option>
                  <option value="seed-test_type-manual">Manual</option>
                  <option value="seed-test_type-automated">Automated</option>
                  <option value="seed-test_type-exploratory">Exploratory</option>
                  <option value="seed-test_type-regression">Regression</option>
                </select>
              </div>
              <div className="w-[150px]">
                <Label className="text-xs">Priority</Label>
                <select
                  value={filters.priorityId}
                  onChange={(e) => setFilters({ ...filters, priorityId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">All Priorities</option>
                  <option value="seed-test_priority-critical">Critical</option>
                  <option value="seed-test_priority-high">High</option>
                  <option value="seed-test_priority-medium">Medium</option>
                  <option value="seed-test_priority-low">Low</option>
                </select>
              </div>
              <div className="w-[150px]">
                <Label className="text-xs">Assignee</Label>
                <select
                  value={filters.assigneeId}
                  onChange={(e) => setFilters({ ...filters, assigneeId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">All Assignees</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-[120px]">
                <Label className="text-xs">Executed</Label>
                <select
                  value={filters.executed}
                  onChange={(e) => setFilters({ ...filters, executed: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">All</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={applyFilters}
                >
                  <Search className="h-4 w-4 mr-1" />
                  Filter
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    const emptyFilters = { search: "", typeId: "", priorityId: "", assigneeId: "", executed: "" }
                    setFilters(emptyFilters)
                    setAppliedFilters(emptyFilters)
                    setPage(1)
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>

            {/* Results */}
            {isLoadingCases ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !cases || cases.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No test cases found. Try adjusting your filters.
              </p>
            ) : (
              <TestCaseList
                suiteId={selectedSuite?.id || ""}
                cases={cases || []}
                isLoading={false}
                onRefresh={() => loadCases(selectedSuite?.id || "")}
              />
            )}

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show:</span>
                  <select
                    value={limit}
                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
                    className="h-8 px-2 rounded border border-input bg-background text-sm"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * limit >= total}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="rounded-lg border bg-card p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold">ID Pattern Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure how test case and bug IDs are generated for this test plan.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium">Test Case IDs</h4>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="tcPrefix">Prefix</Label>
                    <Input
                      id="tcPrefix"
                      placeholder="e.g., TC-API"
                      value={plan?.idPrefix || ""}
                      onChange={(e) => setPlan(plan ? { ...plan, idPrefix: e.target.value } : null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Example: TC-API00001 if prefix is "TC-API"
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tcStart">Initial Number</Label>
                    <Input
                      id="tcStart"
                      type="number"
                      min={1}
                      value={plan?.idInitialNumber || 1}
                      onChange={(e) => setPlan(plan ? { ...plan, idInitialNumber: parseInt(e.target.value) || 1 } : null)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                <h4 className="font-medium">Bug IDs</h4>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="bugPrefix">Prefix</Label>
                    <Input
                      id="bugPrefix"
                      placeholder="e.g., BUG-API"
                      value={plan?.bugPrefix || ""}
                      onChange={(e) => setPlan(plan ? { ...plan, bugPrefix: e.target.value } : null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Example: BUG-API-001 if prefix is "BUG-API"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={saveSettings}>
                Save Settings
              </Button>
            </div>

            <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30">
              <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Preview</h4>
              <p className="text-sm text-muted-foreground">
                Test case IDs will be: <code className="bg-muted px-1 rounded">{plan?.idPrefix || "TC"}{String(plan?.idInitialNumber || 1).padStart(5, '0')}</code>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Bug IDs will be: <code className="bg-muted px-1 rounded">{plan?.bugPrefix || "BUG"}-001</code>
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddSuiteOpen} onOpenChange={setIsAddSuiteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Test Suite</DialogTitle>
            <DialogDescription>
              Create a new test suite within this test plan.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleCreateSuite({
                name: formData.get("name") as string,
                description: formData.get("description") as string,
              })
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="suite-name">
                  Suite Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="suite-name"
                  name="name"
                  placeholder="e.g., Authentication Tests"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="suite-description">Description</Label>
                <Input
                  id="suite-description"
                  name="description"
                  placeholder="Optional description..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddSuiteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Suite</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
