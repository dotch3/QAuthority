"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CheckCircle,
  XCircle,
  Clock,
  Target,
  FileText,
  Loader2,
} from "lucide-react"
import { api } from "@/lib/api"
import { useProject } from "@/contexts/ProjectContext"
import { useTranslations } from "next-intl"

interface SuiteCoverage {
  id: string
  name: string
  testPlanName: string
  totalCases: number
  executedCases: number
  passedCases: number
  failedCases: number
}

interface PlanCoverage {
  id: string
  name: string
  totalCases: number
  coveredCases: number
  coveragePercent: number
}

export function CoverageReport() {
  const { selectedProject } = useProject()
  const t = useTranslations('reports')
  const [isLoading, setIsLoading] = useState(true)
  const [suiteCoverage, setSuiteCoverage] = useState<SuiteCoverage[]>([])
  const [planCoverage, setPlanCoverage] = useState<PlanCoverage[]>([])
  const [selectedModule, setSelectedModule] = useState<string | null>(null)

  const loadCoverage = useCallback(async () => {
    if (!selectedProject) return

    setIsLoading(true)
    try {
      const plans = await api.get<any[]>(`/projects/${selectedProject.id}/test-plans`)
      
      const plansData: PlanCoverage[] = []
      const suitesData: SuiteCoverage[] = []
      let totalCases = 0
      let coveredCases = 0

      for (const plan of plans) {
        const suites = await api.get<any[]>(`/test-plans/${plan.id}/suites`)
        const executions = await api.get<any[]>(`/test-plans/${plan.id}/executions`)
        
        const flattenSuites = (items: any[]): any[] => {
          const result: any[] = []
          const flatten = (items: any[]) => {
            for (const item of items) {
              result.push(item)
              if (item.children && item.children.length > 0) {
                flatten(item.children)
              }
            }
          }
          flatten(items)
          return result
        }
        
        const flatSuites = flattenSuites(suites)
        let planTotalCases = 0
        let planCoveredCases = 0

        for (const suite of flatSuites) {
          const cases = await api.get<any[]>(`/suites/${suite.id}/cases`)
          const suiteExecutedCases = executions.filter((e: any) => {
            return cases.some((c: any) => c.id === e.testCaseId)
          })
          const suitePassedCases = suiteExecutedCases.filter((e: any) => {
            const status = e.status?.value || e.statusId
            return status === "pass"
          })

          planTotalCases += cases.length
          planCoveredCases += suiteExecutedCases.length

          suitesData.push({
            id: suite.id,
            name: suite.name,
            testPlanName: plan.name,
            totalCases: cases.length,
            executedCases: suiteExecutedCases.length,
            passedCases: suitePassedCases.length,
            failedCases: suiteExecutedCases.length - suitePassedCases.length,
          })
        }

        totalCases += planTotalCases
        coveredCases += planCoveredCases

        plansData.push({
          id: plan.id,
          name: plan.name,
          totalCases: planTotalCases,
          coveredCases: planCoveredCases,
          coveragePercent: planTotalCases > 0 ? Math.round((planCoveredCases / planTotalCases) * 100) : 0,
        })
      }

      setSuiteCoverage(suitesData)
      setPlanCoverage(plansData)
    } catch (err) {
      console.error("Failed to load coverage:", err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedProject])

  useEffect(() => {
    loadCoverage()
  }, [loadCoverage])

  const totalCases = planCoverage.reduce((sum, p) => sum + p.totalCases, 0)
  const coveredCases = planCoverage.reduce((sum, p) => sum + p.coveredCases, 0)
  const overallCoverage = totalCases > 0 ? Math.round((coveredCases / totalCases) * 100) : 0

  const selectedSuite = selectedModule 
    ? suiteCoverage.find((s) => s.id === selectedModule) 
    : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('testCoverage')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('testCoverageDesc')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-6 rounded-lg border bg-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overallCoverage}%</p>
              <p className="text-sm text-muted-foreground">{t('overallCoverage')}</p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${overallCoverage}%` }}
            />
          </div>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{coveredCases}</p>
              <p className="text-sm text-muted-foreground">{t('casesExecuted')}</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCases}</p>
              <p className="text-sm text-muted-foreground">{t('totalCases')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">{t('coverageByPlan')}</h3>
          <div className="space-y-4">
            {planCoverage.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noSuites')}</p>
            ) : (
              planCoverage.map((plan) => (
                <div key={plan.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{plan.name}</span>
                    <span className="text-muted-foreground">
                      {plan.coveredCases}/{plan.totalCases} ({plan.coveragePercent}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${plan.coveragePercent}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">{t('suiteDetails')}</h3>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {suiteCoverage.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noSuites')}</p>
            ) : (
              suiteCoverage.map((suite) => (
                <button
                  key={suite.id}
                  onClick={() => setSelectedModule(selectedModule === suite.id ? null : suite.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedModule === suite.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{suite.name}</span>
                    <span className="text-xs text-muted-foreground">{suite.testPlanName}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>{t('total')}: {suite.totalCases}</span>
                    <span>{t('executed')}: {suite.executedCases}</span>
                    <span className="text-green-600">{t('pass')}: {suite.passedCases}</span>
                    <span className="text-red-600">{t('fail')}: {suite.failedCases}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
