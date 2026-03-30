"use client"

import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home, FolderKanban } from "lucide-react"
import { Fragment } from "react"
import { useProject } from "@/contexts/ProjectContext"

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  "test-plans": "Test Plans",
  "test-suites": "Test Suites",
  "test-cases": "Test Cases",
  executions: "Executions",
  bugs: "Bugs",
  reports: "Reports",
  admin: "Admin",
  projects: "Projects",
  profile: "Profile",
  "custom-fields": "Custom Fields",
  integrations: "Integrations",
  enums: "Enums",
  users: "Users",
  heuristics: "Heuristics",
  "et-charters": "ET Charters",
}

function formatLabel(segment: string): string {
  if (routeLabels[segment]) {
    return routeLabels[segment]
  }
  return segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

export function Breadcrumbs() {
  const t = useTranslations("breadcrumbs")
  const pathname = usePathname()
  const { selectedProject } = useProject()

  const segments = pathname.split("/").filter(Boolean)

  const buildPath = (index: number) => {
    return `/${segments.slice(0, index + 1).join("/")}`
  }

  const isDynamicRoute = (segment: string) => {
    return /^[a-f0-9-]{36,}$/.test(segment) || /^\d+$/.test(segment)
  }

  const items = segments.map((segment, index) => {
    const href = buildPath(index)
    const label = formatLabel(segment)

    return { href, label, segment }
  })

  if (items.length === 0 || (items.length === 1 && items[0].segment === "dashboard")) {
    return (
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Home className="h-4 w-4" />
        <span>{t("home")}</span>
      </nav>
    )
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      {selectedProject && (
        <>
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={selectedProject.name}
          >
            <FolderKanban className="h-4 w-4" />
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </>
      )}

      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {items.map((item, index) => (
        <Fragment key={item.href}>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          {index === items.length - 1 ? (
            <span className="font-medium text-foreground">{item.label}</span>
          ) : isDynamicRoute(item.segment) ? (
            <span className="text-muted-foreground">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
