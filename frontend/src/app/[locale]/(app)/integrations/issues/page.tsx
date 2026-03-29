"use client"

import { useEffect, useState } from "react"
import { useProject } from "@/contexts/ProjectContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { AlertCircle, ExternalLink, Unlink, RefreshCw } from "lucide-react"
import { toast } from "sonner"

const PROVIDER_COLORS: Record<string, string> = {
  JIRA: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  GITHUB: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  GITLAB: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  JENKINS: "bg-red-500/10 text-red-600 border-red-500/20",
}

interface ExternalIssue {
  id: string
  externalId: string
  provider: string
  title: string
  status: string
  url: string
  linkedBugId?: string | null
  bug?: {
    id: string
    title: string
  } | null
  syncedAt: string
}

export default function ExternalIssuesPage() {
  const { selectedProject } = useProject()
  const [issues, setIssues] = useState<ExternalIssue[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchIssues = async () => {
      if (!selectedProject) {
        setIssues([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const data = await api.get<ExternalIssue[]>(
          `/external-issues/project/${selectedProject.id}`
        )
        setIssues(data)
      } catch (err) {
        console.error("Failed to fetch issues:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchIssues()
  }, [selectedProject])

  const handleUnlink = async (issueId: string) => {
    try {
      await api.patch(`/external-issues/${issueId}/unlink`, {})
      setIssues((prev) =>
        prev.map((i) =>
          i.id === issueId ? { ...i, linkedBugId: null, bug: null } : i
        )
      )
      toast.success("Issue unlinked successfully")
    } catch (err) {
      console.error("Failed to unlink issue:", err)
      toast.error("Failed to unlink issue")
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString()
  }

  if (!selectedProject) {
    return (
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-4">External Issues</h1>
        <p className="text-muted-foreground">
          Select a project to view external issues.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="h-6 w-6" />
            External Issues
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage issues synced from Jira, GitHub, and other tools
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

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-5 bg-muted rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No external issues</h3>
          <p className="text-sm text-muted-foreground">
            Connect an integration to start syncing issues from external systems.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="border rounded-lg p-4 flex items-start justify-between"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-xs ${PROVIDER_COLORS[issue.provider] || ""}`}
                  >
                    {issue.provider}
                  </Badge>
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    {issue.externalId}: {issue.title}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Status: {issue.status}</span>
                  {issue.bug && (
                    <span className="text-green-600">
                      Linked to bug: {issue.bug.title}
                    </span>
                  )}
                  <span>Synced: {formatDate(issue.syncedAt)}</span>
                </div>
              </div>
              {issue.linkedBugId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnlink(issue.id)}
                  className="ml-4"
                >
                  <Unlink className="h-4 w-4 mr-1" />
                  Unlink
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
