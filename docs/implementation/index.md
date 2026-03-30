# QAuthority — Implementation Plans Index

> **Spec:** `docs/superpowers/specs/2026-03-27-qauthority-governance-design.md`
> **Branch:** `governance-planning`

## Dependency Graph

```
Plan 0: Groups & Permissions + Setup Wizard
  (foundation — execute first, nothing else starts until this is done)
              │
    ┌─────────┼──────────────────────────────┐
    ▼         ▼              ▼               ▼
 Plan 1:   Plan 2:        Plan 4:         Plan 5:
 Navigation KPIs/OKRs/    CI/CD &         Visual
 UI         Metrics       Integrations    Process
 Restructure Dashboard                    Designer
              │                │
              ▼                ▼
           Plan 3:          Plan 6:
           Advanced         AI Code
           Reporting        Generation

Plan 7: QAuthority Rebranding — INDEPENDENT (run in parallel with any plan)
```

## Execution Order

| Plan | File | Depends On | Can Parallel With |
|------|------|------------|-------------------|
| **0** | [plan-0-groups-permissions.md](plan-0-groups-permissions.md) | — | Plan 7 |
| **1** | [plan-1-navigation.md](plan-1-navigation.md) | Plan 0 | Plans 2, 4, 5, 6 |
| **2** | [plan-2-kpis-okrs-dashboard.md](plan-2-kpis-okrs-dashboard.md) | Plan 0 | Plans 1, 4, 5 |
| **3** | [plan-3-reporting.md](plan-3-reporting.md) | Plans 0, 2 | Plan 4 |
| **4** | [plan-4-cicd-integrations.md](plan-4-cicd-integrations.md) | Plan 0 | Plans 1, 2, 5 |
| **5** | [plan-5-process-designer.md](plan-5-process-designer.md) | Plan 0 | Plans 1, 2, 4 |
| **6** | [plan-6-ai-codegen.md](plan-6-ai-codegen.md) | Plan 0 | Plans 1, 4, 5 |
| **7** | [plan-7-rebranding.md](plan-7-rebranding.md) | — | All plans |

## Suggested Parallel Execution After Plan 0

Once Plan 0 is merged, you can run these in parallel with separate agents:

```
Agent A: Plan 1 (Navigation)  +  Plan 2 (KPIs/OKRs)
Agent B: Plan 4 (CI/CD)       +  Plan 5 (Process Designer)
Agent C: Plan 7 (Rebranding)   ← can start now, before Plan 0

After A+B complete:
Agent A: Plan 3 (Reporting)   ← needs Plan 2
Agent B: Plan 6 (AI Codegen)  ← needs Plan 0 only
```

## Tech Stack Reference

- **Backend:** Node.js + TypeScript + Fastify 5 + Prisma 6 + PostgreSQL 16
- **Queue:** BullMQ 5 + Redis 7
- **Auth:** JWT + OAuth2
- **Frontend:** Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui + Zustand 5
- **i18n:** next-intl 4.8
- **Testing:** Vitest 2 (backend), no frontend unit tests required (integration via pages)
- **Docker:** docker-compose (app + db + redis + worker)
