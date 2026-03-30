"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, Shield, Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const roles = [
  {
    id: "admin",
    name: "admin",
    label: "Admin",
    description: "Full system access",
    color: "#ef4444",
    isSystem: true,
    userCount: 2,
  },
  {
    id: "member",
    name: "member",
    label: "Member",
    description: "Standard user access",
    color: "#3b82f6",
    isSystem: true,
    userCount: 5,
  },
  {
    id: "viewer",
    name: "viewer",
    label: "Viewer",
    description: "Read-only access",
    color: "#6b7280",
    isSystem: true,
    userCount: 3,
  },
]

const permissions = [
  {
    resource: "project",
    label: "Projects",
    create: true,
    read: true,
    update: true,
    delete: true,
  },
  {
    resource: "test_plan",
    label: "Test Plans",
    create: true,
    read: true,
    update: true,
    delete: false,
  },
  {
    resource: "test_case",
    label: "Test Cases",
    create: true,
    read: true,
    update: true,
    delete: false,
  },
  {
    resource: "execution",
    label: "Executions",
    create: true,
    read: true,
    update: true,
    delete: false,
  },
  {
    resource: "bug",
    label: "Bugs",
    create: true,
    read: true,
    update: true,
    delete: false,
  },
]

const adminNavItems = [
  { title: "Users", href: "/admin/users" },
  { title: "Roles & Permissions", href: "/admin/roles" },
  { title: "Enums & Fields", href: "/admin/enums" },
  { title: "Integrations", href: "/admin/integrations" },
  { title: "Settings", href: "/admin/settings" },
]

export default function AdminRolesPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground mt-1">
            Configure roles and access control
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
            <h2 className="text-lg font-semibold">System Roles</h2>
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {roles.map((role) => (
              <div
                key={role.id}
                className="p-4 rounded-lg border bg-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: role.color }}
                    />
                    <h3 className="font-semibold">{role.label}</h3>
                    {role.isSystem && (
                      <Badge variant="secondary" className="text-xs">
                        System
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" disabled={role.isSystem}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" disabled={role.isSystem}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {role.description}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {role.userCount} users
                </p>
              </div>
            ))}
          </div>

          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">Permissions Matrix</h2>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Resource</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Create</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Read</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Update</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm) => (
                    <tr key={perm.resource} className="border-t">
                      <td className="px-4 py-3 text-sm font-medium">{perm.label}</td>
                      <td className="px-4 py-3 text-center text-sm">
                        {perm.create ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {perm.read ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {perm.update ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {perm.delete ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Permissions shown for Member role. Admin has full access.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
