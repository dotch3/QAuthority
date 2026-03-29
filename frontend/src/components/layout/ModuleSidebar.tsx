"use client"

import { ChevronLeft, ChevronRight, ShieldCheck, Menu, ClipboardList, BarChart3, FileText, Cpu, Users, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebarState } from "@/hooks/useSidebarState"
import { SidebarNav } from "./SidebarNav"
import { sidebarNavigation, MODULE_LABELS, MODULE_PERMISSION_KEYS, ALL_MODULES, type ModuleId } from "@/lib/navigation"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { APP_CONFIG } from "@/lib/config"
import Link from "next/link"
import { useLocale } from "next-intl"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { usePermissions } from "@/contexts/PermissionsContext"

const MODULE_ICONS: Record<ModuleId, React.ComponentType<{ className?: string }>> = {
  "test-management": ClipboardList,
  governance: BarChart3,
  reports: FileText,
  integrations: Cpu,
  "users-groups": Users,
  admin: Settings,
}

export function ModuleSidebar() {
  const { isCollapsed, toggleCollapse, activeModule, setActiveModule } = useSidebarState()
  const [mobileOpen, setLocalMobileOpen] = useState(false)
  const locale = useLocale()
  const { can } = usePermissions()

  const visibleModules = ALL_MODULES.filter(m => can(MODULE_PERMISSION_KEYS[m], "read"))

  return (
    <>
      <aside
        className={`hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-64"
        } bg-sidebar-bg border-r`}
      >
        <SidebarContent
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
          activeModule={activeModule}
        />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setLocalMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed bottom-4 left-4 z-50 shadow-lg"
            onClick={() => setLocalMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar-bg">
          <div className="flex h-14 items-center border-b px-4">
            <Link href={`/${locale}/dashboard`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <span className="font-semibold">{APP_CONFIG.name}</span>
              <span className="text-xs text-muted-foreground">v{APP_CONFIG.version}</span>
            </Link>
          </div>
          <div className="flex border-b overflow-x-auto">
            {visibleModules.map(moduleId => {
              const Icon = MODULE_ICONS[moduleId]
              return (
                <button
                  key={moduleId}
                  onClick={() => setActiveModule(moduleId)}
                  className={cn(
                    "flex flex-col items-center px-3 py-2 text-xs gap-1 border-b-2 shrink-0",
                    activeModule === moduleId
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:block">{MODULE_LABELS[moduleId].split(' ')[0]}</span>
                </button>
              )
            })}
          </div>
          <SidebarNav sections={sidebarNavigation} isCollapsed={false} activeModule={activeModule} />
        </SheetContent>
      </Sheet>
    </>
  )
}

function SidebarContent({
  isCollapsed,
  onToggleCollapse,
  activeModule,
}: {
  isCollapsed: boolean
  onToggleCollapse: () => void
  activeModule: ModuleId
}) {
  const locale = useLocale()

  return (
    <>
      <div
        className={`flex h-14 items-center border-b px-4 ${
          isCollapsed ? "justify-center" : "gap-2"
        }`}
      >
        <Link
          href={`/${locale}/dashboard`}
          className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${
            isCollapsed ? "" : "flex-1"
          }`}
        >
          <ShieldCheck className="h-6 w-6 text-primary" />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-lg leading-tight">{APP_CONFIG.name}</span>
              <span className="text-xs text-muted-foreground">v{APP_CONFIG.version}</span>
            </div>
          )}
        </Link>
      </div>

      <Separator />

      <SidebarNav sections={sidebarNavigation} isCollapsed={isCollapsed} activeModule={activeModule} />

      <div className={`border-t p-2 mt-auto ${isCollapsed ? "flex justify-center" : ""}`}>
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "default"}
          onClick={onToggleCollapse}
          className={isCollapsed ? "w-9 h-9" : "w-full justify-start gap-2"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </>
  )
}
