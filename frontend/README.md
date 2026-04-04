# Frontend — QAuthority UI

Next.js 16 frontend for QAuthority with React 19, Tailwind CSS 4, and shadcn/ui.

## Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui, ReactFlow
- **Icons**: Lucide React
- **i18n**: next-intl (English default, no locale prefix in URLs)
- **Theme**: Dark / Light / System

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- QAuthority backend running on port 3001

### 1. Environment

```bash
# Create .env.local pointing to your local backend:
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1" > .env.local
```

### 2. Install and start

```bash
npm install
npm run dev   # http://localhost:3000
```

Log in at `http://localhost:3000` with:
- **Email:** `admin@qauthority.com`
- **Password:** `Changeme123!`

---

## Docker Setup

The frontend image is built and managed from the root `docker-compose.yml`.

```bash
# Full stack with local DB:
docker compose --profile local-db up

# Full stack with external DB:
docker compose up
```

`NEXT_PUBLIC_API_URL` is set via the root `.env` file and passed through Docker Compose.

To rebuild after code changes:

```bash
docker compose build qauthority-ui
docker compose up
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |

---

## Project Structure

```
src/
├── app/
│   ├── (app)/          # Authenticated pages (layout with sidebar)
│   │   ├── test-plans/
│   │   ├── test-cases/
│   │   ├── bugs/
│   │   ├── governance/
│   │   │   ├── kpis/
│   │   │   └── processes/
│   │   │       └── [id]/   # ReactFlow canvas editor
│   │   └── …
│   ├── login/
│   └── layout.tsx
├── components/
│   ├── ui/                  # shadcn/ui base components
│   ├── process-designer/    # WorkflowCanvas + BlockPalette (ReactFlow)
│   ├── bugs/                # BugTable
│   ├── test-cases/          # TestCaseList
│   └── providers/           # AuthProvider, ProjectContext, ThemeProvider
├── hooks/
├── lib/
│   └── api.ts               # Typed API client (handles JWT refresh)
└── types/                   # TypeScript interfaces
```

---

## Key Notes

- **No locale in URLs** — `localePrefix: 'never'` is configured; all routes are at `/path` not `/en/path`
- **JWT tokens** — stored in `localStorage` (`access_token` + `refresh_token`); the API client auto-refreshes on 401
- **Process Designer** — drag blocks from the left palette onto the canvas, connect nodes by dragging handles, delete with `Delete`/`Backspace`
