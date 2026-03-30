"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Settings,
  Type,
  Hash,
  ToggleLeft,
  Calendar,
  List,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

const fieldTypes = [
  { id: "text", name: "Text", icon: Type, description: "Single line text" },
  { id: "number", name: "Number", icon: Hash, description: "Numeric value" },
  { id: "boolean", name: "Checkbox", icon: ToggleLeft, description: "Yes/No toggle" },
  { id: "date", name: "Date", icon: Calendar, description: "Date picker" },
  { id: "select", name: "Dropdown", icon: List, description: "Select from options" },
]

const customFields = [
  {
    id: 1,
    name: "Test Type",
    type: "select",
    entity: "test_case",
    required: true,
    options: ["Smoke", "Regression", "Integration", "E2E"],
  },
  {
    id: 2,
    name: "Estimated Time (min)",
    type: "number",
    entity: "test_case",
    required: false,
  },
  {
    id: 3,
    name: "Automated",
    type: "boolean",
    entity: "test_case",
    required: false,
  },
  {
    id: 4,
    name: "Target Release",
    type: "date",
    entity: "test_plan",
    required: false,
  },
]

const workflows = [
  {
    id: 1,
    name: "Standard Test Flow",
    description: "Default workflow for test cases",
    steps: ["Draft", "Ready", "In Review", "Approved"],
    entities: ["test_case"],
  },
  {
    id: 2,
    name: "Bug Triage",
    description: "Workflow for bug management",
    steps: ["Open", "Triaged", "In Progress", "Fixed", "Closed"],
    entities: ["bug"],
  },
]

export default function CustomFieldsPage() {
  const t = useTranslations("common")
  const [activeTab, setActiveTab] = useState<"fields" | "workflows">("fields")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedFieldType, setSelectedFieldType] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Custom Fields & Workflows</h1>
        <p className="text-muted-foreground mt-1">
          Configure custom fields and workflow automation
        </p>
      </div>

      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("fields")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "fields"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Custom Fields
        </button>
        <button
          onClick={() => setActiveTab("workflows")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "workflows"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Workflows
        </button>
      </div>

      {activeTab === "fields" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Custom Fields</h2>
              <p className="text-sm text-muted-foreground">
                Add custom fields to test cases, plans, and bugs
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <h3 className="font-medium">Test Cases</h3>
            </div>
            <div className="p-4">
              {customFields
                .filter((f) => f.entity === "test_case")
                .map((field) => {
                  const FieldIcon = fieldTypes.find((t) => t.id === field.type)?.icon || Type
                  return (
                    <div
                      key={field.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="p-2 rounded-lg bg-muted">
                          <FieldIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{field.name}</span>
                            {field.required && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {fieldTypes.find((t) => t.id === field.type)?.name}
                            {field.options && ` • ${field.options.length} options`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <h3 className="font-medium">Test Plans</h3>
            </div>
            <div className="p-4">
              {customFields
                .filter((f) => f.entity === "test_plan")
                .map((field) => {
                  const FieldIcon = fieldTypes.find((t) => t.id === field.type)?.icon || Type
                  return (
                    <div
                      key={field.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="p-2 rounded-lg bg-muted">
                          <FieldIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{field.name}</span>
                            {field.required && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {fieldTypes.find((t) => t.id === field.type)?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              {customFields.filter((f) => f.entity === "test_plan").length === 0 && (
                <p className="text-center py-4 text-muted-foreground">
                  No custom fields for test plans
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "workflows" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Workflows</h2>
              <p className="text-sm text-muted-foreground">
                Define workflow steps and automation rules
              </p>
            </div>
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              Create Workflow
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="rounded-lg border bg-card p-4"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{workflow.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {workflow.description}
                    </p>
                  </div>
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {workflow.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center">
                      <Badge variant="secondary">{step}</Badge>
                      {idx < workflow.steps.length - 1 && (
                        <div className="w-4 h-px bg-border mx-1" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {workflow.entities.map((entity) => (
                    <Badge key={entity} variant="outline" className="text-xs">
                      {entity}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
            <DialogDescription>
              Create a new custom field for test cases or plans.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Field Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {fieldTypes.map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedFieldType(type.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        selectedFieldType === type.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{type.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-name">Field Name</Label>
              <Input id="field-name" placeholder="e.g., Test Type" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!selectedFieldType}>Create Field</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
