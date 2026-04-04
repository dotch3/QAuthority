"use client"

import { useEffect, useState, useCallback } from "react"
import { useProject } from "@/contexts/ProjectContext"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { NoProjectSelected } from "@/components/ui/NoProjectSelected"
import { Target, TrendingUp, TrendingDown, Minus, Zap, ShieldCheck, CheckCircle2, BarChart3 } from "lucide-react"

// ── Types ───────────────────────────────────────────────────────────────────

interface MetricSnapshot {
  metricType: string
  value: number
  recordedAt: string
}

interface HistoryPoint {
  recordedAt: string
  value: number
}

// ── DORA tier logic ─────────────────────────────────────────────────────────

type Tier = "Elite" | "High" | "Medium" | "Low"

function doraTier(type: string, value: number): Tier {
  switch (type) {
    case "DORA_DEPLOY_FREQUENCY":
      if (value >= 1) return "Elite"
      if (value >= 0.14) return "High"
      if (value >= 0.033) return "Medium"
      return "Low"
    case "DORA_LEAD_TIME_HOURS":
      if (value <= 1) return "Elite"
      if (value <= 168) return "High"
      if (value <= 720) return "Medium"
      return "Low"
    case "DORA_CHANGE_FAIL_RATE":
      if (value <= 5) return "Elite"
      if (value <= 10) return "High"
      if (value <= 15) return "Medium"
      return "Low"
    case "DORA_MTTR_HOURS":
      if (value <= 1) return "Elite"
      if (value <= 24) return "High"
      if (value <= 168) return "Medium"
      return "Low"
    default:
      return "Medium"
  }
}

const TIER_COLOR: Record<Tier, string> = {
  Elite:  "bg-green-500/10 text-green-700 border-green-500/20",
  High:   "bg-blue-500/10 text-blue-700 border-blue-500/20",
  Medium: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  Low:    "bg-red-500/10 text-red-700 border-red-500/20",
}

// ── Metric config ────────────────────────────────────────────────────────────

interface MetricConfig {
  name: string
  unit: string
  target: number
  lowerIsBetter?: boolean
  group: "dora" | "quality" | "execution"
  description: string
}

const METRIC_CONFIG: Record<string, MetricConfig> = {
  DORA_DEPLOY_FREQUENCY:        { name: "Deploy Frequency",    unit: "/day",  target: 1,    group: "dora",      description: "Deployments per day" },
  DORA_LEAD_TIME_HOURS:         { name: "Lead Time",           unit: "hrs",   target: 24,   lowerIsBetter: true, group: "dora",      description: "Hours from commit to production" },
  DORA_CHANGE_FAIL_RATE:        { name: "Change Fail Rate",    unit: "%",     target: 10,   lowerIsBetter: true, group: "dora",      description: "% of deployments causing failure" },
  DORA_MTTR_HOURS:              { name: "MTTR",                unit: "hrs",   target: 4,    lowerIsBetter: true, group: "dora",      description: "Mean time to restore service" },
  QUALITY_DEFECT_DENSITY:       { name: "Defect Density",      unit: "/case", target: 0.3,  lowerIsBetter: true, group: "quality",   description: "Defects per test case" },
  QUALITY_ESCAPED_DEFECTS:      { name: "Escaped Defects",     unit: "",      target: 0,    lowerIsBetter: true, group: "quality",   description: "Bugs found in production" },
  QUALITY_REQUIREMENT_COVERAGE: { name: "Req. Coverage",       unit: "%",     target: 80,   group: "quality",   description: "% of requirements with test cases" },
  EXECUTION_PASS_RATE:          { name: "Pass Rate",           unit: "%",     target: 90,   group: "execution", description: "% of test executions passing" },
  EXECUTION_BURNDOWN:           { name: "Burndown",            unit: "%",     target: 100,  group: "execution", description: "% of planned test cases executed" },
  AUTOMATION_RATE:              { name: "Automation Rate",     unit: "%",     target: 60,   group: "execution", description: "% of test cases automated" },
}

// ── Mini sparkline ───────────────────────────────────────────────────────────

function Sparkline({ points, lowerIsBetter }: { points: number[]; lowerIsBetter?: boolean }) {
  if (points.length < 2) return null
  const w = 80, h = 28
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const xs = points.map((_, i) => (i / (points.length - 1)) * w)
  const ys = points.map((v) => h - ((v - min) / range) * (h - 4) - 2)
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ")

  const last = points[points.length - 1]
  const prev = points[points.length - 2]
  const improving = lowerIsBetter ? last <= prev : last >= prev
  const color = last === prev ? "#94a3b8" : improving ? "#22c55e" : "#ef4444"

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Trend icon ───────────────────────────────────────────────────────────────

function TrendIcon({ current, prev, lowerIsBetter }: { current: number; prev?: number; lowerIsBetter?: boolean }) {
  if (prev === undefined || current === prev) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
  const improved = lowerIsBetter ? current < prev : current > prev
  return improved
    ? <TrendingUp className="h-3.5 w-3.5 text-green-500" />
    : <TrendingDown className="h-3.5 w-3.5 text-red-500" />
}

// ── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({ metricType, value, history, isDora }: {
  metricType: string
  value: number
  history: number[]
  isDora?: boolean
}) {
  const cfg = METRIC_CONFIG[metricType]
  if (!cfg) return null

  const prev = history.length >= 2 ? history[history.length - 2] : undefined
  const isGood = cfg.lowerIsBetter ? value <= cfg.target : value >= cfg.target
  const pct = cfg.lowerIsBetter
    ? Math.min(100, (cfg.target / (value || 1)) * 100)
    : Math.min(100, (value / cfg.target) * 100)
  const tier = isDora ? doraTier(metricType, value) : null

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium leading-tight">{cfg.name}</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">{cfg.description}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {tier && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TIER_COLOR[tier]}`}>
                {tier}
              </Badge>
            )}
            <TrendIcon current={value} prev={prev} lowerIsBetter={cfg.lowerIsBetter} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <span className={`text-3xl font-bold ${isGood ? "text-green-600" : "text-red-600"}`}>
              {value % 1 === 0 ? value : value.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground ml-1">{cfg.unit}</span>
          </div>
          {history.length >= 2 && <Sparkline points={history} lowerIsBetter={cfg.lowerIsBetter} />}
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Target: {cfg.target}{cfg.unit}</span>
            <span>{pct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isGood ? "bg-green-500" : "bg-orange-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

const METRIC_TYPES = Object.keys(METRIC_CONFIG)

export default function KPIsPage() {
  const { selectedProject } = useProject()
  const [snapshots, setSnapshots] = useState<MetricSnapshot[]>([])
  const [historyMap, setHistoryMap] = useState<Record<string, number[]>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!selectedProject) { setLoading(false); return }
    setLoading(true)
    try {
      const data = await api.get<MetricSnapshot[]>(`/metrics/project/${selectedProject.id}`)
      setSnapshots(data)

      // Fetch history for each metric type that has data
      const types = data.map((s) => s.metricType)
      const historyResults = await Promise.allSettled(
        types.map((type) =>
          api.get<{ history: HistoryPoint[] }>(
            `/metrics/project/${selectedProject.id}/history/${type}?days=180`
          ).then((r) => ({ type, points: r.history.map((h) => h.value) }))
        )
      )
      const map: Record<string, number[]> = {}
      for (const r of historyResults) {
        if (r.status === "fulfilled") map[r.value.type] = r.value.points
      }
      setHistoryMap(map)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedProject])

  useEffect(() => { load() }, [load])

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-7 w-7" />
            KPI Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">DORA metrics and quality indicators</p>
        </div>
        <NoProjectSelected description="Select a project to view its KPIs and DORA metrics." />
      </div>
    )
  }

  const byGroup = {
    dora:      snapshots.filter((s) => METRIC_CONFIG[s.metricType]?.group === "dora"),
    quality:   snapshots.filter((s) => METRIC_CONFIG[s.metricType]?.group === "quality"),
    execution: snapshots.filter((s) => METRIC_CONFIG[s.metricType]?.group === "execution"),
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Target className="h-7 w-7" />
          KPI Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">{selectedProject.name}</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, g) => (
            <div key={g} className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}
              </div>
            </div>
          ))}
        </div>
      ) : snapshots.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">No metrics yet</h3>
            <p className="text-sm text-muted-foreground">Metrics are collected automatically as test runs complete.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* DORA */}
          {byGroup.dora.length > 0 && (
            <div className="space-y-3">
              <SectionHeader
                icon={Zap}
                title="DORA Metrics"
                description="DevOps Research and Assessment — delivery performance indicators"
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {byGroup.dora.map((s) => (
                  <MetricCard
                    key={s.metricType}
                    metricType={s.metricType}
                    value={s.value}
                    history={historyMap[s.metricType] ?? []}
                    isDora
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quality */}
          {byGroup.quality.length > 0 && (
            <div className="space-y-3">
              <SectionHeader
                icon={ShieldCheck}
                title="Quality Metrics"
                description="Defect indicators and test coverage"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {byGroup.quality.map((s) => (
                  <MetricCard
                    key={s.metricType}
                    metricType={s.metricType}
                    value={s.value}
                    history={historyMap[s.metricType] ?? []}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Execution */}
          {byGroup.execution.length > 0 && (
            <div className="space-y-3">
              <SectionHeader
                icon={CheckCircle2}
                title="Execution Metrics"
                description="Test execution efficiency and automation coverage"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {byGroup.execution.map((s) => (
                  <MetricCard
                    key={s.metricType}
                    metricType={s.metricType}
                    value={s.value}
                    history={historyMap[s.metricType] ?? []}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
