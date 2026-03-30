"use client"

import { useState, useEffect, useCallback } from "react"
import { useProject } from "@/contexts/ProjectContext"
import { ETCharterList } from "@/components/et-charters/ETCharterList"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { FileCheck } from "lucide-react"

interface TestSuite {
  id: string
  name: string
  testCases?: Array<{ id: string; title: string }>
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
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [selectedSuite, setSelectedSuite] = useState<string>("")
  const [cases, setCases] = useState<TestCase[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadSuites = useCallback(async () => {
    if (!selectedProject) return
    setIsLoading(true)
    try {
      const data = await api.get<any>(`/projects/${selectedProject.id}/suites`)
      const suiteList = Array.isArray(data) ? data : data.items || []
      setSuites(suiteList)
      if (suiteList.length > 0 && !selectedSuite) {
        setSelectedSuite(suiteList[0].id)
      }
    } catch (err) {
      console.error("Failed to load suites:", err)
      setSuites([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedProject, selectedSuite])

  const loadCases = useCallback(async () => {
    if (!selectedSuite) return
    try {
      const data = await api.get<any[]>(`/suites/${selectedSuite}/cases`)
      setCases(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Failed to load cases:", err)
      setCases([])
    }
  }, [selectedSuite])

  useEffect(() => {
    loadSuites()
  }, [loadSuites])

  useEffect(() => {
    if (selectedSuite) {
      loadCases()
    }
  }, [selectedSuite, loadCases])

  const selectedSuiteData = suites.find((s) => s.id === selectedSuite)

  if (!selectedProject) {
    return (
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <FileCheck className="h-6 w-6" />
          ET Charters
        </h1>
        <p className="text-muted-foreground">Select a project to view ET Charters.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileCheck className="h-6 w-6" />
          ET Charters
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Exploratory Testing Charters for {selectedProject.name}
        </p>
      </div>

      <div className="flex gap-4">
        <div className="w-64">
          <label className="text-sm font-medium mb-2 block">Test Suite</label>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <select
              className="w-full px-3 py-2 rounded-md border bg-background"
              value={selectedSuite}
              onChange={(e) => setSelectedSuite(e.target.value)}
            >
              <option value="">Select a suite...</option>
              {suites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {selectedSuite && selectedSuiteData && (
        <ETCharterList
          suiteId={selectedSuite}
          suiteName={selectedSuiteData.name}
          cases={cases}
          onRefresh={loadCases}
        />
      )}

      {!selectedSuite && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Test Suite</h3>
            <p className="text-sm text-muted-foreground">
              Choose a test suite above to view and manage ET Charters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
