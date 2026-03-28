'use client'
import { useState } from 'react'

const MODULES = [
  { key: 'TEST_PLANS', label: 'Test Plans' },
  { key: 'TEST_SUITES', label: 'Test Suites' },
  { key: 'TEST_CASES', label: 'Test Cases' },
  { key: 'EXECUTIONS', label: 'Executions' },
  { key: 'BUGS', label: 'Defects' },
  { key: 'ET_CHARTERS', label: 'ET Charters' },
  { key: 'HEURISTICS', label: 'Heuristics' },
  { key: 'QA_GOVERNANCE', label: 'QA Governance' },
  { key: 'REPORTING', label: 'Reporting' },
  { key: 'PROCESS_DESIGNER', label: 'Process Designer' },
  { key: 'AI_CODEGEN', label: 'AI Code Gen' },
  { key: 'INTEGRATIONS', label: 'Integrations' },
  { key: 'USERS_GROUPS', label: 'Users & Groups' },
  { key: 'ADMIN', label: 'Admin' },
]

const ACTIONS = ['canRead', 'canCreate', 'canUpdate', 'canDelete', 'canExport'] as const

interface Props {
  permissions: Record<string, Record<string, boolean>>
  onChange: (permissions: any[]) => void
  disabled?: boolean
}

export function PermissionsMatrix({ permissions, onChange, disabled }: Props) {
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(() => {
    const initial: Record<string, Record<string, boolean>> = {}
    for (const mod of MODULES) {
      initial[mod.key] = {
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canExport: false,
        ...permissions[mod.key],
      }
    }
    return initial
  })

  const toggle = (module: string, action: string) => {
    const updated = {
      ...matrix,
      [module]: { ...matrix[module], [action]: !matrix[module][action] },
    }
    setMatrix(updated)
    const flat = MODULES.map(m => ({ module: m.key, ...updated[m.key] }))
    onChange(flat)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 w-40">Module</th>
            {ACTIONS.map(a => (
              <th key={a} className="text-center p-2 w-20">
                {a.replace('can', '')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map(mod => (
            <tr key={mod.key} className="border-b hover:bg-muted/30">
              <td className="p-2 font-medium">{mod.label}</td>
              {ACTIONS.map(action => (
                <td key={action} className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={matrix[mod.key]?.[action] ?? false}
                    onChange={() => toggle(mod.key, action)}
                    disabled={disabled}
                    className="h-4 w-4 rounded border-input accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
