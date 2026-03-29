'use client'
import { useEffect, useState } from 'react'
import { useProject } from '@/contexts/ProjectContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'secondary', ON_TRACK: 'default', AT_RISK: 'destructive', ACHIEVED: 'default', CANCELLED: 'secondary',
}

export default function OKRsPage() {
  const { selectedProject } = useProject()
  const [okrs, setOkrs] = useState<any[]>([])
  const [orgOKRs, setOrgOKRs] = useState<any[]>([])

  useEffect(() => {
    api.get<any[]>('/okrs/org')
      .then(setOrgOKRs)
      .catch(console.error)

    if (selectedProject) {
      api.get<any[]>(`/okrs/project/${selectedProject.id}`)
        .then(setOkrs)
        .catch(console.error)
    } else {
      setOkrs([])
    }
  }, [selectedProject])

  const adoptOKR = async (orgOkrId: string) => {
    if (!selectedProject) return
    await api.post(`/okrs/${orgOkrId}/adopt/${selectedProject.id}`, {})
    const updated = await api.get<any[]>(`/okrs/project/${selectedProject.id}`)
    setOkrs(updated)
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">OKRs</h1>

      <section>
        <h2 className="text-lg font-semibold mb-2">Organization OKRs</h2>
        <p className="text-sm text-muted-foreground mb-3">
          These apply across all teams. Adopt one into your project to track progress locally.
        </p>
        <div className="space-y-2">
          {orgOKRs.map(okr => (
            <div key={okr.id} className="border rounded p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{okr.title}</p>
                <p className="text-xs text-muted-foreground">Q{okr.quarter} {okr.year} • {okr.keyResults?.length ?? 0} key results</p>
              </div>
              <div className="flex gap-2 items-center">
                <Badge variant={STATUS_COLORS[okr.status] as any}>{okr.status}</Badge>
                {selectedProject && (
                  <Button size="sm" variant="outline" onClick={() => adoptOKR(okr.id)}>
                    Adopt
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedProject && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Project OKRs</h2>
          <div className="space-y-2">
            {okrs.map(okr => (
              <div key={okr.id} className="border rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{okr.title}</p>
                  <div className="flex gap-2">
                    {okr.isAdopted && <Badge variant="outline">Adopted</Badge>}
                    <Badge variant={STATUS_COLORS[okr.status] as any}>{okr.status}</Badge>
                  </div>
                </div>
                {okr.keyResults?.map((kr: any) => (
                  <div key={kr.id} className="mt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{kr.title}</span>
                      <span>{kr.currentValue} / {kr.targetValue} {kr.unit}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min((kr.currentValue / kr.targetValue) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
