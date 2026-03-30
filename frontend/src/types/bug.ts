export interface Bug {
  id: string
  projectId: string
  title: string
  description?: string
  actualResult?: string
  expectedResult?: string
  statusId: string
  status: {
    id: string
    value: string
    label: string
    color: string
  }
  priorityId: string
  priority: {
    id: string
    value: string
    label: string
    color: string
  }
  severityId: string
  severity: {
    id: string
    value: string
    label: string
    color: string
  }
  sourceId: string
  source: {
    id: string
    value: string
    label: string
  }
  externalId?: string
  externalUrl?: string
  reportedById: string
  reportedBy: {
    id: string
    name?: string
    email: string
  }
  assignedToId?: string
  assignedTo?: {
    id: string
    name?: string
    email: string
  }
  createdAt: string
  updatedAt: string
  syncedAt?: string
  executions?: {
    id: string
    testCase: {
      title: string
    }
    status: {
      label: string
      color: string
    }
  }[]
  _count?: {
    executions: number
  }
}

export interface BugStats {
  total: number
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  bySeverity: Record<string, number>
}

export interface CreateBugInput {
  title: string
  description?: string
  statusId: string
  priorityId: string
  severityId: string
  sourceId: string
  assignedToId?: string
  externalId?: string
  externalUrl?: string
  actualResult?: string
  expectedResult?: string
}

export interface UpdateBugInput {
  title?: string
  description?: string
  statusId?: string
  priorityId?: string
  severityId?: string
  sourceId?: string
  assignedToId?: string | null
}
