'use client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props {
  code: string
  framework: string
  testCaseTitle: string
}

export function GeneratedCodeViewer({ code, framework, testCaseTitle }: Props) {
  const copy = () => {
    navigator.clipboard.writeText(code)
    toast.success('Code copied to clipboard')
  }

  const download = () => {
    const ext = framework === 'PLAYWRIGHT' || framework === 'JEST' ? 'spec.ts' : 'cy.ts'
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${testCaseTitle.toLowerCase().replace(/\s+/g, '-')}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{framework} — Generated Code</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copy}>Copy</Button>
          <Button size="sm" variant="outline" onClick={download}>Download</Button>
        </div>
      </div>
      <pre className="bg-muted rounded p-4 text-xs overflow-x-auto max-h-96 overflow-y-auto">
        <code>{code}</code>
      </pre>
    </div>
  )
}
