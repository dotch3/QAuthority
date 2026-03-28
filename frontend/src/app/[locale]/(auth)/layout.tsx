import { ShieldCheck } from "lucide-react"
import Link from "next/link"
import { APP_CONFIG } from "@/lib/config"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">{APP_CONFIG.name}</span>
            <span className="text-xs text-muted-foreground">v{APP_CONFIG.version}</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">{APP_CONFIG.name}</h1>
            <p className="text-muted-foreground">{APP_CONFIG.description}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
