"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, Globe, Bell, Lock, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { APP_CONFIG } from "@/lib/config"

const adminNavItems = [
  { title: "Users", href: "/admin/users" },
  { title: "Roles & Permissions", href: "/admin/roles" },
  { title: "Enums & Fields", href: "/admin/enums" },
  { title: "Integrations", href: "/admin/integrations" },
  { title: "Settings", href: "/admin/settings" },
]

export default function AdminSettingsPage() {
  const t = useTranslations()
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="p-2 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("nav.settings")}</h1>
          <p className="text-muted-foreground mt-1">
            Application preferences and configuration
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="space-y-1">
          {adminNavItems.map((item) => {
            const isActive = item.href === pathname
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.title}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-6">
          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">{t("settings.general")}</h2>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">{t("settings.organizationName")}</Label>
                <Input id="org-name" defaultValue={APP_CONFIG.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">{t("settings.defaultTimezone")}</Label>
                <select
                  id="timezone"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  defaultValue="UTC"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-format">{t("settings.dateFormat")}</Label>
                <select
                  id="date-format"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  defaultValue="MM/DD/YYYY"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">{t("settings.notifications")}</h2>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("settings.emailNotifications")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.emailNotificationsDesc")}
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("settings.executionAlerts")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.executionAlertsDesc")}
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("settings.weeklySummary")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.weeklySummaryDesc")}
                  </p>
                </div>
                <input type="checkbox" className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">{t("settings.security")}</h2>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("settings.twoFactorAuth")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.twoFactorAuthDesc")}
                  </p>
                </div>
                <input type="checkbox" className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("settings.sessionTimeout")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.sessionTimeoutDesc")}
                  </p>
                </div>
                <select
                  className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                  defaultValue="60"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="480">8 hours</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("settings.passwordPolicy")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.passwordPolicyDesc")}
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">{t("settings.dataManagement")}</h2>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <p className="font-medium">{t("settings.dataRetention")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("settings.dataRetentionDesc")}
                </p>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  defaultValue="365"
                >
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="180">180 days</option>
                  <option value="365">1 year</option>
                  <option value="730">2 years</option>
                  <option value="forever">Forever</option>
                </select>
              </div>
              <div className="pt-4 border-t">
                <Button variant="destructive" disabled>
                  {t("settings.clearAllData")}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button>{t("settings.saveChanges")}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
