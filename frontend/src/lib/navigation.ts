import {
  LayoutDashboard,
  ClipboardList,
  FlaskConical,
  PlayCircle,
  Bug,
  BarChart3,
  Users,
  Shield,
  ListChecks,
  Settings,
  Database,
  Bell,
  FileText,
  ScrollText,
  Download,
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

// Maps each module to the ModuleType permission key that gates access to it.
// TEST_PLANS is used as the representative gate for the entire test-management module.
// IMPORTANT: ROUTE_TO_MODULE order is load-bearing — specific prefixes must appear before catch-alls.
export const MODULE_PERMISSION_KEYS: Record<ModuleId, string> = {
  "test-management": "TEST_PLANS",
  governance: "QA_GOVERNANCE",
  reports: "REPORTING",
  integrations: "INTEGRATIONS",
  "users-groups": "USERS_GROUPS",
  admin: "ADMIN",
}

export const ALL_MODULES: ModuleId[] = [
  "test-management",
  "governance",
  "reports",
  "integrations",
  "users-groups",
  "admin",
]

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
  ["/admin/integrations", "integrations"],
  ["/admin/users", "users-groups"],
  ["/admin/groups", "users-groups"],
  ["/admin/roles", "users-groups"],
  ["/api-keys", "admin"],
  ["/notifications", "admin"],
  ["/admin/", "admin"],
]
