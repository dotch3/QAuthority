"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Check,
  Clock,
  Terminal,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

const apiKeys = [
  {
    id: 1,
    name: "CI/CD Pipeline",
    key: "tt_sk_••••••••••••••••••••••••••••••••••",
    prefix: "tt_sk",
    createdAt: "2 months ago",
    lastUsed: "1 hour ago",
    scopes: ["executions:write", "results:read"],
  },
  {
    id: 2,
    name: "GitHub Actions",
    key: "tt_sk_••••••••••••••••••••••••••••••••••",
    prefix: "tt_sk",
    createdAt: "3 weeks ago",
    lastUsed: "2 days ago",
    scopes: ["executions:write"],
  },
  {
    id: 3,
    name: "Jenkins Integration",
    key: "tt_sk_••••••••••••••••••••••••••••••••••",
    prefix: "tt_sk",
    createdAt: "1 week ago",
    lastUsed: null,
    scopes: ["read"],
  },
]

const scopes = [
  { id: "read", name: "Read", description: "Read access to all resources" },
  { id: "executions:write", name: "Execute Tests", description: "Start and update test executions" },
  { id: "results:read", name: "Read Results", description: "Read test execution results" },
  { id: "bugs:write", name: "Create Bugs", description: "Create and update bugs" },
]

export default function ApiKeysPage() {
  const t = useTranslations("common")
  const [keys, setKeys] = useState(apiKeys)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [showKey, setShowKey] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [newKey, setNewKey] = useState<{ name: string; key: string } | null>(null)
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read"])
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const handleCopy = async (text: string, id: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = (id: number) => {
    setKeys(keys.filter((k) => k.id !== id))
  }

  const handleCreateKey = () => {
    const fakeKey = `tt_sk_${Math.random().toString(36).substring(2, 50)}`
    setNewKey({
      name: "New API Key",
      key: fakeKey,
    })
    setKeys([
      {
        id: Date.now(),
        name: "New API Key",
        key: `tt_sk_••••••••••••••••••••••••••••••••••`,
        prefix: "tt_sk",
        createdAt: "Just now",
        lastUsed: null,
        scopes: selectedScopes,
      },
      ...keys,
    ])
    setIsCreateDialogOpen(false)
  }

  const toggleScope = (scopeId: string) => {
    if (selectedScopes.includes(scopeId)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scopeId))
    } else {
      setSelectedScopes([...selectedScopes, scopeId])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground mt-1">
            Manage API keys for integrations and automation
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <Terminal className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium">API Documentation</h3>
            <p className="text-sm text-muted-foreground mt-1">
              View our API documentation to learn how to integrate with QAuthority.
            </p>
            <Button variant="link" className="p-0 h-auto mt-1" disabled>
              Open API Docs →
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {keys.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <Key className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No API keys yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first API key to start integrating.
            </p>
          </div>
        ) : (
          keys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="rounded-lg border bg-card p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Key className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">{apiKey.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm bg-muted px-2 py-0.5 rounded">
                        {showKey === apiKey.id ? apiKey.key.replace(/tt_sk_/g, "") : apiKey.key}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setShowKey(showKey === apiKey.id ? null : apiKey.id)
                        }
                      >
                        {showKey === apiKey.id ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(apiKey.key, apiKey.id)}
                      >
                        {copiedId === apiKey.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirm(apiKey.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Created {apiKey.createdAt}
                </div>
                {apiKey.lastUsed && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Last used {apiKey.lastUsed}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {apiKey.scopes.map((scope) => (
                    <Badge key={scope} variant="secondary" className="text-xs">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for integrations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., CI/CD Pipeline"
                defaultValue="New API Key"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-2">
                {scopes.map((scope) => (
                  <label
                    key={scope.id}
                    className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope.id)}
                      onChange={() => toggleScope(scope.id)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">{scope.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {scope.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateKey}>Create Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!newKey} onOpenChange={() => setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your API key now. You will not be able to see it again.
            </DialogDescription>
          </DialogHeader>
          {newKey && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border bg-muted">
                <code className="text-sm break-all">{newKey.key}</code>
              </div>
              <Button
                className="w-full"
                onClick={() => handleCopy(newKey.key, -1)}
              >
                {copiedId === -1 ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy API Key
                  </>
                )}
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setNewKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}
        title="Delete API Key"
        description="Are you sure you want to delete this API key? This action cannot be undone."
        onConfirm={() => deleteConfirm !== null && handleDelete(deleteConfirm)}
      />
    </div>
  )
}
