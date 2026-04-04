#!/bin/sh
# backend/scripts/docker-entrypoint.sh
# Runs migrations and seed on first boot, then starts the server

set -e

# Extract database host from DATABASE_URL if DB_HOST not set
if [ -z "$DB_HOST" ]; then
  # Extract host from DATABASE_URL (format: postgresql://user:pass@host:port/db)
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
  if [ -z "$DB_HOST" ]; then
    DB_HOST="qauthority-postgres"
  fi
fi

echo "Using database host: $DB_HOST"

echo "Waiting for database to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if PGPASSWORD=postgres psql -h "$DB_HOST" -U postgres -d qauthority -c "SELECT 1" > /dev/null 2>&1; then
    echo "Database is ready!"
    break
  fi
  attempt=$((attempt + 1))
  echo "Waiting for database... ($attempt/$max_attempts)"
  sleep 2
done

if [ $attempt -ge $max_attempts ]; then
  echo "Database not available after $max_attempts attempts"
  exit 1
fi

echo "Running database migrations..."
npx prisma migrate deploy

echo "Checking if seed is needed..."
admin_count=$(PGPASSWORD=postgres psql -h "$DB_HOST" -U postgres -d qauthority -t -c "SELECT COUNT(*) FROM users WHERE email = '$ADMIN_EMAIL';" 2>/dev/null | tr -d ' ' | tr -d '\n')

if [ -z "$admin_count" ] || [ "$admin_count" = "0" ]; then
  echo "Running database seed..."
  ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" npx prisma db seed
else
  echo "Database already seeded, skipping..."
fi

echo "Starting QAuthority backend..."
exec node dist/index.js
