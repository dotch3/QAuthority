'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'

const STEPS = ['System Check', 'Language & Locale', 'Admin Account', 'Review & Finish']

export function SetupWizard({ health }: { health: { database: string } }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    orgName: '',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
    language: 'en',
    locale: 'en-US',
  })

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const submit = async () => {
    try {
      await api.post('/setup/run', form, { skipAuth: true })
      toast.success('QAuthority setup complete!')
      router.push('/login')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Setup failed')
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Progress bar */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex-1 h-1 rounded ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>

      <h2 className="text-xl font-semibold">{STEPS[step]}</h2>

      {step === 0 && (
        <div className="space-y-3">
          <div className={`p-3 rounded border ${health.database === 'ok' ? 'border-green-500' : 'border-red-500'}`}>
            Database: {health.database}
          </div>
          <Button onClick={() => setStep(1)} disabled={health.database !== 'ok'}>Continue</Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label>Language</Label>
            <select
              className="w-full border border-input rounded-md p-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.language}
              onChange={e => update('language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="pt">Português</option>
              <option value="es">Español</option>
            </select>
          </div>
          <div>
            <Label>Organization Name</Label>
            <Input value={form.orgName} onChange={e => update('orgName', e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={() => setStep(2)} disabled={!form.orgName.trim()}>Continue</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <Label>Admin Name</Label>
            <Input value={form.adminName} onChange={e => update('adminName', e.target.value)} />
          </div>
          <div>
            <Label>Admin Email</Label>
            <Input type="email" value={form.adminEmail} onChange={e => update('adminEmail', e.target.value)} />
          </div>
          <div>
            <Label>Admin Password</Label>
            <Input type="password" value={form.adminPassword} onChange={e => update('adminPassword', e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={!form.adminEmail || !form.adminPassword || !form.adminName}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="border rounded p-4 space-y-2 text-sm">
            <p><strong>Organization:</strong> {form.orgName || '(not set)'}</p>
            <p><strong>Admin:</strong> {form.adminName} ({form.adminEmail})</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={submit} className="flex-1">Complete Setup</Button>
          </div>
        </div>
      )}
    </div>
  )
}
