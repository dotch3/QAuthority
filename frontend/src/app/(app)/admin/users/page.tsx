"use client"

import { UsersTable } from "@/components/admin/UsersTable"

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1">
          Manage user accounts and permissions
        </p>
      </div>
      <UsersTable />
    </div>
  )
}
