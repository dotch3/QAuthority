'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from "next-intl"
import { useProject } from '@/contexts/ProjectContext'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NoProjectSelected } from '@/components/ui/NoProjectSelected'

export default function ProjectDashboardPage() {
  const t = useTranslations('governance')
  const { selectedProject } = useProject()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedProject) {
      setLoading(false)
      return
    }

    setLoading(true)
    api.get<any>(`/metrics/projects/${selectedProject.id}`)
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedProject])

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('projectDashboard')}</h1>
          <p className="text-muted-foreground mt-1">{t('selectProject')}</p>
        </div>
        <NoProjectSelected description="Please select a project from the header to view project-level governance metrics." />
      </div>
    )
  }

  const m = metrics?.metrics ?? {}

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">{t('projectDashboard')}</h1>
        <p className="text-muted-foreground text-sm">
          {selectedProject.name}
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded" />)}
          </div>
        </div>
      ) : (
        <>
          <section>
            <h2 className="text-lg font-semibold mb-3">{t('testExecutionSummary')}</h2>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: t('totalCases'), value: m.TOTAL_CASES ?? 0 },
                { label: t('executed'), value: m.EXECUTED_CASES ?? 0 },
                { label: t('passed'), value: m.PASSED_CASES ?? 0, color: 'text-green-600' },
                { label: t('failed'), value: m.FAILED_CASES ?? 0, color: 'text-red-600' },
              ].map(item => (
                <Card key={item.label}>
                  <CardContent className="pt-6 text-center">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-3xl font-bold mt-1 ${item.color ?? ''}`}>{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">{t('qualityIndicators')}</h2>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">
                    {m.EXECUTED_CASES > 0
                      ? ((m.PASSED_CASES / m.EXECUTED_CASES) * 100).toFixed(1)
                      : '—'
                    }%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Open Bugs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{m.OPEN_BUGS ?? 0}</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">{t('coverage')}</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>{t('testCoverage')}</span>
                    <span className="font-medium">{m.COVERAGE_PERCENT ?? 0}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${m.COVERAGE_PERCENT ?? 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
