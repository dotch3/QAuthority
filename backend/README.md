# Backend - QAuthority API

Fastify-based REST API for QAuthority, built with TypeScript and Prisma ORM.

## Stack

- **Runtime**: Node.js 22
- **Framework**: Fastify 5
- **ORM**: Prisma 6
- **Database**: PostgreSQL 16
- **Cache/Queue**: Redis 7

## Prerequisites

- Node.js 22+
- PostgreSQL 16+ (local or container)
- Redis 7+ (local or container)

## Setup Environment

Copy the appropriate environment file from the root directory:

```bash
# For local development
cp ../.env.local .env

# For Docker/Podman
cp ../.env.podman .env
```

## Database Setup

Make sure PostgreSQL is running (local or container), then:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev --name init

# Seed initial data (creates admin user)
npx prisma db seed
```

## Run Development Server

```bash
npm install
npm run dev
```

The API will be available at `http://localhost:3001`.

## Docker/Podman Deployment

### First Time Setup

```bash
# Build image
cd ..
podman build -t qauthority-api:latest backend/

# Run container
podman run -d \
  --name qauthority-api \
  --network qauthority-internal \
  -p 3001:3001 \
  --env-file .env.podman \
  qauthority-api:latest
```

### After Code Changes

Rebuild and restart:

```bash
podman rm -f qauthority-api
podman build -t qauthority-api:latest backend/
podman run -d \
  --name qauthority-api \
  --network qauthority-internal \
  -p 3001:3001 \
  --env-file .env.podman \
  qauthority-api:latest
```

The container automatically runs migrations and seed on first boot.

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production server |
| `npm test` | Run test suite |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with initial data |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

### Database Commands

```bash
# Create new migration
npx prisma migrate dev --name <migration-name>

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset --force

# View database in browser
npx prisma studio
```

### Project Structure

```
src/
├── infrastructure/     # External services (DB, cache, mail)
├── interfaces/         # HTTP layer (routes, plugins, middleware)
├── services/           # Business logic
├── utils/             # Utilities and helpers
├── config.ts          # Environment validation
├── app.ts             # Fastify app factory
└── index.ts           # Entry point
```

## API Documentation

When the server is running, access Swagger UI at:

```
http://localhost:3001/docs
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Email/password login |
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout (revoke token) |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password with token |
| PATCH | `/api/v1/auth/change-password` | Change password (authenticated) |
| GET | `/api/v1/profile` | Get current user profile |
| PATCH | `/api/v1/profile` | Update profile |
| GET | `/api/v1/admin/users` | List all users (admin) |
| GET | `/api/v1/health` | Health check |

### Authentication

All protected routes require a Bearer token:

```
Authorization: Bearer <access_token>
```

Tokens expire in 8 hours by default. Use `/auth/refresh` to get new tokens.

## Environment Variables

See `.env.example` for all available options:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `DATABASE_POOL_URL` | No | DATABASE_URL | Pooled connection URL |
| `REDIS_URL` | Yes | - | Redis connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | No | 8h | Access token expiry |
| `JWT_REFRESH_EXPIRES_IN` | No | 30d | Refresh token expiry |
| `ENCRYPTION_KEY` | Yes | - | 64-char hex key for AES-256-GCM |
| `AUTH_MODE` | No | both | Auth mode: local, oauth, both |
| `ALLOW_REGISTRATION` | No | false | Allow self-registration |
| `ADMIN_EMAIL` | Yes | - | Initial admin email |
| `ADMIN_PASSWORD` | Yes | - | Initial admin password |

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

## Docker

### Build Image

```bash
docker build -t qauthority-api:latest backend/
# or
podman build -t qauthority-api:latest backend/
```

### Run Container

```bash
docker run -d \
  --name qauthority-api \
  --network qauthority-network \
  -p 3001:3001 \
  --env-file .env \
  qauthority-api:latest
```

For full-stack deployment, see the [root README](../README.md).
