"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, List, Plus, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const enumTypes = [
  {
    type: "test_case_priority",
    label: "Test Case Priority",
    values: [
      { value: "low", label: "Low", color: "#3b82f6" },
      { value: "medium", label: "Medium", color: "#f59e0b" },
      { value: "high", label: "High", color: "#ef4444" },
      { value: "critical", label: "Critical", color: "#dc2626" },
    ],
  },
  {
    type: "execution_status",
    label: "Execution Status",
    values: [
      { value: "pending", label: "Pending", color: "#6b7280" },
      { value: "running", label: "Running", color: "#3b82f6" },
      { value: "passed", label: "Passed", color: "#22c55e" },
      { value: "failed", label: "Failed", color: "#ef4444" },
      { value: "blocked", label: "Blocked", color: "#f59e0b" },
    ],
  },
  {
    type: "bug_status",
    label: "Bug Status",
    values: [
      { value: "open", label: "Open", color: "#ef4444" },
      { value: "in_progress", label: "In Progress", color: "#3b82f6" },
      { value: "resolved", label: "Resolved", color: "#22c55e" },
      { value: "closed", label: "Closed", color: "#6b7280" },
    ],
  },
  {
    type: "bug_priority",
    label: "Bug Priority",
    values: [
      { value: "low", label: "Low", color: "#3b82f6" },
      { value: "medium", label: "Medium", color: "#f59e0b" },
      { value: "high", label: "High", color: "#ef4444" },
      { value: "critical", label: "Critical", color: "#dc2626" },
    ],
  },
  {
    type: "bug_severity",
    label: "Bug Severity",
    values: [
      { value: "cosmetic", label: "Cosmetic", color: "#6b7280" },
      { value: "minor", label: "Minor", color: "#3b82f6" },
      { value: "major", label: "Major", color: "#f59e0b" },
      { value: "blocker", label: "Blocker", color: "#ef4444" },
    ],
  },
  {
    type: "bug_source",
    label: "Bug Source",
    values: [
      { value: "manual", label: "Manual Testing", color: "#6b7280" },
      { value: "automated", label: "Automated Test", color: "#3b82f6" },
      { value: "ci_cd", label: "CI/CD Pipeline", color: "#22c55e" },
      { value: "external", label: "External Report", color: "#f59e0b" },
    ],
  },
]

const adminNavItems = [
  { title: "Users", href: "/admin/users" },
  { title: "Roles & Permissions", href: "/admin/roles" },
  { title: "Enums & Fields", href: "/admin/enums" },
  { title: "Integrations", href: "/admin/integrations" },
  { title: "Settings", href: "/admin/settings" },
]

export default function AdminEnumsPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Enums & Fields</h1>
          <p className="text-muted-foreground mt-1">
            Manage dropdown values and custom fields
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
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Enumerations</h2>
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              Add Enum Type
            </Button>
          </div>

          <div className="space-y-4">
            {enumTypes.map((enumType) => (
              <div key={enumType.type} className="rounded-lg border bg-card">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">{enumType.label}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {enumType.type}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" disabled>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {enumType.values.map((value) => (
                    <div
                      key={value.value}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border"
                      style={{
                        backgroundColor: `${value.color}10`,
                        borderColor: `${value.color}30`,
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: value.color }}
                      />
                      <span
                        className="text-sm font-medium"
                        style={{ color: value.color }}
                      >
                        {value.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
