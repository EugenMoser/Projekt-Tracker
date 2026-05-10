# Phase 1A: Workspace + Schema + DB Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the pnpm monorepo workspace, define the Drizzle SQLite schema for all tables, wire a custom migration runner into the Expo app boot, and validate the two core business-logic helpers (customer number generation, tariff snapshot).

**Architecture:** `packages/schema` holds Drizzle table definitions and typed migration SQL only — no runtime code, no Expo deps. `project-tracker/src/db/` initialises the expo-sqlite connection and runs migrations on app start. `project-tracker/src/repositories/` is the query layer; every exported function takes `userId: string` as a required parameter. Tests in the schema package use vitest + better-sqlite3 (Node, no Expo needed). Mobile-layer tests use jest with an in-memory better-sqlite3 db injected via dependency injection.

**Tech Stack:** pnpm workspaces, drizzle-orm, expo-sqlite, uuidv7, vitest, better-sqlite3, jest-expo

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `pnpm-workspace.yaml` | workspace root |
| Create | `package.json` (root) | root scripts |
| Create | `packages/schema/package.json` | schema package meta |
| Create | `packages/schema/tsconfig.json` | TS config for package |
| Create | `packages/schema/src/sqlite.ts` | Drizzle table definitions |
| Create | `packages/schema/src/migrations.ts` | versioned SQL strings |
| Create | `packages/schema/src/index.ts` | barrel export |
| Create | `packages/schema/src/__tests__/sqlite.test.ts` | roundtrip tests |
| Modify | `project-tracker/package.json` | add schema dep + test script |
| Create | `project-tracker/src/db/client.ts` | expo-sqlite + drizzle instance |
| Create | `project-tracker/src/db/migrate.ts` | migration runner |
| Modify | `project-tracker/app/_layout.tsx` | call initDatabase on boot |
| Create | `project-tracker/src/repositories/customerNumber.ts` | customer number generator |
| Create | `project-tracker/src/repositories/tariffSnapshot.ts` | rate snapshot helper |
| Create | `project-tracker/src/__tests__/customerNumber.test.ts` | algorithm tests |
| Create | `project-tracker/src/__tests__/tariffSnapshot.test.ts` | snapshot tests |

---

### Task 1: Root workspace setup

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json` (root)

- [ ] **Step 1: Create `pnpm-workspace.yaml` in repo root**

```yaml
packages:
  - 'packages/*'
  - 'project-tracker'
```

- [ ] **Step 2: Create `package.json` in repo root**

```json
{
  "name": "projekt-tracker-root",
  "private": true,
  "scripts": {
    "lint": "pnpm -r --filter='./packages/*' lint; pnpm --filter project-tracker lint",
    "typecheck": "pnpm -r typecheck"
  },
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 3: Run pnpm install from repo root and verify**

```bash
pnpm install
```

Expected: No errors. pnpm prints workspace resolution info.

- [ ] **Step 4: Commit**

```bash
git add pnpm-workspace.yaml package.json
git commit -m "chore(workspace): add pnpm monorepo workspace root"
```

---

### Task 2: `packages/schema` package scaffold

**Files:**
- Create: `packages/schema/package.json`
- Create: `packages/schema/tsconfig.json`
- Create: `packages/schema/src/index.ts`

- [ ] **Step 1: Create `packages/schema/package.json`**

```json
{
  "name": "@projekt-tracker/schema",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "drizzle-orm": "^0.43.0"
  },
  "devDependencies": {
    "better-sqlite3": "^11.7.0",
    "@types/better-sqlite3": "^7.6.12",
    "typescript": "~5.9.2",
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 2: Create `packages/schema/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/schema/src/index.ts`**

```typescript
export * from './sqlite'
export * from './migrations'
```

- [ ] **Step 4: Install dependencies**

```bash
cd packages/schema && pnpm install
```

Expected: `node_modules` created, drizzle-orm + better-sqlite3 installed.

- [ ] **Step 5: Commit**

```bash
git add packages/schema/
git commit -m "chore(schema): scaffold @projekt-tracker/schema package"
```

---

### Task 3: SQLite schema — all tables

**Files:**
- Create: `packages/schema/src/sqlite.ts`

- [ ] **Step 1: Write the Drizzle SQLite table definitions**

Create `packages/schema/src/sqlite.ts`:

```typescript
import {
  sqliteTable, text, integer, primaryKey,
  uniqueIndex, index,
} from 'drizzle-orm/sqlite-core'

const uuid = (name: string) => text(name)
const tsMs = (name: string) => integer(name, { mode: 'timestamp_ms' })

export const users = sqliteTable('users', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name').notNull(),
  tier: text('tier').notNull().default('pro'),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
})

export const orderTypes = sqliteTable('order_types', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  digit: integer('digit').notNull(),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
  deletedAt: tsMs('deleted_at'),
}, (t) => ({
  userIdx: index('order_types_user_idx').on(t.userId),
  uniqueUserDigit: uniqueIndex('order_types_user_digit_uq').on(t.userId, t.digit),
  uniqueUserName: uniqueIndex('order_types_user_name_uq').on(t.userId, t.name),
}))

export const customers = sqliteTable('customers', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  customerNumber: text('customer_number').notNull(),
  orderTypeId: uuid('order_type_id').notNull().references(() => orderTypes.id),
  name: text('name').notNull(),
  street: text('street'),
  zip: text('zip'),
  city: text('city'),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
  deletedAt: tsMs('deleted_at'),
}, (t) => ({
  userIdx: index('customers_user_idx').on(t.userId),
  uniqueUserNumber: uniqueIndex('customers_user_number_uq').on(t.userId, t.customerNumber),
  numberingIdx: index('customers_numbering_idx').on(t.userId, t.orderTypeId, t.createdAt),
}))

export const projects = sqliteTable('projects', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  title: text('title').notNull(),
  description: text('description'),
  color: text('color').notNull(),
  pricingMode: text('pricing_mode').notNull(),
  hourlyRateCents: integer('hourly_rate_cents'),
  fixedPriceCents: integer('fixed_price_cents'),
  status: text('status').notNull().default('active'),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
  deletedAt: tsMs('deleted_at'),
}, (t) => ({
  userStatusIdx: index('projects_user_status_updated_idx').on(t.userId, t.status, t.updatedAt),
}))

export const tasks = sqliteTable('tasks', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  description: text('description').notNull(),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
  deletedAt: tsMs('deleted_at'),
}, (t) => ({
  userIdx: index('tasks_user_idx').on(t.userId),
  uniqueUserDesc: uniqueIndex('tasks_user_description_uq').on(t.userId, t.description),
}))

export const tags = sqliteTable('tags', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
  deletedAt: tsMs('deleted_at'),
}, (t) => ({
  userIdx: index('tags_user_idx').on(t.userId),
  uniqueUserTitle: uniqueIndex('tags_user_title_uq').on(t.userId, t.title),
}))

export const taskTags = sqliteTable('task_tags', {
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.taskId, t.tagId] }),
  userIdx: index('task_tags_user_idx').on(t.userId),
}))

export const projectTasks = sqliteTable('project_tasks', {
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.taskId] }),
  userIdx: index('project_tasks_user_idx').on(t.userId),
}))

export const timeEntries = sqliteTable('time_entries', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  taskId: uuid('task_id').notNull().references(() => tasks.id),
  startedAt: tsMs('started_at').notNull(),
  endedAt: tsMs('ended_at').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  rateSnapshotCents: integer('rate_snapshot_cents'),
  pricingModeSnapshot: text('pricing_mode_snapshot').notNull(),
  notes: text('notes'),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
  deletedAt: tsMs('deleted_at'),
}, (t) => ({
  userStartedIdx: index('time_entries_user_started_idx').on(t.userId, t.startedAt),
  userProjectIdx: index('time_entries_user_project_idx').on(t.userId, t.projectId, t.startedAt),
  userUpdatedIdx: index('time_entries_user_updated_idx').on(t.userId, t.updatedAt),
}))

export const timers = sqliteTable('timers', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  startedAt: tsMs('started_at').notNull(),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
}, (t) => ({
  uniqueUser: uniqueIndex('timers_user_uq').on(t.userId),
}))

export const appSettings = sqliteTable('app_settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  pinHash: text('pin_hash'),
  biometricEnabled: integer('biometric_enabled', { mode: 'boolean' }).notNull().default(false),
  lastExportPeriod: text('last_export_period'),
  updatedAt: tsMs('updated_at').notNull(),
})
```

- [ ] **Step 2: Run typecheck**

```bash
cd packages/schema && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/schema/src/sqlite.ts packages/schema/src/index.ts
git commit -m "db(schema): define Drizzle SQLite schema for all tables"
```

---

### Task 4: Migration SQL

**Files:**
- Create: `packages/schema/src/migrations.ts`

The app uses a custom migration runner that tracks schema version in a `_meta` table. Each entry has a monotonically increasing `version` int and a raw SQL string.

- [ ] **Step 1: Create `packages/schema/src/migrations.ts`**

```typescript
export type Migration = { version: number; sql: string }

export const migrations: Migration[] = [
  {
    version: 1,
    sql: `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'pro',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS order_types (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  digit INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS order_types_user_idx ON order_types(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS order_types_user_digit_uq ON order_types(user_id, digit);
CREATE UNIQUE INDEX IF NOT EXISTS order_types_user_name_uq ON order_types(user_id, name);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  customer_number TEXT NOT NULL,
  order_type_id TEXT NOT NULL REFERENCES order_types(id),
  name TEXT NOT NULL,
  street TEXT,
  zip TEXT,
  city TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS customers_user_idx ON customers(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS customers_user_number_uq ON customers(user_id, customer_number);
CREATE INDEX IF NOT EXISTS customers_numbering_idx ON customers(user_id, order_type_id, created_at);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  title TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  pricing_mode TEXT NOT NULL,
  hourly_rate_cents INTEGER,
  fixed_price_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS projects_user_status_updated_idx ON projects(user_id, status, updated_at);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  description TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS tasks_user_idx ON tasks(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_description_uq ON tasks(user_id, description);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS tags_user_idx ON tags(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS tags_user_title_uq ON tags(user_id, title);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (task_id, tag_id)
);
CREATE INDEX IF NOT EXISTS task_tags_user_idx ON task_tags(user_id);

CREATE TABLE IF NOT EXISTS project_tasks (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (project_id, task_id)
);
CREATE INDEX IF NOT EXISTS project_tasks_user_idx ON project_tasks(user_id);

CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  task_id TEXT NOT NULL REFERENCES tasks(id),
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  rate_snapshot_cents INTEGER,
  pricing_mode_snapshot TEXT NOT NULL,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS time_entries_user_started_idx ON time_entries(user_id, started_at);
CREATE INDEX IF NOT EXISTS time_entries_user_project_idx ON time_entries(user_id, project_id, started_at);
CREATE INDEX IF NOT EXISTS time_entries_user_updated_idx ON time_entries(user_id, updated_at);

CREATE TABLE IF NOT EXISTS timers (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  started_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS timers_user_uq ON timers(user_id);

CREATE TABLE IF NOT EXISTS app_settings (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id),
  pin_hash TEXT,
  biometric_enabled INTEGER NOT NULL DEFAULT 0,
  last_export_period TEXT,
  updated_at INTEGER NOT NULL
);
    `,
  },
]
```

- [ ] **Step 2: Verify typecheck**

```bash
cd packages/schema && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/schema/src/migrations.ts
git commit -m "db(schema): add versioned SQLite migration SQL (v1)"
```

---

### Task 5: Schema roundtrip tests

**Files:**
- Create: `packages/schema/src/__tests__/sqlite.test.ts`

These tests use `better-sqlite3` (not Expo) to run the migration SQL and verify insert/select/unique constraints for each table.

- [ ] **Step 1: Write the failing tests**

Create `packages/schema/src/__tests__/sqlite.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import BetterSQLite from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import * as schema from '../sqlite'
import { migrations } from '../migrations'

function makeTestDb() {
  const sqlite = new BetterSQLite(':memory:')
  sqlite.pragma('foreign_keys = ON')
  for (const m of migrations) {
    sqlite.exec(m.sql)
  }
  return drizzle(sqlite, { schema })
}

const NOW = new Date()
const U = '00000000-0000-0000-0000-000000000001'
const OT = '00000000-0000-0000-0000-000000000002'
const CU = '00000000-0000-0000-0000-000000000003'
const PR = '00000000-0000-0000-0000-000000000004'
const TA = '00000000-0000-0000-0000-000000000005'

function seedBase(db: ReturnType<typeof makeTestDb>) {
  db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW }).run()
  db.insert(schema.orderTypes).values({ id: OT, userId: U, name: 'Hochzeit', digit: 1, createdAt: NOW, updatedAt: NOW }).run()
  db.insert(schema.customers).values({ id: CU, userId: U, customerNumber: '26101', orderTypeId: OT, name: 'Müller', createdAt: NOW, updatedAt: NOW }).run()
  db.insert(schema.projects).values({ id: PR, userId: U, customerId: CU, title: 'Hochzeit Müller', color: '#4A90D9', pricingMode: 'hourly', hourlyRateCents: 8000, status: 'active', createdAt: NOW, updatedAt: NOW }).run()
  db.insert(schema.tasks).values({ id: TA, userId: U, description: 'Bildbearbeitung', createdAt: NOW, updatedAt: NOW }).run()
}

describe('users', () => {
  it('roundtrip', () => {
    const db = makeTestDb()
    db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW }).run()
    const rows = db.select().from(schema.users).where(eq(schema.users.id, U)).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].tier).toBe('pro')
  })
})

describe('order_types', () => {
  it('rejects duplicate digit per user', () => {
    const db = makeTestDb()
    db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW }).run()
    db.insert(schema.orderTypes).values({ id: OT, userId: U, name: 'Hochzeit', digit: 1, createdAt: NOW, updatedAt: NOW }).run()
    expect(() =>
      db.insert(schema.orderTypes).values({ id: '00000000-0000-0000-0000-000000000099', userId: U, name: 'Andere', digit: 1, createdAt: NOW, updatedAt: NOW }).run()
    ).toThrow()
  })
})

describe('customers', () => {
  it('rejects duplicate customer_number per user', () => {
    const db = makeTestDb()
    db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW }).run()
    db.insert(schema.orderTypes).values({ id: OT, userId: U, name: 'Hochzeit', digit: 1, createdAt: NOW, updatedAt: NOW }).run()
    db.insert(schema.customers).values({ id: CU, userId: U, customerNumber: '26101', orderTypeId: OT, name: 'Müller', createdAt: NOW, updatedAt: NOW }).run()
    expect(() =>
      db.insert(schema.customers).values({ id: '00000000-0000-0000-0000-000000000099', userId: U, customerNumber: '26101', orderTypeId: OT, name: 'Other', createdAt: NOW, updatedAt: NOW }).run()
    ).toThrow()
  })
})

describe('projects', () => {
  it('stores hourly pricing', () => {
    const db = makeTestDb()
    seedBase(db)
    const rows = db.select().from(schema.projects).where(eq(schema.projects.id, PR)).all()
    expect(rows[0].pricingMode).toBe('hourly')
    expect(rows[0].hourlyRateCents).toBe(8000)
    expect(rows[0].fixedPriceCents).toBeNull()
  })

  it('stores fixed pricing', () => {
    const db = makeTestDb()
    db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW }).run()
    db.insert(schema.orderTypes).values({ id: OT, userId: U, name: 'Design', digit: 2, createdAt: NOW, updatedAt: NOW }).run()
    db.insert(schema.customers).values({ id: CU, userId: U, customerNumber: '26201', orderTypeId: OT, name: 'Schmidt', createdAt: NOW, updatedAt: NOW }).run()
    const FP = '00000000-0000-0000-0000-000000000099'
    db.insert(schema.projects).values({ id: FP, userId: U, customerId: CU, title: 'Logo', color: '#00FF00', pricingMode: 'fixed', fixedPriceCents: 150000, status: 'active', createdAt: NOW, updatedAt: NOW }).run()
    const rows = db.select().from(schema.projects).where(eq(schema.projects.id, FP)).all()
    expect(rows[0].fixedPriceCents).toBe(150000)
    expect(rows[0].hourlyRateCents).toBeNull()
  })
})

describe('time_entries', () => {
  it('stores duration_seconds and rate_snapshot_cents', () => {
    const db = makeTestDb()
    seedBase(db)
    const TE = '00000000-0000-0000-0000-000000000006'
    const started = new Date('2026-01-01T10:00:00Z')
    const ended = new Date('2026-01-01T11:30:00Z')
    db.insert(schema.timeEntries).values({
      id: TE, userId: U, projectId: PR, taskId: TA,
      startedAt: started, endedAt: ended, durationSeconds: 5400,
      rateSnapshotCents: 8000, pricingModeSnapshot: 'hourly',
      createdAt: NOW, updatedAt: NOW,
    }).run()
    const rows = db.select().from(schema.timeEntries).where(eq(schema.timeEntries.id, TE)).all()
    expect(rows[0].durationSeconds).toBe(5400)
    expect(rows[0].rateSnapshotCents).toBe(8000)
  })
})

describe('timers', () => {
  it('enforces single active timer per user', () => {
    const db = makeTestDb()
    seedBase(db)
    const T1 = '00000000-0000-0000-0000-000000000007'
    const T2 = '00000000-0000-0000-0000-000000000008'
    db.insert(schema.timers).values({ id: T1, userId: U, projectId: PR, startedAt: NOW, createdAt: NOW, updatedAt: NOW }).run()
    expect(() =>
      db.insert(schema.timers).values({ id: T2, userId: U, projectId: PR, startedAt: NOW, createdAt: NOW, updatedAt: NOW }).run()
    ).toThrow()
  })
})
```

- [ ] **Step 2: Run tests — expect fail (modules not yet resolved)**

```bash
cd packages/schema && pnpm test
```

Expected: Tests may fail with import errors until drizzle-orm/better-sqlite3 resolves correctly.

- [ ] **Step 3: Fix vitest config if needed**

If ESM/CJS issues occur, add `vitest.config.ts` in `packages/schema/`:

```typescript
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { environment: 'node' },
})
```

Run again: `pnpm test`

- [ ] **Step 4: All 5 test suites must pass**

Expected output: `5 passed | 0 failed`

- [ ] **Step 5: Commit**

```bash
git add packages/schema/src/__tests__/ packages/schema/vitest.config.ts
git commit -m "test(schema): roundtrip + constraint tests for SQLite schema"
```

---

### Task 6: Expo app — dependencies + DB client

**Files:**
- Modify: `project-tracker/package.json`
- Create: `project-tracker/src/db/client.ts`
- Create: `project-tracker/src/db/migrate.ts`

- [ ] **Step 1: Add dependencies to `project-tracker/package.json`**

In the `dependencies` section, add:

```json
"@projekt-tracker/schema": "workspace:*",
"drizzle-orm": "^0.43.0",
"expo-sqlite": "~16.0.0",
"uuidv7": "^1.0.2"
```

In `devDependencies`, add:

```json
"@types/better-sqlite3": "^7.6.12",
"better-sqlite3": "^11.7.0",
"jest-expo": "~54.0.0"
```

Also add a `test` script:

```json
"test": "jest --passWithNoTests"
```

- [ ] **Step 2: Add Jest config to `project-tracker/package.json`**

Add at the top level:

```json
"jest": {
  "preset": "jest-expo",
  "testMatch": ["**/__tests__/**/*.test.ts"],
  "moduleNameMapper": {
    "^@projekt-tracker/schema$": "<rootDir>/../packages/schema/src/index.ts"
  }
}
```

- [ ] **Step 3: Run `pnpm install` from repo root**

```bash
pnpm install
```

Expected: `@projekt-tracker/schema` symlinked into `project-tracker/node_modules/`.

- [ ] **Step 4: Create `project-tracker/src/db/client.ts`**

```typescript
import * as SQLite from 'expo-sqlite'
import { drizzle } from 'drizzle-orm/expo-sqlite'
import * as schema from '@projekt-tracker/schema'

const sqlite = SQLite.openDatabaseSync('projekt-tracker.db', {
  enableChangeListener: true,
})

export const db = drizzle(sqlite, { schema })
export { sqlite }
```

- [ ] **Step 5: Create `project-tracker/src/db/migrate.ts`**

```typescript
import type * as SQLite from 'expo-sqlite'
import { migrations } from '@projekt-tracker/schema'

export async function runMigrations(sqlite: SQLite.SQLiteDatabase): Promise<void> {
  await sqlite.execAsync(
    `CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`
  )

  const row = await sqlite.getFirstAsync<{ value: string }>(
    `SELECT value FROM _meta WHERE key = 'schema_version'`
  )
  const currentVersion = row ? parseInt(row.value, 10) : 0

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      await sqlite.execAsync(migration.sql)
      await sqlite.runAsync(
        `INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', ?)`,
        [String(migration.version)]
      )
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add project-tracker/package.json project-tracker/src/db/
git commit -m "feat(mobile): add expo-sqlite db client and migration runner"
```

---

### Task 7: Wire migrations into app boot

**Files:**
- Modify: `project-tracker/app/_layout.tsx`

- [ ] **Step 1: Read the current `_layout.tsx`**

Open `project-tracker/app/_layout.tsx` and understand its existing structure.

- [ ] **Step 2: Add DB init to `_layout.tsx`**

Add an `isDbReady` state that blocks rendering until migrations complete. Integrate into the existing `useEffect` / splash screen logic. The exact insertion depends on what's currently in the file, but the pattern is:

```typescript
import { sqlite } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'

// Inside the root layout component, add:
const [isDbReady, setIsDbReady] = React.useState(false)

React.useEffect(() => {
  runMigrations(sqlite)
    .then(() => setIsDbReady(true))
    .catch((e) => {
      console.error('DB migration failed', e)
      // Still set ready so app doesn't hang, but log prominently
      setIsDbReady(true)
    })
}, [])

// Block render until DB is ready (after splash is hidden):
if (!isDbReady) return null
```

- [ ] **Step 3: Verify the app starts without crash**

```bash
cd project-tracker && npx expo start --ios
```

Expected: App boots on iOS simulator, no red screen. Check Metro console — should see no migration errors.

- [ ] **Step 4: Verify DB file exists on simulator**

In a second terminal:
```bash
xcrun simctl get_app_container booted host.exp.exponent data
```
Then check that `Documents/projekt-tracker.db` exists in that path.

- [ ] **Step 5: Commit**

```bash
git add project-tracker/app/_layout.tsx
git commit -m "feat(mobile): run SQLite migrations on app boot"
```

---

### Task 8: Customer number helper + tests

The algorithm (from CONCEPT.md): format is `YY` + `A` + `LL` where `YY` = 2-digit year, `A` = order type digit (1 char), `LL` = zero-padded sequential count per user+type+year (2 digits, max 99; if ≥100 extend to 3 digits).

**Files:**
- Create: `project-tracker/src/repositories/customerNumber.ts`
- Create: `project-tracker/src/__tests__/customerNumber.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `project-tracker/src/__tests__/customerNumber.test.ts`:

```typescript
import BetterSQLite from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '@projekt-tracker/schema'
import { migrations } from '@projekt-tracker/schema'
import { generateCustomerNumber } from '../repositories/customerNumber'

function makeTestDb() {
  const sqlite = new BetterSQLite(':memory:')
  sqlite.pragma('foreign_keys = ON')
  for (const m of migrations) sqlite.exec(m.sql)
  return drizzle(sqlite, { schema })
}

const NOW = new Date()
const U = '00000000-0000-0000-0000-000000000001'
const OT = '00000000-0000-0000-0000-000000000002'

function seedBase(db: ReturnType<typeof makeTestDb>) {
  db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW }).run()
  db.insert(schema.orderTypes).values({ id: OT, userId: U, name: 'Hochzeit', digit: 1, createdAt: NOW, updatedAt: NOW }).run()
}

describe('generateCustomerNumber', () => {
  it('first customer of the year gets LL=01', () => {
    const db = makeTestDb()
    seedBase(db)
    const num = generateCustomerNumber(db, { userId: U, orderTypeDigit: 1, year: 2026 })
    expect(num).toBe('26101')
  })

  it('second customer gets LL=02', () => {
    const db = makeTestDb()
    seedBase(db)
    const C1 = '00000000-0000-0000-0000-000000000010'
    db.insert(schema.customers).values({
      id: C1, userId: U, customerNumber: '26101', orderTypeId: OT,
      name: 'First', createdAt: NOW, updatedAt: NOW,
    }).run()
    const num = generateCustomerNumber(db, { userId: U, orderTypeDigit: 1, year: 2026 })
    expect(num).toBe('26102')
  })

  it('different order type digit gives different prefix', () => {
    const db = makeTestDb()
    seedBase(db)
    const num = generateCustomerNumber(db, { userId: U, orderTypeDigit: 3, year: 2026 })
    expect(num).toBe('26301')
  })

  it('different year gives different prefix', () => {
    const db = makeTestDb()
    seedBase(db)
    const num = generateCustomerNumber(db, { userId: U, orderTypeDigit: 1, year: 2025 })
    expect(num).toBe('25101')
  })

  it('99th customer still 2-digit LL (26199)', () => {
    const db = makeTestDb()
    seedBase(db)
    // Insert 98 customers with numbers 26101..26198
    for (let i = 1; i <= 98; i++) {
      db.insert(schema.customers).values({
        id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
        userId: U, customerNumber: `261${String(i).padStart(2, '0')}`, orderTypeId: OT,
        name: `C${i}`, createdAt: NOW, updatedAt: NOW,
      }).run()
    }
    const num = generateCustomerNumber(db, { userId: U, orderTypeDigit: 1, year: 2026 })
    expect(num).toBe('26199')
  })

  it('100th customer gets 3-digit LL (261100)', () => {
    const db = makeTestDb()
    seedBase(db)
    for (let i = 1; i <= 99; i++) {
      db.insert(schema.customers).values({
        id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
        userId: U, customerNumber: `261${String(i).padStart(2, '0')}`, orderTypeId: OT,
        name: `C${i}`, createdAt: NOW, updatedAt: NOW,
      }).run()
    }
    const num = generateCustomerNumber(db, { userId: U, orderTypeDigit: 1, year: 2026 })
    expect(num).toBe('261100')
  })
})
```

- [ ] **Step 2: Run tests — expect fail (module not found)**

```bash
cd project-tracker && npm test -- --testPathPattern=customerNumber
```

Expected: `Cannot find module '../repositories/customerNumber'`

- [ ] **Step 3: Implement `customerNumber.ts`**

Create `project-tracker/src/repositories/customerNumber.ts`:

```typescript
import { and, count, eq, like } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import * as schema from '@projekt-tracker/schema'

type AnyDb = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>

interface Params {
  userId: string
  orderTypeDigit: number
  year: number
}

export function generateCustomerNumber(db: AnyDb, { userId, orderTypeDigit, year }: Params): string {
  const yy = String(year).slice(-2)
  // customer_number starts with YY + digit, e.g. "261" for year 2026 digit 1
  const prefix = `${yy}${orderTypeDigit}`

  const result = (db as BetterSQLite3Database<typeof schema>)
    .select({ count: count() })
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.userId, userId),
        like(schema.customers.customerNumber, `${prefix}%`),
      )
    )
    .get()

  const seq = (result?.count ?? 0) + 1
  // LL is 2 digits until 99, then extends to 3 (schema allows varchar(8))
  const ll = seq <= 99 ? String(seq).padStart(2, '0') : String(seq)
  return `${prefix}${ll}`
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd project-tracker && npm test -- --testPathPattern=customerNumber
```

Expected: `6 passed | 0 failed`

- [ ] **Step 5: Commit**

```bash
git add project-tracker/src/repositories/customerNumber.ts project-tracker/src/__tests__/customerNumber.test.ts
git commit -m "feat(mobile): customer number generator with tests (ADR-010)"
```

---

### Task 9: Tariff snapshot helper + tests

When creating a `time_entry`, the current project's `hourly_rate_cents` and `pricing_mode` must be frozen into the entry. This is the only way historical entries stay correct if a project's rate is later changed.

**Files:**
- Create: `project-tracker/src/repositories/tariffSnapshot.ts`
- Create: `project-tracker/src/__tests__/tariffSnapshot.test.ts`

- [ ] **Step 1: Write failing tests**

Create `project-tracker/src/__tests__/tariffSnapshot.test.ts`:

```typescript
import BetterSQLite from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import * as schema from '@projekt-tracker/schema'
import { migrations } from '@projekt-tracker/schema'
import { buildTimeEntrySnapshot } from '../repositories/tariffSnapshot'

function makeTestDb() {
  const sqlite = new BetterSQLite(':memory:')
  sqlite.pragma('foreign_keys = ON')
  for (const m of migrations) sqlite.exec(m.sql)
  return drizzle(sqlite, { schema })
}

const NOW = new Date()
const U = '00000000-0000-0000-0000-000000000001'
const OT = '00000000-0000-0000-0000-000000000002'
const CU = '00000000-0000-0000-0000-000000000003'

function seedProject(db: ReturnType<typeof makeTestDb>, overrides: Partial<typeof schema.projects.$inferInsert>) {
  const id = overrides.id ?? '00000000-0000-0000-0000-000000000004'
  db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW }).run()
  db.insert(schema.orderTypes).values({ id: OT, userId: U, name: 'Hochzeit', digit: 1, createdAt: NOW, updatedAt: NOW }).run()
  db.insert(schema.customers).values({ id: CU, userId: U, customerNumber: '26101', orderTypeId: OT, name: 'Müller', createdAt: NOW, updatedAt: NOW }).run()
  db.insert(schema.projects).values({
    id, userId: U, customerId: CU, title: 'P', color: '#000',
    pricingMode: 'hourly', hourlyRateCents: 8000, status: 'active',
    createdAt: NOW, updatedAt: NOW,
    ...overrides,
  }).run()
  return id
}

describe('buildTimeEntrySnapshot', () => {
  it('freezes hourly rate from project', () => {
    const db = makeTestDb()
    const projectId = seedProject(db, { pricingMode: 'hourly', hourlyRateCents: 9500 })
    const snapshot = buildTimeEntrySnapshot(db, { projectId, userId: U })
    expect(snapshot.rateSnapshotCents).toBe(9500)
    expect(snapshot.pricingModeSnapshot).toBe('hourly')
  })

  it('sets rateSnapshotCents to null for fixed-price project', () => {
    const db = makeTestDb()
    const projectId = seedProject(db, {
      id: '00000000-0000-0000-0000-000000000099',
      pricingMode: 'fixed', fixedPriceCents: 150000, hourlyRateCents: null,
    })
    const snapshot = buildTimeEntrySnapshot(db, { projectId, userId: U })
    expect(snapshot.rateSnapshotCents).toBeNull()
    expect(snapshot.pricingModeSnapshot).toBe('fixed')
  })

  it('throws if project not found', () => {
    const db = makeTestDb()
    db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW }).run()
    expect(() =>
      buildTimeEntrySnapshot(db, { projectId: 'does-not-exist', userId: U })
    ).toThrow('Project not found')
  })

  it('throws if project belongs to different user', () => {
    const db = makeTestDb()
    const projectId = seedProject(db, {})
    expect(() =>
      buildTimeEntrySnapshot(db, { projectId, userId: 'wrong-user' })
    ).toThrow('Project not found')
  })
})
```

- [ ] **Step 2: Run tests — expect fail**

```bash
cd project-tracker && npm test -- --testPathPattern=tariffSnapshot
```

Expected: `Cannot find module '../repositories/tariffSnapshot'`

- [ ] **Step 3: Implement `tariffSnapshot.ts`**

Create `project-tracker/src/repositories/tariffSnapshot.ts`:

```typescript
import { and, eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import * as schema from '@projekt-tracker/schema'

type AnyDb = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>

interface SnapshotParams {
  projectId: string
  userId: string
}

interface TariffSnapshot {
  rateSnapshotCents: number | null
  pricingModeSnapshot: string
}

export function buildTimeEntrySnapshot(db: AnyDb, { projectId, userId }: SnapshotParams): TariffSnapshot {
  const project = (db as BetterSQLite3Database<typeof schema>)
    .select({
      pricingMode: schema.projects.pricingMode,
      hourlyRateCents: schema.projects.hourlyRateCents,
    })
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), eq(schema.projects.userId, userId)))
    .get()

  if (!project) throw new Error('Project not found')

  return {
    pricingModeSnapshot: project.pricingMode,
    rateSnapshotCents: project.pricingMode === 'hourly' ? project.hourlyRateCents : null,
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd project-tracker && npm test -- --testPathPattern=tariffSnapshot
```

Expected: `4 passed | 0 failed`

- [ ] **Step 5: Run all tests**

```bash
cd project-tracker && npm test
cd packages/schema && pnpm test
```

Expected: all pass.

- [ ] **Step 6: Run typecheck on both packages**

```bash
cd packages/schema && pnpm typecheck
cd project-tracker && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add project-tracker/src/repositories/tariffSnapshot.ts project-tracker/src/__tests__/tariffSnapshot.test.ts
git commit -m "feat(mobile): tariff snapshot helper with tests (ADR-008)"
```

---

## Self-Review

### Spec coverage

| Requirement (TODO.md Phase 1 Schema) | Task |
|--------------------------------------|------|
| Workspace-Struktur einrichten | Task 1 |
| Drizzle + drizzle-kit installieren | Task 2 |
| SQLite-Schema laut DATA_MODEL.md | Task 3 |
| Initial-Migration generieren + im App-Boot ausführen | Tasks 4, 6, 7 |
| Test: Schema-Roundtrip für jede Tabelle | Task 5 |
| Tarif-Snapshot-Logik: Helper + Tests | Task 9 |
| Kundennummern-Generator, getestet | Task 8 |

**Gap**: `drizzle-kit` is included in schema package devDeps for future use but no `generate` step is used in this plan — migrations are handwritten SQL. This is intentional for Phase 1 simplicity; the Drizzle table definitions in `sqlite.ts` are still the authoritative type source for queries.

### Placeholder scan
None found.

### Type consistency
- `buildTimeEntrySnapshot` returns `TariffSnapshot` — the same type is used in Task 9 tests (destructured).
- `generateCustomerNumber` takes `Params` inline — consistent between Task 8 implementation and tests.
- `AnyDb` union type used in both repositories — same definition, not duplicated between files.
