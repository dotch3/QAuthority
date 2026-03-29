"use client"

import { useEffect, useState } from "react"
import { useProject } from "@/contexts/ProjectContext"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { GitBranch, Clock, ExternalLink, RefreshCw } from "lucide-react"

const STATUS_COLORS: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  SUCCESS: { variant: "default", label: "Success" },
  FAILED: { variant: "destructive", label: "Failed" },
  RUNNING: { variant: "secondary", label: "Running" },
  PENDING: { variant: "outline", label: "Pending" },
  UNKNOWN: { variant: "outline", label: "Unknown" },
}

interface CIBuild {
  id: string
  buildNumber: string
  branch: string
  status: string
  triggeredAt: string
  completedAt?: string
  integration?: {
    type?: { value?: string }
  }
}

export default function CICDPage() {
  const { selectedProject } = useProject()
  const [builds, setBuilds] = useState<CIBuild[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchBuilds = async () => {
      if (!selectedProject) {
        setBuilds([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const params = selectedProject ? `?projectId=${selectedProject.id}` : ""
        const data = await api.get<CIBuild[]>(`/cicd/builds${params}`)
        setBuilds(data)
      } catch (err) {
        console.error("Failed to fetch builds:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBuilds()
  }, [selectedProject])

  const getStatusConfig = (status: string) => {
    return STATUS_COLORS[status] || STATUS_COLORS.UNKNOWN
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString()
  }

  if (!selectedProject) {
    return (
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-4">CI/CD Builds</h1>
        <p className="text-muted-foreground">
          Select a project to view CI/CD builds.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            CI/CD Builds
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View test results from your CI/CD pipelines
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-medium mb-2">Webhook Endpoint</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Send build results to this endpoint with your integration secret:
        </p>
        <div className="bg-background rounded border p-3 font-mono text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">POST</Badge>
            <code>/api/v1/cicd/webhook</code>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Header: <code className="bg-muted px-1 rounded">x-qauthority-secret: &lt;integration secret&gt;</code>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-5 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : builds.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No builds yet</h3>
          <p className="text-sm text-muted-foreground">
            Configure a CI webhook to start syncing build results.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {builds.map((build) => {
            const statusConfig = getStatusConfig(build.status)
            return (
              <div
                key={build.id}
                className="border rounded-lg p-4 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      #{build.buildNumber}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm">{build.branch}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(build.triggeredAt)}
                    {build.completedAt && (
                      <>
                        <span>→</span>
                        {formatDate(build.completedAt)}
                      </>
                    )}
                  </div>
                </div>
                <Badge variant={statusConfig.variant}>
                  {statusConfig.label}
                </Badge>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
