'use client'

interface Props {
  projectName: string
  score: number
}

export function TeamHealthCard({ projectName, score }: Props) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-sm w-40 truncate">{projectName}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-medium w-10 text-right">{score}%</span>
    </div>
  )
}
