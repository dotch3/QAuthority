"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/components/providers/AuthProvider"

export interface Project {
  id: string
  name: string
  key: string
  slug: string
  description?: string
}

interface ProjectContextType {
  projects: Project[]
  selectedProject: Project | null
  isOrgView: boolean
  isLoading: boolean
  error: string | null
  setSelectedProject: (project: Project | null) => void
  refreshProjects: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([])
      setSelectedProjectState(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const data = await api.get<any[]>("/projects")
      
      const mappedProjects: Project[] = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        key: p.slug?.substring(0, 3).toUpperCase() || p.name.substring(0, 3).toUpperCase(),
        slug: p.slug,
        description: p.description,
      }))
      
      setProjects(mappedProjects)
      
      if (mappedProjects.length > 0) {
        const stored = localStorage.getItem("selectedProjectId")
        const storedProject = stored ? mappedProjects.find((p) => p.id === stored) : null
        setSelectedProjectState(storedProject ?? mappedProjects[0])
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load projects"
      setError(errorMessage)
      setProjects([])
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const isOrgView = selectedProject === null

  const setSelectedProject = (project: Project | null) => {
    setSelectedProjectState(project)
    if (project) {
      localStorage.setItem("selectedProjectId", project.id)
    } else {
      localStorage.removeItem("selectedProjectId")
    }
  }

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        isOrgView,
        isLoading,
        error,
        setSelectedProject,
        refreshProjects: fetchProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider")
  }
  return context
}