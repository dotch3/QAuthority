"use client"

import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebarState } from "@/hooks/useSidebarState"
import { SidebarNav } from "./SidebarNav"
import { ProjectSelector } from "./ProjectSelector"
import { sidebarNavigation } from "@/lib/navigation"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { Menu } from "lucide-react"
import { APP_CONFIG } from "@/lib/config"
import Link from "next/link"
import { useLocale } from "next-intl"
import { Separator } from "@/components/ui/separator"

export function Sidebar() {
  const { isCollapsed, toggleCollapse } = useSidebarState()
  const [mobileOpen, setLocalMobileOpen] = useState(false)
  const locale = useLocale()

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
          <div className="p-2">
            <ProjectSelector />
          </div>
          <Separator />
          <SidebarNav sections={sidebarNavigation} isCollapsed={false} />
        </SheetContent>
      </Sheet>
    </>
  )
}

function SidebarContent({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean
  onToggleCollapse: () => void
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

      {!isCollapsed && (
        <div className="p-2 border-b">
          <h4 className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Projects
          </h4>
          <ProjectSelector />
        </div>
      )}

      {isCollapsed && (
        <div className="p-2 flex justify-center border-b">
          <ProjectSelector />
        </div>
      )}

      <Separator />

      <SidebarNav sections={sidebarNavigation} isCollapsed={isCollapsed} />

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
