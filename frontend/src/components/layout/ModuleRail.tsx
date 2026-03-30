"use client"

import { useTranslations } from "next-intl"
import { ClipboardList, BarChart3, FileText, Cpu, Users, Settings } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { useSidebarState } from "@/hooks/useSidebarState"
import { usePermissions } from "@/contexts/PermissionsContext"
import { ROUTE_TO_MODULE, MODULE_LABELS, MODULE_PERMISSION_KEYS, ALL_MODULES, type ModuleId } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const MODULE_ICONS: Record<ModuleId, React.ComponentType<{ className?: string }>> = {
  "test-management": ClipboardList,
  governance: BarChart3,
  reports: FileText,
  integrations: Cpu,
  "users-groups": Users,
  admin: Settings,
}

export function ModuleRail() {
  const pathname = usePathname()
  const { activeModule, setActiveModule } = useSidebarState()
  const { can } = usePermissions()
  const t = useTranslations()

  useEffect(() => {
    const stripped = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, "")
    const match = ROUTE_TO_MODULE.find(([prefix]) => stripped.startsWith(prefix))
    if (match) setActiveModule(match[1])
  }, [pathname, setActiveModule])

  const visibleModules = ALL_MODULES.filter(
    m => can(MODULE_PERMISSION_KEYS[m], "read")
  )

  return (
    <TooltipProvider>
      <aside className="hidden md:flex w-12 flex-col items-center py-3 gap-1 border-r bg-sidebar-bg shrink-0">
        {visibleModules.map(moduleId => {
          const Icon = MODULE_ICONS[moduleId]
          const isActive = activeModule === moduleId
          return (
            <Tooltip key={moduleId}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveModule(moduleId)}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150",
                    isActive
                      ? "bg-primary/20 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                  aria-label={t(MODULE_LABELS[moduleId])}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {t(MODULE_LABELS[moduleId])}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </aside>
    </TooltipProvider>
  )
}
