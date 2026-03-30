'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from "next-intl"
import { useProject } from '@/contexts/ProjectContext'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NoProjectSelected } from '@/components/ui/NoProjectSelected'
import { TrendingUp, TrendingDown, Minus, Target, CheckCircle, XCircle, Clock } from 'lucide-react'

interface KPI {
  id: string
  name: string
  value: number
  target: number
  unit: string
  trend: 'up' | 'down' | 'stable'
}

export default function KPIsPage() {
  const t = useTranslations('governance')
  const { selectedProject } = useProject()
  const [kpis, setKpis] = useState<KPI[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedProject) {
      setLoading(false)
      return
    }

    setLoading(true)
    api.get<any[]>(`/metrics/kpis?projectId=${selectedProject.id}`)
      .then(setKpis)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedProject])

  const getStatusColor = (kpi: KPI) => {
    const achieved = kpi.value >= kpi.target
    if (kpi.unit === '%') {
      return achieved ? 'text-green-600' : 'text-red-600'
    }
    return achieved ? 'text-green-600' : 'text-orange-600'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6" />
            {t('kpisTitle')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('kpisDesc')}</p>
        </div>
        <NoProjectSelected description="Please select a project from the header to view project KPIs." />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="h-6 w-6" />
          {t('kpisTitle')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {selectedProject.name}
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded" />)}
          </div>
        </div>
      ) : kpis.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('noKpisTitle')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('noKpisDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map(kpi => (
            <Card key={kpi.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
                  {getTrendIcon(kpi.trend)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${getStatusColor(kpi)}`}>
                    {kpi.value.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">{kpi.unit}</span>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Target</span>
                    <span>{kpi.target}{kpi.unit}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        kpi.value >= kpi.target ? 'bg-green-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Achieved
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-500" />
                    Pending
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
