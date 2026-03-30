"use client"

import { useState, useEffect, useCallback } from "react"
import { useProject } from "@/contexts/ProjectContext"
import { ETCharterList } from "@/components/et-charters/ETCharterList"
import { HierarchySelector, HierarchyBreadcrumb } from "@/components/hierarchy/HierarchySelector"
import { Card, CardContent } from "@/components/ui/card"
import { NoProjectSelected } from "@/components/ui/NoProjectSelected"
import { api } from "@/lib/api"
import { FileCheck, Layers, FolderKanban } from "lucide-react"

interface HierarchySelection {
  planId: string
  planName: string
  suiteId: string
  suiteName: string
}

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

export default function ETChartersPage() {
  const { selectedProject } = useProject()
  const [hierarchySelection, setHierarchySelection] = useState<HierarchySelection | null>(null)
  const [cases, setCases] = useState<TestCase[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadCases = useCallback(async () => {
    if (!hierarchySelection) return
    setIsLoading(true)
    try {
      const data = await api.get<TestCase[]>(`/suites/${hierarchySelection.suiteId}/cases`)
      setCases(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Failed to load cases:", err)
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
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950">
              <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            ET Charters
          </h1>
          <p className="text-muted-foreground mt-1">Select a project to view ET Charters.</p>
        </div>
        <NoProjectSelected description="Please select a project from the header to view and manage exploratory testing charters." />
      </div>
    )
  }

  if (!hierarchySelection) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950">
              <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            ET Charters
          </h1>
          <p className="text-muted-foreground mt-1">Select a test plan and suite to view charters</p>
        </div>
        <HierarchySelector onSelect={handleHierarchySelect} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <HierarchyBreadcrumb
          projectName={selectedProject.name}
          planName={hierarchySelection.planName}
          suiteName={hierarchySelection.suiteName}
          onChange={() => setHierarchySelection(null)}
        />
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 mt-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950">
            <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          ET Charters
        </h1>
      </div>

      <ETCharterList
        suiteId={hierarchySelection.suiteId}
        suiteName={hierarchySelection.suiteName}
        cases={cases}
        onRefresh={loadCases}
      />
    </div>
  )
}
