"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Users,
  Shield,
  List,
  Plug,
  Settings,
  ChevronRight,
} from "lucide-react"

const adminNavItems = [
  {
    title: "Users",
    description: "Manage user accounts and permissions",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Roles & Permissions",
    description: "Configure roles and access control",
    href: "/admin/roles",
    icon: Shield,
  },
  {
    title: "Enums & Fields",
    description: "Manage dropdown values and custom fields",
    href: "/admin/enums",
    icon: List,
  },
  {
    title: "Integrations",
    description: "Connect with Jira, GitHub, and CI/CD tools",
    href: "/admin/integrations",
    icon: Plug,
  },
  {
    title: "Settings",
    description: "Application preferences and configuration",
    href: "/admin/settings",
    icon: Settings,
  },
]

export default function AdminPage() {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization settings
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                isActive
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  isActive ? "bg-primary/10" : "bg-muted"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <h3 className="font-semibold">{item.title}</h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
