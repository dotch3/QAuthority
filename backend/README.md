# Backend — QAuthority API

Fastify-based REST API for QAuthority, built with TypeScript and Prisma ORM.

## Stack

- **Runtime**: Node.js 20+
- **Framework**: Fastify 5
- **ORM**: Prisma 6
- **Database**: PostgreSQL 16 (DB name: `qauthority`)
- **Cache/Queue**: Redis 7 + BullMQ 5

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ running locally
- Redis 7+ running locally

### 1. Environment

```bash
# From the repo root, copy the example env:
cp .env.example .env

# Then copy it into backend/ as well:
cp .env backend/.env
```

Edit `.env` — key variables:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/qauthority
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-to-a-strong-secret-min-32-chars
ENCRYPTION_KEY=<64-char hex string>
ADMIN_EMAIL=admin@qauthority.com
ADMIN_PASSWORD=Changeme123!
```

### 2. Install and start

```bash
cd backend
npm install
npx prisma migrate deploy   # apply all migrations
npx prisma db seed          # seed admin, groups, demo project
npm run dev                 # http://localhost:3001
```

---

## Docker Setup

The backend image is built and managed from the root `docker-compose.yml`.

```bash
# Full stack with local PostgreSQL + Redis:
docker compose --profile local-db up

# Full stack with an external DB (set DATABASE_URL in .env first):
docker compose up
```

The container entrypoint automatically:
1. Waits for PostgreSQL to be ready
2. Runs `prisma migrate deploy`
3. Seeds the database if the admin user does not exist yet
4. Starts the server

To rebuild after code changes:

```bash
docker compose build qauthority-api
docker compose --profile local-db up
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production server |
| `npm test` | Run test suite (Vitest) |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Create + apply a new migration |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |

### Useful Prisma commands

```bash
# Create a new migration
npx prisma migrate dev --name <migration-name>

# Apply migrations (production / Docker)
npx prisma migrate deploy

# Reset database — development only, destroys all data
npx prisma migrate reset --force

# Inspect DB in the browser
npx prisma studio
```

---

## Project Structure

```
src/
├── infrastructure/     # DB, cache, mail, storage
├── interfaces/         # HTTP routes, middleware, plugins
├── services/           # Business logic
├── utils/              # Errors, helpers
├── config.ts           # Environment validation
├── app.ts              # Fastify app factory
└── index.ts            # Entry point
prisma/
├── schema.prisma       # Data model
├── seed.ts             # Main seed entry point
└── seed/               # Seed modules (groups, salesPlatform, …)
```

---

## API

Swagger UI (when running locally): `http://localhost:3001/docs`

### Auth endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Email/password login |
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password |
| PATCH | `/api/v1/auth/change-password` | Change password (auth required) |

All protected routes require:
```
Authorization: Bearer <access_token>
```

---

## Testing

```bash
npm test              # run all tests
npm run test:watch    # watch mode
```

Tests use Vitest with the real database (no mocks). Make sure `DATABASE_URL` points to a test-safe database before running.
