"use client"

import { Bug } from "lucide-react"
import { useProject } from "@/contexts/ProjectContext"
import { BugTable } from "@/components/bugs/BugTable"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

function NoProjectSelected() {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Bug className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Please select a project from the header to view and manage bugs.
        </p>
        <Button asChild>
          <Link href="/projects/select">
            <ChevronRight className="mr-2 h-4 w-4" />
            Select Project
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function BugsPage() {
  const { selectedProject } = useProject()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bugs</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage bugs from test executions
        </p>
      </div>
      
      {!selectedProject ? (
        <NoProjectSelected />
      ) : (
        <BugTable projectId={selectedProject.id} />
      )}
    </div>
  )
}
