# Phase 2C — Mobile Sync-Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a push-pull sync worker on the mobile client that synchronises local SQLite data with the Hono backend via POST /v1/sync/push and GET /v1/sync/pull, with exponential backoff retry, app-resume + periodic (60 s) triggers, and a sync status indicator in the Settings tab.

**Architecture:** Single-cycle push-pull loop. Client pushes local entities changed since `lastSyncedAt`, then pulls server changes since the same timestamp and applies them locally with LWW semantics (`updatedAt` comparison). Join tables (taskTags, projectTasks) and timers are always full-replaced. JWT token and `lastSyncedAt` are persisted in expo-secure-store across app restarts. Local data uses the hardcoded `OWNER_ID = '00000000-0000-0000-0000-000000000001'`; the server maps this to its own JWT-derived userId transparently.

**Tech Stack:** expo-secure-store, Zustand 5, React Native AppState, Drizzle ORM (SQLite/expo dialect), Jest + better-sqlite3 for tests

---

## File Map

**New files:**
- `project-tracker/src/sync/types.ts` — PushPayload, PullResponse, and per-entity interfaces
- `project-tracker/src/sync/config.ts` — API_BASE_URL, LOCAL_USER_ID, SYNC_INTERVAL_MS, SECURE_KEYS
- `project-tracker/src/sync/api.ts` — apiBootstrap, apiPush, apiPull (pure fetch wrappers)
- `project-tracker/src/sync/syncRepository.ts` — collectPushPayload(db, userId, since), applyPull(db, data)
- `project-tracker/src/sync/service.ts` — runSync, startSyncLoop, stopSyncLoop
- `project-tracker/src/store/syncStore.ts` — Zustand state: status, token, lastSyncedAt, consecutiveErrors
- `project-tracker/src/components/SyncIndicator.tsx` — compact sync status row

**Modified files:**
- `project-tracker/app/_layout.tsx` — bootstrap on first run, load lastSyncedAt from SecureStore, start sync loop
- `project-tracker/app/(tabs)/settings.tsx` — add SyncIndicator row

**Test files:**
- `project-tracker/src/__tests__/syncRepository.test.ts` — unit tests for collectPushPayload + applyPull

---

## Task 1: Install expo-secure-store + Sync State Store

**Files:**
- Create: `project-tracker/src/store/syncStore.ts`

- [ ] **Step 1: Install expo-secure-store**

```bash
cd project-tracker && npx expo install expo-secure-store
```

Expected output: package added to package.json, pnpm lockfile updated.

- [ ] **Step 2: Verify install**

```bash
cd project-tracker && npx tsc --noEmit 2>&1 | grep -c "error TS" || true
```

Expected: 0 (or same count as pre-existing baseline errors).

- [ ] **Step 3: Create syncStore.ts**

Create `project-tracker/src/store/syncStore.ts`:

```ts
import { create } from 'zustand'

export type SyncStatus = 'idle' | 'syncing' | 'error'

interface SyncState {
  status: SyncStatus
  lastError: string | null
  lastSyncedAt: Date | null
  consecutiveErrors: number
  token: string | null
  setStatus: (s: SyncStatus, error?: string) => void
  setLastSyncedAt: (d: Date) => void
  setToken: (t: string | null) => void
  incrementErrors: () => void
  resetErrors: () => void
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastError: null,
  lastSyncedAt: null,
  consecutiveErrors: 0,
  token: null,
  setStatus: (s, error) => set({ status: s, lastError: error ?? null }),
  setLastSyncedAt: (d) => set({ lastSyncedAt: d }),
  setToken: (t) => set({ token: t }),
  incrementErrors: () => set((s) => ({ consecutiveErrors: s.consecutiveErrors + 1 })),
  resetErrors: () => set({ consecutiveErrors: 0 }),
}))
```

- [ ] **Step 4: Typecheck**

```bash
cd project-tracker && npx tsc --noEmit 2>&1 | grep syncStore || true
```

Expected: no errors mentioning syncStore.

- [ ] **Step 5: Commit**

```bash
git add project-tracker/src/store/syncStore.ts project-tracker/package.json
git commit -m "feat(sync): install expo-secure-store and add syncStore"
```

---

## Task 2: Sync Types + Config + API Client

**Files:**
- Create: `project-tracker/src/sync/types.ts`
- Create: `project-tracker/src/sync/config.ts`
- Create: `project-tracker/src/sync/api.ts`

- [ ] **Step 1: Create types.ts**

Create `project-tracker/src/sync/types.ts`:

```ts
export interface SyncOrderType {
  id: string
  name: string
  digit: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface SyncCustomer {
  id: string
  customerNumber: string
  orderTypeId: string
  name: string
  street: string | null
  zip: string | null
  city: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface SyncProject {
  id: string
  customerId: string
  title: string
  description: string | null
  color: string
  pricingMode: 'hourly' | 'fixed'
  hourlyRateCents: number | null
  fixedPriceCents: number | null
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface SyncTask {
  id: string
  description: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface SyncTag {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface SyncTimeEntry {
  id: string
  projectId: string
  taskId: string
  startedAt: string
  endedAt: string
  durationSeconds: number
  rateSnapshotCents: number | null
  pricingModeSnapshot: 'hourly' | 'fixed'
  notes: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface SyncTimer {
  id: string
  projectId: string
  startedAt: string
  createdAt: string
  updatedAt: string
}

export interface SyncAppSettings {
  pinHash: string | null
  biometricEnabled: boolean
  lastExportPeriod: string | null
  updatedAt: string
}

export interface PushPayload {
  orderTypes: SyncOrderType[]
  customers: SyncCustomer[]
  projects: SyncProject[]
  tasks: SyncTask[]
  tags: SyncTag[]
  timeEntries: SyncTimeEntry[]
  taskTags: Array<{ taskId: string; tagId: string }>
  projectTasks: Array<{ projectId: string; taskId: string }>
  timers: SyncTimer[]
  appSettings: SyncAppSettings | null
}

export interface PullResponse {
  orderTypes: SyncOrderType[]
  customers: SyncCustomer[]
  projects: SyncProject[]
  tasks: SyncTask[]
  tags: SyncTag[]
  timeEntries: SyncTimeEntry[]
  taskTags: Array<{ taskId: string; tagId: string }>
  projectTasks: Array<{ projectId: string; taskId: string }>
  timers: SyncTimer[]
  appSettings: SyncAppSettings | null
  serverTime: string
}
```

- [ ] **Step 2: Create config.ts**

Create `project-tracker/src/sync/config.ts`:

```ts
// Change to your production URL before Phase 5 deploy
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://your-server.example.com'

export const LOCAL_USER_ID = '00000000-0000-0000-0000-000000000001'
export const BOOTSTRAP_DISPLAY_NAME = 'Owner'
export const SYNC_INTERVAL_MS = 60_000

export const SECURE_KEYS = {
  TOKEN: 'pt_auth_token',
  USER_ID: 'pt_user_id',
  LAST_SYNCED_AT: 'pt_last_synced_at',
} as const
```

- [ ] **Step 3: Create api.ts**

Create `project-tracker/src/sync/api.ts`:

```ts
import type { PushPayload, PullResponse } from './types'

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(`HTTP ${status}: ${message}`)
  }
}

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, text)
  }
  return res.json() as Promise<T>
}

export async function apiBootstrap(
  baseUrl: string,
  displayName: string,
): Promise<{ token: string; userId: string }> {
  return request(`${baseUrl}/v1/auth/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  })
}

export async function apiPush(
  baseUrl: string,
  token: string,
  payload: PushPayload,
): Promise<{ serverTime: string }> {
  return request(`${baseUrl}/v1/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function apiPull(
  baseUrl: string,
  token: string,
  since: string | null,
): Promise<PullResponse> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : ''
  return request(`${baseUrl}/v1/sync/pull${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
```

- [ ] **Step 4: Typecheck**

```bash
cd project-tracker && npx tsc --noEmit 2>&1 | grep -E "src/sync/(types|config|api)" || true
```

Expected: no errors for these files.

- [ ] **Step 5: Commit**

```bash
git add project-tracker/src/sync/
git commit -m "feat(sync): sync types, config, and API client"
```

---

## Task 3: collectPushPayload — Tests + Implementation

**Files:**
- Create: `project-tracker/src/__tests__/syncRepository.test.ts` (tests first)
- Create: `project-tracker/src/sync/syncRepository.ts` (implementation)

- [ ] **Step 1: Write failing tests for collectPushPayload**

Create `project-tracker/src/__tests__/syncRepository.test.ts`:

```ts
import BetterSQLite from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '@projekt-tracker/schema'
import { migrations } from '@projekt-tracker/schema'
import { collectPushPayload } from '../sync/syncRepository'

const U = '00000000-0000-0000-0000-000000000001'
const OT = '00000000-0000-0000-0000-000000000002'
const CU = '00000000-0000-0000-0000-000000000003'
const PR = '00000000-0000-0000-0000-000000000004'
const TA = '00000000-0000-0000-0000-000000000005'
const TE = '00000000-0000-0000-0000-000000000006'

function makeDb() {
  const sqlite = new BetterSQLite(':memory:')
  sqlite.pragma('foreign_keys = ON')
  for (const m of migrations) sqlite.exec(m.sql)
  return drizzle(sqlite, { schema })
}

const T0 = new Date('2026-01-01T00:00:00.000Z')
const T1 = new Date('2026-01-02T00:00:00.000Z')
const T2 = new Date('2026-01-03T00:00:00.000Z')

function seedBase(db: ReturnType<typeof makeDb>) {
  db.insert(schema.users).values({
    id: U, displayName: 'Owner', tier: 'pro', createdAt: T0, updatedAt: T0,
  }).run()
  db.insert(schema.orderTypes).values({
    id: OT, userId: U, name: 'Hochzeit', digit: 1, createdAt: T0, updatedAt: T1,
  }).run()
  db.insert(schema.customers).values({
    id: CU, userId: U, customerNumber: '26101', orderTypeId: OT,
    name: 'Müller', createdAt: T0, updatedAt: T1,
  }).run()
  db.insert(schema.projects).values({
    id: PR, userId: U, customerId: CU, title: 'Projekt A', color: '#FF0000',
    pricingMode: 'hourly', hourlyRateCents: 8000, status: 'active',
    createdAt: T0, updatedAt: T1,
  }).run()
  db.insert(schema.tasks).values({
    id: TA, userId: U, description: 'Planung', createdAt: T0, updatedAt: T1,
  }).run()
  db.insert(schema.timeEntries).values({
    id: TE, userId: U, projectId: PR, taskId: TA,
    startedAt: T0, endedAt: T1, durationSeconds: 3600,
    rateSnapshotCents: 8000, pricingModeSnapshot: 'hourly',
    notes: null, createdAt: T0, updatedAt: T1,
  }).run()
  db.insert(schema.projectTasks).values({ projectId: PR, taskId: TA, userId: U }).run()
}

describe('collectPushPayload', () => {
  it('full sync (since=null): collects all entities', () => {
    const db = makeDb()
    seedBase(db)
    const payload = collectPushPayload(db, U, null)
    expect(payload.orderTypes).toHaveLength(1)
    expect(payload.orderTypes[0].id).toBe(OT)
    expect(payload.orderTypes[0].createdAt).toBe(T0.toISOString())
    expect(payload.customers).toHaveLength(1)
    expect(payload.projects).toHaveLength(1)
    expect(payload.tasks).toHaveLength(1)
    expect(payload.timeEntries).toHaveLength(1)
    expect(payload.projectTasks).toHaveLength(1)
  })

  it('incremental sync (since=T0): only entities updated after T0', () => {
    const db = makeDb()
    seedBase(db)
    // Add second orderType updated at T0 (not after T0)
    db.insert(schema.orderTypes).values({
      id: '00000000-0000-0000-0000-000000000099',
      userId: U, name: 'Taufe', digit: 2, createdAt: T0, updatedAt: T0,
    }).run()
    const payload = collectPushPayload(db, U, T0)
    // orderType updated at T1 > T0 → included
    expect(payload.orderTypes).toHaveLength(1)
    expect(payload.orderTypes[0].id).toBe(OT)
  })

  it('incremental sync after T1: nothing to push', () => {
    const db = makeDb()
    seedBase(db)
    const payload = collectPushPayload(db, U, T2)
    expect(payload.orderTypes).toHaveLength(0)
    expect(payload.customers).toHaveLength(0)
    expect(payload.projects).toHaveLength(0)
    expect(payload.tasks).toHaveLength(0)
    expect(payload.timeEntries).toHaveLength(0)
  })

  it('join tables always included regardless of since', () => {
    const db = makeDb()
    seedBase(db)
    const payload = collectPushPayload(db, U, T2)
    // projectTasks always sent (full replace on server)
    expect(payload.projectTasks).toHaveLength(1)
    expect(payload.timers).toHaveLength(0) // no active timer
  })

  it('soft-deleted entity (deletedAt set) is included in push', () => {
    const db = makeDb()
    seedBase(db)
    db.update(schema.orderTypes)
      .set({ deletedAt: T1, updatedAt: T1 })
      .where(schema.orderTypes.id.name === OT ? undefined : undefined) // Drizzle way below
      .run()
    // Update via raw to avoid import complexity in test
    const sqlite = new BetterSQLite(':memory:')
    // Use fresh db instead — just verify the field mapping
    const db2 = makeDb()
    seedBase(db2)
    db2.update(schema.orderTypes)
      .set({ deletedAt: T1, updatedAt: T1 })
      .run() // updates all (fine in test, only one row)
    const payload = collectPushPayload(db2, U, null)
    expect(payload.orderTypes[0].deletedAt).toBe(T1.toISOString())
  })

  it('timestamps are ISO strings in payload', () => {
    const db = makeDb()
    seedBase(db)
    const payload = collectPushPayload(db, U, null)
    expect(payload.orderTypes[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(payload.orderTypes[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
```

- [ ] **Step 2: Run tests to see them fail**

```bash
cd project-tracker && npm test -- --testPathPattern=syncRepository 2>&1 | tail -5
```

Expected: FAIL (cannot find module `../sync/syncRepository`).

- [ ] **Step 3: Implement collectPushPayload in syncRepository.ts**

Create `project-tracker/src/sync/syncRepository.ts`:

```ts
import { eq, and, gt } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import * as schema from '@projekt-tracker/schema'
import type { PushPayload, PullResponse } from './types'
import { LOCAL_USER_ID } from './config'

type AnyDb = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>

function toISO(d: Date): string { return d.toISOString() }
function toISOOrNull(d: Date | null | undefined): string | null {
  return d != null ? d.toISOString() : null
}
function toDate(s: string): Date { return new Date(s) }
function toDateOrNull(s: string | null | undefined): Date | null {
  return s != null ? new Date(s) : null
}

export function collectPushPayload(
  db: AnyDb,
  userId: string,
  since: Date | null,
): PushPayload {
  const bDb = db as BetterSQLite3Database<typeof schema>

  function withSince<T extends { updatedAt: Date }>(
    rows: T[],
  ): T[] {
    return since ? rows.filter((r) => r.updatedAt.getTime() > since.getTime()) : rows
  }

  const orderTypesAll = bDb.select().from(schema.orderTypes)
    .where(eq(schema.orderTypes.userId, userId)).all()
  const customersAll = bDb.select().from(schema.customers)
    .where(eq(schema.customers.userId, userId)).all()
  const projectsAll = bDb.select().from(schema.projects)
    .where(eq(schema.projects.userId, userId)).all()
  const tasksAll = bDb.select().from(schema.tasks)
    .where(eq(schema.tasks.userId, userId)).all()
  const tagsAll = bDb.select().from(schema.tags)
    .where(eq(schema.tags.userId, userId)).all()
  const timeEntriesAll = bDb.select().from(schema.timeEntries)
    .where(eq(schema.timeEntries.userId, userId)).all()

  // Join tables + timers: always full set (server does full replace)
  const taskTagsAll = bDb.select().from(schema.taskTags)
    .where(eq(schema.taskTags.userId, userId)).all()
  const projectTasksAll = bDb.select().from(schema.projectTasks)
    .where(eq(schema.projectTasks.userId, userId)).all()
  const timersAll = bDb.select().from(schema.timers)
    .where(eq(schema.timers.userId, userId)).all()
  const appSettingsRow = bDb.select().from(schema.appSettings)
    .where(eq(schema.appSettings.userId, userId)).get() ?? null

  const orderTypes = withSince(orderTypesAll)
  const customers = withSince(customersAll)
  const projects = withSince(projectsAll)
  const tasks = withSince(tasksAll)
  const tags = withSince(tagsAll)
  const timeEntries = withSince(timeEntriesAll)

  return {
    orderTypes: orderTypes.map((r) => ({
      id: r.id, name: r.name, digit: r.digit,
      createdAt: toISO(r.createdAt), updatedAt: toISO(r.updatedAt),
      deletedAt: toISOOrNull(r.deletedAt),
    })),
    customers: customers.map((r) => ({
      id: r.id, customerNumber: r.customerNumber, orderTypeId: r.orderTypeId,
      name: r.name, street: r.street ?? null, zip: r.zip ?? null, city: r.city ?? null,
      createdAt: toISO(r.createdAt), updatedAt: toISO(r.updatedAt),
      deletedAt: toISOOrNull(r.deletedAt),
    })),
    projects: projects.map((r) => ({
      id: r.id, customerId: r.customerId, title: r.title,
      description: r.description ?? null, color: r.color,
      pricingMode: r.pricingMode as 'hourly' | 'fixed',
      hourlyRateCents: r.hourlyRateCents ?? null,
      fixedPriceCents: r.fixedPriceCents ?? null,
      status: r.status as 'active' | 'archived',
      createdAt: toISO(r.createdAt), updatedAt: toISO(r.updatedAt),
      deletedAt: toISOOrNull(r.deletedAt),
    })),
    tasks: tasks.map((r) => ({
      id: r.id, description: r.description,
      createdAt: toISO(r.createdAt), updatedAt: toISO(r.updatedAt),
      deletedAt: toISOOrNull(r.deletedAt),
    })),
    tags: tags.map((r) => ({
      id: r.id, title: r.title,
      createdAt: toISO(r.createdAt), updatedAt: toISO(r.updatedAt),
      deletedAt: toISOOrNull(r.deletedAt),
    })),
    timeEntries: timeEntries.map((r) => ({
      id: r.id, projectId: r.projectId, taskId: r.taskId,
      startedAt: toISO(r.startedAt), endedAt: toISO(r.endedAt),
      durationSeconds: r.durationSeconds,
      rateSnapshotCents: r.rateSnapshotCents ?? null,
      pricingModeSnapshot: r.pricingModeSnapshot as 'hourly' | 'fixed',
      notes: r.notes ?? null,
      createdAt: toISO(r.createdAt), updatedAt: toISO(r.updatedAt),
      deletedAt: toISOOrNull(r.deletedAt),
    })),
    taskTags: taskTagsAll.map((r) => ({ taskId: r.taskId, tagId: r.tagId })),
    projectTasks: projectTasksAll.map((r) => ({ projectId: r.projectId, taskId: r.taskId })),
    timers: timersAll.map((r) => ({
      id: r.id, projectId: r.projectId,
      startedAt: toISO(r.startedAt),
      createdAt: toISO(r.createdAt), updatedAt: toISO(r.updatedAt),
    })),
    appSettings: appSettingsRow ? {
      pinHash: appSettingsRow.pinHash ?? null,
      biometricEnabled: appSettingsRow.biometricEnabled,
      lastExportPeriod: appSettingsRow.lastExportPeriod ?? null,
      updatedAt: toISO(appSettingsRow.updatedAt),
    } : null,
  }
}

// applyPull added in Task 4
export function applyPull(_db: AnyDb, _data: PullResponse): void {
  throw new Error('not implemented')
}
```

- [ ] **Step 4: Fix the soft-delete test — it has a duplicate db variable, simplify**

The test in Step 1 has a duplication bug in the `soft-deleted entity` test case. Replace that test case with:

```ts
  it('soft-deleted entity (deletedAt set) is included with deletedAt as ISO', () => {
    const db = makeDb()
    seedBase(db)
    // Soft-delete the orderType
    db.update(schema.orderTypes)
      .set({ deletedAt: T1, updatedAt: T1 })
      .run()
    const payload = collectPushPayload(db, U, null)
    expect(payload.orderTypes[0].deletedAt).toBe(T1.toISOString())
  })
```

- [ ] **Step 5: Run tests and verify they pass**

```bash
cd project-tracker && npm test -- --testPathPattern=syncRepository 2>&1 | tail -10
```

Expected: 5/5 collectPushPayload tests PASS (applyPull tests not yet added).

- [ ] **Step 6: Commit**

```bash
git add project-tracker/src/sync/syncRepository.ts project-tracker/src/__tests__/syncRepository.test.ts
git commit -m "feat(sync): collectPushPayload with TDD — collects SQLite entities for server push"
```

---

## Task 4: applyPull — Tests + Implementation

**Files:**
- Modify: `project-tracker/src/__tests__/syncRepository.test.ts` (add applyPull tests)
- Modify: `project-tracker/src/sync/syncRepository.ts` (implement applyPull)

- [ ] **Step 1: Add applyPull tests to syncRepository.test.ts**

Append the following `describe('applyPull', ...)` block to `syncRepository.test.ts` (after the existing describe block):

```ts
import { applyPull } from '../sync/syncRepository'
import type { PullResponse } from '../sync/types'

// (add this import at top of file, alongside the existing collectPushPayload import)
```

And add after the first describe block:

```ts
describe('applyPull', () => {
  const baseResponse = (): PullResponse => ({
    orderTypes: [],
    customers: [],
    projects: [],
    tasks: [],
    tags: [],
    timeEntries: [],
    taskTags: [],
    projectTasks: [],
    timers: [],
    appSettings: null,
    serverTime: T2.toISOString(),
  })

  it('inserts new entity from server', () => {
    const db = makeDb()
    db.insert(schema.users).values({
      id: U, displayName: 'Owner', tier: 'pro', createdAt: T0, updatedAt: T0,
    }).run()

    applyPull(db, {
      ...baseResponse(),
      orderTypes: [{
        id: OT, name: 'Hochzeit', digit: 1,
        createdAt: T0.toISOString(), updatedAt: T1.toISOString(), deletedAt: null,
      }],
    })

    const rows = db.select().from(schema.orderTypes).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(OT)
    expect(rows[0].name).toBe('Hochzeit')
  })

  it('updates existing entity when server updatedAt is newer (LWW)', () => {
    const db = makeDb()
    db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: T0, updatedAt: T0 }).run()
    db.insert(schema.orderTypes).values({
      id: OT, userId: U, name: 'Alt', digit: 1, createdAt: T0, updatedAt: T0,
    }).run()

    applyPull(db, {
      ...baseResponse(),
      orderTypes: [{
        id: OT, name: 'Neu', digit: 1,
        createdAt: T0.toISOString(), updatedAt: T1.toISOString(), deletedAt: null,
      }],
    })

    const row = db.select().from(schema.orderTypes).get()
    expect(row?.name).toBe('Neu')
  })

  it('does NOT update local entity when server updatedAt is older (LWW preserved)', () => {
    const db = makeDb()
    db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: T0, updatedAt: T0 }).run()
    // Local has T2 (newer than server's T1)
    db.insert(schema.orderTypes).values({
      id: OT, userId: U, name: 'Local-Neu', digit: 1, createdAt: T0, updatedAt: T2,
    }).run()

    applyPull(db, {
      ...baseResponse(),
      orderTypes: [{
        id: OT, name: 'Server-Alt', digit: 1,
        createdAt: T0.toISOString(), updatedAt: T1.toISOString(), deletedAt: null,
      }],
    })

    const row = db.select().from(schema.orderTypes).get()
    expect(row?.name).toBe('Local-Neu') // local preserved
  })

  it('propagates deletedAt from server', () => {
    const db = makeDb()
    db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: T0, updatedAt: T0 }).run()
    db.insert(schema.orderTypes).values({
      id: OT, userId: U, name: 'Hochzeit', digit: 1, createdAt: T0, updatedAt: T0,
    }).run()

    applyPull(db, {
      ...baseResponse(),
      orderTypes: [{
        id: OT, name: 'Hochzeit', digit: 1,
        createdAt: T0.toISOString(), updatedAt: T1.toISOString(),
        deletedAt: T1.toISOString(),
      }],
    })

    const row = db.select().from(schema.orderTypes).get()
    expect(row?.deletedAt).toBeTruthy()
  })

  it('full-replaces timers (delete existing, insert server timers)', () => {
    const db = makeDb()
    db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: T0, updatedAt: T0 }).run()
    db.insert(schema.orderTypes).values({ id: OT, userId: U, name: 'H', digit: 1, createdAt: T0, updatedAt: T0 }).run()
    db.insert(schema.customers).values({ id: CU, userId: U, customerNumber: '26101', orderTypeId: OT, name: 'M', createdAt: T0, updatedAt: T0 }).run()
    db.insert(schema.projects).values({ id: PR, userId: U, customerId: CU, title: 'P', color: '#000', pricingMode: 'hourly', hourlyRateCents: 8000, status: 'active', createdAt: T0, updatedAt: T0 }).run()
    // Insert a local timer
    db.insert(schema.timers).values({ id: 'old-timer', userId: U, projectId: PR, startedAt: T0, createdAt: T0, updatedAt: T0 }).run()

    // Server says: no active timer
    applyPull(db, { ...baseResponse(), timers: [] })

    const timers = db.select().from(schema.timers).all()
    expect(timers).toHaveLength(0)
  })

  it('full-replaces taskTags', () => {
    const db = makeDb()
    db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: T0, updatedAt: T0 }).run()
    db.insert(schema.tasks).values({ id: TA, userId: U, description: 'A', createdAt: T0, updatedAt: T0 }).run()
    const TAG = '00000000-0000-0000-0000-000000000007'
    db.insert(schema.tags).values({ id: TAG, userId: U, title: 'wichtig', createdAt: T0, updatedAt: T0 }).run()
    // Local has an existing task-tag
    db.insert(schema.taskTags).values({ taskId: TA, tagId: TAG, userId: U }).run()

    // Server says: no taskTags
    applyPull(db, { ...baseResponse(), taskTags: [] })

    const rows = db.select().from(schema.taskTags).all()
    expect(rows).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm applyPull tests fail**

```bash
cd project-tracker && npm test -- --testPathPattern=syncRepository 2>&1 | tail -10
```

Expected: FAIL with "not implemented" error on applyPull tests.

- [ ] **Step 3: Implement applyPull in syncRepository.ts**

Replace the stub `applyPull` in `syncRepository.ts` with the full implementation:

```ts
export function applyPull(db: AnyDb, data: PullResponse): void {
  const bDb = db as BetterSQLite3Database<typeof schema>

  // 1. orderTypes
  for (const r of data.orderTypes) {
    bDb.insert(schema.orderTypes).values({
      id: r.id, userId: LOCAL_USER_ID,
      name: r.name, digit: r.digit,
      createdAt: toDate(r.createdAt),
      updatedAt: toDate(r.updatedAt),
      deletedAt: toDateOrNull(r.deletedAt),
    }).onConflictDoUpdate({
      target: schema.orderTypes.id,
      set: {
        name: sql`excluded.name`,
        digit: sql`excluded.digit`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
      },
      setWhere: sql`excluded.updated_at > order_types.updated_at`,
    }).run()
  }

  // 2. customers
  for (const r of data.customers) {
    bDb.insert(schema.customers).values({
      id: r.id, userId: LOCAL_USER_ID,
      customerNumber: r.customerNumber, orderTypeId: r.orderTypeId,
      name: r.name, street: r.street, zip: r.zip, city: r.city,
      createdAt: toDate(r.createdAt),
      updatedAt: toDate(r.updatedAt),
      deletedAt: toDateOrNull(r.deletedAt),
    }).onConflictDoUpdate({
      target: schema.customers.id,
      set: {
        customerNumber: sql`excluded.customer_number`,
        orderTypeId: sql`excluded.order_type_id`,
        name: sql`excluded.name`,
        street: sql`excluded.street`,
        zip: sql`excluded.zip`,
        city: sql`excluded.city`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
      },
      setWhere: sql`excluded.updated_at > customers.updated_at`,
    }).run()
  }

  // 3. tasks
  for (const r of data.tasks) {
    bDb.insert(schema.tasks).values({
      id: r.id, userId: LOCAL_USER_ID,
      description: r.description,
      createdAt: toDate(r.createdAt),
      updatedAt: toDate(r.updatedAt),
      deletedAt: toDateOrNull(r.deletedAt),
    }).onConflictDoUpdate({
      target: schema.tasks.id,
      set: {
        description: sql`excluded.description`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
      },
      setWhere: sql`excluded.updated_at > tasks.updated_at`,
    }).run()
  }

  // 4. tags
  for (const r of data.tags) {
    bDb.insert(schema.tags).values({
      id: r.id, userId: LOCAL_USER_ID,
      title: r.title,
      createdAt: toDate(r.createdAt),
      updatedAt: toDate(r.updatedAt),
      deletedAt: toDateOrNull(r.deletedAt),
    }).onConflictDoUpdate({
      target: schema.tags.id,
      set: {
        title: sql`excluded.title`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
      },
      setWhere: sql`excluded.updated_at > tags.updated_at`,
    }).run()
  }

  // 5. projects (refs customers — must come after customers)
  for (const r of data.projects) {
    bDb.insert(schema.projects).values({
      id: r.id, userId: LOCAL_USER_ID,
      customerId: r.customerId, title: r.title,
      description: r.description, color: r.color,
      pricingMode: r.pricingMode,
      hourlyRateCents: r.hourlyRateCents,
      fixedPriceCents: r.fixedPriceCents,
      status: r.status,
      createdAt: toDate(r.createdAt),
      updatedAt: toDate(r.updatedAt),
      deletedAt: toDateOrNull(r.deletedAt),
    }).onConflictDoUpdate({
      target: schema.projects.id,
      set: {
        customerId: sql`excluded.customer_id`,
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        color: sql`excluded.color`,
        pricingMode: sql`excluded.pricing_mode`,
        hourlyRateCents: sql`excluded.hourly_rate_cents`,
        fixedPriceCents: sql`excluded.fixed_price_cents`,
        status: sql`excluded.status`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
      },
      setWhere: sql`excluded.updated_at > projects.updated_at`,
    }).run()
  }

  // 6. timeEntries (refs projects + tasks)
  for (const r of data.timeEntries) {
    bDb.insert(schema.timeEntries).values({
      id: r.id, userId: LOCAL_USER_ID,
      projectId: r.projectId, taskId: r.taskId,
      startedAt: toDate(r.startedAt),
      endedAt: toDate(r.endedAt),
      durationSeconds: r.durationSeconds,
      rateSnapshotCents: r.rateSnapshotCents,
      pricingModeSnapshot: r.pricingModeSnapshot,
      notes: r.notes,
      createdAt: toDate(r.createdAt),
      updatedAt: toDate(r.updatedAt),
      deletedAt: toDateOrNull(r.deletedAt),
    }).onConflictDoUpdate({
      target: schema.timeEntries.id,
      set: {
        projectId: sql`excluded.project_id`,
        taskId: sql`excluded.task_id`,
        startedAt: sql`excluded.started_at`,
        endedAt: sql`excluded.ended_at`,
        durationSeconds: sql`excluded.duration_seconds`,
        rateSnapshotCents: sql`excluded.rate_snapshot_cents`,
        pricingModeSnapshot: sql`excluded.pricing_mode_snapshot`,
        notes: sql`excluded.notes`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
      },
      setWhere: sql`excluded.updated_at > time_entries.updated_at`,
    }).run()
  }

  // 7. timers — full replace
  bDb.delete(schema.timers).where(eq(schema.timers.userId, LOCAL_USER_ID)).run()
  if (data.timers.length > 0) {
    bDb.insert(schema.timers).values(
      data.timers.map((r) => ({
        id: r.id, userId: LOCAL_USER_ID, projectId: r.projectId,
        startedAt: toDate(r.startedAt),
        createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
      }))
    ).run()
  }

  // 8. taskTags — full replace
  bDb.delete(schema.taskTags).where(eq(schema.taskTags.userId, LOCAL_USER_ID)).run()
  if (data.taskTags.length > 0) {
    bDb.insert(schema.taskTags).values(
      data.taskTags.map((r) => ({ taskId: r.taskId, tagId: r.tagId, userId: LOCAL_USER_ID }))
    ).onConflictDoNothing().run()
  }

  // 9. projectTasks — full replace
  bDb.delete(schema.projectTasks).where(eq(schema.projectTasks.userId, LOCAL_USER_ID)).run()
  if (data.projectTasks.length > 0) {
    bDb.insert(schema.projectTasks).values(
      data.projectTasks.map((r) => ({ projectId: r.projectId, taskId: r.taskId, userId: LOCAL_USER_ID }))
    ).onConflictDoNothing().run()
  }

  // 10. appSettings — LWW
  if (data.appSettings) {
    bDb.insert(schema.appSettings).values({
      userId: LOCAL_USER_ID,
      pinHash: data.appSettings.pinHash,
      biometricEnabled: data.appSettings.biometricEnabled,
      lastExportPeriod: data.appSettings.lastExportPeriod,
      updatedAt: toDate(data.appSettings.updatedAt),
    }).onConflictDoUpdate({
      target: schema.appSettings.userId,
      set: {
        pinHash: sql`excluded.pin_hash`,
        biometricEnabled: sql`excluded.biometric_enabled`,
        lastExportPeriod: sql`excluded.last_export_period`,
        updatedAt: sql`excluded.updated_at`,
      },
      setWhere: sql`excluded.updated_at > app_settings.updated_at`,
    }).run()
  }
}
```

Also add the missing `eq` import at the top of `syncRepository.ts` (it's used in applyPull):
```ts
import { eq, sql } from 'drizzle-orm'
```

Remove the unused `and, gt` imports (they were in the stub; now unused since we do JS-level filtering).

- [ ] **Step 4: Run all tests**

```bash
cd project-tracker && npm test -- --testPathPattern=syncRepository 2>&1 | tail -15
```

Expected: 11/11 tests PASS (5 collectPushPayload + 6 applyPull).

- [ ] **Step 5: Typecheck**

```bash
cd project-tracker && npx tsc --noEmit 2>&1 | grep -E "syncRepository|applyPull" || echo "No errors"
```

Expected: "No errors".

- [ ] **Step 6: Commit**

```bash
git add project-tracker/src/sync/syncRepository.ts project-tracker/src/__tests__/syncRepository.test.ts
git commit -m "feat(sync): applyPull with LWW semantics — TDD, 11/11 tests"
```

---

## Task 5: Sync Service (Push-Pull Loop + Backoff)

**Files:**
- Create: `project-tracker/src/sync/service.ts`

- [ ] **Step 1: Create service.ts**

Create `project-tracker/src/sync/service.ts`:

```ts
import { AppState, type AppStateStatus } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { db } from '../db/client'
import { useSyncStore } from '../store/syncStore'
import { API_BASE_URL, LOCAL_USER_ID, SYNC_INTERVAL_MS, SECURE_KEYS } from './config'
import { apiPush, apiPull } from './api'
import { collectPushPayload, applyPull } from './syncRepository'

const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]

let nextSyncTimeout: ReturnType<typeof setTimeout> | null = null
let appStateSubscription: { remove: () => void } | null = null
let isSyncing = false

function scheduleNextSync(delayMs: number): void {
  if (nextSyncTimeout) clearTimeout(nextSyncTimeout)
  nextSyncTimeout = setTimeout(() => { void runSync() }, delayMs)
}

export async function runSync(): Promise<void> {
  if (isSyncing) return
  if (nextSyncTimeout) { clearTimeout(nextSyncTimeout); nextSyncTimeout = null }

  const store = useSyncStore.getState()
  const token = store.token
  if (!token) return

  isSyncing = true
  store.setStatus('syncing')

  try {
    const since = store.lastSyncedAt

    const payload = collectPushPayload(db, LOCAL_USER_ID, since)
    const { serverTime } = await apiPush(API_BASE_URL, token, payload)

    const pullSince = since ? since.toISOString() : null
    const pullData = await apiPull(API_BASE_URL, token, pullSince)

    applyPull(db, pullData)

    const newLastSynced = new Date(serverTime)
    store.setLastSyncedAt(newLastSynced)
    store.resetErrors()
    store.setStatus('idle')

    await SecureStore.setItemAsync(SECURE_KEYS.LAST_SYNCED_AT, serverTime)

    scheduleNextSync(SYNC_INTERVAL_MS)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    const currentErrors = store.consecutiveErrors
    store.incrementErrors()
    store.setStatus('error', msg)

    const delay = BACKOFF_DELAYS[Math.min(currentErrors, BACKOFF_DELAYS.length - 1)]
    scheduleNextSync(delay)
  } finally {
    isSyncing = false
  }
}

function handleAppStateChange(nextState: AppStateStatus): void {
  if (nextState === 'active') {
    void runSync()
  }
}

export function startSyncLoop(): void {
  void runSync()
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange)
}

export function stopSyncLoop(): void {
  if (nextSyncTimeout) { clearTimeout(nextSyncTimeout); nextSyncTimeout = null }
  if (appStateSubscription) { appStateSubscription.remove(); appStateSubscription = null }
  isSyncing = false
}
```

- [ ] **Step 2: Typecheck**

```bash
cd project-tracker && npx tsc --noEmit 2>&1 | grep "src/sync/service" || echo "No errors in service.ts"
```

Expected: no errors from service.ts.

- [ ] **Step 3: Run full test suite**

```bash
cd project-tracker && npm test 2>&1 | tail -5
```

Expected: all tests pass (service.ts has no unit tests — logic is integration-level).

- [ ] **Step 4: Commit**

```bash
git add project-tracker/src/sync/service.ts
git commit -m "feat(sync): push-pull service with exponential backoff and AppState trigger"
```

---

## Task 6: Wire Up in _layout.tsx (Bootstrap + Sync Loop)

**Files:**
- Modify: `project-tracker/app/_layout.tsx`

- [ ] **Step 1: Read current _layout.tsx**

Current content is:
```ts
import React from 'react'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { sqlite } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = React.useState(false)

  React.useEffect(() => {
    runMigrations(sqlite)
      .then(() => setIsDbReady(true))
      .catch((e) => { console.error('Migration failed', e); setIsDbReady(true) })
  }, [])

  if (!isDbReady) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="projects/new" options={{ title: 'Neues Projekt', presentation: 'modal' }} />
        <Stack.Screen name="projects/[id]" options={{ title: 'Projekt-Detail' }} />
        <Stack.Screen name="customers" options={{ title: 'Kunden' }} />
        <Stack.Screen name="customers/new" options={{ title: 'Neuer Kunde', presentation: 'modal' }} />
        <Stack.Screen name="order-types" options={{ title: 'Auftragsarten' }} />
        <Stack.Screen name="time-entries/[id]/edit" options={{ title: 'Zeiteintrag bearbeiten', presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}
```

- [ ] **Step 2: Replace _layout.tsx with bootstrapped version**

Replace the entire file with:

```ts
import React from 'react'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as SecureStore from 'expo-secure-store'
import { sqlite } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { useSyncStore } from '../src/store/syncStore'
import { startSyncLoop, stopSyncLoop } from '../src/sync/service'
import { apiBootstrap } from '../src/sync/api'
import { API_BASE_URL, BOOTSTRAP_DISPLAY_NAME, SECURE_KEYS } from '../src/sync/config'

async function initSync(): Promise<void> {
  const store = useSyncStore.getState()

  // Load or create JWT token
  let token = await SecureStore.getItemAsync(SECURE_KEYS.TOKEN)
  if (!token) {
    try {
      const result = await apiBootstrap(API_BASE_URL, BOOTSTRAP_DISPLAY_NAME)
      token = result.token
      await SecureStore.setItemAsync(SECURE_KEYS.TOKEN, token)
      await SecureStore.setItemAsync(SECURE_KEYS.USER_ID, result.userId)
    } catch (e) {
      console.warn('[sync] Bootstrap failed, working offline:', e)
      return
    }
  }
  store.setToken(token)

  // Restore lastSyncedAt
  const lastSyncedStr = await SecureStore.getItemAsync(SECURE_KEYS.LAST_SYNCED_AT)
  if (lastSyncedStr) {
    store.setLastSyncedAt(new Date(lastSyncedStr))
  }

  startSyncLoop()
}

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = React.useState(false)

  React.useEffect(() => {
    runMigrations(sqlite)
      .then(() => {
        setIsDbReady(true)
        void initSync()
      })
      .catch((e) => {
        console.error('Migration failed', e)
        setIsDbReady(true)
      })

    return () => stopSyncLoop()
  }, [])

  if (!isDbReady) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="projects/new" options={{ title: 'Neues Projekt', presentation: 'modal' }} />
        <Stack.Screen name="projects/[id]" options={{ title: 'Projekt-Detail' }} />
        <Stack.Screen name="customers" options={{ title: 'Kunden' }} />
        <Stack.Screen name="customers/new" options={{ title: 'Neuer Kunde', presentation: 'modal' }} />
        <Stack.Screen name="order-types" options={{ title: 'Auftragsarten' }} />
        <Stack.Screen name="time-entries/[id]/edit" options={{ title: 'Zeiteintrag bearbeiten', presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
cd project-tracker && npx tsc --noEmit 2>&1 | grep "_layout" || echo "No errors in _layout.tsx"
```

Expected: no errors from _layout.tsx.

- [ ] **Step 4: Run full test suite**

```bash
cd project-tracker && npm test 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add project-tracker/app/_layout.tsx
git commit -m "feat(sync): bootstrap JWT on first launch and start sync loop in _layout"
```

---

## Task 7: SyncIndicator Component + Settings Integration

**Files:**
- Create: `project-tracker/src/components/SyncIndicator.tsx`
- Modify: `project-tracker/app/(tabs)/settings.tsx`

- [ ] **Step 1: Create SyncIndicator.tsx**

Create `project-tracker/src/components/SyncIndicator.tsx`:

```ts
import { View, Text, StyleSheet } from 'react-native'
import { useSyncStore } from '../store/syncStore'

export function SyncIndicator() {
  const { status, lastError, lastSyncedAt } = useSyncStore()

  if (status === 'syncing') {
    return (
      <View style={styles.row}>
        <Text style={styles.dot}>●</Text>
        <Text style={styles.label}>Synchronisiert...</Text>
      </View>
    )
  }

  if (status === 'error') {
    return (
      <View style={styles.row}>
        <Text style={[styles.dot, styles.errorDot]}>●</Text>
        <Text style={[styles.label, styles.error]}>
          Sync-Fehler{lastError ? `: ${lastError}` : ''}
        </Text>
      </View>
    )
  }

  const timeStr = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : 'Noch nicht synchronisiert'

  return (
    <View style={styles.row}>
      <Text style={[styles.dot, styles.okDot]}>●</Text>
      <Text style={styles.label}>Synchronisiert: {timeStr}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  dot: { fontSize: 10, color: '#999' },
  okDot: { color: '#27AE60' },
  errorDot: { color: '#C0392B' },
  label: { fontSize: 13, color: '#666' },
  error: { color: '#C0392B' },
})
```

- [ ] **Step 2: Read current settings.tsx**

Read `project-tracker/app/(tabs)/settings.tsx` and note the current structure (list of NavigableRow items).

- [ ] **Step 3: Add SyncIndicator to settings.tsx**

Add `import { SyncIndicator } from '../../src/components/SyncIndicator'` at the top of settings.tsx.

Add a sync status section above (or below) the existing navigation rows. Example insertion point after the `<View style={styles.container}>` opening tag:

```tsx
<View style={styles.syncSection}>
  <SyncIndicator />
</View>
```

And add to StyleSheet:
```ts
syncSection: {
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: '#DDD',
},
```

- [ ] **Step 4: Typecheck**

```bash
cd project-tracker && npx tsc --noEmit 2>&1 | grep -E "settings|SyncIndicator" || echo "No errors"
```

Expected: no errors.

- [ ] **Step 5: Run full test suite**

```bash
cd project-tracker && npm test 2>&1 | tail -5
```

Expected: all tests pass (10 existing + 11 sync repo = 21 total).

- [ ] **Step 6: Commit**

```bash
git add project-tracker/src/components/SyncIndicator.tsx project-tracker/app/(tabs)/settings.tsx
git commit -m "feat(sync): SyncIndicator component in settings tab"
```

---

## Self-Review

Spec coverage check:
- [x] Push-Pull-Loop mit Exponential Backoff → service.ts `runSync` + `BACKOFF_DELAYS`
- [x] Sync-Trigger (App-Resume, periodisch 60s) → `AppState.addEventListener` + `scheduleNextSync(SYNC_INTERVAL_MS)`
- [x] Konfliktbehandlung (Server-Wins bei newer updatedAt) → `applyPull` `setWhere: excluded.updated_at > ...`
- [x] Soft-Delete-Sync → `deletedAt` field mapped in both `collectPushPayload` and `applyPull`
- [x] Sync-Indicator in UI → `SyncIndicator.tsx` in settings tab
- [ ] Pull-to-Refresh → not in TODO.md scope for 2C; screens don't have pull-to-refresh yet (can be wired per-screen in a follow-up by calling `runSync()` manually)
- [ ] Integration-Test 2-Geräte → tracked in TODO.md Phase 2 Tests section; requires real PG instance

No placeholders found. Type consistency: `PushPayload` used in api.ts matches `collectPushPayload` return type. `PullResponse` used in applyPull matches apiPull return type. `AnyDb` union type covers both test (better-sqlite3) and production (expo-sqlite) usage.
