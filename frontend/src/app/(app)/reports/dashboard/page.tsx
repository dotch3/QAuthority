"use client"

import { useProject } from "@/contexts/ProjectContext"
import { ReportsDashboard } from "@/components/reports/ReportsDashboard"
import { NoProjectSelected } from "@/components/ui/NoProjectSelected"
import { BarChart3 } from "lucide-react"
import { useTranslations } from "next-intl"

export default function ReportsDashboardPage() {
  const { selectedProject } = useProject()
  const t = useTranslations('reports')

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('dashboardDesc')}
          </p>
        </div>
        <NoProjectSelected description="Please select a project to view reports." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <span>{selectedProject.name}</span>
          <BarChart3 className="h-4 w-4" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('dashboardDesc')}
        </p>
      </div>
      <ReportsDashboard />
    </div>
  )
}
