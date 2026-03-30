"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bug,
  PlayCircle,
  Bell,
  Settings,
  Trash2,
  Check,
} from "lucide-react"

const notifications = [
  {
    id: 1,
    type: "execution",
    title: "Execution Failed",
    message: "API Tests #234 failed on 'User Login' test case",
    time: "5 minutes ago",
    read: false,
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    id: 2,
    type: "bug",
    title: "Bug Created",
    message: "New bug 'Login timeout' reported by John",
    time: "1 hour ago",
    read: false,
    icon: Bug,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    id: 3,
    type: "execution",
    title: "Execution Passed",
    message: "UI Tests #189 completed successfully (45/45 passed)",
    time: "2 hours ago",
    read: true,
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: 4,
    type: "execution",
    title: "Execution Started",
    message: "Nightly regression suite started by CI pipeline",
    time: "3 hours ago",
    read: true,
    icon: PlayCircle,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: 5,
    type: "system",
    title: "Weekly Report",
    message: "Your weekly test execution report is ready",
    time: "1 day ago",
    read: true,
    icon: Bell,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
]

export default function NotificationsPage() {
  const t = useTranslations("common")
  const [notifs, setNotifs] = useState(notifications)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const unreadCount = notifs.filter((n) => !n.read).length

  const handleMarkAsRead = (id: number) => {
    setNotifs(
      notifs.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const handleMarkAllAsRead = () => {
    setNotifs(notifs.map((n) => ({ ...n, read: true })))
  }

  const handleDelete = (id: number) => {
    setNotifs(notifs.filter((n) => n.id !== id))
  }

  const filteredNotifs = showUnreadOnly
    ? notifs.filter((n) => !n.read)
    : notifs

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "You're all caught up!"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            {showUnreadOnly ? "Show All" : "Unread Only"}
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <Check className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {filteredNotifs.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No notifications</p>
          </div>
        ) : (
          filteredNotifs.map((notification) => {
            const Icon = notification.icon
            return (
              <div
                key={notification.id}
                className={`flex items-start gap-4 p-4 rounded-lg border bg-card transition-colors ${
                  !notification.read ? "border-l-4 border-l-primary" : ""
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${notification.bgColor}`}
                >
                  <Icon className={`h-5 w-5 ${notification.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`font-medium ${
                        !notification.read ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <Badge
                        variant="secondary"
                        className="h-2 w-2 p-0 rounded-full bg-primary"
                      />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notification.time}
                  </p>
                </div>
                <div className="flex gap-1">
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(notification.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
