# Migration Strategy Guide

## Overview
There are three types of migrations in this PostgreSQL backend setup:

### 1. **Schema Migration** (Database Structure)
- **What**: Creates tables, indexes, and database structure
- **When**: First deployment and any schema changes
- **Where**: `scripts/setup-database-schema.js`

### 2. **Data Migration** (Content Transfer)
- **What**: Moves existing data from localStorage to PostgreSQL
- **When**: Only when migrating from existing localStorage data
- **Where**: `scripts/migrate-localStorage-to-postgresql.js`

### 3. **Runtime Migration** (App Startup)
- **What**: Ensures database is ready when app starts
- **When**: Every app startup (safe to run multiple times)
- **Where**: `server.js` -> `runDatabaseMigration()`

## Local Testing Workflow

### Step 1: Set up local PostgreSQL
```bash
# Option A: Install PostgreSQL locally
brew install postgresql
brew services start postgresql
createdb human_eval_test

# Option B: Use Docker
docker run --name postgres-test -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
docker exec -it postgres-test createdb -U postgres human_eval_test
```

### Step 2: Configure environment
```bash
cp .env.local.example .env.local
# Edit .env.local with your local PostgreSQL settings
```

### Step 3: Test the setup
```bash
npm run db:test-local
```

### Step 4: Run development server
```bash
npm run dev
# App will automatically run migrations on startup
```

## Production Deployment Workflow

### What happens during `./scripts/deploy-backend-postgresql.sh`:

1. **Infrastructure Setup** (Lines 78-150)
   - Creates PostgreSQL Flexible Server in Azure
   - Creates App Service
   - Configures environment variables

2. **Application Build** (Lines 151-170)
   - Installs dependencies
   - Builds Next.js app
   - Creates deployment package

3. **Deployment** (Lines 171-180)
   - Uploads app to Azure App Service

4. **Schema Migration** (Lines 181-202)
   - Runs database schema setup
   - **Primary**: SSH into Azure App Service and run migration
   - **Fallback**: Run migration locally connecting to Azure database

5. **Runtime Migration** (server.js)
   - **Every app startup**: Automatically ensures schema is up-to-date
   - Safe to run multiple times (uses IF NOT EXISTS)

## Migration Safety Features

### Schema Migration (`setup-database-schema.js`)
- Uses `CREATE TABLE IF NOT EXISTS` - safe to run multiple times
- Uses `CREATE INDEX IF NOT EXISTS` - won't create duplicates
- Uses `CREATE OR REPLACE VIEW` - updates views safely

### Runtime Migration (server.js)
- Runs on every app startup
- Non-blocking - app continues if migration fails
- Logs success/failure for debugging

### Data Migration (`migrate-localStorage-to-postgresql.js`)
- Uses `ON CONFLICT DO NOTHING` - won't duplicate data
- Can be run multiple times safely

## When to Use Each Script

### `npm run db:setup`
- Setting up new database
- Deploying schema changes
- Initial database setup

### `npm run db:test-local`
- Testing PostgreSQL setup locally
- Validating migrations before deployment
- Development environment setup

### `./scripts/deploy-backend-postgresql.sh`
- Full production deployment
- Creates infrastructure + deploys app
- Runs complete migration process

### `scripts/migrate-localStorage-to-postgresql.js`
- One-time data migration from localStorage
- Moving existing production data
- Backup and restore scenarios
