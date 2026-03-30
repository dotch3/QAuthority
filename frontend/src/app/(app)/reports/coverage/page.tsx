"use client"

import { useProject } from "@/contexts/ProjectContext"
import { CoverageReport } from "@/components/reports/CoverageReport"
import { NoProjectSelected } from "@/components/ui/NoProjectSelected"
import { Target } from "lucide-react"
import { useTranslations } from "next-intl"

export default function CoveragePage() {
  const { selectedProject } = useProject()
  const t = useTranslations('reports')

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('coverage')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('coverageDesc')}
          </p>
        </div>
        <NoProjectSelected description="Please select a project to view coverage reports." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <span>{selectedProject.name}</span>
          <Target className="h-4 w-4" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t('coverage')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('coverageDesc')}
        </p>
      </div>
      <CoverageReport />
    </div>
  )
}
