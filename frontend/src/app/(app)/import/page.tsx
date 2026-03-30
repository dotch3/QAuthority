"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  Download,
  FileJson,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
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

const importFormats = [
  {
    id: "csv",
    name: "CSV",
    description: "Comma-separated values format",
    icon: FileSpreadsheet,
    color: "text-green-600",
  },
  {
    id: "json",
    name: "JSON",
    description: "JavaScript Object Notation",
    icon: FileJson,
    color: "text-yellow-600",
  },
  {
    id: "testrail",
    name: "TestRail",
    description: "Import from TestRail XML export",
    icon: FileText,
    color: "text-blue-600",
  },
  {
    id: "cypress",
    name: "Cypress",
    description: "Import from Cypress test results",
    icon: FileText,
    color: "text-gray-600",
  },
]

const recentImports = [
  {
    id: 1,
    name: "API_Test_Cases_v2.csv",
    format: "CSV",
    status: "completed",
    date: "2 hours ago",
    count: 45,
  },
  {
    id: 2,
    name: "testrail_export.xml",
    format: "TestRail",
    status: "failed",
    date: "1 day ago",
    error: "Invalid XML structure",
  },
  {
    id: 3,
    name: "ui_tests.json",
    format: "JSON",
    status: "completed",
    date: "3 days ago",
    count: 28,
  },
]

export default function ImportPage() {
  const t = useTranslations("common")
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const handleImport = () => {
    if (!file || !selectedFormat) return
    alert(`Importing ${file.name} as ${selectedFormat}`)
    setIsImportDialogOpen(false)
    setFile(null)
    setSelectedFormat(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import / Export</h1>
        <p className="text-muted-foreground mt-1">
          Import test cases from various formats or export your data
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Import Test Cases</h2>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a format and upload your file to import test cases.
            </p>
            <div className="grid gap-3">
              {importFormats.map((format) => {
                const Icon = format.icon
                return (
                  <button
                    key={format.id}
                    onClick={() => {
                      setSelectedFormat(format.id)
                      setIsImportDialogOpen(true)
                    }}
                    className="flex items-center gap-4 p-4 rounded-lg border text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg bg-muted`}>
                      <Icon className={`h-6 w-6 ${format.color}`} />
                    </div>
                    <div>
                      <h3 className="font-medium">{format.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Export Data</h2>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Export your test cases, suites, and results in various formats.
            </p>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" disabled>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as CSV
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <FileJson className="mr-2 h-4 w-4" />
                Export as JSON
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <FileText className="mr-2 h-4 w-4" />
                Export TestRail Format
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold">Recent Imports</h2>
        </div>
        <div className="p-4">
          {recentImports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No imports yet
            </div>
          ) : (
            <div className="space-y-2">
              {recentImports.map((import_) => (
                <div
                  key={import_.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{import_.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {import_.date} • {import_.count ? `${import_.count} cases` : import_.error}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      import_.status === "completed" ? "secondary" : "destructive"
                    }
                    className="gap-1"
                  >
                    {import_.status === "completed" ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Completed
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        Failed
                      </>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium">Import Guidelines</h3>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>CSV files should have headers: title, description, priority, status</li>
              <li>JSON files should follow the QAuthority schema format</li>
              <li>TestRail imports require XML format exported from TestRail</li>
              <li>Maximum file size: 10MB</li>
            </ul>
          </div>
        </div>
      </div>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from {selectedFormat?.toUpperCase()}</DialogTitle>
            <DialogDescription>
              Upload your {selectedFormat} file to import test cases.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                accept={
                  selectedFormat === "csv"
                    ? ".csv"
                    : selectedFormat === "json"
                      ? ".json"
                      : selectedFormat === "testrail"
                        ? ".xml"
                        : ".json"
                }
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            {file && (
              <div className="p-3 rounded-lg border bg-muted">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!file}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
