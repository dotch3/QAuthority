import { AppShell } from "@/components/layout/AppShell"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { PermissionsProvider } from "@/contexts/PermissionsContext"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute redirectTo="/login">
      <PermissionsProvider>
        <AppShell>{children}</AppShell>
      </PermissionsProvider>
    </ProtectedRoute>
  )
}
