"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { permissionsApi, type PermissionEntry } from "@/lib/api"
import { useAuth } from "@/components/providers/AuthProvider"

interface PermissionsContextValue {
  matrix: Record<string, PermissionEntry>
  loaded: boolean
  can: (module: string, action: "create" | "read" | "update" | "delete" | "export") => boolean
}

const PermissionsContext = createContext<PermissionsContextValue>({
  matrix: {},
  loaded: false,
  can: () => true,
})

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [matrix, setMatrix] = useState<Record<string, PermissionEntry>>({})
  const [loaded, setLoaded] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setMatrix({})
      setLoaded(true)
      return
    }
    setLoaded(false)
    permissionsApi.getMyMatrix()
      .then(res => {
        setMatrix(res)
        setLoaded(true)
      })
      .catch(() => {
        setLoaded(true)
      })
  }, [user])

  const can = (module: string, action: "create" | "read" | "update" | "delete" | "export") => {
    if (!loaded) return true
    const entry = matrix[module]
    if (!entry) return false
    const key = `can${action.charAt(0).toUpperCase()}${action.slice(1)}` as keyof PermissionEntry
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
