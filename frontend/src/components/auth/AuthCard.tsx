import { ShieldCheck } from "lucide-react"
import Link from "next/link"

interface AuthCardProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-2 text-center">
        <div className="flex justify-center mb-4">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}
