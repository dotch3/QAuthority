# Plan 1: Navigation / UI Restructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **REQUIRED READING:** Read `docs/implementation/ui-ux-review.md` before starting. The plan was corrected after UI/UX review.

**Goal:** Restructure the existing flat sidebar into a module-based icon rail + contextual sidebar while preserving all existing UI quality (Header, Breadcrumbs, ProjectSelector, mobile drawer).

**Architecture:**
- Add a 48px `ModuleRail` (icon strip) to the left of the existing sidebar area — total nav width stays at ~260px (same as current w-64)
- The existing `Sidebar.tsx` becomes `ModuleSidebar.tsx` — filters its nav items by active module
- `Header.tsx` is UNCHANGED except `ProjectSelector` moves into it
- `navigation.ts` gains a `moduleId` field per section — single source of truth
- Module visibility uses `PermissionsContext` (React Context, not Zustand)
- Mobile: existing Sheet drawer is kept and updated to show module selector + items

**Tech Stack:** Next.js 16 App Router `[locale]/(app)`, next-intl, React Context, Tailwind CSS 4, shadcn/ui, existing useSidebarState hook

**Depends on:** Plan 0 (groups/permissions seeded before visibility logic works)

---

## ⚠️ Path & URL Convention — Read This First

All new pages live under `frontend/src/app/[locale]/(app)/`. Never create pages directly under `frontend/src/app/` without the `[locale]/(app)/` prefix — they will 404.

**The `[locale]` in the file path is NOT visible in URLs.** The middleware is already configured with `localePrefix: 'never'`, so:
- File: `app/[locale]/(app)/governance/executive/page.tsx`
- URL:  `/governance/executive`  ✅

Always use `Link` from `next-intl` (not `next/link`) and write clean `href` values without locale prefix:
```typescript
import { Link } from 'next-intl'
// ...
<Link href="/governance/executive">...</Link>
```

Do NOT change `frontend/src/middleware.ts` — `localePrefix: 'never'` is already correctly set.

---

## File Map

### Modified Files (do NOT create new files for these)
- `frontend/src/lib/navigation.ts` — add `moduleId` + `requiredPermission` to `NavSection`
- `frontend/src/lib/config.ts` — update brand name to QAuthority
- `frontend/src/components/layout/AppShell.tsx` — add ModuleRail between sidebar and content
- `frontend/src/components/layout/Sidebar.tsx` — rename to `ModuleSidebar.tsx`, add module filtering
- `frontend/src/components/layout/SidebarNav.tsx` — accept active moduleId for filtering
- `frontend/src/components/layout/Header.tsx` — add ProjectSelector to left side
- `frontend/src/components/layout/ProjectSelector.tsx` — add "All Projects" option
- `frontend/src/contexts/ProjectContext.tsx` — add `selectedProject = null` for org view

### New Files
- `frontend/src/components/layout/ModuleRail.tsx`
- `frontend/src/contexts/PermissionsContext.tsx`

### Backend — New (for permissions API)
- `backend/src/interfaces/http/routes/permissionMatrix.ts`
- Modify: `backend/src/interfaces/http/routes/index.ts`

---

## Task 1: Update navigation.ts with module structure

**Files:**
- Modify: `frontend/src/lib/navigation.ts`

- [ ] **Step 1: Add ModuleId type and moduleId to NavSection**

Replace the contents of `frontend/src/lib/navigation.ts`:

```typescript
import {
  LayoutDashboard,
  ClipboardList,
  FlaskConical,
  PlayCircle,
  Bug,
  BarChart3,
  Map,
  Users,
  Shield,
  ListChecks,
  Settings,
  Plug,
  Database,
  Bell,
  FolderKanban,
  FileText,
  ScrollText,
  Download,
  Link2,
  Cpu,
  GitBranch,
  AlertCircle,
  Webhook,
  TrendingUp,
  Target,
  Workflow,
  Code2,
  KeyRound,
  ClipboardCheck,
  Search,
  FileCheck,
  Group,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type ModuleId =
  | "test-management"
  | "governance"
  | "reports"
  | "integrations"
  | "users-groups"
  | "admin"

export interface NavItem {
  titleKey: string
  href: string
  icon: LucideIcon
  iconColor?: string
  badge?: string
}

export interface NavSection {
  titleKey?: string
  moduleId: ModuleId
  items: NavItem[]
  adminOnly?: boolean
  requiredPermission?: string
}

export const MODULE_LABELS: Record<ModuleId, string> = {
  "test-management": "Test Command",
  governance: "QA Governance",
  reports: "Reports",
  integrations: "AI & Integrations",
  "users-groups": "Users & Groups",
  admin: "Admin",
}

export const sidebarNavigation: NavSection[] = [
  {
    moduleId: "test-management",
    items: [
      { titleKey: "nav.testPlans", href: "/test-plans", icon: ClipboardList, iconColor: "text-icon-purple" },
      { titleKey: "nav.testSuites", href: "/test-suites", icon: FlaskConical, iconColor: "text-icon-cyan" },
      { titleKey: "nav.testCases", href: "/test-cases", icon: ListChecks, iconColor: "text-icon-green" },
      { titleKey: "nav.executions", href: "/executions", icon: PlayCircle, iconColor: "text-icon-orange" },
      { titleKey: "nav.bugs", href: "/bugs", icon: Bug, iconColor: "text-destructive" },
      { titleKey: "nav.etCharters", href: "/et-charters", icon: FileCheck, iconColor: "text-icon-pink" },
      { titleKey: "nav.heuristics", href: "/heuristics", icon: Search, iconColor: "text-icon-blue" },
    ],
  },
  {
    moduleId: "governance",
    requiredPermission: "QA_GOVERNANCE",
    items: [
      { titleKey: "nav.executiveDashboard", href: "/governance/executive", icon: LayoutDashboard, iconColor: "text-icon-blue" },
      { titleKey: "nav.projectDashboard", href: "/governance/project", icon: BarChart3, iconColor: "text-icon-purple" },
      { titleKey: "nav.okrs", href: "/governance/okrs", icon: Target, iconColor: "text-icon-orange" },
      { titleKey: "nav.kpis", href: "/governance/kpis", icon: TrendingUp, iconColor: "text-icon-green" },
      { titleKey: "nav.processDesigner", href: "/governance/processes", icon: Workflow, iconColor: "text-icon-cyan" },
    ],
  },
  {
    moduleId: "reports",
    requiredPermission: "REPORTING",
    items: [
      { titleKey: "nav.reportTemplates", href: "/reports/templates", icon: FileText, iconColor: "text-icon-blue" },
      { titleKey: "nav.generateReport", href: "/reports/generate", icon: ScrollText, iconColor: "text-icon-purple" },
      { titleKey: "nav.reportHistory", href: "/reports/history", icon: ClipboardCheck, iconColor: "text-icon-green" },
      { titleKey: "nav.exportCenter", href: "/reports/export", icon: Download, iconColor: "text-icon-orange" },
    ],
  },
  {
    moduleId: "integrations",
    requiredPermission: "INTEGRATIONS",
    items: [
      { titleKey: "nav.aiGenerator", href: "/ai/generator", icon: Code2, iconColor: "text-icon-cyan" },
      { titleKey: "nav.aiProviders", href: "/ai/providers", icon: Cpu, iconColor: "text-icon-blue" },
      { titleKey: "nav.cicd", href: "/integrations/cicd", icon: GitBranch, iconColor: "text-icon-orange" },
      { titleKey: "nav.externalIssues", href: "/integrations/issues", icon: AlertCircle, iconColor: "text-destructive" },
      { titleKey: "nav.webhooks", href: "/admin/integrations", icon: Webhook, iconColor: "text-icon-purple" },
    ],
  },
  {
    moduleId: "users-groups",
    requiredPermission: "USERS_GROUPS",
    items: [
      { titleKey: "nav.users", href: "/admin/users", icon: Users, iconColor: "text-icon-blue" },
      { titleKey: "nav.groups", href: "/admin/groups", icon: Group, iconColor: "text-icon-purple" },
      { titleKey: "nav.roles", href: "/admin/roles", icon: Shield, iconColor: "text-icon-green" },
    ],
  },
  {
    moduleId: "admin",
    adminOnly: true,
    items: [
      { titleKey: "nav.settings", href: "/admin/settings", icon: Settings, iconColor: "text-muted-foreground" },
      { titleKey: "nav.enums", href: "/admin/enums", icon: Database, iconColor: "text-icon-cyan" },
      { titleKey: "nav.apiKeys", href: "/api-keys", icon: KeyRound, iconColor: "text-icon-orange" },
      { titleKey: "nav.notifications", href: "/notifications", icon: Bell, iconColor: "text-icon-pink" },
    ],
  },
]

// Map routes to module IDs for auto-detection
export const ROUTE_TO_MODULE: Array<[string, ModuleId]> = [
  ["/test-plans", "test-management"],
  ["/test-suites", "test-management"],
  ["/test-cases", "test-management"],
  ["/executions", "test-management"],
  ["/bugs", "test-management"],
  ["/et-charters", "test-management"],
  ["/heuristics", "test-management"],
  ["/governance", "governance"],
  ["/reports", "reports"],
  ["/ai/", "integrations"],
  ["/integrations/", "integrations"],
  ["/admin/users", "users-groups"],
  ["/admin/groups", "users-groups"],
  ["/admin/roles", "users-groups"],
  ["/admin/", "admin"],
]
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/navigation.ts
git commit -m "feat(nav): add moduleId and requiredPermission to navigation.ts — single source of truth for module nav"
```

---

## Task 2: Update APP_CONFIG brand name

**Files:**
- Modify: `frontend/src/lib/config.ts`

- [ ] **Step 1: Update config**

Replace the contents of `frontend/src/lib/config.ts`:

```typescript
export const APP_CONFIG = {
  name: "QAuthority",
  version: "1.0.0",
  description: "Enterprise QA Command Center",
} as const
```

- [ ] **Step 2: Verify brand propagates**

The `APP_CONFIG.name` is used in `Sidebar.tsx` (logo text) and `AboutDialog.tsx`. After this change, both will show "QAuthority" automatically.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/config.ts
git commit -m "feat(brand): update APP_CONFIG name to QAuthority"
```

---

## Task 3: Add "All Projects" to ProjectContext

**Files:**
- Modify: `frontend/src/contexts/ProjectContext.tsx`

- [ ] **Step 1: Read the current ProjectContext**

```bash
cat frontend/src/contexts/ProjectContext.tsx
```

- [ ] **Step 2: Add isOrgView state**

Find the `ProjectContext` value type and add `isOrgView`:

```typescript
// In the context type:
interface ProjectContextValue {
  projects: Project[]
  selectedProject: Project | null
  setSelectedProject: (project: Project | null) => void  // null = org view
  isOrgView: boolean    // ← add this
  isLoading: boolean
}
```

In the provider implementation, derive `isOrgView`:
```typescript
const isOrgView = selectedProject === null && projects.length > 0

// In context value:
value={{ projects, selectedProject, setSelectedProject, isOrgView, isLoading }}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/contexts/ProjectContext.tsx
git commit -m "feat(context): add isOrgView to ProjectContext — null selectedProject = All Projects"
```

---

## Task 4: Update ProjectSelector — Add "All Projects"

**Files:**
- Modify: `frontend/src/components/layout/ProjectSelector.tsx`

- [ ] **Step 1: Add "All Projects" option to dropdown**

Replace the return statement in `ProjectSelector.tsx` with:

```typescript
"use client"

import { FolderKanban, ChevronDown, Check, Loader2, Globe } from "lucide-react"
import { useProject } from "@/contexts/ProjectContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function ProjectSelector() {
  const { projects, selectedProject, setSelectedProject, isLoading } = useProject()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    )
  }

  const label = selectedProject?.name ?? "All Projects"
  const icon = selectedProject ? FolderKanban : Globe

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-9 px-2 text-sm font-medium max-w-48"
        >
          {selectedProject
            ? <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
            : <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
          }
          <span className="truncate">{label}</span>
          {projects.length > 0 && <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => setSelectedProject(project)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col">
              <span>{project.name}</span>
              <span className="text-xs text-muted-foreground">{project.key}</span>
            </div>
            {selectedProject?.id === project.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        {projects.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onClick={() => setSelectedProject(null)}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span>All Projects</span>
          </div>
          {selectedProject === null && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/ProjectSelector.tsx
git commit -m "feat(nav): add All Projects option to ProjectSelector — enables org-wide view"
```

---

## Task 5: Add ProjectSelector to Header

**Files:**
- Modify: `frontend/src/components/layout/Header.tsx`

- [ ] **Step 1: Add ProjectSelector to Header left side**

In `frontend/src/components/layout/Header.tsx`, update the import and layout:

```typescript
"use client"

import { Bell, Search, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./ThemeToggle"
import { ProfileDropdown } from "./ProfileDropdown"
import { Breadcrumbs } from "./Breadcrumbs"
import { AboutDialog } from "./AboutDialog"
import { ProjectSelector } from "./ProjectSelector"
import { Separator } from "@/components/ui/separator"
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
```

- [ ] **Step 2: Remove ProjectSelector from Sidebar**

In `frontend/src/components/layout/Sidebar.tsx` (soon to be `ModuleSidebar.tsx`), remove the `ProjectSelector` section and the `<Separator />` below it from `SidebarContent`.

- [ ] **Step 3: Verify header looks correct**

```bash
cd frontend && npm run dev
```

Header should show: `[ProjectSelector ▼] | [Breadcrumbs...]  [🔍][🔔][ℹ]|[☀][👤]`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Header.tsx frontend/src/components/layout/Sidebar.tsx
git commit -m "feat(nav): move ProjectSelector into Header — removes from sidebar, adds org view toggle"
```

---

## Task 6: Create PermissionsContext

**Files:**
- Create: `frontend/src/contexts/PermissionsContext.tsx`
- Add backend route: `backend/src/interfaces/http/routes/permissionMatrix.ts`

- [ ] **Step 1: Create backend permission matrix endpoint**

Create `backend/src/interfaces/http/routes/permissionMatrix.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { PermissionMatrixService } from '../../../services/PermissionMatrixService'

export async function permissionMatrixRoutes(app: FastifyInstance) {
  const service = new PermissionMatrixService(app.prisma)

  app.get('/my-matrix', { onRequest: [app.authenticate] }, async (req, reply) => {
    const matrix = await service.getFullMatrix((req.user as any).id)
    return reply.send(matrix)
  })
}
```

Register in `backend/src/interfaces/http/routes/index.ts`:
```typescript
import { permissionMatrixRoutes } from './permissionMatrix'
app.register(permissionMatrixRoutes, { prefix: '/permissions' })
```

- [ ] **Step 2: Add API call to frontend**

In `frontend/src/lib/api.ts`, add:

```typescript
export const permissionsApi = {
  getMyMatrix: () => api.get('/permissions/my-matrix'),
}
```

- [ ] **Step 3: Create PermissionsContext**

Create `frontend/src/contexts/PermissionsContext.tsx`:

```typescript
"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { permissionsApi } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"  // adjust import to match existing auth context

interface PermEntry {
  canCreate: boolean
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
  canExport: boolean
}

interface PermissionsContextValue {
  matrix: Record<string, PermEntry>
  loaded: boolean
  can: (module: string, action: "create" | "read" | "update" | "delete" | "export") => boolean
}

const PermissionsContext = createContext<PermissionsContextValue>({
  matrix: {},
  loaded: false,
  can: () => true, // default open until loaded
})

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [matrix, setMatrix] = useState<Record<string, PermEntry>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    permissionsApi.getMyMatrix()
      .then(res => {
        setMatrix(res.data)
        setLoaded(true)
      })
      .catch(() => {
        // If endpoint not available yet (Plan 0 not executed), grant all access
        setLoaded(true)
      })
  }, [])

  const can = (module: string, action: "create" | "read" | "update" | "delete" | "export") => {
    if (!loaded) return true // optimistic while loading
    const entry = matrix[module]
    if (!entry) return false
    const key = `can${action.charAt(0).toUpperCase()}${action.slice(1)}` as keyof PermEntry
    return entry[key] ?? false
  }

  return (
    <PermissionsContext.Provider value={{ matrix, loaded, can }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext)
}
```

- [ ] **Step 4: Wrap app with PermissionsProvider**

In `frontend/src/app/[locale]/(app)/layout.tsx`, wrap children:

```typescript
import { PermissionsProvider } from "@/contexts/PermissionsContext"

// Inside the layout:
<PermissionsProvider>
  <AppShell>{children}</AppShell>
</PermissionsProvider>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/contexts/PermissionsContext.tsx
git add backend/src/interfaces/http/routes/permissionMatrix.ts
git commit -m "feat(context): add PermissionsContext for module-level permission gating"
```

---

## Task 7: Create ModuleRail

**Files:**
- Create: `frontend/src/components/layout/ModuleRail.tsx`

- [ ] **Step 1: Create ModuleRail**

Create `frontend/src/components/layout/ModuleRail.tsx`:

```typescript
"use client"

import {
  ClipboardList, BarChart3, FileText, Cpu, Users, Settings
} from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { useSidebarState } from "@/hooks/useSidebarState"
import { usePermissions } from "@/contexts/PermissionsContext"
import { ROUTE_TO_MODULE, MODULE_LABELS, type ModuleId } from "@/lib/navigation"
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

const MODULE_PERMISSIONS: Record<ModuleId, string> = {
  "test-management": "TEST_PLANS",
  governance: "QA_GOVERNANCE",
  reports: "REPORTING",
  integrations: "INTEGRATIONS",
  "users-groups": "USERS_GROUPS",
  admin: "ADMIN",
}

const ALL_MODULES: ModuleId[] = [
  "test-management",
  "governance",
  "reports",
  "integrations",
  "users-groups",
  "admin",
]

export function ModuleRail() {
  const pathname = usePathname()
  const { activeModule, setActiveModule } = useSidebarState()
  const { can } = usePermissions()

  // Auto-detect active module from current route
  useEffect(() => {
    // Strip locale prefix: /en/test-plans → /test-plans
    const stripped = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, "")
    const match = ROUTE_TO_MODULE.find(([prefix]) => stripped.startsWith(prefix))
    if (match) setActiveModule(match[1])
  }, [pathname, setActiveModule])

  const visibleModules = ALL_MODULES.filter(
    m => can(MODULE_PERMISSIONS[m], "read")
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
                  aria-label={MODULE_LABELS[moduleId]}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {MODULE_LABELS[moduleId]}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </aside>
    </TooltipProvider>
  )
}
```

- [ ] **Step 2: Extend useSidebarState to include activeModule**

Read the current `frontend/src/hooks/useSidebarState.ts`:

```bash
cat frontend/src/hooks/useSidebarState.ts
```

Add `activeModule` state to it:

```typescript
// Add to useSidebarState:
import { useState } from "react"
import type { ModuleId } from "@/lib/navigation"

export function useSidebarState() {
  // ... existing isCollapsed logic (keep unchanged)

  const [activeModule, setActiveModule] = useState<ModuleId>("test-management")

  return { isCollapsed, toggleCollapse, activeModule, setActiveModule }
}
```

> Note: If `useSidebarState` uses localStorage or cookies for persistence, add `activeModule` to that persistence too.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/ModuleRail.tsx frontend/src/hooks/useSidebarState.ts
git commit -m "feat(nav): add ModuleRail with permission-gated module icons and route auto-detection"
```

---

## Task 8: Convert Sidebar to ModuleSidebar

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx` → rename to `ModuleSidebar.tsx`
- Modify: `frontend/src/components/layout/SidebarNav.tsx`

- [ ] **Step 1: Update SidebarNav to accept activeModule filter**

In `frontend/src/components/layout/SidebarNav.tsx`, add `activeModule` prop:

```typescript
import type { NavSection, ModuleId } from "@/lib/navigation"
import { useProject } from "@/contexts/ProjectContext"

interface SidebarNavProps {
  sections: NavSection[]
  isCollapsed: boolean
  activeModule: ModuleId   // ← add this
}

export function SidebarNav({ sections, isCollapsed, activeModule }: SidebarNavProps) {
  const { isOrgView } = useProject()

  // Filter to active module
  const activeSections = sections.filter(s => s.moduleId === activeModule)

  // Show notice if test-management selected without a project
  if (activeModule === "test-management" && isOrgView) {
    return (
      <div className="p-4">
        <p className="text-xs text-muted-foreground">
          Select a project to access Test Command.
        </p>
      </div>
    )
  }

  // ... rest of rendering using activeSections instead of sections
```

- [ ] **Step 2: Rename Sidebar.tsx to ModuleSidebar.tsx**

```bash
git mv frontend/src/components/layout/Sidebar.tsx frontend/src/components/layout/ModuleSidebar.tsx
```

In `ModuleSidebar.tsx`, update:
- Export name: `export function ModuleSidebar()`
- Pass `activeModule` from `useSidebarState()` to `SidebarNav`
- Remove `ProjectSelector` section (moved to Header in Task 5)

Key part of `SidebarContent` (inside `ModuleSidebar.tsx`):

```typescript
function SidebarContent({ isCollapsed, onToggleCollapse }: Props) {
  const locale = useLocale()
  const { activeModule } = useSidebarState()   // ← add this

  return (
    <>
      {/* Logo header — unchanged */}
      <div className={`flex h-14 items-center border-b px-4 ...`}>
        <Link href={`/${locale}/dashboard`} ...>
          <ShieldCheck className="h-6 w-6 text-primary" />  {/* updated icon */}
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-lg leading-tight">{APP_CONFIG.name}</span>
              <span className="text-xs text-muted-foreground">v{APP_CONFIG.version}</span>
            </div>
          )}
        </Link>
      </div>

      <Separator />

      {/* Pass activeModule to filter nav items */}
      <SidebarNav
        sections={sidebarNavigation}
        isCollapsed={isCollapsed}
        activeModule={activeModule}   // ← add this
      />

      {/* Collapse toggle — unchanged */}
    </>
  )
}
```

- [ ] **Step 3: Update AppShell imports**

In `frontend/src/components/layout/AppShell.tsx`:

```typescript
import { ModuleSidebar } from "./ModuleSidebar"   // was Sidebar
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/
git commit -m "feat(nav): rename Sidebar → ModuleSidebar, filter nav items by active module"
```

---

## Task 9: Update AppShell — Add ModuleRail

**Files:**
- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Add ModuleRail to AppShell**

Replace `frontend/src/components/layout/AppShell.tsx`:

```typescript
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
```

- [ ] **Step 2: Verify layout**

```bash
cd frontend && npm run dev
```

Expected layout:
```
┌────┬──────────────┬────────────────────────────────────────┐
│Rail│ ModuleSidebar│  Header (ProjectSelector + Breadcrumbs)│
│    │  QAuthority  │  [icons] | [theme] [avatar]            │
│    │  ──────────  ├────────────────────────────────────────┤
│    │  Test Plans  │                                        │
│    │  Test Suites │          Page Content                  │
│    │  Test Cases  │                                        │
│    │  ...         │                                        │
└────┴──────────────┴────────────────────────────────────────┘
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/AppShell.tsx
git commit -m "feat(nav): integrate ModuleRail into AppShell — complete navigation restructure"
```

---

## Task 10: Update Mobile Drawer

**Files:**
- Modify: `frontend/src/components/layout/ModuleSidebar.tsx`

- [ ] **Step 1: Update mobile Sheet to show module selector + filtered items**

In the `ModuleSidebar` component's Sheet section, add a module selector strip:

```typescript
// In the mobile Sheet content:
<SheetContent side="left" className="w-72 p-0 bg-sidebar-bg">
  {/* Logo */}
  <div className="flex h-14 items-center border-b px-4">
    <Link href={`/${locale}/dashboard`} className="flex items-center gap-2">
      <ShieldCheck className="h-6 w-6 text-primary" />
      <span className="font-semibold">{APP_CONFIG.name}</span>
      <span className="text-xs text-muted-foreground">v{APP_CONFIG.version}</span>
    </Link>
  </div>

  {/* Module selector tabs — horizontal scroll */}
  <div className="flex border-b overflow-x-auto">
    {ALL_MODULES.filter(m => can(MODULE_PERMISSIONS[m], 'read')).map(moduleId => {
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

  {/* Filtered nav items */}
  <SidebarNav sections={sidebarNavigation} isCollapsed={false} activeModule={activeModule} />
</SheetContent>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/ModuleSidebar.tsx
git commit -m "feat(nav): update mobile drawer with module tabs + filtered nav items"
```

---

## Task 11: Add i18n keys for new nav items

**Files:**
- Modify: `frontend/src/messages/en.json`
- Modify: `frontend/src/messages/pt.json`

- [ ] **Step 1: Add missing nav keys**

```bash
# Find the nav section in en.json
grep -n '"nav"' frontend/src/messages/en.json
```

Add to the `nav` object in `en.json`:

```json
"nav": {
  // ... existing keys ...
  "etCharters": "ET Charters",
  "heuristics": "Heuristics",
  "executiveDashboard": "Executive Dashboard",
  "projectDashboard": "Project Dashboard",
  "okrs": "OKRs",
  "kpis": "KPIs & Metrics",
  "processDesigner": "Process Designer",
  "reportTemplates": "Report Templates",
  "generateReport": "Generate Report",
  "reportHistory": "Report History",
  "exportCenter": "Export Center",
  "aiGenerator": "AI Code Generator",
  "aiProviders": "AI Providers",
  "cicd": "CI/CD Connections",
  "externalIssues": "External Issues",
  "webhooks": "Webhooks",
  "groups": "Groups",
  "apiKeys": "API Keys"
}
```

Do the same for `pt.json` with Portuguese translations.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/messages/
git commit -m "feat(i18n): add nav translation keys for new modules"
```

---

## Final: Visual Verification Checklist

- [ ] **Module rail visible** — 6 icons on left, active one highlighted in `bg-primary/20`
- [ ] **Sidebar filters by module** — clicking Governance icon shows only governance nav items
- [ ] **Header ProjectSelector** — dropdown shows projects + "All Projects" option at bottom
- [ ] **Breadcrumbs still work** — navigate to `/test-cases` → breadcrumb shows correct path
- [ ] **Theme toggle works** — dark/light switch in header still functions
- [ ] **Profile dropdown works** — avatar opens user menu
- [ ] **Mobile menu** — button appears on small screens, Sheet opens with module tabs
- [ ] **Test Management without project** — selecting "All Projects" shows notice in sidebar
- [ ] **Brand updated** — sidebar shows "QAuthority" not "TestTool"
- [ ] **Module auto-detection** — navigating to `/bugs` activates test-management module icon

- [ ] **Final commit**

```bash
git add .
git commit -m "feat(plan-1): complete Navigation restructure — ModuleRail + contextual sidebar + QAuthority brand"
```
