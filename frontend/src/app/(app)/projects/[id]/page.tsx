"use client"

import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import { useState, useEffect, use } from "react"
import type { Project, ProjectMember } from "@/types/project"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const t = useTranslations("common")
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadProject()
    loadMembers()
  }, [id])

  const loadProject = async () => {
    try {
      const data = await api.get<Project>(`/projects/${id}`)
      setProject(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project")
    } finally {
      setIsLoading(false)
    }
  }

  const loadMembers = async () => {
    try {
      const data = await api.get<ProjectMember[]>(`/projects/${id}/members`)
      setMembers(data)
    } catch (err) {
      console.error("Failed to load members:", err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        {error || "Project not found"}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <Button asChild>
          <Link href={`/projects/${id}/test-plans`}>Test Plans</Link>
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-6">
              <div className="text-2xl font-bold">{project._count?.testPlans ?? 0}</div>
              <div className="text-sm text-muted-foreground">Test Plans</div>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <div className="text-2xl font-bold">{members.length}</div>
              <div className="text-sm text-muted-foreground">Members</div>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-muted-foreground">Test Cases</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-end">
            <Button>{t("create")} Member</Button>
          </div>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b">
                    <td className="px-4 py-3">{member.user.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {member.user.email}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs">
                        {member.role.label}
                      </span>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      No members yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-muted-foreground">Project settings coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
