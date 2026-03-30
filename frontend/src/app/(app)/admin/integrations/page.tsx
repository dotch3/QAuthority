"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, Plug, Plus, ExternalLink, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const integrations = [
  {
    name: "GitHub",
    description: "Import test cases from GitHub Actions and link commits to executions",
    icon: "🐙",
    status: "connected",
    lastSync: "2 hours ago",
  },
  {
    name: "Jira",
    description: "Sync bugs with Jira issues and link test cases to tickets",
    icon: "📋",
    status: "not_configured",
    lastSync: null,
  },
  {
    name: "Jenkins",
    description: "Trigger test runs from CI/CD pipelines and capture results",
    icon: "🔧",
    status: "not_configured",
    lastSync: null,
  },
  {
    name: "Slack",
    description: "Send notifications to Slack channels on test completion",
    icon: "💬",
    status: "not_configured",
    lastSync: null,
  },
]

const adminNavItems = [
  { title: "Users", href: "/admin/users" },
  { title: "Roles & Permissions", href: "/admin/roles" },
  { title: "Enums & Fields", href: "/admin/enums" },
  { title: "Integrations", href: "/admin/integrations" },
  { title: "Settings", href: "/admin/settings" },
]

export default function AdminIntegrationsPage() {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="p-2 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect with Jira, GitHub, and CI/CD tools
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="space-y-1">
          {adminNavItems.map((item) => {
            const isActive = item.href === pathname
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.title}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="p-4 rounded-lg border bg-card"
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{integration.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{integration.name}</h3>
                      {integration.status === "connected" ? (
                        <Badge
                          variant="secondary"
                          className="text-xs gap-1 bg-green-500/10 text-green-600 border-green-500/20"
                        >
                          <Check className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-xs"
                        >
                          Not configured
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {integration.description}
                    </p>
                    {integration.lastSync && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last synced: {integration.lastSync}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant={integration.status === "connected" ? "outline" : "default"}
                    size="sm"
                    disabled={integration.status === "connected"}
                  >
                    {integration.status === "connected" ? (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Configure
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Connect
                      </>
                    )}
                  </Button>
                  {integration.status === "connected" && (
                    <Button variant="ghost" size="sm">
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="font-medium mb-2">Webhook Endpoints</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Use these endpoints to receive events from external systems.
            </p>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">POST</Badge>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  /api/v1/webhooks/github
                </code>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">POST</Badge>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  /api/v1/webhooks/jenkins
                </code>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">POST</Badge>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  /api/v1/webhooks/jira
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
