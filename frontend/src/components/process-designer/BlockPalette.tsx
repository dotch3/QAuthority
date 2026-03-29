'use client'

const BLOCK_TYPES = [
  { type: 'BRAINSTORMING', label: 'Brainstorming', color: 'bg-purple-100 border-purple-400' },
  { type: 'RISK_ANALYSIS', label: 'Risk Analysis', color: 'bg-red-100 border-red-400' },
  { type: 'RACI_MATRIX', label: 'RACI Matrix', color: 'bg-blue-100 border-blue-400' },
  { type: 'ORACLE_DEFINITION', label: 'Oracle Definition', color: 'bg-yellow-100 border-yellow-400' },
  { type: 'SANITY_SMOKE', label: 'Sanity / Smoke', color: 'bg-green-100 border-green-400' },
  { type: 'ENVIRONMENT_SETUP', label: 'Environment Setup', color: 'bg-gray-100 border-gray-400' },
  { type: 'SIGN_OFF', label: 'Sign Off', color: 'bg-emerald-100 border-emerald-400' },
  { type: 'NOTE', label: 'Note', color: 'bg-orange-100 border-orange-400' },
  { type: 'DECISION', label: 'Decision', color: 'bg-cyan-100 border-cyan-400' },
  { type: 'SUBPROCESS', label: 'Subprocess', color: 'bg-indigo-100 border-indigo-400' },
]

export function BlockPalette({ onAdd }: { onAdd: (type: string, label: string) => void }) {
  return (
    <div className="w-48 border-r p-3 space-y-1 overflow-y-auto bg-background">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Blocks
      </p>
      {BLOCK_TYPES.map(b => (
        <button
          key={b.type}
          onClick={() => onAdd(b.type, b.label)}
          className={`w-full text-left text-xs px-2 py-1.5 rounded border ${b.color} hover:opacity-80 transition-opacity`}
        >
          {b.label}
        </button>
      ))}
    </div>
  )
}
