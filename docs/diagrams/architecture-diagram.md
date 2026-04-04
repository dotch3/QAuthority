# QAuthority — Architecture Diagram

Render this file in VS Code with the "Markdown Preview Mermaid Support" extension, or paste into https://mermaid.live

## System Architecture (C4 — Container Level)

Shown in full-local mode. For cloud deployments, PostgreSQL and backup containers
are replaced by Supabase/Neon/RDS, and storage can point to Supabase Storage or S3.

```mermaid
graph TB
    subgraph Browser["Browser / Client"]
        UI["Next.js 16.2 Frontend\n:3000\nTypeScript + Tailwind CSS\nnext-themes + next-intl + Lucide"]
    end

    subgraph DockerNetwork["Docker Network (full-local profile)"]
        subgraph Public["public network"]
            BE["Backend: Fastify\n:3001\nTypeScript + Prisma\nJWT + BullMQ + Winston\nSwagger/OpenAPI"]
        end

        subgraph Internal["internal network"]
            WK["Worker: BullMQ\n(same image as backend)\nProcesses async jobs"]
            PG[("PostgreSQL 16\nLocal DB\n(profile: local-db)")]
            RD[("Redis 7\nCache + Job Queue\nor Upstash/Redis Cloud")]
            BK["Backup Container\npg_dump cron\n(profile: local-db)"]
        end
    end

    subgraph External["External Services"]
        JR["Jira API"]
        GH["GitHub API"]
        GL["GitLab API"]
        JK["Jenkins API"]
        GHA["GitHub Actions API"]
        OAUTH["OAuth2 Providers\n(Google / GitHub / Microsoft)"]
        CLOUDDB[("Cloud DB\nSupabase / Neon / RDS\n(replaces local postgres)")]
        CLOUDSTORAGE["Cloud Storage\nSupabase Storage / S3 / R2\n(replaces local uploads)"]
    end

    subgraph Storage["Host Volumes (local mode only)"]
        UP["/data/uploads\nImages & Videos"]
        BP["/data/backups\nDB Dumps"]
        LG["/logs\nWinston logs"]
    end

    UI -->|"REST API calls\nHTTP/JSON"| BE
    BE -->|"Prisma — direct URL\n(migrations)"| PG
    BE -->|"Prisma — pool URL\n(runtime queries)"| PG
    BE -->|"Cache + enqueue jobs"| RD
    BE -->|"IFileStorageAdapter\n(local / supabase / s3)"| UP
    BE -->|"Write logs"| LG
    WK -->|"Consume jobs"| RD
    WK -->|"DB operations"| PG
    WK -->|"Bug sync"| JR
    WK -->|"Bug sync"| GH
    WK -->|"Bug sync"| GL
    WK -->|"Trigger CI"| JK
    WK -->|"Trigger CI"| GHA
    BE -->|"OAuth2 callbacks"| OAUTH
    BK -->|"Daily dump"| BP
    BK -->|"Read DB"| PG

    BE -.->|"cloud mode"| CLOUDDB
    BE -.->|"cloud mode"| CLOUDSTORAGE
```

## Clean Architecture Layer Diagram

```mermaid
graph TD
    subgraph Interfaces["interfaces/ — HTTP Layer"]
        CTRL["Fastify Controllers\nRoute schemas\nRequest validation"]
    end

    subgraph Application["application/ — Use Cases"]
        SVC["Services\nProjectService\nTestExecutionService\nBugService\nReportService\nAuthService\nCustomFieldService\nEnumService\nRoleService\nAttachmentService"]
    end

    subgraph Domain["domain/ — Business Rules"]
        ENT["Entities\nProject, TestPlan, TestSuite\nTestCase, TestExecution\nBug, User, Attachment\nCustomFieldDef, EnumValue, Role"]
        IFACE["Interfaces\nIProjectRepository\nIBugTrackerAdapter\nICIAdapter\nIAttachmentStorage"]
    end

    subgraph Infrastructure["infrastructure/ — External Concerns"]
        REPO["Prisma Repositories\nImplement domain interfaces"]
        ADAPT["Integration Adapters\nJiraAdapter\nGitHubAdapter\nGitLabAdapter\nJenkinsAdapter\nGitHubActionsAdapter"]
        QUEUE["BullMQ Worker\nSyncBugsJob\nTriggerCIJob\nGenerateReportJob"]
        STORE["File Storage Service\nLocalStorageAdapter"]
    end

    CTRL --> SVC
    SVC --> ENT
    SVC --> IFACE
    IFACE -.->|"implemented by"| REPO
    IFACE -.->|"implemented by"| ADAPT
    IFACE -.->|"implemented by"| STORE
    SVC --> QUEUE
```

## Worker Queue Job Flow

```mermaid
sequenceDiagram
    participant C as Controller
    participant S as Service
    participant Q as BullMQ Queue
    participant W as Worker
    participant E as External API

    C->>S: triggerCI(caseId, integrationId)
    S->>Q: enqueue({type: "trigger_ci", payload})
    Q-->>C: jobId (immediate response)

    Note over W: Worker processes in background
    W->>E: Jenkins/GitHub Actions API call
    E-->>W: job status
    W->>Q: update job result
    C->>S: GET /reports/jobs/:jobId (polling)
    S->>Q: getJobStatus(jobId)
    Q-->>C: {status: "completed", result}
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant OP as OAuth Provider
    participant DB as Database

    alt OAuth2 Login
        U->>FE: Click "Login with GitHub"
        FE->>BE: GET /auth/github/callback?code=...
        BE->>OP: Exchange code for token
        OP-->>BE: access_token + user info
        BE->>DB: Upsert OAUTH_ACCOUNTS
        BE-->>FE: JWT token
    else Local Login
        U->>FE: Email + Password form
        FE->>BE: POST /auth/login {email, password}
        BE->>DB: Find user, verify bcrypt hash
        BE-->>FE: JWT token
    end

    FE->>FE: Store JWT (localStorage: access_token + refresh_token)
    FE->>BE: API requests with Authorization: Bearer <jwt>
    BE->>BE: PermissionGuard checks ROLE_PERMISSIONS (Redis cached)
```
