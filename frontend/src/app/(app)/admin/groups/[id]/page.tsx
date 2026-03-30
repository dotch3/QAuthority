'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { groupsApi } from '@/lib/api'
import { PermissionsMatrix } from '@/components/admin/groups/PermissionsMatrix'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [group, setGroup] = useState<any>(null)
  const [pendingPerms, setPendingPerms] = useState<any[]>([])

  useEffect(() => {
    groupsApi.get(id).then((r: any) => {
      const data = r.data ?? r
      setGroup(data)
      setPendingPerms(data.permissions.map((p: any) => ({
        module: p.module,
        canRead: p.canRead,
        canCreate: p.canCreate,
        canUpdate: p.canUpdate,
        canDelete: p.canDelete,
        canExport: p.canExport,
      })))
    }).catch(() => {
      toast.error('Failed to load group')
    })
  }, [id])

  const savePermissions = async () => {
    try {
      await groupsApi.setPermissions(id, pendingPerms)
      toast.success('Permissions saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save permissions')
    }
  }

  if (!group) return <div className="p-6 text-muted-foreground">Loading...</div>

  const permMap: Record<string, Record<string, boolean>> = {}
  for (const p of group.permissions ?? []) {
    permMap[p.module] = {
      canRead: p.canRead,
      canCreate: p.canCreate,
      canUpdate: p.canUpdate,
      canDelete: p.canDelete,
      canExport: p.canExport,
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
          {group.isSystem && <Badge variant="secondary">System</Badge>}
        </div>
        {group.description && (
          <p className="text-muted-foreground mt-1">{group.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          {group.members?.length ?? 0} members
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Module Permissions</h2>
        {group.isSystem && (
          <p className="text-sm text-muted-foreground">
            Permissions for system groups cannot be modified.
          </p>
        )}
        <div className="border rounded-lg overflow-hidden">
          <PermissionsMatrix
            permissions={permMap}
            onChange={setPendingPerms}
            disabled={group.isSystem}
          />
        </div>
        {!group.isSystem && (
          <Button onClick={savePermissions}>Save Permissions</Button>
        )}
      </div>
    </div>
  )
}
