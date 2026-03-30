'use client'
import { useTranslations } from "next-intl"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts'

interface PBCData {
  history: { recordedAt: string; value: number }[]
  pbc: {
    centralLine: number
    upperLimit: number
    lowerLimit: number
    signals: { date: string; type: string }[]
  } | null
}

interface Props {
  data: PBCData
  title: string
  unit?: string
}

export function PBCChart({ data, title, unit = '' }: Props) {
  const t = useTranslations('governance')
  if (!data.pbc || data.history.length < 2) {
    return (
      <div className="border rounded p-4">
        <p className="text-sm font-medium mb-2">{title}</p>
        <p className="text-xs text-muted-foreground">{t('notEnoughDataPBC')}</p>
      </div>
    )
  }

  const signalDates = new Set(data.pbc.signals.map(s => s.date.slice(0, 10)))
  const chartData = data.history.map(h => ({
    date: h.recordedAt.slice(0, 10),
    value: h.value,
    isSignal: signalDates.has(h.recordedAt.slice(0, 10)),
  }))

  const renderDot = (props: any) => {
    const { cx, cy, payload } = props
    if (payload.isSignal) {
      return <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={6} fill="#ef4444" stroke="white" strokeWidth={2} />
    }
    return <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={3} fill="#3b82f6" />
  }

  return (
    <div className="border rounded p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>X&#772; = {data.pbc.centralLine.toFixed(2)}{unit}</span>
          <span>UNPL = {data.pbc.upperLimit.toFixed(2)}{unit}</span>
          {data.pbc.signals.length > 0 && (
            <span className="text-red-500 font-medium">
              {data.pbc.signals.length} signal{data.pbc.signals.length > 1 ? 's' : ''} detected
            </span>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(v) => [`${Number(v).toFixed(2)}${unit}`, title]}
            labelFormatter={(l) => `Date: ${String(l)}`}
          />
          <ReferenceLine y={data.pbc.centralLine} stroke="#6b7280" strokeDasharray="4 4" label={{ value: 'X\u0305', fontSize: 10 }} />
          <ReferenceLine y={data.pbc.upperLimit} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'UNPL', fontSize: 10 }} />
          <ReferenceLine y={data.pbc.lowerLimit} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'LNPL', fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={renderDot}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
