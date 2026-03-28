"use client"

import { Bell, Search, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./ThemeToggle"
import { ProfileDropdown } from "./ProfileDropdown"
import { Breadcrumbs } from "./Breadcrumbs"
import { AboutDialog } from "./AboutDialog"
import { ProjectSelector } from "./ProjectSelector"
import { useState } from "react"

export function Header() {
  const [showAbout, setShowAbout] = useState(false)

  return (
    <>
      <header className="flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur px-4">
        {/* Left: project selector + breadcrumbs */}
        <ProjectSelector />
        <div className="h-4 w-px bg-border" />
        <div className="flex-1 min-w-0">
          <Breadcrumbs />
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent">
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 relative text-muted-foreground hover:text-foreground hover:bg-accent">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={() => setShowAbout(true)}
          >
            <Info className="h-4 w-4" />
            <span className="sr-only">About</span>
          </Button>
          <div className="ml-1 h-6 w-px bg-border" />
          <ThemeToggle />
          <ProfileDropdown />
        </div>
      </header>
      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  )
}
