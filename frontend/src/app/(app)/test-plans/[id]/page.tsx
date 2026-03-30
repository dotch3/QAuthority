"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
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

export default function TestPlanDetailPage() {
  const params = useParams()
  const planId = params.id as string
  const { selectedProject } = useProject()
  const [plan, setPlan] = useState<{
    id: string
    name: string
    description?: string
    createdAt: string
  } | null>(null)
  const [suites, setSuites] = useState<SuiteNode[]>([])
  const [selectedSuite, setSelectedSuite] = useState<SuiteNode | null>(null)
  const [cases, setCases] = useState<TestCaseRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddSuiteOpen, setIsAddSuiteOpen] = useState(false)

  useEffect(() => {
    if (!selectedProject) return
    loadPlan()
    loadSuites()
  }, [planId, selectedProject])

  useEffect(() => {
    if (selectedSuite) {
      loadCases(selectedSuite.id)
    }
  }, [selectedSuite])

  const loadPlan = async () => {
    try {
      const data = await api.get(`/test-plans/${planId}`)
      setPlan(data as typeof plan)
    } catch (err) {
      console.error("Failed to load plan:", err)
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

  const loadCases = async (suiteId: string) => {
    try {
      const data = await api.get<TestCaseRow[]>(`/suites/${suiteId}/cases`)
      setCases(data)
    } catch (err) {
      console.error("Failed to load cases:", err)
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
          <span>Test Plans</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{plan.name}</span>
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
                    cases={cases}
                    isLoading={false}
                    onRefresh={() => loadCases(selectedSuite.id)}
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
          <div className="rounded-lg border bg-card p-6">
            <p className="text-muted-foreground">
              View all test cases across all suites in this plan.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-muted-foreground">
              Test plan settings coming soon...
            </p>
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
