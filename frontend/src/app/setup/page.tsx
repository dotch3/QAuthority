import { SetupWizard } from '@/components/setup/SetupWizard'

async function getSetupStatus() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/setup/status`, { cache: 'no-store' })
    if (!res.ok) return { complete: false, health: { database: 'error', migrations: 'unknown' } }
    return res.json()
  } catch {
    return { complete: false, health: { database: 'error', migrations: 'unknown' } }
  }
}

export default async function SetupPage() {
  const status = await getSetupStatus()
  if (status.complete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Setup already complete. <a href="/login" className="underline">Go to login</a></p>
      </div>
    )
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-xl">
        <h1 className="text-3xl font-bold mb-2">QAuthority Setup</h1>
        <p className="text-muted-foreground mb-8">Enterprise QA Command Center — First Run Configuration</p>
        <SetupWizard health={status.health} />
      </div>
    </div>
  )
}
