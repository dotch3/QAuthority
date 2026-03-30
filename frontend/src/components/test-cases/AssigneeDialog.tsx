"use client"

import { useState, useEffect } from "react"
import { User, X, Plus } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface UserOption {
  id: string
  name?: string
  email: string
}

interface Assignee {
  id: string
  name?: string
  email: string
}

interface AssigneeDialogProps {
  suiteId: string
  caseId: string
  assignees: Assignee[]
  onAssigneesChange: (assignees: Assignee[]) => void
  trigger?: React.ReactNode
}

export function AssigneeDialog({
  suiteId,
  caseId,
  assignees,
  onAssigneesChange,
  trigger,
}: AssigneeDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [users, setUsers] = useState<UserOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")

  useEffect(() => {
    if (isOpen) {
      loadUsers()
    }
  }, [isOpen])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const data = await api.get<UserOption[]>("/users")
      setUsers(data)
    } catch (err) {
      console.error("Failed to load users:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddAssignee = async () => {
    if (!selectedUserId) return

    setIsAdding(true)
    try {
      await api.post(`/suites/${suiteId}/cases/${caseId}/assignees`, {
        userId: selectedUserId,
      })
      const user = users.find((u) => u.id === selectedUserId)
      if (user) {
        onAssigneesChange([...assignees, { id: user.id, name: user.name, email: user.email }])
      }
      setSelectedUserId("")
    } catch (err) {
      console.error("Failed to add assignee:", err)
      alert(err instanceof Error ? err.message : "Failed to add assignee")
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveAssignee = async (userId: string) => {
    try {
      await api.delete(`/suites/${suiteId}/cases/${caseId}/assignees/${userId}`)
      onAssigneesChange(assignees.filter((a) => a.id !== userId))
    } catch (err) {
      console.error("Failed to remove assignee:", err)
      alert(err instanceof Error ? err.message : "Failed to remove assignee")
    }
  }

  const availableUsers = users.filter(
    (user) => !assignees.some((a) => a.id === user.id)
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <User className="mr-2 h-4 w-4" />
            Manage Assignees
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Assignees</DialogTitle>
          <DialogDescription>
            Assign team members to this test case
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {assignees.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Current Assignees
                </Label>
                <div className="space-y-2">
                  {assignees.map((assignee) => (
                    <div
                      key={assignee.id}
                      className="flex items-center justify-between p-2 rounded-md border"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">
                            {((assignee.name || assignee.email) || '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {assignee.name || assignee.email}
                          </p>
                          {assignee.name && (
                            <p className="text-xs text-muted-foreground">
                              {assignee.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveAssignee(assignee.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="user-select" className="text-sm font-medium">
              Add Assignee
            </Label>
            <div className="flex gap-2">
              <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm"
                disabled={isLoading || isAdding}
              >
                <option value="">Select a user</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleAddAssignee}
                disabled={!selectedUserId || isAdding}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {availableUsers.length === 0 && assignees.length > 0 && (
              <p className="text-xs text-muted-foreground">
                All users are already assigned
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
