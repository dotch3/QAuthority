# QAuthority — Class Diagram

Render this file in VS Code with the "Markdown Preview Mermaid Support" extension, or paste into https://mermaid.live

```mermaid
classDiagram

    %% ── Domain Entities ──────────────────────────────────────────

    class User {
        +UUID id
        +string email
        +UUID roleId
        +string themePreference
        +OAuthAccount[] oauthAccounts
    }

    class Project {
        +UUID id
        +string name
        +string slug
        +UUID createdBy
        +Date archivedAt
    }

    class TestPlan {
        +UUID id
        +UUID projectId
        +string name
        +UUID statusId
        +Date startDate
        +Date endDate
    }

    class TestSuite {
        +UUID id
        +UUID planId
        +UUID parentId
        +string name
        +int orderIndex
        +TestSuite[] children
        +TestCase[] cases
    }

    class TestCase {
        +UUID id
        +UUID suiteId
        +string title
        +TestStep[] steps
        +UUID priorityId
        +UUID typeId
        +string automationScriptRef
    }

    class TestStep {
        +int order
        +string action
        +string expectedResult
    }

    class TestExecution {
        +UUID id
        +UUID caseId
        +UUID planId
        +UUID statusId
        +UUID executedBy
        +Date executedAt
        +int durationMs
        +string notes
        +string ciRunId
    }

    class Bug {
        +UUID id
        +UUID projectId
        +string title
        +UUID statusId
        +UUID priorityId
        +UUID severityId
        +UUID sourceId
        +string externalId
        +string externalUrl
        +Date syncedAt
    }

    class Attachment {
        +UUID id
        +string entityType
        +UUID entityId
        +string storagePath
        +string fileType
        +int fileSizeKb
    }

    class Role {
        +UUID id
        +string name
        +string label
        +bool isSystem
        +Permission[] permissions
    }

    class Permission {
        +UUID id
        +string resource
        +string action
        +string label
    }

    class EnumValue {
        +UUID id
        +UUID enumTypeId
        +string systemKey
        +string value
        +string label
        +string color
        +bool isSystem
    }

    class CustomFieldDef {
        +UUID id
        +string entityType
        +string name
        +UUID fieldTypeId
        +string[] options
        +bool required
    }

    %% ── Application Services ─────────────────────────────────────

    class ProjectService {
        +createProject(dto, actor) Project
        +archiveProject(id, actor) void
        +addMember(projectId, userId, roleId, actor) void
        +removeMember(projectId, userId, actor) void
    }

    class TestExecutionService {
        +runManual(caseId, planId, statusId, notes, actor) TestExecution
        +triggerCI(caseId, integrationId, actor) void
        +bulkUpdateStatus(ids, statusId, actor) void
    }

    class BugService {
        +createInternal(dto, actor) Bug
        +syncFromExternal(integrationId, actor) void
        +updateBug(bugId, changes, actor) Bug
        +closeBug(bugId, actor) Bug
        +linkToExecution(bugId, executionId) void
    }

    class ReportService {
        +getDashboard(projectId) DashboardData
        +getExecutionTrend(planId, range) TrendData
        +getCoverage(planId) CoverageData
        +exportReport(planId, format, actor) void
        +importTestCases(file, suiteId, actor) ImportResult
    }

    class AuthService {
        +oauthCallback(provider, code) TokenResult
        +loginLocal(email, password) TokenResult
        +register(dto) User
        +resetPassword(token, newPassword) void
        +changePassword(userId, current, newPassword) void
    }

    class CustomFieldService {
        +defineField(dto, actor) CustomFieldDef
        +updateField(id, dto, actor) CustomFieldDef
        +deleteField(id, actor) void
        +setValues(entityType, entityId, values, actor) void
        +enrichEntity(entityType, entityId, entity) T
    }

    class EnumService {
        +listTypes() EnumType[]
        +listValues(enumTypeName) EnumValue[]
        +createValue(enumTypeId, dto, actor) EnumValue
        +updateValue(id, dto, actor) EnumValue
        +deleteValue(id, actor) void
    }

    class RoleService {
        +listRoles() Role[]
        +createRole(dto, actor) Role
        +updateRole(id, dto, actor) Role
        +setPermissions(roleId, permissionIds, actor) void
        +deleteRole(id, actor) void
    }

    class AttachmentService {
        +upload(file, entityType, entityId, actor) Attachment
        +delete(attachmentId, actor) void
        +serveFile(attachmentId, actor) ReadableStream
    }

    %% ── Infrastructure Interfaces (Adapters) ─────────────────────

    class IBugTrackerAdapter {
        <<interface>>
        +fetchBug(externalId, token) ExternalBug
        +createBug(data, token) ExternalBug
        +updateBug(externalId, changes, token) ExternalBug
        +closeBug(externalId, token) void
    }

    class JiraAdapter {
        +fetchBug(externalId, token) ExternalBug
        +createBug(data, token) ExternalBug
        +updateBug(externalId, changes, token) ExternalBug
        +closeBug(externalId, token) void
    }

    class GitHubAdapter {
        +fetchBug(externalId, token) ExternalBug
        +createBug(data, token) ExternalBug
        +updateBug(externalId, changes, token) ExternalBug
        +closeBug(externalId, token) void
    }

    class GitLabAdapter {
        +fetchBug(externalId, token) ExternalBug
        +createBug(data, token) ExternalBug
        +updateBug(externalId, changes, token) ExternalBug
        +closeBug(externalId, token) void
    }

    class ICIAdapter {
        <<interface>>
        +triggerJob(config, params) CIJob
        +getJobStatus(jobId, config) CIJobStatus
    }

    class JenkinsAdapter {
        +triggerJob(config, params) CIJob
        +getJobStatus(jobId, config) CIJobStatus
    }

    class GitHubActionsAdapter {
        +triggerJob(config, params) CIJob
        +getJobStatus(jobId, config) CIJobStatus
    }

    %% ── Relationships ────────────────────────────────────────────

    TestSuite "1" --> "0..*" TestSuite : nests
    TestSuite "1" --> "0..*" TestCase : contains
    TestCase "1" --> "0..*" TestStep : has steps
    TestPlan "1" --> "0..*" TestSuite : has
    Project "1" --> "0..*" TestPlan : has
    User "1" --> "1" Role : has
    Role "1" --> "0..*" Permission : grants

    ProjectService ..> Project : manages
    TestExecutionService ..> TestExecution : manages
    BugService ..> Bug : manages
    BugService ..> IBugTrackerAdapter : uses
    ReportService ..> TestExecution : reads
    AuthService ..> User : manages

    JiraAdapter ..|> IBugTrackerAdapter : implements
    GitHubAdapter ..|> IBugTrackerAdapter : implements
    GitLabAdapter ..|> IBugTrackerAdapter : implements
    JenkinsAdapter ..|> ICIAdapter : implements
    GitHubActionsAdapter ..|> ICIAdapter : implements

    AttachmentService ..> Attachment : manages
    CustomFieldService ..> CustomFieldDef : manages
    EnumService ..> EnumValue : manages
    RoleService ..> Role : manages
```
