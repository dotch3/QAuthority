'use client'
import { useEffect, useState } from 'react'
import { groupsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    groupsApi.list().then((r: any) => {
      setGroups(r.data ?? r)
      setLoading(false)
    }).catch(() => {
      toast.error('Failed to load groups')
      setLoading(false)
    })
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return
    try {
      await groupsApi.delete(id)
      setGroups(prev => prev.filter(g => g.id !== id))
      toast.success('Group deleted')
    } catch {
      toast.error('Failed to delete group')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground mt-1">
            Manage user groups and module permissions
          </p>
        </div>
        <Button onClick={() => router.push('/admin/groups/new')}>New Group</Button>
      </div>
      <div className="space-y-2">
        {groups.map(group => (
          <div key={group.id} className="flex items-center justify-between border rounded-lg p-4 bg-card">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{group.name}</span>
                {group.isSystem && <Badge variant="secondary">System</Badge>}
              </div>
              {group.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{group.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {group.members?.length ?? 0} members
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/admin/groups/${group.id}`)}
              >
                Configure
              </Button>
              {!group.isSystem && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(group.id)}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-center py-12 text-muted-foreground">
            Loading...
          </div>
        )}
        {!loading && groups.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No groups found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  )
}
