# Phase 2B: Sync-Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `POST /v1/sync/push` and `GET /v1/sync/pull?since=<ts>` endpoints that enable Last-Write-Wins synchronisation between the mobile SQLite client and the PostgreSQL backend.

**Architecture:** The client pushes locally-changed records with `updated_at` timestamps; the server upserts them using `ON CONFLICT DO UPDATE … WHERE excluded.updated_at >= server.updated_at` (LWW). The pull endpoint returns all records for the user modified after a given `since` timestamp. Junction tables (`task_tags`, `project_tasks`) and `timers` use full-replace semantics because they have no `updated_at`.

**Tech Stack:** Hono 4.7, Drizzle ORM 0.43 (PG-dialect), Zod, Vitest, `@hono/zod-validator`, `hono/jwt`. All tests are in `packages/server`.

---

## File Structure

```
packages/server/src/
├── routes/
│   └── sync.ts          NEW — Zod schemas, createSyncRoute(db, jwtSecret)
├── repositories/
│   └── sync.ts          NEW — pullSince(db, userId, since), pushChanges(db, userId, body)
├── __tests__/
│   └── sync.test.ts     NEW — unit tests (schema) + integration tests (skipIf !DATABASE_URL)
└── app.ts               MODIFY — mount /v1/sync
```

---

## API Contract

### POST /v1/sync/push

**Auth:** `Authorization: Bearer <jwt>` required → 401 if absent/invalid.

**Request body** (all arrays are optional — only send changed records):
```json
{
  "orderTypes":    [{ "id", "name", "digit", "createdAt", "updatedAt", "deletedAt" }],
  "customers":     [{ "id", "customerNumber", "orderTypeId", "name", "street", "zip", "city", "createdAt", "updatedAt", "deletedAt" }],
  "projects":      [{ "id", "customerId", "title", "description", "color", "pricingMode", "hourlyRateCents", "fixedPriceCents", "status", "createdAt", "updatedAt", "deletedAt" }],
  "tasks":         [{ "id", "description", "createdAt", "updatedAt", "deletedAt" }],
  "tags":          [{ "id", "title", "createdAt", "updatedAt", "deletedAt" }],
  "timeEntries":   [{ "id", "projectId", "taskId", "startedAt", "endedAt", "rateSnapshotCents", "pricingModeSnapshot", "notes", "createdAt", "updatedAt", "deletedAt" }],
  "taskTags":      [{ "taskId", "tagId" }],     // optional — absent means "no change"
  "projectTasks":  [{ "projectId", "taskId" }], // optional — absent means "no change"
  "timers":        [{ "id", "projectId", "startedAt", "createdAt", "updatedAt" }], // optional — [] clears the active timer
  "appSettings":   { "pinHash", "biometricEnabled", "lastExportPeriod", "updatedAt" } // optional
}
```

**Notes:**
- `userId` is NEVER in the body — always taken from the JWT (`ctx.userId`).
- `durationSeconds` is a PG generated column — not in push payload, computed server-side.
- `taskTags`, `projectTasks`, `timers`: full-replace when present (absent = skip, `[]` = delete all).

**Response 200:**
```json
{ "serverTime": "2026-05-15T12:00:00.000Z" }
```

### GET /v1/sync/pull?since=\<ISO\>

**Auth:** same.

**Query param** `since`: ISO 8601 timestamp. Absent or empty → return ALL records (initial sync).

**Response 200:**
```json
{
  "orderTypes": [...], "customers": [...], "projects": [...], "tasks": [...],
  "tags": [...], "timeEntries": [...], "timers": [...],
  "taskTags": [...], "projectTasks": [...],
  "appSettings": { ... } | null,
  "serverTime": "2026-05-15T12:00:00.000Z"
}
```

`serverTime` is the current server clock — the client stores it as `lastPulledAt` for the next pull.

---

## Task 1: Zod Schemas + Schema Unit Tests

**Files:**
- Create: `packages/server/src/routes/sync.ts`
- Create: `packages/server/src/repositories/sync.ts` (stubs — real impl in Task 2)
- Create: `packages/server/src/__tests__/sync.test.ts` (unit tests only at this point)

- [ ] **Step 1: Write the failing unit tests**

Create `packages/server/src/__tests__/sync.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { pushBodySchema } from '../routes/sync.js'

describe('pushBodySchema — unit', () => {
  it('accepts an empty body (all arrays default to [])', () => {
    const r = pushBodySchema.safeParse({})
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.orderTypes).toEqual([])
      expect(r.data.customers).toEqual([])
      expect(r.data.projects).toEqual([])
      expect(r.data.tasks).toEqual([])
      expect(r.data.tags).toEqual([])
      expect(r.data.timeEntries).toEqual([])
      expect(r.data.taskTags).toBeUndefined()
      expect(r.data.projectTasks).toBeUndefined()
      expect(r.data.timers).toBeUndefined()
      expect(r.data.appSettings).toBeUndefined()
    }
  })

  it('accepts a valid orderType record', () => {
    const r = pushBodySchema.safeParse({
      orderTypes: [{
        id: '01930000-0000-7000-8000-000000000001',
        name: 'Hochzeitsfotografie',
        digit: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        deletedAt: null,
      }],
    })
    expect(r.success).toBe(true)
  })

  it('rejects an orderType with digit = 0 (min 1)', () => {
    const r = pushBodySchema.safeParse({
      orderTypes: [{
        id: '01930000-0000-7000-8000-000000000001',
        name: 'Test',
        digit: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        deletedAt: null,
      }],
    })
    expect(r.success).toBe(false)
  })

  it('rejects an orderType with digit = 10 (max 9)', () => {
    const r = pushBodySchema.safeParse({
      orderTypes: [{
        id: '01930000-0000-7000-8000-000000000001',
        name: 'Test',
        digit: 10,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        deletedAt: null,
      }],
    })
    expect(r.success).toBe(false)
  })

  it('rejects a project with invalid pricingMode', () => {
    const r = pushBodySchema.safeParse({
      projects: [{
        id: '01930000-0000-7000-8000-000000000002',
        customerId: '01930000-0000-7000-8000-000000000003',
        title: 'Project',
        description: null,
        color: '#FF0000',
        pricingMode: 'subscription',
        hourlyRateCents: null,
        fixedPriceCents: null,
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        deletedAt: null,
      }],
    })
    expect(r.success).toBe(false)
  })

  it('rejects a timeEntry with invalid pricingModeSnapshot', () => {
    const r = pushBodySchema.safeParse({
      timeEntries: [{
        id: '01930000-0000-7000-8000-000000000004',
        projectId: '01930000-0000-7000-8000-000000000005',
        taskId: '01930000-0000-7000-8000-000000000006',
        startedAt: '2026-01-01T08:00:00.000Z',
        endedAt: '2026-01-01T09:00:00.000Z',
        rateSnapshotCents: null,
        pricingModeSnapshot: 'unknown',
        notes: null,
        createdAt: '2026-01-01T08:00:00.000Z',
        updatedAt: '2026-01-01T08:00:00.000Z',
        deletedAt: null,
      }],
    })
    expect(r.success).toBe(false)
  })

  it('accepts taskTags as undefined (absent) vs empty array []', () => {
    expect(pushBodySchema.parse({}).taskTags).toBeUndefined()
    expect(pushBodySchema.parse({ taskTags: [] }).taskTags).toEqual([])
  })

  it('accepts appSettings with all fields', () => {
    const r = pushBodySchema.safeParse({
      appSettings: {
        pinHash: null,
        biometricEnabled: false,
        lastExportPeriod: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    })
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /path/to/Projekt-Tracker/packages/server && pnpm vitest run src/__tests__/sync.test.ts
```
Expected: FAIL — `Cannot find module '../routes/sync.js'`

- [ ] **Step 3: Create stub repository (so route imports resolve)**

Create `packages/server/src/repositories/sync.ts`:

```typescript
import type { Db } from '../db.js'
import type { PushBody } from '../routes/sync.js'

// Stub — implemented in Task 2
export async function pullSince(
  _db: Db,
  _userId: string,
  _since: Date | null,
): Promise<never> {
  throw new Error('not implemented')
}

export async function pushChanges(
  _db: Db,
  _userId: string,
  _body: PushBody,
): Promise<void> {
  throw new Error('not implemented')
}
```

- [ ] **Step 4: Create routes/sync.ts with schemas + route factory**

Create `packages/server/src/routes/sync.ts`:

```typescript
import { z } from 'zod'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { Db } from '../db.js'
import type { AppVariables } from '../middleware/auth.js'
import { createAuthMiddleware } from '../middleware/auth.js'
import { pushChanges, pullSince } from '../repositories/sync.js'

const isoDatetime = z.string().datetime()
const nullableIso = z.string().datetime().nullable()

const orderTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  digit: z.number().int().min(1).max(9),
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
  deletedAt: nullableIso,
})

const customerSchema = z.object({
  id: z.string().uuid(),
  customerNumber: z.string().min(1).max(8),
  orderTypeId: z.string().uuid(),
  name: z.string().min(1),
  street: z.string().nullable(),
  zip: z.string().max(10).nullable(),
  city: z.string().nullable(),
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
  deletedAt: nullableIso,
})

const projectSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  pricingMode: z.enum(['hourly', 'fixed']),
  hourlyRateCents: z.number().int().nullable(),
  fixedPriceCents: z.number().int().nullable(),
  status: z.enum(['active', 'archived']),
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
  deletedAt: nullableIso,
})

const taskSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1),
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
  deletedAt: nullableIso,
})

const tagSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
  deletedAt: nullableIso,
})

const taskTagSchema = z.object({
  taskId: z.string().uuid(),
  tagId: z.string().uuid(),
})

const projectTaskSchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
})

const timeEntrySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  startedAt: isoDatetime,
  endedAt: isoDatetime,
  rateSnapshotCents: z.number().int().nullable(),
  pricingModeSnapshot: z.enum(['hourly', 'fixed']),
  notes: z.string().nullable(),
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
  deletedAt: nullableIso,
})

const timerSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  startedAt: isoDatetime,
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
})

const appSettingsSchema = z.object({
  pinHash: z.string().nullable(),
  biometricEnabled: z.boolean(),
  lastExportPeriod: z.string().nullable(),
  updatedAt: isoDatetime,
})

export const pushBodySchema = z.object({
  orderTypes:   z.array(orderTypeSchema).default([]),
  customers:    z.array(customerSchema).default([]),
  projects:     z.array(projectSchema).default([]),
  tasks:        z.array(taskSchema).default([]),
  tags:         z.array(tagSchema).default([]),
  timeEntries:  z.array(timeEntrySchema).default([]),
  taskTags:     z.array(taskTagSchema).optional(),
  projectTasks: z.array(projectTaskSchema).optional(),
  timers:       z.array(timerSchema).optional(),
  appSettings:  appSettingsSchema.nullable().optional(),
})

export type PushBody = z.infer<typeof pushBodySchema>

export function createSyncRoute(db: Db, jwtSecret: string) {
  const route = new Hono<{ Variables: AppVariables }>()
  route.use('*', createAuthMiddleware(jwtSecret))

  route.post('/push', zValidator('json', pushBodySchema), async (c) => {
    const userId = c.get('userId')
    const body = c.req.valid('json')
    await pushChanges(db, userId, body)
    return c.json({ serverTime: new Date().toISOString() })
  })

  route.get('/pull', async (c) => {
    const userId = c.get('userId')
    const sinceStr = c.req.query('since')
    let since: Date | null = null
    if (sinceStr) {
      since = new Date(sinceStr)
      if (isNaN(since.getTime())) {
        return c.json({ error: 'Invalid since parameter' }, 400)
      }
    }
    const data = await pullSince(db, userId, since)
    return c.json({ ...data, serverTime: new Date().toISOString() })
  })

  return route
}
```

- [ ] **Step 5: Run unit tests — verify they pass**

```bash
cd packages/server && pnpm vitest run src/__tests__/sync.test.ts
```
Expected: 7/7 unit tests PASS (integration tests don't exist yet).

- [ ] **Step 6: Typecheck**

```bash
cd packages/server && pnpm typecheck
```
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/routes/sync.ts \
        packages/server/src/repositories/sync.ts \
        packages/server/src/__tests__/sync.test.ts
git commit -m "feat(sync): Zod schemas + stub repository for Phase 2B sync endpoints"
```

---

## Task 2: Sync Repository — pullSince + pushChanges

**Files:**
- Modify: `packages/server/src/repositories/sync.ts` (replace stubs with real implementations)

- [ ] **Step 1: Implement pullSince**

Replace `packages/server/src/repositories/sync.ts` with:

```typescript
import { and, eq, gte, sql } from 'drizzle-orm'
import type { Db } from '../db.js'
import * as schema from '@projekt-tracker/schema/pg'
import type { PushBody } from '../routes/sync.js'

export async function pullSince(
  db: Db,
  userId: string,
  since: Date | null,
) {
  const [
    orderTypes,
    customers,
    projects,
    tasks,
    tags,
    timeEntries,
    timers,
    taskTagsRows,
    projectTasksRows,
    appSettingsRows,
  ] = await Promise.all([
    db.select().from(schema.orderTypes).where(
      since
        ? and(eq(schema.orderTypes.userId, userId), gte(schema.orderTypes.updatedAt, since))
        : eq(schema.orderTypes.userId, userId),
    ),
    db.select().from(schema.customers).where(
      since
        ? and(eq(schema.customers.userId, userId), gte(schema.customers.updatedAt, since))
        : eq(schema.customers.userId, userId),
    ),
    db.select().from(schema.projects).where(
      since
        ? and(eq(schema.projects.userId, userId), gte(schema.projects.updatedAt, since))
        : eq(schema.projects.userId, userId),
    ),
    db.select().from(schema.tasks).where(
      since
        ? and(eq(schema.tasks.userId, userId), gte(schema.tasks.updatedAt, since))
        : eq(schema.tasks.userId, userId),
    ),
    db.select().from(schema.tags).where(
      since
        ? and(eq(schema.tags.userId, userId), gte(schema.tags.updatedAt, since))
        : eq(schema.tags.userId, userId),
    ),
    db.select().from(schema.timeEntries).where(
      since
        ? and(eq(schema.timeEntries.userId, userId), gte(schema.timeEntries.updatedAt, since))
        : eq(schema.timeEntries.userId, userId),
    ),
    // Timers, junction tables, appSettings: always return full set (no updated_at filter)
    db.select().from(schema.timers).where(eq(schema.timers.userId, userId)),
    db.select().from(schema.taskTags).where(eq(schema.taskTags.userId, userId)),
    db.select().from(schema.projectTasks).where(eq(schema.projectTasks.userId, userId)),
    db.select().from(schema.appSettings).where(eq(schema.appSettings.userId, userId)),
  ])

  return {
    orderTypes,
    customers,
    projects,
    tasks,
    tags,
    timeEntries,
    timers,
    taskTags: taskTagsRows,
    projectTasks: projectTasksRows,
    appSettings: appSettingsRows[0] ?? null,
  }
}

export async function pushChanges(
  db: Db,
  userId: string,
  body: PushBody,
): Promise<void> {
  await db.transaction(async (tx) => {
    // Insert order matters: respect FK dependencies
    // 1. order_types (refs users)
    if (body.orderTypes.length > 0) {
      await tx
        .insert(schema.orderTypes)
        .values(body.orderTypes.map(r => ({
          id: r.id,
          userId,
          name: r.name,
          digit: r.digit,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
          deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
        })))
        .onConflictDoUpdate({
          target: schema.orderTypes.id,
          set: {
            name:      sql`excluded.name`,
            digit:     sql`excluded.digit`,
            updatedAt: sql`excluded.updated_at`,
            deletedAt: sql`excluded.deleted_at`,
          },
          setWhere: sql`excluded.updated_at >= order_types.updated_at`,
        })
    }

    // 2. customers (refs users, order_types)
    if (body.customers.length > 0) {
      await tx
        .insert(schema.customers)
        .values(body.customers.map(r => ({
          id: r.id,
          userId,
          customerNumber: r.customerNumber,
          orderTypeId:    r.orderTypeId,
          name:  r.name,
          street: r.street,
          zip:   r.zip,
          city:  r.city,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
          deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
        })))
        .onConflictDoUpdate({
          target: schema.customers.id,
          set: {
            customerNumber: sql`excluded.customer_number`,
            orderTypeId:    sql`excluded.order_type_id`,
            name:      sql`excluded.name`,
            street:    sql`excluded.street`,
            zip:       sql`excluded.zip`,
            city:      sql`excluded.city`,
            updatedAt: sql`excluded.updated_at`,
            deletedAt: sql`excluded.deleted_at`,
          },
          setWhere: sql`excluded.updated_at >= customers.updated_at`,
        })
    }

    // 3. tasks (refs users)
    if (body.tasks.length > 0) {
      await tx
        .insert(schema.tasks)
        .values(body.tasks.map(r => ({
          id: r.id,
          userId,
          description: r.description,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
          deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
        })))
        .onConflictDoUpdate({
          target: schema.tasks.id,
          set: {
            description: sql`excluded.description`,
            updatedAt:   sql`excluded.updated_at`,
            deletedAt:   sql`excluded.deleted_at`,
          },
          setWhere: sql`excluded.updated_at >= tasks.updated_at`,
        })
    }

    // 4. tags (refs users)
    if (body.tags.length > 0) {
      await tx
        .insert(schema.tags)
        .values(body.tags.map(r => ({
          id: r.id,
          userId,
          title: r.title,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
          deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
        })))
        .onConflictDoUpdate({
          target: schema.tags.id,
          set: {
            title:     sql`excluded.title`,
            updatedAt: sql`excluded.updated_at`,
            deletedAt: sql`excluded.deleted_at`,
          },
          setWhere: sql`excluded.updated_at >= tags.updated_at`,
        })
    }

    // 5. projects (refs users, customers)
    if (body.projects.length > 0) {
      await tx
        .insert(schema.projects)
        .values(body.projects.map(r => ({
          id: r.id,
          userId,
          customerId:      r.customerId,
          title:           r.title,
          description:     r.description,
          color:           r.color,
          pricingMode:     r.pricingMode,
          hourlyRateCents: r.hourlyRateCents,
          fixedPriceCents: r.fixedPriceCents,
          status:          r.status,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
          deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
        })))
        .onConflictDoUpdate({
          target: schema.projects.id,
          set: {
            customerId:      sql`excluded.customer_id`,
            title:           sql`excluded.title`,
            description:     sql`excluded.description`,
            color:           sql`excluded.color`,
            pricingMode:     sql`excluded.pricing_mode`,
            hourlyRateCents: sql`excluded.hourly_rate_cents`,
            fixedPriceCents: sql`excluded.fixed_price_cents`,
            status:          sql`excluded.status`,
            updatedAt:       sql`excluded.updated_at`,
            deletedAt:       sql`excluded.deleted_at`,
          },
          setWhere: sql`excluded.updated_at >= projects.updated_at`,
        })
    }

    // 6. time_entries (refs users, projects, tasks)
    // NOTE: durationSeconds is a PG generated column — not included in INSERT values
    if (body.timeEntries.length > 0) {
      await tx
        .insert(schema.timeEntries)
        .values(body.timeEntries.map(r => ({
          id:                  r.id,
          userId,
          projectId:           r.projectId,
          taskId:              r.taskId,
          startedAt:           new Date(r.startedAt),
          endedAt:             new Date(r.endedAt),
          rateSnapshotCents:   r.rateSnapshotCents,
          pricingModeSnapshot: r.pricingModeSnapshot,
          notes:               r.notes,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
          deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
        })))
        .onConflictDoUpdate({
          target: schema.timeEntries.id,
          set: {
            projectId:           sql`excluded.project_id`,
            taskId:              sql`excluded.task_id`,
            startedAt:           sql`excluded.started_at`,
            endedAt:             sql`excluded.ended_at`,
            rateSnapshotCents:   sql`excluded.rate_snapshot_cents`,
            pricingModeSnapshot: sql`excluded.pricing_mode_snapshot`,
            notes:               sql`excluded.notes`,
            updatedAt:           sql`excluded.updated_at`,
            deletedAt:           sql`excluded.deleted_at`,
          },
          setWhere: sql`excluded.updated_at >= time_entries.updated_at`,
        })
    }

    // 7. timers — full replace (unique constraint on user_id; at most 1 per user)
    //    If body.timers is undefined → no change. [] → delete active timer.
    if (body.timers !== undefined) {
      await tx.delete(schema.timers).where(eq(schema.timers.userId, userId))
      if (body.timers.length > 0) {
        await tx.insert(schema.timers).values(
          body.timers.map(r => ({
            id:        r.id,
            userId,
            projectId: r.projectId,
            startedAt: new Date(r.startedAt),
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
          })),
        )
      }
    }

    // 8. task_tags — full replace per user if field provided
    if (body.taskTags !== undefined) {
      await tx.delete(schema.taskTags).where(eq(schema.taskTags.userId, userId))
      if (body.taskTags.length > 0) {
        await tx
          .insert(schema.taskTags)
          .values(body.taskTags.map(r => ({ taskId: r.taskId, tagId: r.tagId, userId })))
          .onConflictDoNothing()
      }
    }

    // 9. project_tasks — full replace per user if field provided
    if (body.projectTasks !== undefined) {
      await tx.delete(schema.projectTasks).where(eq(schema.projectTasks.userId, userId))
      if (body.projectTasks.length > 0) {
        await tx
          .insert(schema.projectTasks)
          .values(body.projectTasks.map(r => ({ projectId: r.projectId, taskId: r.taskId, userId })))
          .onConflictDoNothing()
      }
    }

    // 10. app_settings (PK = userId)
    if (body.appSettings != null) {
      await tx
        .insert(schema.appSettings)
        .values({
          userId,
          pinHash:          body.appSettings.pinHash,
          biometricEnabled: body.appSettings.biometricEnabled,
          lastExportPeriod: body.appSettings.lastExportPeriod,
          updatedAt:        new Date(body.appSettings.updatedAt),
        })
        .onConflictDoUpdate({
          target: schema.appSettings.userId,
          set: {
            pinHash:          sql`excluded.pin_hash`,
            biometricEnabled: sql`excluded.biometric_enabled`,
            lastExportPeriod: sql`excluded.last_export_period`,
            updatedAt:        sql`excluded.updated_at`,
          },
          setWhere: sql`excluded.updated_at >= app_settings.updated_at`,
        })
    }
  })
}
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/server && pnpm typecheck
```
Expected: 0 errors. (Unit tests still pass — they don't call the repository.)

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/repositories/sync.ts
git commit -m "feat(sync): implement pullSince + pushChanges with LWW upserts"
```

---

## Task 3: Integration Tests + Route Wired Up

**Files:**
- Modify: `packages/server/src/__tests__/sync.test.ts` (add integration tests below the unit tests)

- [ ] **Step 1: Write failing integration tests**

Append to `packages/server/src/__tests__/sync.test.ts` (after the unit test `describe` block):

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as schema from '@projekt-tracker/schema/pg'
import { createBootstrapRoute } from '../routes/auth.js'
import { createSyncRoute } from '../routes/sync.js'
import type { AppVariables } from '../middleware/auth.js'

const DB_URL = process.env.DATABASE_URL
const SECRET = 'integration-test-secret-32chars!!'

describe.skipIf(!DB_URL)('Sync endpoints (integration)', () => {
  let sql: ReturnType<typeof postgres>
  let db: ReturnType<typeof drizzle<typeof schema>>
  let userId: string
  let token: string
  let app: Hono<{ Variables: AppVariables }>

  beforeAll(async () => {
    sql = postgres(DB_URL!, { max: 5 })
    db = drizzle(sql, { schema })

    const migrationsFolder = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../migrations',
    )
    const migSql = postgres(DB_URL!, { max: 1 })
    await migrate(drizzle(migSql), { migrationsFolder })
    await migSql.end()

    // Bootstrap a test user
    const bootstrapApp = new Hono<{ Variables: AppVariables }>()
    bootstrapApp.route('/v1/auth', createBootstrapRoute(db, SECRET))
    const res = await bootstrapApp.request('/v1/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Sync Integration Test User' }),
    })
    const body = await res.json() as { token: string; userId: string }
    token = body.token
    userId = body.userId

    app = new Hono<{ Variables: AppVariables }>()
    app.route('/v1/sync', createSyncRoute(db, SECRET))
  })

  afterAll(async () => {
    await sql.end()
  })

  // -- Auth tests --

  it('GET /v1/sync/pull returns 401 without token', async () => {
    const res = await app.request('/v1/sync/pull')
    expect(res.status).toBe(401)
  })

  it('POST /v1/sync/push returns 401 without token', async () => {
    const res = await app.request('/v1/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(401)
  })

  // -- Pull tests --

  it('GET /v1/sync/pull returns empty arrays for new user', async () => {
    const res = await app.request('/v1/sync/pull', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.orderTypes).toEqual([])
    expect(body.customers).toEqual([])
    expect(body.projects).toEqual([])
    expect(body.tasks).toEqual([])
    expect(body.tags).toEqual([])
    expect(body.timeEntries).toEqual([])
    expect(body.timers).toEqual([])
    expect(body.taskTags).toEqual([])
    expect(body.projectTasks).toEqual([])
    expect(body.appSettings).toBeNull()
    expect(typeof body.serverTime).toBe('string')
  })

  it('GET /v1/sync/pull returns 400 for invalid since param', async () => {
    const res = await app.request('/v1/sync/pull?since=not-a-date', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(400)
  })

  // -- Push + pull roundtrip --

  it('POST /v1/sync/push creates an order type, pull returns it', async () => {
    const orderTypeId = '01930001-0000-7000-8000-000000000001'
    const now = new Date().toISOString()

    const pushRes = await app.request('/v1/sync/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderTypes: [{
          id: orderTypeId,
          name: 'Sync Test Art',
          digit: 3,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        }],
      }),
    })
    expect(pushRes.status).toBe(200)
    const pushBody = await pushRes.json() as { serverTime: string }
    expect(typeof pushBody.serverTime).toBe('string')

    // Pull should return the pushed order type
    const pullRes = await app.request('/v1/sync/pull', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(pullRes.status).toBe(200)
    const pullBody = await pullRes.json() as { orderTypes: { id: string; name: string }[] }
    const found = pullBody.orderTypes.find(o => o.id === orderTypeId)
    expect(found).toBeDefined()
    expect(found?.name).toBe('Sync Test Art')
  })

  // -- LWW: server version wins when newer --

  it('push with older updated_at does not overwrite server record', async () => {
    const orderTypeId = '01930002-0000-7000-8000-000000000001'
    const serverTime = new Date('2026-05-15T10:00:00.000Z').toISOString()
    const olderTime = new Date('2026-05-15T09:00:00.000Z').toISOString()

    // First push: establish server record with serverTime
    await app.request('/v1/sync/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderTypes: [{
          id: orderTypeId,
          name: 'Original Name',
          digit: 4,
          createdAt: serverTime,
          updatedAt: serverTime,
          deletedAt: null,
        }],
      }),
    })

    // Second push: older updated_at — server should NOT update
    await app.request('/v1/sync/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderTypes: [{
          id: orderTypeId,
          name: 'Stale Name',
          digit: 4,
          createdAt: serverTime,
          updatedAt: olderTime,
          deletedAt: null,
        }],
      }),
    })

    // Pull: original name should be preserved
    const pullRes = await app.request('/v1/sync/pull', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const pullBody = await pullRes.json() as { orderTypes: { id: string; name: string }[] }
    const found = pullBody.orderTypes.find(o => o.id === orderTypeId)
    expect(found?.name).toBe('Original Name')
  })

  // -- Timers: full replace semantics --

  it('push timers=[] clears the active timer', async () => {
    // First: create an order type and project to satisfy FK
    const otId = '01930003-0000-7000-8000-000000000001'
    const custId = '01930003-0000-7000-8000-000000000002'
    const projId = '01930003-0000-7000-8000-000000000003'
    const timerId = '01930003-0000-7000-8000-000000000004'
    const now = new Date().toISOString()

    await app.request('/v1/sync/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderTypes: [{ id: otId, name: 'Timer Test Art', digit: 5, createdAt: now, updatedAt: now, deletedAt: null }],
        customers: [{ id: custId, customerNumber: '26500A01', orderTypeId: otId, name: 'Timer Test Kunde', street: null, zip: null, city: null, createdAt: now, updatedAt: now, deletedAt: null }],
        projects: [{ id: projId, customerId: custId, title: 'Timer Test Projekt', description: null, color: '#FF0000', pricingMode: 'hourly', hourlyRateCents: 8000, fixedPriceCents: null, status: 'active', createdAt: now, updatedAt: now, deletedAt: null }],
        timers: [{ id: timerId, projectId: projId, startedAt: now, createdAt: now, updatedAt: now }],
      }),
    })

    // Verify timer is present
    const before = await app.request('/v1/sync/pull', { headers: { Authorization: `Bearer ${token}` } })
    const beforeBody = await before.json() as { timers: { id: string }[] }
    expect(beforeBody.timers.some(t => t.id === timerId)).toBe(true)

    // Push empty timers → clears active timer
    await app.request('/v1/sync/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timers: [] }),
    })

    const after = await app.request('/v1/sync/pull', { headers: { Authorization: `Bearer ${token}` } })
    const afterBody = await after.json() as { timers: unknown[] }
    expect(afterBody.timers).toEqual([])
  })

  // -- Pull with since filter --

  it('GET /pull?since=<ts> returns only records updated after ts', async () => {
    const beforeTs = new Date().toISOString()
    await new Promise(resolve => setTimeout(resolve, 10)) // ensure updated_at > beforeTs

    const otId = '01930004-0000-7000-8000-000000000001'
    const after = new Date().toISOString()

    await app.request('/v1/sync/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderTypes: [{ id: otId, name: 'Since Test Art', digit: 6, createdAt: after, updatedAt: after, deletedAt: null }],
      }),
    })

    const res = await app.request(`/v1/sync/pull?since=${encodeURIComponent(beforeTs)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { orderTypes: { id: string }[] }
    expect(body.orderTypes.some(o => o.id === otId)).toBe(true)

    // Pull with a future since → should NOT include the record
    const futureTs = new Date(Date.now() + 60_000).toISOString()
    const resEmpty = await app.request(`/v1/sync/pull?since=${encodeURIComponent(futureTs)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const bodyEmpty = await resEmpty.json() as { orderTypes: { id: string }[] }
    expect(bodyEmpty.orderTypes.some(o => o.id === otId)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify integration tests skip (no DB) and unit tests still pass**

```bash
cd packages/server && pnpm vitest run src/__tests__/sync.test.ts
```
Expected: 7 unit tests PASS, integration tests SKIP (no DATABASE_URL in env).

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/__tests__/sync.test.ts
git commit -m "test(sync): integration tests for push/pull endpoints (skipIf !DATABASE_URL)"
```

---

## Task 4: Wire Up in app.ts + Full Verification

**Files:**
- Modify: `packages/server/src/app.ts`

- [ ] **Step 1: Mount sync route in app.ts**

Edit `packages/server/src/app.ts`:

```typescript
import { Hono } from 'hono'
import { healthRoute } from './routes/health.js'
import { createBootstrapRoute } from './routes/auth.js'
import { createSyncRoute } from './routes/sync.js'
import { db } from './db.js'
import { env } from './env.js'
import type { AppVariables } from './middleware/auth.js'

export function createApp(): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>()
  app.route('/v1', healthRoute)
  app.route('/v1/auth', createBootstrapRoute(db, env.JWT_SECRET))
  app.route('/v1/sync', createSyncRoute(db, env.JWT_SECRET))
  return app
}
```

- [ ] **Step 2: Typecheck the whole server package**

```bash
cd packages/server && pnpm typecheck
```
Expected: 0 errors.

- [ ] **Step 3: Run all server tests**

```bash
cd packages/server && pnpm vitest run
```
Expected: all unit tests PASS, integration tests SKIP (or PASS if DATABASE_URL is set).

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/app.ts
git commit -m "feat(sync): mount /v1/sync/push + /v1/sync/pull — Phase 2B complete"
```

---

## Self-Review

### Spec Coverage Check

| Requirement | Covered by |
|---|---|
| `POST /v1/sync/push` — batch upsert with `updated_at` | Task 2 `pushChanges`, Task 3 route |
| `GET /v1/sync/pull?since=<ts>` — incremental pull | Task 2 `pullSince`, Task 3 route |
| LWW: server wins if `server.updated_at > client.updated_at` | `setWhere: excluded.updated_at >= table.updated_at` |
| Auth required (JWT) | `createAuthMiddleware` on `route.use('*', ...)` |
| Multi-tenant isolation: all queries scoped to `userId` | `eq(table.userId, userId)` on every query |
| Soft-delete sync: `deleted_at` transmitted | `deletedAt` in push payload + pulled in responses |
| Junction tables (task_tags, project_tasks): full-replace | Delete+insert in transaction if field present |
| Timer: unique per user, full-replace on push | Delete+insert in transaction if `body.timers !== undefined` |
| `serverTime` in both push response and pull response | Route handlers: `new Date().toISOString()` |
| `durationSeconds` not in push (generated column) | Excluded from `timeEntries.map()` in pushChanges |
| 400 for invalid `since` param | `isNaN(since.getTime())` guard in GET /pull handler |
| Zod validation on all push fields | `pushBodySchema` + `zValidator` middleware |

### Placeholder Scan ✅

No TBD, TODO, or unimplemented steps. All code blocks are complete.

### Type Consistency ✅

- `PushBody` is exported from `routes/sync.ts` and imported in `repositories/sync.ts`
- `pullSince` return type is inferred from Drizzle selects
- `createSyncRoute` consumes both functions with matching signatures
