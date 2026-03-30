"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Settings, Plus, Trash2 } from 'lucide-react'

interface AIProvider {
  id: string
  name: string
  provider: string
  model: string
  baseUrl?: string
  isDefault: boolean
  projectId?: string
}

export default function AIProvidersPage() {
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    provider: 'ANTHROPIC',
    apiKey: '',
    model: 'claude-sonnet-4-7-20260227',
    baseUrl: '',
    isDefault: false,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      const data = await api.get<AIProvider[]>('/ai/providers')
      setProviders(data)
    } catch (e) {
      console.error('Failed to fetch providers:', e)
    }
  }

  const save = async () => {
    if (!form.name || !form.apiKey) {
      toast.error('Please fill in name and API key')
      return
    }
    setLoading(true)
    try {
      await api.post('/ai/providers', {
        ...form,
        baseUrl: form.baseUrl || null,
      })
      toast.success('Provider added')
      setShowForm(false)
      setForm({
        name: '',
        provider: 'ANTHROPIC',
        apiKey: '',
        model: 'claude-sonnet-4-7-20260227',
        baseUrl: '',
        isDefault: false,
      })
      fetchProviders()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to add provider')
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await api.delete(`/ai/providers/${id}`)
      setProviders(prev => prev.filter(p => p.id !== id))
      toast.success('Provider removed')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to remove provider')
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            AI Providers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure AI providers for code generation
          </p>
        </div>
        <Button onClick={() => setShowForm(s => !s)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Provider
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="My Anthropic Provider"
              />
            </div>
            <div>
              <Label>Provider</Label>
              <select
                className="w-full px-3 py-2 rounded-md border bg-background"
                value={form.provider}
                onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
              >
                <option value="ANTHROPIC">Anthropic</option>
                <option value="OPENAI">OpenAI</option>
                <option value="OLLAMA">Ollama</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            <div>
              <Label>Model</Label>
              <Input
                value={form.model}
                onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                placeholder="claude-sonnet-4-6 / gpt-4o / llama3"
              />
            </div>
            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={form.apiKey}
                onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                placeholder="sk-ant-..."
              />
            </div>
            {(form.provider === 'OLLAMA' || form.provider === 'CUSTOM') && (
              <div className="col-span-2">
                <Label>Base URL</Label>
                <Input
                  value={form.baseUrl}
                  onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
                  placeholder="http://localhost:11434"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={form.isDefault}
              onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
              className="rounded"
            />
            <Label htmlFor="isDefault">Set as default provider</Label>
          </div>
          <Button onClick={save} disabled={loading}>
            {loading ? 'Saving...' : 'Save Provider'}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {providers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No AI providers configured. Add one to start generating code.
          </div>
        ) : (
          providers.map(p => (
            <div key={p.id} className="border rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  {p.isDefault && <Badge variant="default">Default</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.provider} / {p.model}
                  {p.baseUrl && ` — ${p.baseUrl}`}
                </p>
              </div>
              <Button size="sm" variant="destructive" onClick={() => remove(p.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
