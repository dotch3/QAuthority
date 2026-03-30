# Database Migrations

## Overview

This document describes how to manage database migrations for QAuthority.

## Commands

### Apply All Migrations
```bash
cd backend
npm run db:migrate:deploy
```

### Reset Database (Delete All + Fresh Migration + Seed)
```bash
cd backend
npm run db:reset
```
⚠️ **WARNING**: This will DELETE all data and recreate the database from scratch.

### Clean Test Data
Removes all test-related data (projects, plans, suites, cases, executions, bugs) but keeps users, roles, and enums.
```bash
cd backend
npm run db:clean
```
This is useful for resetting test data while keeping the admin user.

### Apply New Migration
```bash
cd backend
npm run db:migrate
```

### Generate Prisma Client
After modifying the schema:
```bash
cd backend
npm run db:generate
```

### Open Prisma Studio
```bash
cd backend
npm run db:studio
```

## Migration Files

| Migration | Description |
|-----------|-------------|
| `init` | Initial schema with users, roles, enums |
| `add_tags_assignees` | Tags, assignees, and new fields |
| `clean_data` | DELETE test data (keeps users/roles/enums) |

## Manual SQL Execution

If you need to run migrations manually:

```bash
# Apply specific migration
psql $DATABASE_URL -f prisma/migrations/TIMESTAMP_migration_name/migration.sql

# Clean all test data
psql $DATABASE_URL -f prisma/migrations/20260325120001_clean_data/migration.sql
```

## Environment Variables

Make sure your `.env` file has:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/qauthority
```

## Troubleshooting

### Migration Failed
```bash
# Check migration status
npx prisma migrate status

# Reset and try again
npm run db:reset
```

### Prisma Client Outdated
```bash
npm run db:generate
```
