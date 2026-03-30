<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# QAuthority Project Guidelines

## Project Overview

QAuthority is a comprehensive test case management system with:
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, next-intl, Lucide React
- **Backend**: Node.js/TypeScript with Fastify, Prisma ORM, PostgreSQL
- **Auth**: JWT tokens with refresh token support

## Project Structure

```
qauthority/
├── frontend/           # Next.js frontend
│   └── src/
│       ├── app/       # Next.js App Router pages
│       ├── components/ # React components
│       ├── contexts/   # React contexts
│       ├── hooks/     # Custom hooks
│       ├── lib/       # Utilities
│       └── types/     # TypeScript types
├── backend/           # Fastify backend
│   └── src/
│       ├── interfaces/http/routes/  # API routes
│       ├── services/   # Business logic
│       └── infrastructure/  # Database, auth
└── TODO.md           # Project TODO list
```

## Database Seed IDs

When creating entities, use these seed enum IDs:

**Test Plan Status:**
- `seed-test_plan_status-draft`
- `seed-test_plan_status-active`
- `seed-test_plan_status-completed`
- `seed-test_plan_status-archived`

**Test Priority:**
- `seed-test_priority-low`
- `seed-test_priority-medium`
- `seed-test_priority-high`
- `seed-test_priority-critical`

**Test Type:**
- `seed-test_type-manual`
- `seed-test_type-automated`
- `seed-test_type-exploratory`
- `seed-test_type-regression`

**Bug Status:**
- `seed-bug_status-open`
- `seed-bug_status-in_progress`
- `seed-bug_status-resolved`
- `seed-bug_status-closed`
- `seed-bug_status-reopened`

**Bug Priority:**
- `seed-bug_priority-low`
- `seed-bug_priority-medium`
- `seed-bug_priority-high`
- `seed-bug_priority-critical`

**Bug Severity:**
- `seed-bug_severity-trivial`
- `seed-bug_severity-minor`
- `seed-bug_severity-major`
- `seed-bug_severity-critical`
- `seed-bug_severity-blocker`

**Bug Source:**
- `seed-bug_source-internal`
- `seed-bug_source-jira`
- `seed-bug_source-github`
- `seed-bug_source-gitlab`
- `seed-bug_source-linear`

## Hierarchy

Project → Test Plan → Test Suite → Test Case → Execution

## NPM Scripts

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

**Backend:**
- `npm run dev` - Start development server
- `npm run test` - Run tests
- `npm run db:seed` - Seed database

## Common API Endpoints

- `GET /projects` - List user's projects
- `GET /projects/:id/test-plans` - List test plans
- `POST /projects/:id/test-plans` - Create test plan
- `DELETE /test-plans/:id` - Delete test plan
- `GET /test-plans/:id/suites` - Get suite tree
- `POST /test-plans/:id/suites` - Create suite
- `DELETE /suites/:id` - Delete suite
- `GET /suites/:id/cases` - List test cases
- `POST /suites/:id/cases` - Create test case
- `PATCH /test-cases/:id` - Update test case
- `DELETE /test-cases/:id` - Delete test case
- `GET /projects/:id/bugs` - List bugs
- `POST /projects/:id/bugs` - Create bug
- `GET /projects/:id/bugs/stats` - Bug statistics

## Important Notes

1. **No mock data** - All pages must use real API endpoints
2. **Token refresh** - The API client handles 401 errors by attempting token refresh
3. **Enum values** - Always use proper seed IDs when creating entities
4. **i18n** - Use next-intl for translations with `useTranslations()` hook
