"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { NavSection, ModuleId } from "@/lib/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { AboutDialog } from "./AboutDialog"
import { useProject } from "@/contexts/ProjectContext"

interface SidebarNavProps {
  sections: NavSection[]
  isCollapsed: boolean
  activeModule: ModuleId
}

export function SidebarNav({ sections, isCollapsed, activeModule }: SidebarNavProps) {
  const t = useTranslations()
  const pathname = usePathname()
  const [showAbout, setShowAbout] = useState(false)
  const { isOrgView } = useProject()

  const activeSections = sections.filter(s => s.moduleId === activeModule)

  if (activeModule === "test-management" && isOrgView) {
    return (
      <div className="p-4">
        <p className="text-xs text-muted-foreground">
          Select a project to access Test Command.
        </p>
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-5 px-2">
          {activeSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.titleKey && !isCollapsed && (
                <h4 className="mb-3 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t(section.titleKey)}
                </h4>
              )}
              {section.items.map((item) => {
                const itemHref = item.href
                const isActive = pathname === itemHref || (item.href !== "/dashboard" && pathname.startsWith(itemHref))
                const Icon = item.icon
                const isAbout = item.href === "/about"

                if (isAbout) {
                  return (
                    <button
                      key={item.href}
                      onClick={() => setShowAbout(true)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                        isCollapsed ? "justify-center px-2" : "",
                        "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
                      )}
                      title={isCollapsed ? t(item.titleKey) : undefined}
                    >
                      <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110", item.iconColor || "text-muted-foreground")} />
                      {!isCollapsed && <span className="font-medium">{t(item.titleKey)}</span>}
                    </button>
                  )
                }

                return (
                  <Link
                    key={itemHref}
                    href={itemHref}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                      isActive
                        ? "bg-sidebar-active font-semibold text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground",
                      isCollapsed && "justify-center px-2"
                    )}
                    title={isCollapsed ? t(item.titleKey) : undefined}
                  >
                    <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110", isActive ? "text-primary" : item.iconColor || "text-muted-foreground")} />
                    {!isCollapsed && <span>{t(item.titleKey)}</span>}
                    {isActive && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </Link>
                )
              })}
              {idx < activeSections.length - 1 && !isCollapsed && (
                <Separator className="my-4 opacity-50" />
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  )
}
