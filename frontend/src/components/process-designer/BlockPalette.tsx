'use client'

const BLOCK_TYPES = [
  { type: 'BRAINSTORMING',     label: 'Brainstorming',      color: 'bg-purple-100 border-purple-400' },
  { type: 'RISK_ANALYSIS',     label: 'Risk Analysis',      color: 'bg-red-100 border-red-400' },
  { type: 'RACI_MATRIX',       label: 'RACI Matrix',        color: 'bg-blue-100 border-blue-400' },
  { type: 'ORACLE_DEFINITION', label: 'Oracle Definition',  color: 'bg-yellow-100 border-yellow-400' },
  { type: 'SANITY_SMOKE',      label: 'Sanity / Smoke',     color: 'bg-green-100 border-green-400' },
  { type: 'ENVIRONMENT_SETUP', label: 'Environment Setup',  color: 'bg-gray-100 border-gray-400' },
  { type: 'SIGN_OFF',          label: 'Sign Off',           color: 'bg-emerald-100 border-emerald-400' },
  { type: 'NOTE',              label: 'Note',               color: 'bg-orange-100 border-orange-400' },
  { type: 'DECISION',          label: 'Decision',           color: 'bg-cyan-100 border-cyan-400' },
  { type: 'SUBPROCESS',        label: 'Subprocess',         color: 'bg-indigo-100 border-indigo-400' },
]

interface BlockPaletteProps {
  onAdd: (type: string, label: string) => void
}

export function BlockPalette({ onAdd }: BlockPaletteProps) {
  const onDragStart = (event: React.DragEvent, type: string, label: string) => {
    event.dataTransfer.setData('application/rf-block-type', type)
    event.dataTransfer.setData('application/rf-block-label', label)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-48 border-r p-3 space-y-1 overflow-y-auto bg-background flex flex-col">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Blocks
      </p>
      <p className="text-[10px] text-muted-foreground mb-3 leading-snug">
        Drag onto canvas or click to add
      </p>
      {BLOCK_TYPES.map(b => (
        <button
          key={b.type}
          draggable
          onDragStart={(e) => onDragStart(e, b.type, b.label)}
          onClick={() => onAdd(b.type, b.label)}
          className={`w-full text-left text-xs px-2 py-1.5 rounded border text-gray-900 cursor-grab active:cursor-grabbing ${b.color} hover:opacity-80 transition-opacity`}
        >
          {b.label}
        </button>
      ))}
      <div className="mt-auto pt-4 border-t space-y-1 text-[10px] text-muted-foreground leading-snug">
        <p>🔗 Drag from handle to handle to connect</p>
        <p>🗑 Select + <kbd className="bg-muted px-1 rounded">Del</kbd> to remove</p>
      </div>
    </div>
  )
}
