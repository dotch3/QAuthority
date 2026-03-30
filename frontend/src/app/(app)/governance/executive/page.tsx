'use client'
import { useEffect, useState } from 'react'
import { TeamHealthCard } from '@/components/governance/TeamHealthCard'
import { api } from '@/lib/api'

export default function ExecutiveDashboardPage() {
  const [orgMetrics, setOrgMetrics] = useState<any>(null)
  const [teamHealth, setTeamHealth] = useState<any[]>([])
  const [orgOKRs, setOrgOKRs] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      api.get<any>('/metrics/org'),
      api.get<any[]>('/metrics/org/team-health'),
      api.get<any[]>('/okrs/org'),
    ]).then(([metrics, health, okrs]) => {
      setOrgMetrics(metrics)
      setTeamHealth(health)
      setOrgOKRs(okrs)
    }).catch(console.error)
  }, [])

  const m = orgMetrics?.metrics ?? {}
  const fmt = (key: string, decimals = 1) =>
    m[key] ? m[key].avg.toFixed(decimals) : '—'

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold">Executive Dashboard</h1>
      <p className="text-muted-foreground text-sm">
        Org-wide view across {orgMetrics?.projectCount ?? '—'} projects
      </p>

      <section>
        <h2 className="text-lg font-semibold mb-3">DORA Metrics (30-day avg)</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Deploy Frequency', value: fmt('DORA_DEPLOY_FREQUENCY'), unit: '/week' },
            { label: 'Lead Time', value: fmt('DORA_LEAD_TIME_HOURS'), unit: 'hrs' },
            { label: 'Change Fail Rate', value: fmt('DORA_CHANGE_FAIL_RATE'), unit: '%' },
            { label: 'MTTR', value: fmt('DORA_MTTR_HOURS'), unit: 'hrs' },
          ].map(item => (
            <div key={item.label} className="border rounded p-4 text-center">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold mt-1">{item.value}<span className="text-sm font-normal ml-1">{item.unit}</span></p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Team Health Scorecards</h2>
        <div className="border rounded p-4 space-y-1">
          {teamHealth
            .sort((a, b) => b.score - a.score)
            .map(t => (
              <TeamHealthCard key={t.projectId} projectName={t.projectName} score={t.score} />
            ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Organization OKRs</h2>
        <div className="space-y-3">
          {orgOKRs.map((okr: any) => {
            const progress = okr.keyResults?.length > 0
              ? okr.keyResults.reduce((s: number, kr: any) =>
                  s + Math.min((kr.currentValue / kr.targetValue) * 100, 100), 0
                ) / okr.keyResults.length
              : 0
            return (
              <div key={okr.id} className="border rounded p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-medium">{okr.title}</p>
                  <span className="text-sm text-muted-foreground">Q{okr.quarter} {okr.year}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{progress.toFixed(0)}% complete</p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
