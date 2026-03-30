"use client"

import { useState, useEffect, useCallback } from "react"
import {
  BarChart3,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Activity,
  Loader2,
} from "lucide-react"
import { api } from "@/lib/api"
import { useProject } from "@/contexts/ProjectContext"
import { useTranslations } from "next-intl"

interface ExecutionStats {
  total: number
  passed: number
  failed: number
  blocked: number
  notRun: number
}

interface PlanStats {
  id: string
  name: string
  total: number
  passed: number
  failed: number
  passRate: number
}

export function ReportsDashboard() {
  const { selectedProject } = useProject()
  const t = useTranslations('reports')
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<ExecutionStats>({ total: 0, passed: 0, failed: 0, blocked: 0, notRun: 0 })
  const [planStats, setPlanStats] = useState<PlanStats[]>([])
  const [timeRange, setTimeRange] = useState("7d")

  const loadStats = useCallback(async () => {
    if (!selectedProject) return

    setIsLoading(true)
    try {
      const plans = await api.get<any[]>(`/projects/${selectedProject.id}/test-plans`)
      
      let totalPassed = 0
      let totalFailed = 0
      let totalBlocked = 0
      let totalNotRun = 0
      const plansData: PlanStats[] = []

      for (const plan of plans) {
        const executions = await api.get<any[]>(`/test-plans/${plan.id}/executions`)
        
        let planPassed = 0
        let planFailed = 0
        let planBlocked = 0
        let planNotRun = 0

        for (const exec of executions) {
          const status = exec.status?.value || exec.statusId
          switch (status) {
            case "pass":
              planPassed++
              totalPassed++
              break
            case "fail":
              planFailed++
              totalFailed++
              break
            case "blocked":
              planBlocked++
              totalBlocked++
              break
            default:
              planNotRun++
              totalNotRun++
          }
        }

        const planTotal = executions.length
        plansData.push({
          id: plan.id,
          name: plan.name,
          total: planTotal,
          passed: planPassed,
          failed: planFailed,
          passRate: planTotal > 0 ? Math.round((planPassed / planTotal) * 100) : 0,
        })
      }

      setStats({
        total: totalPassed + totalFailed + totalBlocked + totalNotRun,
        passed: totalPassed,
        failed: totalFailed,
        blocked: totalBlocked,
        notRun: totalNotRun,
      })
      setPlanStats(plansData)
    } catch (err) {
      console.error("Failed to load stats:", err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedProject])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const totalTests = stats.total
  const passRate = totalTests > 0 ? Math.round((stats.passed / totalTests) * 100) : 0
  const maxValue = Math.max(...planStats.map((p) => p.total), 1)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('testActivity')}</h2>
          <p className="text-sm text-muted-foreground">{t('testActivityDesc')}</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="7d">{t('last7Days')}</option>
          <option value="30d">{t('last30Days')}</option>
          <option value="90d">{t('last90Days')}</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.passed}</p>
              <p className="text-sm text-muted-foreground">{t('passed')}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.failed}</p>
              <p className="text-sm text-muted-foreground">{t('failed')}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.blocked}</p>
              <p className="text-sm text-muted-foreground">{t('blocked')}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{passRate}%</p>
              <p className="text-sm text-muted-foreground">{t('passRate')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">{t('passRateByPlan')}</h3>
          <div className="space-y-4">
            {planStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noTestPlans')}</p>
            ) : (
              planStats.map((plan) => (
                <div key={plan.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{plan.name}</span>
                    <span className="text-muted-foreground">
                      {plan.passed}/{plan.total} ({plan.passRate}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${plan.passRate}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold mb-4">{t('executionSummary')}</h3>
          <div className="space-y-3">
            {totalTests === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noExecutions')}</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('totalExecutions')}</span>
                  <span className="font-medium">{totalTests}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600">{t('passed')}</span>
                  <span className="font-medium text-green-600">{stats.passed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-600">{t('failed')}</span>
                  <span className="font-medium text-red-600">{stats.failed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-yellow-600">{t('blocked')}</span>
                  <span className="font-medium text-yellow-600">{stats.blocked}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('notRun')}</span>
                  <span className="font-medium text-gray-600">{stats.notRun}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
