"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ModuleId } from "@/lib/navigation"

interface SidebarState {
  isCollapsed: boolean
  isMobileOpen: boolean
  activeModule: ModuleId
  toggleCollapse: () => void
  toggleMobile: () => void
  setCollapsed: (collapsed: boolean) => void
  setMobileOpen: (open: boolean) => void
  setActiveModule: (module: ModuleId) => void
}

export const useSidebarState = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,
      activeModule: "test-management",
      toggleCollapse: () =>
        set((state) => ({ isCollapsed: !state.isCollapsed })),
      toggleMobile: () =>
        set((state) => ({ isMobileOpen: !state.isMobileOpen })),
      setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
      setMobileOpen: (open) => set({ isMobileOpen: open }),
      setActiveModule: (module) => set({ activeModule: module }),
    }),
    {
      name: "qauthority-sidebar",
    }
  )
)
