# QAuthority — UI/UX Review & Plan Corrections

**Date:** 2026-03-27
**Reviewer:** UI/UX Architecture Analysis
**Status:** Required reading before executing any plan

---

## Summary

The implementation plans were written without full context of the existing frontend structure. This review identifies critical corrections needed before any plan is executed. Several plans would have broken or regressed the existing, polished UI if run as written.

---

## 1. Critical Bug: All Frontend Page Paths Are Wrong

### What the plans wrote
```
frontend/src/app/governance/executive/page.tsx
frontend/src/app/reports/templates/page.tsx
frontend/src/app/ai/generator/page.tsx
frontend/src/app/admin/groups/page.tsx
```

### What the actual app structure requires
```
frontend/src/app/[locale]/(app)/governance/executive/page.tsx
frontend/src/app/[locale]/(app)/reports/templates/page.tsx
frontend/src/app/[locale]/(app)/ai/generator/page.tsx
frontend/src/app/[locale]/(app)/admin/groups/page.tsx
```

### Why
The app uses Next.js 16 with `next-intl` i18n. All authenticated pages live under `app/[locale]/(app)/`. This is not optional — pages created outside this structure will 404.

### IMPORTANT: `[locale]` in file path ≠ locale in URL

The `[locale]` segment is a **file system convention required by next-intl**, not a URL segment. The middleware is already configured with `localePrefix: 'never'`:

```typescript
// frontend/src/middleware.ts (already in the app — do NOT change)
export default createMiddleware({
  locales: ['pt-BR', 'en-US'],
  defaultLocale: 'pt-BR',
  localePrefix: 'never',   // ← locale NEVER appears in URL
})
```

This means:
- File lives at: `app/[locale]/(app)/governance/executive/page.tsx`
- URL is:        `/governance/executive`  ✅ (no locale prefix)
- NOT:           `/pt-BR/governance/executive`  ❌

The locale is determined by Accept-Language header or user preference, not the URL. **Do NOT change the middleware configuration.** When writing `Link` hrefs in components, use clean paths like `href="/governance/executive"` — next-intl handles locale injection automatically.

### Exception: Setup Wizard
The setup page has no authentication requirement. It belongs at:
```
frontend/src/app/[locale]/setup/page.tsx    ← outside (app) group
```

### Fix: Apply to ALL plans
Every file path in plans 0–6 that starts with `frontend/src/app/` and is a page component must be corrected to `frontend/src/app/[locale]/(app)/`.

The full correction table:

| Plan | Wrong path | Correct path |
|------|-----------|--------------|
| 0 | `app/admin/groups/page.tsx` | `app/[locale]/(app)/admin/groups/page.tsx` |
| 0 | `app/admin/groups/[id]/page.tsx` | `app/[locale]/(app)/admin/groups/[id]/page.tsx` |
| 0 | `app/setup/page.tsx` | `app/[locale]/setup/page.tsx` |
| 1 | All layout files | `app/[locale]/(app)/layout.tsx` |
| 2 | `app/governance/*/page.tsx` | `app/[locale]/(app)/governance/*/page.tsx` |
| 3 | `app/reports/*/page.tsx` | `app/[locale]/(app)/reports/*/page.tsx` |
| 4 | `app/integrations/*/page.tsx` | `app/[locale]/(app)/integrations/*/page.tsx` |
| 5 | `app/governance/processes/*/page.tsx` | `app/[locale]/(app)/governance/processes/*/page.tsx` |
| 6 | `app/ai/*/page.tsx` | `app/[locale]/(app)/ai/*/page.tsx` |

---

## 2. Plan 1 (Navigation) — Significant Corrections

### 2a. Header.tsx must NOT be replaced

**Current Header.tsx is excellent and must be kept:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Breadcrumbs]              [🔍] [🔔] [ℹ] │ [☀] [Avatar]  │
└─────────────────────────────────────────────────────────────┘
```
- `Breadcrumbs` — context of where you are in deep hierarchies
- `Search` — fast navigation shortcut
- `Bell` — notifications
- `Info` → `AboutDialog` — product version/credits
- `ThemeToggle` — dark/light mode
- `ProfileDropdown` — user info + logout

Plan 1's `TopBar` would have replaced all of this with just:
```
QAuthority | [ProjectSelector] | [UserMenu]
```
This is a UX regression. **Do not replace Header.tsx.**

**Correction:** Move `ProjectSelector` from the Sidebar into `Header.tsx`, next to the breadcrumbs area. The sidebar header section then shows only the logo/brand.

Updated Header layout:
```
┌─────────────────────────────────────────────────────────────┐
│  [ProjectSelector ▼]  [Breadcrumbs]    [🔍][🔔][ℹ]│[☀][👤] │
└─────────────────────────────────────────────────────────────┘
```

### 2b. ProjectSelector.tsx must be MODIFIED, not rebuilt

The existing `ProjectSelector.tsx` uses `ProjectContext` which manages project state across the app. Rebuilding it with `Zustand` would break the rest of the app.

**Correct approach:** Add an "All Projects" option to the existing `ProjectSelector.tsx`. The `ProjectContext` should have a concept of `selectedProject = null` (org view).

```typescript
// In ProjectContext, add:
const ORG_VIEW_SENTINEL = null  // null = All Projects / org view

// In ProjectSelector.tsx, add before the project list:
<DropdownMenuSeparator />
<DropdownMenuItem onClick={() => setSelectedProject(null)}>
  <Globe className="h-4 w-4 mr-2" />
  All Projects
  {selectedProject === null && <Check className="h-4 w-4 ml-auto" />}
</DropdownMenuItem>
```

### 2c. AppShell.tsx should be modified, not replaced

Current `AppShell.tsx` (8 lines) is a clean wrapper. The new design just needs to change the sidebar portion:

```typescript
// Current:
<div className="flex min-h-screen">
  <Sidebar />                    // ← replace with ModuleRail + ModuleSidebar
  <div className="flex flex-1 flex-col">
    <Header />
    <main className="flex-1 p-6">{children}</main>
  </div>
</div>

// New:
<div className="flex min-h-screen">
  <ModuleRail />                 // NEW: 48px icon strip
  <ModuleSidebar />              // MODIFIED: contextual items, was Sidebar
  <div className="flex flex-1 flex-col overflow-hidden">
    <Header />                   // UNCHANGED
    <main className="flex-1 overflow-y-auto p-6">{children}</main>
  </div>
</div>
```

### 2d. navigation.ts must be the single source of truth

The plans create `MODULE_MENUS` inline in `ModuleSidebar.tsx`. This bypasses the existing `navigation.ts` which:
- Uses i18n `titleKey` strings
- Applies `adminOnly` filtering
- Is the existing contract for nav structure

**Correction:** Extend `navigation.ts` to add a `module` field to each `NavSection`:

```typescript
export interface NavSection {
  titleKey?: string
  moduleId: ModuleId          // ← add this
  items: NavItem[]
  adminOnly?: boolean
}
```

Then `ModuleSidebar` filters `sidebarNavigation` by the active `moduleId`.

### 2e. Mobile navigation must be preserved

The existing `Sidebar.tsx` has a Sheet-based mobile drawer. The new design must preserve mobile:

```
Mobile behavior:
- ModuleRail: hidden on mobile (md:flex)
- ModuleSidebar: hidden on mobile (md:flex)
- Mobile: bottom-left Menu button (keep existing pattern)
- Mobile Sheet: shows full module selector + active module items
```

### 2f. useSidebarState hook should be reused

The plan creates a new `navigationStore.ts` with Zustand. The app already has `useSidebarState`. Use it or extend it instead of adding a parallel store.

### 2g. Don't create permissionsStore with Zustand

The app uses React Context for state (see `ProjectContext`). Introducing Zustand for permissions while the rest of the app uses Context creates architectural inconsistency.

**Correction:** Create `PermissionsContext` instead, following the same pattern as `ProjectContext`.

---

## 3. What's Already Good (Don't Touch)

| Component | Status | Notes |
|-----------|--------|-------|
| `Header.tsx` | ✅ Keep | Breadcrumbs + all icons are valuable |
| `Breadcrumbs.tsx` | ✅ Keep | Critical for deep navigation context |
| `ProfileDropdown.tsx` | ✅ Keep | |
| `ThemeToggle.tsx` | ✅ Keep | |
| `AboutDialog.tsx` | ✅ Keep | Update brand name only |
| `ProjectSelector.tsx` | ✅ Modify | Add "All Projects" option |
| `SidebarNav.tsx` | ✅ Modify | Add module awareness |
| `AppShell.tsx` | ✅ Modify | Add ModuleRail between |
| `navigation.ts` | ✅ Extend | Add `moduleId` field |
| All shadcn/ui components | ✅ Keep | Complete library already present |
| Loading/Empty states | ✅ Keep | Well implemented |
| Theme (dark blue-purple OkLch) | ✅ Keep | Perfect for "authority" brand |

---

## 4. Updated Navigation Architecture for Plan 1

### Total width unchanged

```
Before: ├──── Sidebar (w-64) ────┤ content
After:  ├─Rail─┤─── Sidebar ───┤ content
          w-12      w-52          = 64px total — same width!
```

### Revised component structure

```
AppShell (modified)
├── ModuleRail (NEW, 48px)
│   └── 6 module icons — always visible
├── ModuleSidebar (NEW, replaces Sidebar)
│   ├── SidebarHeader (logo, collapse toggle)
│   ├── SidebarNav (extended with module filtering)
│   └── SidebarFooter (collapse button)
└── Right panel
    ├── Header (UNCHANGED — has breadcrumbs etc.)
    └── main content
```

### Revised file list for Plan 1

| Action | File |
|--------|------|
| Create | `frontend/src/components/layout/ModuleRail.tsx` |
| Modify | `frontend/src/components/layout/AppShell.tsx` |
| Rename/Modify | `frontend/src/components/layout/Sidebar.tsx` → `ModuleSidebar.tsx` |
| Modify | `frontend/src/components/layout/SidebarNav.tsx` |
| Modify | `frontend/src/components/layout/Header.tsx` (add ProjectSelector) |
| Modify | `frontend/src/components/layout/ProjectSelector.tsx` (add All Projects) |
| Modify | `frontend/src/lib/navigation.ts` (add moduleId to NavSection) |
| Modify | `frontend/src/contexts/ProjectContext.tsx` (add null = org view) |
| Create | `frontend/src/contexts/PermissionsContext.tsx` (not Zustand) |

### navigation.ts updated structure

```typescript
export type ModuleId =
  | 'test-management'
  | 'governance'
  | 'reports'
  | 'integrations'
  | 'users-groups'
  | 'admin'

export interface NavSection {
  titleKey?: string
  moduleId: ModuleId          // ← new field
  items: NavItem[]
  adminOnly?: boolean
  requiredPermission?: string // ← new: module permission key
}

export const sidebarNavigation: NavSection[] = [
  {
    moduleId: 'test-management',
    items: [
      { titleKey: "nav.testPlans", href: "/test-plans", ... },
      { titleKey: "nav.testSuites", href: "/test-suites", ... },
      { titleKey: "nav.testCases", href: "/test-cases", ... },
      { titleKey: "nav.executions", href: "/executions", ... },
      { titleKey: "nav.bugs", href: "/bugs", ... },
      { titleKey: "nav.etCharters", href: "/et-charters", ... },
      { titleKey: "nav.heuristics", href: "/heuristics", ... },
    ],
  },
  {
    moduleId: 'governance',
    requiredPermission: 'QA_GOVERNANCE',
    items: [
      { titleKey: "nav.executiveDashboard", href: "/governance/executive", ... },
      { titleKey: "nav.projectDashboard", href: "/governance/project", ... },
      { titleKey: "nav.okrs", href: "/governance/okrs", ... },
      { titleKey: "nav.kpis", href: "/governance/kpis", ... },
      { titleKey: "nav.processDesigner", href: "/governance/processes", ... },
    ],
  },
  // ... etc
]
```

---

## 5. Plan 7 (Rebranding) — Additional Item

`frontend/src/lib/config.ts` is the single source of truth for the app name:

```typescript
// Current:
export const APP_CONFIG = {
  name: "TestTool",        // ← appears in sidebar header
  version: "1.0.0",
  description: "Test Case Management System",
}

// Must become:
export const APP_CONFIG = {
  name: "QAuthority",
  version: "1.0.0",
  description: "Enterprise QA Command Center",
}
```

This one change propagates the brand to: sidebar header, mobile drawer, `AboutDialog`, browser title fallback.

Also: Replace the `TestTube2` icon in `Sidebar.tsx` with a more enterprise-appropriate icon. `Shield`, `ShieldCheck`, or a custom SVG.

---

## 6. UX Improvements: Dashboard → Command Center

The existing dashboard (`/dashboard`) is good. For the QAuthority rebrand:

1. **Rename route** `/dashboard` → `/command-center` (or keep `/dashboard` but change heading)
2. **Add "Welcome to QAuthority" onboarding banner** for new users (no projects yet)
3. **Add module shortcuts grid** to dashboard — 6 cards linking to each module

```
Current dashboard flow:
  Dashboard → stats → recent executions → quick actions

QAuthority command center flow:
  Command Center
  ├── [project scope] Stats + Recent Executions (unchanged, good)
  └── [org scope "All Projects"] → Redirect to /governance/executive
```

---

## 7. Color & Icon Decisions for New Modules

The existing theme uses specific icon colors. New modules should follow the same pattern:

```typescript
// Add to globals.css (following existing pattern):
--icon-teal:   oklch(0.72 0.15 175)  // QA Governance
--icon-amber:  oklch(0.75 0.18 80)   // Reports

// Module icon assignments:
Test Management  → text-icon-purple  (ClipboardList)
QA Governance    → text-icon-teal    (BarChart3)
Reports          → text-icon-blue    (FileText)
AI & Integrations→ text-icon-cyan    (Link2 / Cpu)
Users & Groups   → text-icon-green   (Users)
Admin            → text-muted-foreground (Settings)
```

---

## 8. Summary: What to Fix Before Executing Plans

### Must fix (blockers):
1. ✅ ALL page paths: Add `[locale]/(app)/` prefix
2. ✅ `[locale]` in file path is NOT in the URL — middleware already has `localePrefix: 'never'`; use clean href="/governance/executive" everywhere
3. ✅ Plan 1: Don't replace Header.tsx — move ProjectSelector into it instead
4. ✅ Plan 1: Modify existing ProjectSelector.tsx, don't rebuild
5. ✅ Plan 1: Use PermissionsContext (not Zustand store)
6. ✅ Plan 1: Add moduleId to navigation.ts, filter in ModuleSidebar
7. ✅ Plan 1: Keep mobile Sheet drawer
8. ✅ Plan 7: Update APP_CONFIG in lib/config.ts

### Nice to fix (quality):
9. Plan 1: Reuse useSidebarState or extend it
10. Plan 0: Setup wizard path is `[locale]/setup/` not `[locale]/(app)/setup/`
11. All plans: Use next-intl `Link` component (from `next-intl`) for locale-aware navigation — NOT `next/link`
