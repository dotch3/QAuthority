"use client"

import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api"
import { useProject } from "@/contexts/ProjectContext"
import { HierarchySelector, HierarchyBreadcrumb } from "@/components/hierarchy/HierarchySelector"
import { TestCaseList, type TestCaseRow } from "@/components/test-cases/TestCaseList"
import { NoProjectSelected } from "@/components/ui/NoProjectSelected"

interface HierarchySelection {
  planId: string
  planName: string
  suiteId: string
  suiteName: string
}

export default function TestCasesPage() {
  const { selectedProject } = useProject()
  const [hierarchySelection, setHierarchySelection] = useState<HierarchySelection | null>(null)
  const [cases, setCases] = useState<TestCaseRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const loadCases = useCallback(async () => {
    if (!hierarchySelection) return
    setIsLoading(true)
    setError("")
    try {
      const data = await api.get<TestCaseRow[]>(`/suites/${hierarchySelection.suiteId}/cases`)
      setCases(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load test cases")
      setCases([])
    } finally {
      setIsLoading(false)
    }
  }, [hierarchySelection])

  useEffect(() => {
    loadCases()
  }, [loadCases])

  const handleHierarchySelect = (planId: string, planName: string, suiteId: string, suiteName: string) => {
    setHierarchySelection({ planId, planName, suiteId, suiteName })
  }

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Cases</h1>
          <p className="text-muted-foreground mt-1">Select a project to view test cases</p>
        </div>
        <NoProjectSelected description="Please select a project from the header to view and manage test cases." />
      </div>
    )
  }

  if (!hierarchySelection) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Cases</h1>
          <p className="text-muted-foreground mt-1">Select a test plan and suite to view cases</p>
        </div>
        <HierarchySelector onSelect={handleHierarchySelect} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Cases</h1>
        <div className="mt-1">
          <HierarchyBreadcrumb
            projectName={selectedProject.name}
            planName={hierarchySelection.planName}
            suiteName={hierarchySelection.suiteName}
            onChange={() => setHierarchySelection(null)}
          />
        </div>
      </div>

      <TestCaseList
        suiteId={hierarchySelection.suiteId}
        cases={cases}
        isLoading={isLoading}
        error={error}
        onRefresh={loadCases}
      />
    </div>
  )
}
