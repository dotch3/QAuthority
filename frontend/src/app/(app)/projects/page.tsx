import { ProjectsTable } from "@/components/projects/ProjectsTable"

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground mt-1">
          Manage your test projects
        </p>
      </div>

      <ProjectsTable />
    </div>
  )
}
