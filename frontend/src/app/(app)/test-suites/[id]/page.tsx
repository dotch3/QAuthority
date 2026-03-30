"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Folder, TestTubes, Compass } from "lucide-react"
import { useProject } from "@/contexts/ProjectContext"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { NoProjectSelected } from "@/components/ui/NoProjectSelected"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { ETCharterList } from "@/components/et-charters/ETCharterList"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AssigneeDialog } from "@/components/test-cases/AssigneeDialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { User } from "lucide-react"

interface TestCase {
  id: string
  title: string
  description?: string
  priority: { value: string; label: string; color: string }
  type: { value: string; label: string }
  suite: { id: string; name: string }
  status: string
  tags: Array<{ id: string; name: string; color: string }>
  assignees: Array<{ id: string; name?: string; email: string }>
  lastExecution?: { status: { value: string; label: string; color: string }; executedAt: string }
  _count: { executions: number }
}

const priorityColors: Record<string, string> = {
  critical: "border-red-500 text-red-500",
  high: "border-orange-500 text-orange-500",
  medium: "border-yellow-500 text-yellow-500",
  low: "border-blue-500 text-blue-500",
}

const statusColors: Record<string, string> = {
  pass: "bg-green-500/10 text-green-600 border-green-500/20",
  fail: "bg-red-500/10 text-red-600 border-red-500/20",
  blocked: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  not_run: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  skipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
}

export default function TestSuiteDetailPage() {
  const params = useParams()
  const suiteId = params.id as string
  const { selectedProject } = useProject()
  const [suite, setSuite] = useState<any>(null)
  const [cases, setCases] = useState<TestCase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"cases" | "charters">("cases")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedProject || !suiteId) return
    loadSuite()
  }, [selectedProject, suiteId])

  const loadSuite = async () => {
    setIsLoading(true)
    try {
      const suiteData = await api.get<any>(`/suites/${suiteId}`)
      setSuite(suiteData)
      
      const casesData = await api.get<any[]>(`/suites/${suiteId}/cases`)
      setCases(casesData.map((tc: any) => ({
        id: tc.id,
        title: tc.title,
        description: tc.description,
        priority: tc.priority ? { 
          value: tc.priority.value, 
          label: tc.priority.label, 
          color: tc.priority.color 
        } : { value: 'medium', label: 'Medium', color: '#f59e0b' },
        type: tc.type ? { value: tc.type.value, label: tc.type.label } : { value: 'manual', label: 'Manual' },
        suite: { 
          id: suiteId, 
          name: suiteData.name,
        },
        status: 'active',
        tags: (tc.tags || []).map((t: any) => ({ id: t.id, name: t.name, color: t.color })),
        assignees: (tc.assignees || []).map((a: any) => ({ id: a.id, name: a.name, email: a.email })),
        lastExecution: tc.lastExecution,
        _count: { executions: tc._count?.executions || 0 },
      })))
    } catch (err) {
      console.error("Failed to load suite:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCase = async (caseId: string) => {
    try {
      await api.delete(`/cases/${caseId}`)
      setCases(cases.filter(c => c.id !== caseId))
    } catch (err) {
      console.error("Failed to delete case:", err)
      alert(err instanceof Error ? err.message : "Failed to delete test case")
    }
  }

  const handleAssigneesChange = (caseId: string, newAssignees: TestCase["assignees"]) => {
    setCases(cases.map(c => c.id === caseId ? { ...c, assignees: newAssignees } : c))
  }

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Suite</h1>
          <p className="text-muted-foreground mt-1">
            View test suite details
          </p>
        </div>
        <NoProjectSelected description="Please select a project from the header to view test suite details." />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!suite) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/test-suites" className="hover:text-foreground">
            {selectedProject.name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span>Test Suites</span>
        </div>
        <div className="rounded-lg border bg-card p-12 text-center">
          <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Test suite not found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            This test suite may have been deleted or you may not have access.
          </p>
          <Button asChild>
            <Link href="/test-suites">Back to Test Suites</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/test-suites" className="hover:text-foreground">
            {selectedProject.name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span>Test Suites</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{suite.name}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{suite.name}</h1>
        {suite.description && (
          <p className="text-muted-foreground mt-1">{suite.description}</p>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "cases" | "charters")}>
        <TabsList>
          <TabsTrigger value="cases" className="gap-2">
            <TestTubes className="h-4 w-4" />
            Test Cases ({cases.length})
          </TabsTrigger>
          <TabsTrigger value="charters" className="gap-2">
            <Compass className="h-4 w-4" />
            ET Charters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="mt-4">
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Assignees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Executions</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No test cases in this suite. Go to Test Cases page to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  cases.map((caseItem) => (
                    <TableRow key={caseItem.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{caseItem.title}</p>
                          {caseItem.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {caseItem.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={priorityColors[caseItem.priority.value] || "border-gray-500 text-gray-500"}
                        >
                          {caseItem.priority.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{caseItem.type.label}</span>
                      </TableCell>
                      <TableCell>
                        {caseItem.assignees.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <div className="flex -space-x-2">
                              {caseItem.assignees.slice(0, 3).map((assignee) => (
                                <Avatar
                                  key={assignee.id}
                                  className="h-6 w-6 border-2 border-background"
                                >
                                  <AvatarFallback className="text-[10px]">
                                    {(assignee.name || assignee.email).charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            {caseItem.assignees.length > 3 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                +{caseItem.assignees.length - 3}
                              </span>
                            )}
                            <AssigneeDialog
                              suiteId={suiteId}
                              caseId={caseItem.id}
                              assignees={caseItem.assignees}
                              onAssigneesChange={(assignees) => handleAssigneesChange(caseItem.id, assignees)}
                              trigger={
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1">
                                  <User className="h-3 w-3" />
                                </Button>
                              }
                            />
                          </div>
                        ) : (
                          <AssigneeDialog
                            suiteId={suiteId}
                            caseId={caseItem.id}
                            assignees={caseItem.assignees}
                            onAssigneesChange={(assignees) => handleAssigneesChange(caseItem.id, assignees)}
                            trigger={
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground">
                                <User className="h-3 w-3" />
                              </Button>
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {caseItem.lastExecution ? (
                          <Badge
                            variant="outline"
                            className={statusColors[caseItem.lastExecution.status.value] || statusColors.not_run}
                          >
                            {caseItem.lastExecution.status.label}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{caseItem._count.executions}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirm(caseItem.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="charters" className="mt-4">
          <ETCharterList
            suiteId={suiteId}
            suiteName={suite.name}
            cases={cases}
            onRefresh={loadSuite}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}
        title="Delete Test Case"
        description="Are you sure you want to delete this test case? This action cannot be undone."
        onConfirm={() => deleteConfirm && handleDeleteCase(deleteConfirm)}
      />
    </div>
  )
}
