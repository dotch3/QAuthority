"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Clock, Download, RefreshCw, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react"

const STATUS_CONFIG: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any; label: string }> = {
  PENDING: { variant: "secondary", icon: Clock, label: "Pending" },
  RUNNING: { variant: "default", icon: Loader2, label: "Running" },
  DONE: { variant: "default", icon: CheckCircle, label: "Completed" },
  FAILED: { variant: "destructive", icon: XCircle, label: "Failed" },
}

interface ReportJob {
  id: string
  status: string
  format: string
  filePath?: string
  errorMsg?: string
  createdAt: string
  completedAt?: string
  template?: {
    name: string
    type: string
  }
}

export default function ReportHistoryPage() {
  const [jobs, setJobs] = useState<ReportJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchJobs = async () => {
    try {
      const data = await api.get<ReportJob[]>("/reports/jobs")
      setJobs(data)
    } catch (err) {
      console.error("Failed to fetch jobs:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadReport = async (jobId: string) => {
    setDownloading(jobId)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"
      const url = `${baseUrl}/reports/jobs/${jobId}/download`
      const token = localStorage.getItem("access_token")

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Download failed")

      const blob = await response.blob()
      const contentDisposition = response.headers.get("content-disposition")
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] ?? `report-${jobId}.pdf`

      const urlBlob = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = urlBlob
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(urlBlob)
      document.body.removeChild(a)
    } catch (err) {
      console.error("Failed to download:", err)
    } finally {
      setDownloading(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const formatDuration = (start: string, end?: string) => {
    if (!end) return "..."
    const ms = new Date(end).getTime() - new Date(start).getTime()
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Report History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and download generated reports
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchJobs}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No reports generated yet. Create a template and generate a report to see it here.
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => {
            const config = getStatusConfig(job.status)
            const StatusIcon = config.icon
            return (
              <div key={job.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{job.template?.name ?? "Unknown Template"}</h3>
                      <Badge variant="outline">{job.format}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(job.createdAt)}
                      </span>
                      {job.completedAt && (
                        <span>Duration: {formatDuration(job.createdAt, job.completedAt)}</span>
                      )}
                      {job.errorMsg && (
                        <span className="text-destructive">{job.errorMsg}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={config.variant as any} className="flex items-center gap-1">
                      <StatusIcon className={`h-3 w-3 ${job.status === "RUNNING" ? "animate-spin" : ""}`} />
                      {config.label}
                    </Badge>
                    {job.status === "DONE" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={downloading === job.id}
                        onClick={() => downloadReport(job.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {downloading === job.id ? "Downloading..." : "Download"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
