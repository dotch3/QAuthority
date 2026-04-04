"use client"

import { useEffect, useState } from "react"
import { useProject } from "@/contexts/ProjectContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import {
  GitBranch,
  Clock,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Server,
  ChevronRight,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────

interface CIBuild {
  id: string
  buildNumber: string
  branch: string
  status: string
  triggeredAt: string
  completedAt?: string
}

interface CIRunnerConfig {
  id: string
  name: string
  type: string
  framework: string
  baseUrl?: string
  active: boolean
  createdAt: string
}

const STATUS_COLORS: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  SUCCESS: { variant: "default", label: "Success" },
  FAILED: { variant: "destructive", label: "Failed" },
  RUNNING: { variant: "secondary", label: "Running" },
  PENDING: { variant: "outline", label: "Pending" },
  UNKNOWN: { variant: "outline", label: "Unknown" },
}

const RUNNER_TYPE_LABELS: Record<string, string> = {
  jenkins: "Jenkins",
  github_actions: "GitHub Actions",
  gitlab_ci: "GitLab CI",
  custom_webhook: "Custom Webhook",
}

const FRAMEWORK_LABELS: Record<string, string> = {
  playwright: "Playwright",
  cypress: "Cypress",
  jest: "Jest",
  selenium: "Selenium",
}

// ── Runner config form fields by type ─────────────────────────────────────────

const CONFIG_FIELDS: Record<string, Array<{ key: string; label: string; placeholder: string }>> = {
  jenkins: [{ key: "jobName", label: "Job Name", placeholder: "e.g. my-test-job" }],
  github_actions: [
    { key: "owner", label: "Owner", placeholder: "e.g. my-org" },
    { key: "repo", label: "Repository", placeholder: "e.g. my-repo" },
    { key: "workflowId", label: "Workflow ID or filename", placeholder: "e.g. test.yml" },
    { key: "ref", label: "Branch/ref (default: main)", placeholder: "main" },
  ],
  gitlab_ci: [
    { key: "projectId", label: "GitLab Project ID", placeholder: "e.g. 12345678" },
    { key: "ref", label: "Branch/ref (default: main)", placeholder: "main" },
  ],
  custom_webhook: [{ key: "url", label: "Webhook URL", placeholder: "https://..." }],
}

// ── Runner Dialog ──────────────────────────────────────────────────────────────

function RunnerDialog({
  projectId,
  runner,
  onClose,
  onSaved,
}: {
  projectId: string
  runner?: CIRunnerConfig
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(runner?.name ?? "")
  const [type, setType] = useState(runner?.type ?? "github_actions")
  const [framework, setFramework] = useState(runner?.framework ?? "playwright")
  const [baseUrl, setBaseUrl] = useState(runner?.baseUrl ?? "")
  const [credential, setCredential] = useState("")
  const [config, setConfig] = useState<Record<string, string>>({})
  const [scriptTemplate, setScriptTemplate] = useState("")
  const [saving, setSaving] = useState(false)

  const fields = CONFIG_FIELDS[type] ?? []

  async function save() {
    setSaving(true)
    try {
      const body: Record<string, unknown> = { name, type, framework, config }
      if (baseUrl) body.baseUrl = baseUrl
      if (credential) body.credential = credential
      if (scriptTemplate) body.scriptTemplate = scriptTemplate

      if (runner) {
        await api.patch(`/ci-runner-configs/${runner.id}`, body)
      } else {
        await api.post(`/projects/${projectId}/ci-runner-configs`, body)
      }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{runner ? "Edit Runner Config" : "New CI Runner Config"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Playwright on GitHub" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Runner type</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {Object.entries(RUNNER_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Framework</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
              >
                {Object.entries(FRAMEWORK_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {(type === "jenkins" || type === "gitlab_ci") && (
            <div className="space-y-1">
              <Label>Base URL</Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={type === "jenkins" ? "https://jenkins.mycompany.com" : "https://gitlab.com"}
              />
            </div>
          )}

          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label>{f.label}</Label>
              <Input
                value={config[f.key] ?? ""}
                onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
                placeholder={f.placeholder}
              />
            </div>
          ))}

          <div className="space-y-1">
            <Label>
              {type === "jenkins" ? "API Token (user:token base64)" : "API Token / Personal Access Token"}
            </Label>
            <Input
              type="password"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder={runner ? "Leave blank to keep existing" : "Paste token here"}
            />
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1">
              Custom script template
              <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <textarea
              className="w-full border rounded-md p-2 text-sm font-mono min-h-[80px] bg-background resize-y"
              value={scriptTemplate}
              onChange={(e) => setScriptTemplate(e.target.value)}
              placeholder={"Tokens: {GREP} {RUNID} {WEBHOOK_URL} {IDS_CSV}"}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !name || !type || !framework}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CICDPage() {
  const { selectedProject } = useProject()
  const [builds, setBuilds] = useState<CIBuild[]>([])
  const [runners, setRunners] = useState<CIRunnerConfig[]>([])
  const [loadingBuilds, setLoadingBuilds] = useState(true)
  const [loadingRunners, setLoadingRunners] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editRunner, setEditRunner] = useState<CIRunnerConfig | undefined>()

  const projectId = selectedProject?.id ?? ""

  useEffect(() => {
    if (!projectId) {
      setBuilds([])
      setRunners([])
      setLoadingBuilds(false)
      setLoadingRunners(false)
      return
    }

    setLoadingBuilds(true)
    api.get<CIBuild[]>(`/cicd/builds?projectId=${projectId}`)
      .then(setBuilds)
      .catch(console.error)
      .finally(() => setLoadingBuilds(false))

    fetchRunners()
  }, [projectId])

  function fetchRunners() {
    if (!projectId) return
    setLoadingRunners(true)
    api.get<CIRunnerConfig[]>(`/projects/${projectId}/ci-runner-configs`)
      .then(setRunners)
      .catch(console.error)
      .finally(() => setLoadingRunners(false))
  }

  async function deleteRunner(id: string) {
    if (!confirm("Delete this runner config?")) return
    await api.delete(`/ci-runner-configs/${id}`)
    fetchRunners()
  }

  if (!selectedProject) {
    return (
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-4">CI/CD</h1>
        <p className="text-muted-foreground">Select a project to configure CI integrations.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            CI/CD
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automate test execution and sync results from your pipelines
          </p>
        </div>
      </div>

      <Tabs defaultValue="runners">
        <TabsList>
          <TabsTrigger value="runners">Runner Configs</TabsTrigger>
          <TabsTrigger value="builds">Build History</TabsTrigger>
        </TabsList>

        {/* ── Runner Configs tab ────────────────────────────────────────── */}
        <TabsContent value="runners" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Configure connections to Jenkins, GitHub Actions, GitLab CI, or custom webhooks.
              These are used when dispatching automated test runs.
            </p>
            <Button size="sm" onClick={() => { setEditRunner(undefined); setShowDialog(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Add runner
            </Button>
          </div>

          {loadingRunners ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : runners.length === 0 ? (
            <div className="border rounded-lg p-8 text-center">
              <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No runner configs yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add a runner to dispatch automated test runs directly from QAuthority.
              </p>
              <Button size="sm" onClick={() => { setEditRunner(undefined); setShowDialog(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Add runner
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {runners.map((r) => (
                <div key={r.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      {!r.active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{RUNNER_TYPE_LABELS[r.type] ?? r.type}</span>
                      <ChevronRight className="h-3 w-3" />
                      <span>{FRAMEWORK_LABELS[r.framework] ?? r.framework}</span>
                      {r.baseUrl && <><ChevronRight className="h-3 w-3" /><span>{r.baseUrl}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => { setEditRunner(r); setShowDialog(true) }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteRunner(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* How it works */}
          <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
            <p className="font-medium">How it works</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>QAuthority generates a CLI command tagged with each test's External ID (e.g. <code className="bg-muted px-1 rounded">@TC-CHK-0001</code>)</li>
              <li>The command is dispatched to your runner via API</li>
              <li>After tests run, your CI pipeline calls back QAuthority's webhook with JUnit XML results</li>
              <li>Results are matched by tag and live progress updates are pushed via SSE</li>
            </ol>
          </div>
        </TabsContent>

        {/* ── Build History tab ─────────────────────────────────────────── */}
        <TabsContent value="builds" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Recent CI builds from connected integrations</p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {loadingBuilds ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : builds.length === 0 ? (
            <div className="border rounded-lg p-8 text-center">
              <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No builds yet</h3>
              <p className="text-sm text-muted-foreground">Configure a CI webhook to start syncing build results.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {builds.map((build) => {
                const sc = STATUS_COLORS[build.status] ?? STATUS_COLORS.UNKNOWN
                return (
                  <div key={build.id} className="border rounded-lg p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{build.buildNumber}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm">{build.branch}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(build.triggeredAt).toLocaleString()}
                        {build.completedAt && (
                          <><span>→</span>{new Date(build.completedAt).toLocaleString()}</>
                        )}
                      </div>
                    </div>
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showDialog && (
        <RunnerDialog
          projectId={projectId}
          runner={editRunner}
          onClose={() => setShowDialog(false)}
          onSaved={fetchRunners}
        />
      )}
    </div>
  )
}
