"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FolderKanban, Plus, Users, TestTube, ChevronRight } from "lucide-react"
import { useProject } from "@/contexts/ProjectContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface ProjectWithStats {
  id: string
  name: string
  key: string
  slug: string
  description?: string
  testPlansCount: number
  testCasesCount: number
  membersCount: number
}

export default function ProjectSelectorPage() {
  const router = useRouter()
  const { projects, selectedProject, setSelectedProject, isLoading } = useProject()
  const [projectsWithStats, setProjectsWithStats] = useState<ProjectWithStats[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!isLoading && projects.length > 0) {
      setProjectsWithStats(
        projects.map((p) => ({
          ...p,
          testPlansCount: Math.floor(Math.random() * 10),
          testCasesCount: Math.floor(Math.random() * 100),
          membersCount: Math.floor(Math.random() * 5) + 1,
        }))
      )
      setLoadingStats(false)
    }
  }, [isLoading, projects])

  const handleSelectProject = (project: ProjectWithStats) => {
    setSelectedProject(project)
    router.push("/dashboard")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getColorForProject = (key: string) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-green-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-cyan-500",
      "bg-indigo-500",
      "bg-rose-500",
    ]
    const index = key.charCodeAt(0) % colors.length
    return colors[index]
  }

  if (isLoading || loadingStats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-4xl px-4">
          <div className="text-center mb-8">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">No Projects Available</h1>
          <p className="text-muted-foreground mb-6">
            You don't have access to any projects yet. Contact your administrator to get access.
          </p>
          <Button asChild>
            <a href="/admin/projects">Create Project</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Select a Project</h1>
            <p className="text-muted-foreground">
              Choose a project to work with. You can change this later.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projectsWithStats.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => handleSelectProject(project)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${getColorForProject(
                      project.key
                    )} flex items-center justify-center text-white font-bold text-sm`}
                  >
                    {getInitials(project.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{project.name}</h3>
                    <p className="text-xs text-muted-foreground">{project.key}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>

                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <TestTube className="h-3 w-3" />
                    {project.testPlansCount} plans
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {project.membersCount} members
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Create New Project Card */}
          <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all border-dashed group">
            <CardContent className="p-4 h-full flex flex-col items-center justify-center min-h-[140px]">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                Create New Project
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
