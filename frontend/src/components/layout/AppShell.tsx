"use client"

import { ModuleRail } from "./ModuleRail"
import { ModuleSidebar } from "./ModuleSidebar"
import { Header } from "./Header"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <ModuleRail />
      <ModuleSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
