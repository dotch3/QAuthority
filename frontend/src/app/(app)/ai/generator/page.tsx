"use client"
import { useEffect, useState } from 'react'
import { useProject } from '@/contexts/ProjectContext'
import { Button } from '@/components/ui/button'
import { GeneratedCodeViewer } from '@/components/ai/GeneratedCodeViewer'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Cpu, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

const FRAMEWORKS = ['PLAYWRIGHT', 'CYPRESS', 'JEST', 'SELENIUM']

interface TestCase {
  id: string
  title: string
}

export default function AIGeneratorPage() {
  const { selectedProject } = useProject()
  const t = useTranslations('ai')
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [selectedCase, setSelectedCase] = useState<string>('')
  const [framework, setFramework] = useState<string>('PLAYWRIGHT')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingCases, setLoadingCases] = useState(false)

  useEffect(() => {
    if (selectedProject) {
      setLoadingCases(true)
      api.get<{ items?: TestCase[]; data?: TestCase[] }>(`/test-cases?projectId=${selectedProject.id}`)
        .then(r => {
          const items = r.items ?? r.data ?? []
          setTestCases(Array.isArray(items) ? items : [])
        })
        .catch(() => setTestCases([]))
        .finally(() => setLoadingCases(false))
    } else {
      setTestCases([])
    }
  }, [selectedProject])

  const generate = async () => {
    if (!selectedCase) return toast.error('Select a test case first')
    setLoading(true)
    setGeneratedCode(null)
    try {
      const res = await api.post<{ code: string }>('/ai/generate', { testCaseId: selectedCase, framework })
      setGeneratedCode(res.code)
      toast.success('Code generated successfully')
    } catch (e: any) {
      toast.error(e.message ?? 'Generation failed — check AI provider configuration')
    } finally {
      setLoading(false)
    }
  }

  const selectedTestCase = testCases.find(tc => tc.id === selectedCase)

  if (!selectedProject) {
    return (
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-4">{t('generator')}</h1>
        <p className="text-muted-foreground">{t('selectProject')}</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Cpu className="h-6 w-6" />
          {t('generator')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('generatorDesc')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('testCase')}</label>
          <select
            className="w-full px-3 py-2 rounded-md border bg-background"
            value={selectedCase}
            onChange={(e) => setSelectedCase(e.target.value)}
            disabled={loadingCases}
          >
            <option value="">{t('selectTestCase')}</option>
            {testCases.map(tc => (
              <option key={tc.id} value={tc.id}>{tc.title}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('framework')}</label>
          <select
            className="w-full px-3 py-2 rounded-md border bg-background"
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
          >
            {FRAMEWORKS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      <Button onClick={generate} disabled={loading || !selectedCase}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {t('generating')}
          </>
        ) : (
          t('generate')
        )}
      </Button>

      {generatedCode && selectedTestCase && (
        <GeneratedCodeViewer
          code={generatedCode}
          framework={framework}
          testCaseTitle={selectedTestCase.title}
        />
      )}
    </div>
  )
}
