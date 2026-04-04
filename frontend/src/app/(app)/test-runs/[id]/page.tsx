"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useTestRunSSE } from "@/hooks/useTestRunSSE"
import { useProject } from "@/contexts/ProjectContext"
import {
  ChevronRight,
  CheckCircle2,
  XCircle,
  MinusCircle,
  SkipForward,
  Loader2,
  Clock,
  PlayCircle,
  ChevronDown,
  User,
  Timer,
  Zap,
  ExternalLink,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────

interface RunCase {
  id: string
  testCaseId: string
  status: string
  orderIndex: number
  assignee?: { id: string; name?: string; email: string } | null
  testCase: {
    id: string
    title: string
    description?: string
    preconditions?: string
    steps: Array<{ order: number; action: string; expectedResult: string }>
    externalId?: string
    priority: { label: string; value: string; color?: string }
    type: { label: string; value: string }
    suite: { id: string; name: string }
  }
  executions: Array<{
    id: string
    notes?: string
    durationMs?: number
    executedAt: string
    executedBy?: { name?: string; email: string }
  }>
}

interface TestRun {
  id: string
  name: string
  status: string
  environment?: string
  testPlan: { id: string; name: string }
  createdBy: { id: string; name?: string; email: string }
  createdAt: string
  startedAt?: string
  completedAt?: string
  cases: RunCase[]
  _count: { cases: number }
}

type CaseStatus = "not_run" | "in_progress" | "passed" | "failed" | "blocked" | "skipped"

// ─── Status configs ─────────────────────────────────────────────────────────

const CASE_STATUS: Record<CaseStatus, { label: string; className: string; dot: string }> = {
  not_run: { label: "Not Run", className: "bg-gray-500/10 text-gray-500 border-gray-500/20", dot: "bg-gray-400" },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-600 border-blue-500/20", dot: "bg-blue-500" },
  passed: { label: "Passed", className: "bg-green-500/10 text-green-600 border-green-500/20", dot: "bg-green-500" },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-600 border-red-500/20", dot: "bg-red-500" },
  blocked: { label: "Blocked", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", dot: "bg-yellow-500" },
  skipped: { label: "Skipped", className: "bg-purple-500/10 text-purple-600 border-purple-500/20", dot: "bg-purple-400" },
}

const RUN_STATUS: Record<string, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  completed: { label: "Completed", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  aborted: { label: "Aborted", className: "bg-red-500/10 text-red-600 border-red-500/20" },
}

// ─── Progress bar ────────────────────────────────────────────────────────────

function RunProgress({ cases }: { cases: RunCase[] }) {
  const total = cases.length
  const passed = cases.filter((c) => c.status === "passed").length
  const failed = cases.filter((c) => c.status === "failed").length
  const blocked = cases.filter((c) => c.status === "blocked").length
  const skipped = cases.filter((c) => c.status === "skipped").length
  const completed = passed + failed + blocked + skipped
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{completed} / {total} completed</span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
        {total > 0 && (
          <>
            <div className="h-full bg-green-500 transition-all" style={{ width: `${(passed / total) * 100}%` }} />
            <div className="h-full bg-red-500 transition-all" style={{ width: `${(failed / total) * 100}%` }} />
            <div className="h-full bg-yellow-500 transition-all" style={{ width: `${(blocked / total) * 100}%` }} />
            <div className="h-full bg-purple-400 transition-all" style={{ width: `${(skipped / total) * 100}%` }} />
          </>
        )}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{passed} passed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{failed} failed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />{blocked} blocked</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" />{skipped} skipped</span>
      </div>
    </div>
  )
}

// ─── Case detail panel ───────────────────────────────────────────────────────

function CaseDetailPanel({
  runCase,
  onResult,
  runCompleted,
}: {
  runCase: RunCase
  onResult: (id: string, status: CaseStatus, notes: string, durationMs?: number) => Promise<void>
  runCompleted: boolean
}) {
  const [notes, setNotes] = useState(runCase.executions[0]?.notes ?? "")
  const [durationSec, setDurationSec] = useState<string>("")
  const [saving, setSaving] = useState<CaseStatus | null>(null)
  const [stepsExpanded, setStepsExpanded] = useState(true)
  const startTimeRef = useRef<number | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    setNotes(runCase.executions[0]?.notes ?? "")
    setDurationSec("")
    setStepsExpanded(true)
    if (runCase.status === "in_progress") {
      startTimeRef.current = Date.now()
    } else {
      startTimeRef.current = null
    }
  }, [runCase.id])

  // Timer for in_progress
  useEffect(() => {
    if (runCase.status !== "in_progress") { setElapsed(0); return }
    const id = setInterval(() => {
      if (startTimeRef.current) setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [runCase.status, runCase.id])

  const record = async (status: CaseStatus) => {
    setSaving(status)
    try {
      const dms = durationSec ? parseInt(durationSec) * 1000 : elapsed > 0 ? elapsed * 1000 : undefined
      await onResult(runCase.id, status, notes, dms)
    } finally {
      setSaving(null)
    }
  }

  const steps: Array<{ order: number; action: string; expectedResult: string }> =
    Array.isArray(runCase.testCase.steps) ? runCase.testCase.steps : []

  const formatSec = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">{runCase.testCase.suite.name} · {runCase.testCase.externalId}</p>
            <h3 className="font-semibold leading-snug mt-0.5">{runCase.testCase.title}</h3>
          </div>
          <Badge variant="outline" className={CASE_STATUS[runCase.status as CaseStatus]?.className ?? ""}>
            {CASE_STATUS[runCase.status as CaseStatus]?.label ?? runCase.status}
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap text-xs">
          <Badge variant="outline">{runCase.testCase.type.label}</Badge>
          <Badge variant="outline">{runCase.testCase.priority.label}</Badge>
          {runCase.assignee && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              {runCase.assignee.name || runCase.assignee.email}
            </span>
          )}
          {runCase.status === "in_progress" && elapsed > 0 && (
            <span className="flex items-center gap-1 text-blue-600 font-mono">
              <Timer className="h-3 w-3" />
              {formatSec(elapsed)}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {runCase.testCase.preconditions && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Preconditions</p>
            <p className="text-sm">{runCase.testCase.preconditions}</p>
          </div>
        )}

        {steps.length > 0 && (
          <div>
            <button
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2 hover:text-foreground"
              onClick={() => setStepsExpanded((v) => !v)}
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${stepsExpanded ? "" : "-rotate-90"}`} />
              Steps ({steps.length})
            </button>
            {stepsExpanded && (
              <div className="space-y-2">
                {steps.map((s) => (
                  <div key={s.order} className="border rounded-md p-3 text-sm space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center">
                        {s.order}
                      </span>
                      <div className="flex-1 space-y-1">
                        <p>{s.action}</p>
                        <p className="text-xs text-muted-foreground">Expected: {s.expectedResult}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Notes / Actual Result</label>
          <textarea
            className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Describe what happened, errors seen, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={runCompleted}
          />
        </div>

        {/* Duration */}
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Duration (seconds)</label>
            <input
              type="number"
              className="mt-1 h-8 w-24 rounded-md border border-input bg-background px-2 text-sm"
              placeholder="e.g. 45"
              value={durationSec}
              onChange={(e) => setDurationSec(e.target.value)}
              disabled={runCompleted}
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {!runCompleted && (
        <div className="p-4 border-t space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!!saving}
              onClick={() => record("passed")}
            >
              {saving === "passed" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Pass
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!!saving}
              onClick={() => record("failed")}
            >
              {saving === "failed" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
              Fail
            </Button>
            <Button
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
              disabled={!!saving}
              onClick={() => record("blocked")}
            >
              {saving === "blocked" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MinusCircle className="h-4 w-4 mr-1" />}
              Blocked
            </Button>
            <Button
              variant="outline"
              disabled={!!saving}
              onClick={() => record("skipped")}
            >
              {saving === "skipped" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <SkipForward className="h-4 w-4 mr-1" />}
              Skip
            </Button>
          </div>
          <Button
            variant="outline"
            className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
            disabled={!!saving || runCase.status === "in_progress"}
            onClick={() => record("in_progress")}
          >
            {saving === "in_progress" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <PlayCircle className="h-4 w-4 mr-1" />}
            Mark In Progress
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Run Automated Dialog ─────────────────────────────────────────────────────

interface CIRunner { id: string; name: string; type: string; framework: string }

function RunAutomatedDialog({
  runId,
  projectId,
  onClose,
  onDispatched,
}: {
  runId: string
  projectId: string
  onClose: () => void
  onDispatched: (jobUrl?: string) => void
}) {
  const [runners, setRunners] = useState<CIRunner[]>([])
  const [selectedRunner, setSelectedRunner] = useState<string>("")
  const [preview, setPreview] = useState<{ script: string; callbackSnippet: string; externalIds: string[] } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [dispatching, setDispatching] = useState(false)

  useEffect(() => {
    api.get<CIRunner[]>(`/projects/${projectId}/ci-runner-configs`)
      .then((data) => {
        setRunners(data)
        if (data.length === 1) setSelectedRunner(data[0].id)
      })
      .catch(console.error)
  }, [projectId])

  useEffect(() => {
    if (!selectedRunner) { setPreview(null); return }
    setLoadingPreview(true)
    api.get<any>(`/test-runs/${runId}/ci-script?runnerId=${selectedRunner}`)
      .then(setPreview)
      .catch(console.error)
      .finally(() => setLoadingPreview(false))
  }, [selectedRunner, runId])

  async function dispatch() {
    setDispatching(true)
    try {
      const res = await api.post<{ dispatched: boolean; jobUrl?: string }>(
        `/test-runs/${runId}/dispatch`,
        { runnerId: selectedRunner }
      )
      toast.success("CI job dispatched")
      onDispatched(res.jobUrl)
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? "Failed to dispatch CI job")
    } finally {
      setDispatching(false)
    }
  }

  const FRAMEWORK_LABELS: Record<string, string> = {
    playwright: "Playwright", cypress: "Cypress", jest: "Jest", selenium: "Selenium",
  }
  const TYPE_LABELS: Record<string, string> = {
    jenkins: "Jenkins", github_actions: "GitHub Actions", gitlab_ci: "GitLab CI", custom_webhook: "Custom",
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Run Automated Tests</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {runners.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No CI runner configs found for this project.{" "}
              <Link href="/integrations/cicd" className="text-primary underline-offset-4 hover:underline">
                Configure one here.
              </Link>
            </p>
          ) : (
            <>
              <div className="space-y-1">
                <Label>Select runner</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedRunner}
                  onChange={(e) => setSelectedRunner(e.target.value)}
                >
                  <option value="">Choose a runner config…</option>
                  {runners.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {TYPE_LABELS[r.type] ?? r.type} / {FRAMEWORK_LABELS[r.framework] ?? r.framework}
                    </option>
                  ))}
                </select>
              </div>

              {loadingPreview && (
                <div className="text-sm text-muted-foreground animate-pulse">Loading script preview…</div>
              )}

              {preview && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Generated command ({preview.externalIds.length} test{preview.externalIds.length !== 1 ? "s" : ""})
                    </p>
                    <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {preview.script}
                    </pre>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Callback snippet (run after tests in CI)
                    </p>
                    <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {preview.callbackSnippet}
                    </pre>
                  </div>
                  {preview.externalIds.length === 0 && (
                    <p className="text-sm text-yellow-600">
                      Warning: no test cases in this run have an External ID set. Results cannot be matched back automatically.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={dispatch}
            disabled={!selectedRunner || dispatching || runners.length === 0}
          >
            {dispatching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            Dispatch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function TestRunPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { selectedProject } = useProject()
  const [run, setRun] = useState<TestRun | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [completing, setCompleting] = useState(false)
  const [showAutoDialog, setShowAutoDialog] = useState(false)
  const [ciJobUrl, setCiJobUrl] = useState<string | null>(null)

  const loadRun = useCallback(async () => {
    try {
      const data = await api.get<TestRun>(`/test-runs/${id}`)
      setRun(data)
      if (!selectedCaseId && data.cases.length > 0) {
        setSelectedCaseId(data.cases[0].id)
      }
    } catch (err) {
      console.error("Failed to load run:", err)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => { loadRun() }, [loadRun])

  // Store loadRun in a ref so the SSE handler can call it without a stale closure
  const loadRunRef = useRef(loadRun)
  loadRunRef.current = loadRun

  // Live SSE updates from CI webhook
  useTestRunSSE(id, (event) => {
    if (event.type === "case_updated") {
      const { runCaseId, status } = event.payload as { runCaseId: string; status: string }
      setRun((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          cases: prev.cases.map((c) =>
            c.id === runCaseId ? { ...c, status } : c
          ),
        }
      })
    }
    if (event.type === "ci_status") {
      const { ciStatus, jobUrl } = event.payload as { ciStatus?: string; jobUrl?: string }
      if (jobUrl) setCiJobUrl(jobUrl)
      if (ciStatus === "completed") {
        toast.success("CI run completed — results synced")
        loadRunRef.current()
      }
    }
  })

  const handleResult = async (runCaseId: string, status: CaseStatus, notes: string, durationMs?: number) => {
    try {
      await api.patch(`/test-run-cases/${runCaseId}/result`, { status, notes: notes || undefined, durationMs })
      // Optimistic update
      setRun((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          status: prev.status === "not_started" ? "in_progress" : prev.status,
          cases: prev.cases.map((c) =>
            c.id === runCaseId ? { ...c, status } : c
          ),
        }
      })
      // Auto-advance to next not_run case
      if (status !== "in_progress" && run) {
        const sorted = [...run.cases].sort((a, b) => a.orderIndex - b.orderIndex)
        const currentIdx = sorted.findIndex((c) => c.id === runCaseId)
        const next = sorted.slice(currentIdx + 1).find((c) => c.status === "not_run")
        if (next) setSelectedCaseId(next.id)
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to record result")
      throw err
    }
  }

  const handleComplete = async () => {
    if (!run) return
    setCompleting(true)
    try {
      await api.patch(`/test-runs/${run.id}`, { status: "completed" })
      setRun((prev) => prev ? { ...prev, status: "completed" } : prev)
      toast.success("Run completed")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to complete run")
    } finally {
      setCompleting(false)
    }
  }

  const handleAbort = async () => {
    if (!run) return
    try {
      await api.patch(`/test-runs/${run.id}`, { status: "aborted" })
      setRun((prev) => prev ? { ...prev, status: "aborted" } : prev)
      toast.success("Run aborted")
    } catch (err: any) {
      toast.error(err.message ?? "Failed to abort run")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-2 w-full" />
        <div className="grid grid-cols-[300px_1fr] gap-4 h-[600px]">
          <Skeleton className="h-full" />
          <Skeleton className="h-full" />
        </div>
      </div>
    )
  }

  if (!run) return <div className="p-8 text-muted-foreground">Run not found</div>

  const runCompleted = run.status === "completed" || run.status === "aborted"
  const runStatus = RUN_STATUS[run.status] || RUN_STATUS.not_started

  const filteredCases = run.cases.filter((c) => {
    if (statusFilter === "all") return true
    if (statusFilter === "done") return ["passed", "failed", "blocked", "skipped"].includes(c.status)
    return c.status === statusFilter
  }).sort((a, b) => a.orderIndex - b.orderIndex)

  const selectedCase = run.cases.find((c) => c.id === selectedCaseId) ?? null

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden -m-6">
      {/* Top bar */}
      <div className="px-6 py-3 border-b bg-card flex-shrink-0 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/test-runs" className="hover:text-foreground">Test Runs</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium truncate">{run.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">{run.name}</h1>
            <Badge variant="outline" className={runStatus.className}>{runStatus.label}</Badge>
            {run.environment && (
              <Badge variant="secondary" className="text-xs">{run.environment}</Badge>
            )}
            <span className="text-xs text-muted-foreground">{run.testPlan.name}</span>
          </div>
          <div className="flex gap-2">
            {ciJobUrl && (
              <a href={ciJobUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  CI Job
                </Button>
              </a>
            )}
            {!runCompleted && selectedProject && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAutoDialog(true)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Run Automated
              </Button>
            )}
            {!runCompleted && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={handleAbort}
                >
                  Abort Run
                </Button>
                <Button
                  size="sm"
                  onClick={handleComplete}
                  disabled={completing}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {completing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Complete Run
                </Button>
              </>
            )}
          </div>
        </div>
        <RunProgress cases={run.cases} />
      </div>

      {/* Main two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: case list */}
        <div className="w-72 flex-shrink-0 border-r flex flex-col overflow-hidden">
          <div className="p-2 border-b">
            <select
              className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All ({run.cases.length})</option>
              <option value="not_run">Not Run</option>
              <option value="in_progress">In Progress</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="blocked">Blocked</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredCases.map((c) => {
              const cfg = CASE_STATUS[c.status as CaseStatus] || CASE_STATUS.not_run
              const isSelected = c.id === selectedCaseId
              return (
                <button
                  key={c.id}
                  className={`w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition-colors ${isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                  onClick={() => setSelectedCaseId(c.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className={`flex-shrink-0 mt-1 w-2 h-2 rounded-full ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-snug">{c.testCase.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">{cfg.label}</span>
                        {c.assignee && (
                          <span className="text-xs text-muted-foreground truncate">· {c.assignee.name || c.assignee.email}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: execution panel */}
        <div className="flex-1 overflow-hidden">
          {selectedCase ? (
            <CaseDetailPanel
              key={selectedCase.id}
              runCase={selectedCase}
              onResult={handleResult}
              runCompleted={runCompleted}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Select a case from the list
            </div>
          )}
        </div>
      </div>

      {showAutoDialog && selectedProject && (
        <RunAutomatedDialog
          runId={id}
          projectId={selectedProject.id}
          onClose={() => setShowAutoDialog(false)}
          onDispatched={(jobUrl) => {
            if (jobUrl) setCiJobUrl(jobUrl)
          }}
        />
      )}
    </div>
  )
}
