# Phase 3 Excel-Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side Excel export (ExcelJS) and a mobile export screen with date-range picker and system share sheet, so the freelancer can generate monthly billing reports.

**Architecture:** Server generates `.xlsx` via ExcelJS from a Drizzle JOIN query grouped by customer + project + task. Mobile downloads the binary via fetch, writes it to `FileSystem.cacheDirectory`, and opens the system share sheet via `expo-sharing`. Auth via existing JWT Bearer middleware.

**Tech Stack:** ExcelJS (server), expo-sharing + expo-file-system (mobile), existing Hono + Drizzle + JWT stack.

---

## File Map

**Server (`packages/server/`):**
- NEW: `src/repositories/export.ts` — Drizzle JOIN query: time entries + customer + project + task, grouped and aggregated
- NEW: `src/services/excelRenderer.ts` — ExcelJS workbook generation (hourly vs. fixed-price logic, tags)
- NEW: `src/routes/export.ts` — GET /v1/exports/excel (auth protected, Zod query validation)
- NEW: `src/__tests__/excelRenderer.test.ts` — unit tests for renderer (no DB)
- MOD: `src/__tests__/export.test.ts` — integration tests for repository + Zod unit tests for route schema
- MOD: `src/app.ts` — mount `/v1/exports` route
- MOD: `package.json` — add `exceljs`

**Mobile (`project-tracker/`):**
- NEW: `app/export/index.tsx` — export screen (date inputs + customer picker + share logic)
- MOD: `src/sync/api.ts` — add `apiExportExcel` function (returns `ArrayBuffer`)
- MOD: `app/_layout.tsx` — declare `export` stack screen
- MOD: `app/(tabs)/settings.tsx` — add "Export erstellen" row
- MOD: `package.json` — add `expo-sharing` and `expo-file-system`

---

### Task 1: Install dependencies

**Files:**
- Modify: `packages/server/package.json`
- Modify: `project-tracker/package.json`

- [ ] **Step 1: Add exceljs to server**

```bash
cd packages/server && pnpm add exceljs && cd ../..
```

Expected: `"exceljs"` appears in `packages/server/package.json` under `dependencies`.

- [ ] **Step 2: Add expo-sharing + expo-file-system to mobile**

```bash
cd project-tracker && npx expo install expo-sharing expo-file-system && cd ..
```

Expected: both packages appear in `project-tracker/package.json` with SDK-54 compatible versions.

- [ ] **Step 3: Commit**

```bash
git add packages/server/package.json project-tracker/package.json pnpm-lock.yaml
git commit -m "chore(deps): add exceljs, expo-sharing, expo-file-system"
```

---

### Task 2: Export repository (TDD — integration tests skip without DATABASE_URL)

**Files:**
- Create: `packages/server/src/repositories/export.ts`
- Create: `packages/server/src/__tests__/export.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `packages/server/src/__tests__/export.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '@projekt-tracker/schema/pg'
import { queryExportData } from '../repositories/export.js'

const DATABASE_URL = process.env.DATABASE_URL
const skipIf = !DATABASE_URL

const userId   = 'eeeeeeee-0000-0000-0000-000000000001'
const otId     = 'eeeeeeee-0000-0000-0000-000000000002'
const custId   = 'eeeeeeee-0000-0000-0000-000000000003'
const taskId   = 'eeeeeeee-0000-0000-0000-000000000004'
const projId   = 'eeeeeeee-0000-0000-0000-000000000005'
const teId     = 'eeeeeeee-0000-0000-0000-000000000006'
const cust2Id  = 'eeeeeeee-0000-0000-0000-000000000007'
const proj2Id  = 'eeeeeeee-0000-0000-0000-000000000008'
const task2Id  = 'eeeeeeee-0000-0000-0000-000000000009'
const te2Id    = 'eeeeeeee-0000-0000-0000-000000000010'

describe.skipIf(skipIf)('queryExportData', () => {
  let client: ReturnType<typeof postgres>
  let db: ReturnType<typeof drizzle<typeof schema>>

  beforeEach(async () => {
    client = postgres(DATABASE_URL!)
    db = drizzle(client, { schema })

    await client`INSERT INTO users (id, display_name) VALUES (${userId}, 'ExportTest') ON CONFLICT (id) DO NOTHING`
    await client`INSERT INTO order_types (id, user_id, name, digit, created_at, updated_at) VALUES (${otId}, ${userId}, 'Test', 9, now(), now()) ON CONFLICT (id) DO NOTHING`
    await client`INSERT INTO customers (id, user_id, customer_number, order_type_id, name, street, zip, city, created_at, updated_at) VALUES (${custId}, ${userId}, '26901', ${otId}, 'Müller', 'Hauptstr. 1', '12345', 'Berlin', now(), now()) ON CONFLICT (id) DO NOTHING`
    await client`INSERT INTO tasks (id, user_id, description, created_at, updated_at) VALUES (${taskId}, ${userId}, 'Bildbearbeitung', now(), now()) ON CONFLICT (id) DO NOTHING`
    await client`INSERT INTO projects (id, user_id, customer_id, title, color, pricing_mode, hourly_rate_cents, status, created_at, updated_at) VALUES (${projId}, ${userId}, ${custId}, 'Hochzeit Müller', '#4A90D9', 'hourly', 8000, 'active', now(), now()) ON CONFLICT (id) DO NOTHING`
    // 2h @ 80€/h → 7200s → 16000 cents
    await client`INSERT INTO time_entries (id, user_id, project_id, task_id, started_at, ended_at, rate_snapshot_cents, pricing_mode_snapshot, created_at, updated_at) VALUES (${teId}, ${userId}, ${projId}, ${taskId}, '2026-05-10 10:00:00Z', '2026-05-10 12:00:00Z', 8000, 'hourly', now(), now()) ON CONFLICT (id) DO NOTHING`

    // Second customer with fixed-price project
    await client`INSERT INTO customers (id, user_id, customer_number, order_type_id, name, created_at, updated_at) VALUES (${cust2Id}, ${userId}, '26902', ${otId}, 'Schmidt', now(), now()) ON CONFLICT (id) DO NOTHING`
    await client`INSERT INTO tasks (id, user_id, description, created_at, updated_at) VALUES (${task2Id}, ${userId}, 'Design', now(), now()) ON CONFLICT (id) DO NOTHING`
    await client`INSERT INTO projects (id, user_id, customer_id, title, color, pricing_mode, fixed_price_cents, status, created_at, updated_at) VALUES (${proj2Id}, ${userId}, ${cust2Id}, 'Logo Schmidt', '#000000', 'fixed', 50000, 'active', now(), now()) ON CONFLICT (id) DO NOTHING`
    await client`INSERT INTO time_entries (id, user_id, project_id, task_id, started_at, ended_at, rate_snapshot_cents, pricing_mode_snapshot, created_at, updated_at) VALUES (${te2Id}, ${userId}, ${proj2Id}, ${task2Id}, '2026-05-11 09:00:00Z', '2026-05-11 10:00:00Z', NULL, 'fixed', now(), now()) ON CONFLICT (id) DO NOTHING`
  })

  afterEach(async () => {
    await client`DELETE FROM time_entries WHERE user_id = ${userId}`
    await client`DELETE FROM project_tasks WHERE user_id = ${userId}`
    await client`DELETE FROM task_tags WHERE user_id = ${userId}`
    await client`DELETE FROM timers WHERE user_id = ${userId}`
    await client`DELETE FROM projects WHERE user_id = ${userId}`
    await client`DELETE FROM tasks WHERE user_id = ${userId}`
    await client`DELETE FROM customers WHERE user_id = ${userId}`
    await client`DELETE FROM order_types WHERE user_id = ${userId}`
    await client`DELETE FROM users WHERE id = ${userId}`
    await client.end()
  })

  it('returns one row per project+task combination', async () => {
    const { rows } = await queryExportData(db as any, userId, new Date('2026-05-01Z'), new Date('2026-06-01Z'))
    expect(rows).toHaveLength(2)
  })

  it('hourly row has correct aggregated seconds and amount', async () => {
    const { rows } = await queryExportData(db as any, userId, new Date('2026-05-01Z'), new Date('2026-06-01Z'))
    const hourly = rows.find(r => r.pricingMode === 'hourly')!
    expect(hourly.customerNumber).toBe('26901')
    expect(hourly.totalSeconds).toBe(7200)
    expect(hourly.totalAmountCents).toBe(16000)
    expect(hourly.hourlyRateCents).toBe(8000)
  })

  it('fixed-price row has totalSeconds but zero amountCents', async () => {
    const { rows } = await queryExportData(db as any, userId, new Date('2026-05-01Z'), new Date('2026-06-01Z'))
    const fixed = rows.find(r => r.pricingMode === 'fixed')!
    expect(fixed.fixedPriceCents).toBe(50000)
    expect(fixed.totalSeconds).toBe(3600)
    expect(fixed.totalAmountCents).toBe(0)
  })

  it('excludes entries outside date range', async () => {
    const { rows } = await queryExportData(db as any, userId, new Date('2026-04-01Z'), new Date('2026-05-01Z'))
    expect(rows).toHaveLength(0)
  })

  it('filters by customerId', async () => {
    const { rows } = await queryExportData(db as any, userId, new Date('2026-05-01Z'), new Date('2026-06-01Z'), custId)
    expect(rows).toHaveLength(1)
    expect(rows[0].customerName).toBe('Müller')
  })

  it('tagMap is empty when no tags exist', async () => {
    const { tagMap } = await queryExportData(db as any, userId, new Date('2026-05-01Z'), new Date('2026-06-01Z'))
    expect(Object.keys(tagMap)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/server && pnpm test src/__tests__/export.test.ts 2>&1 | tail -5
```

Expected: FAIL "Cannot find module '../repositories/export.js'" (or SKIP if no DATABASE_URL — both acceptable, proceed to Step 3).

- [ ] **Step 3: Implement the export repository**

Create `packages/server/src/repositories/export.ts`:

```typescript
import { and, eq, gte, lt, isNull, inArray, sql } from 'drizzle-orm'
import type { Db } from '../db.js'
import * as schema from '@projekt-tracker/schema/pg'

export interface ExportRow {
  customerNumber: string
  customerName: string
  street: string | null
  zip: string | null
  city: string | null
  projectId: string
  projectTitle: string
  pricingMode: 'hourly' | 'fixed'
  hourlyRateCents: number | null
  fixedPriceCents: number | null
  taskId: string
  taskDescription: string
  totalSeconds: number
  totalAmountCents: number
}

export type TagMap = Record<string, string[]>

export async function queryExportData(
  db: Db,
  userId: string,
  from: Date,
  to: Date,
  customerId?: string,
): Promise<{ rows: ExportRow[]; tagMap: TagMap }> {
  const conditions = [
    eq(schema.timeEntries.userId, userId),
    gte(schema.timeEntries.startedAt, from),
    lt(schema.timeEntries.startedAt, to),
    isNull(schema.timeEntries.deletedAt),
    isNull(schema.projects.deletedAt),
    isNull(schema.customers.deletedAt),
  ]
  if (customerId) {
    conditions.push(eq(schema.customers.id, customerId))
  }

  const rawRows = await db
    .select({
      customerNumber: schema.customers.customerNumber,
      customerName: schema.customers.name,
      street: schema.customers.street,
      zip: schema.customers.zip,
      city: schema.customers.city,
      projectId: schema.projects.id,
      projectTitle: schema.projects.title,
      pricingMode: schema.projects.pricingMode,
      hourlyRateCents: schema.projects.hourlyRateCents,
      fixedPriceCents: schema.projects.fixedPriceCents,
      taskId: schema.tasks.id,
      taskDescription: schema.tasks.description,
      totalSeconds: sql<number>`SUM(${schema.timeEntries.durationSeconds})`,
      totalAmountCents: sql<number>`ROUND(SUM(COALESCE(${schema.timeEntries.rateSnapshotCents}, 0)::numeric * ${schema.timeEntries.durationSeconds}) / 3600.0)`,
    })
    .from(schema.timeEntries)
    .innerJoin(schema.projects, eq(schema.timeEntries.projectId, schema.projects.id))
    .innerJoin(schema.customers, eq(schema.projects.customerId, schema.customers.id))
    .innerJoin(schema.tasks, eq(schema.timeEntries.taskId, schema.tasks.id))
    .where(and(...conditions))
    .groupBy(
      schema.customers.id,
      schema.projects.id,
      schema.tasks.id,
    )
    .orderBy(schema.customers.customerNumber, schema.projects.title, schema.tasks.description)

  const rows: ExportRow[] = rawRows.map(r => ({
    customerNumber: r.customerNumber,
    customerName: r.customerName,
    street: r.street,
    zip: r.zip,
    city: r.city,
    projectId: r.projectId,
    projectTitle: r.projectTitle,
    pricingMode: r.pricingMode as 'hourly' | 'fixed',
    hourlyRateCents: r.hourlyRateCents,
    fixedPriceCents: r.fixedPriceCents,
    taskId: r.taskId,
    taskDescription: r.taskDescription,
    totalSeconds: Number(r.totalSeconds),
    totalAmountCents: Number(r.totalAmountCents),
  }))

  const taskIds = [...new Set(rows.map(r => r.taskId))]
  const tagMap: TagMap = {}

  if (taskIds.length > 0) {
    const tagRows = await db
      .select({
        taskId: schema.taskTags.taskId,
        tagTitle: schema.tags.title,
      })
      .from(schema.taskTags)
      .innerJoin(schema.tags, eq(schema.taskTags.tagId, schema.tags.id))
      .where(and(
        eq(schema.taskTags.userId, userId),
        inArray(schema.taskTags.taskId, taskIds),
      ))

    for (const { taskId, tagTitle } of tagRows) {
      if (!tagMap[taskId]) tagMap[taskId] = []
      tagMap[taskId].push(tagTitle)
    }
  }

  return { rows, tagMap }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/server && pnpm test src/__tests__/export.test.ts 2>&1 | tail -10
```

Expected: all 6 tests PASS (or SKIP without DATABASE_URL).

- [ ] **Step 5: Run typecheck**

```bash
cd packages/server && pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/repositories/export.ts packages/server/src/__tests__/export.test.ts
git commit -m "feat(backend): export repository — JOIN query grouping time entries by customer+project+task"
```

---

### Task 3: ExcelJS renderer (TDD — no DB needed)

**Files:**
- Create: `packages/server/src/services/excelRenderer.ts`
- Create: `packages/server/src/__tests__/excelRenderer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/server/src/__tests__/excelRenderer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { renderExcel } from '../services/excelRenderer.js'
import type { ExportRow, TagMap } from '../repositories/export.js'

const hourlyRow: ExportRow = {
  customerNumber: '26101',
  customerName: 'Müller GmbH',
  street: 'Hauptstr. 1',
  zip: '12345',
  city: 'Berlin',
  projectId: 'proj-1',
  projectTitle: 'Hochzeit Müller',
  pricingMode: 'hourly',
  hourlyRateCents: 8000,
  fixedPriceCents: null,
  taskId: 'task-1',
  taskDescription: 'Bildbearbeitung',
  totalSeconds: 7200,
  totalAmountCents: 16000,
}

const fixedRow1: ExportRow = {
  customerNumber: '26202',
  customerName: 'Schmidt AG',
  street: null,
  zip: null,
  city: null,
  projectId: 'proj-2',
  projectTitle: 'Logo Schmidt',
  pricingMode: 'fixed',
  hourlyRateCents: null,
  fixedPriceCents: 50000,
  taskId: 'task-2',
  taskDescription: 'Konzeption',
  totalSeconds: 3600,
  totalAmountCents: 0,
}

const fixedRow2: ExportRow = {
  ...fixedRow1,
  taskId: 'task-3',
  taskDescription: 'Design',
  totalSeconds: 5400,
}

async function readWorkbook(buf: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf)
  return wb
}

describe('renderExcel', () => {
  it('produces a valid xlsx buffer', async () => {
    const buf = await renderExcel([hourlyRow], {})
    expect(buf.length).toBeGreaterThan(100)
    const wb = await readWorkbook(buf)
    expect(wb.worksheets).toHaveLength(1)
  })

  it('header row contains required column titles', async () => {
    const buf = await renderExcel([hourlyRow], {})
    const wb = await readWorkbook(buf)
    const sheet = wb.worksheets[0]
    const header = sheet.getRow(1).values as (string | undefined)[]
    expect(header).toContain('Kundennr.')
    expect(header).toContain('Aufgabe')
    expect(header).toContain('Zeit')
    expect(header).toContain('Stundensatz')
    expect(header).toContain('Betrag')
  })

  it('hourly data row has correct time, rate and amount', async () => {
    const buf = await renderExcel([hourlyRow], {})
    const wb = await readWorkbook(buf)
    const sheet = wb.worksheets[0]
    const row = sheet.getRow(2).values as (string | undefined)[]
    const rowStr = row.join('|')
    expect(rowStr).toContain('26101')
    expect(rowStr).toContain('02:00:00')
    expect(rowStr).toContain('80,00')
    expect(rowStr).toContain('160,00')
  })

  it('fixed-price first task row shows Festpreis in Betrag', async () => {
    const buf = await renderExcel([fixedRow1, fixedRow2], {})
    const wb = await readWorkbook(buf)
    const sheet = wb.worksheets[0]
    const row2 = (sheet.getRow(2).values as (string | undefined)[]).join('|')
    expect(row2).toContain('500,00')
    expect(row2).not.toContain('€/h')
  })

  it('fixed-price second task row has blank Betrag', async () => {
    const buf = await renderExcel([fixedRow1, fixedRow2], {})
    const wb = await readWorkbook(buf)
    const sheet = wb.worksheets[0]
    const row3 = (sheet.getRow(3).values as (string | undefined)[]).join('|')
    expect(row3).not.toContain('500,00')
  })

  it('renders comma-separated tags', async () => {
    const tagMap: TagMap = { 'task-1': ['Website', 'Hochzeit'] }
    const buf = await renderExcel([hourlyRow], tagMap)
    const wb = await readWorkbook(buf)
    const sheet = wb.worksheets[0]
    const row = (sheet.getRow(2).values as (string | undefined)[]).join('|')
    expect(row).toContain('Website, Hochzeit')
  })

  it('empty rows array produces only the header row', async () => {
    const buf = await renderExcel([], {})
    const wb = await readWorkbook(buf)
    expect(wb.worksheets[0].rowCount).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/server && pnpm test src/__tests__/excelRenderer.test.ts 2>&1 | tail -5
```

Expected: FAIL "Cannot find module '../services/excelRenderer.js'"

- [ ] **Step 3: Implement the renderer**

Create `packages/server/src/services/excelRenderer.ts`:

```typescript
import ExcelJS from 'exceljs'
import type { ExportRow, TagMap } from '../repositories/export.js'

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function centsToEuroStr(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

export async function renderExcel(rows: ExportRow[], tagMap: TagMap): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const sheet = wb.addWorksheet('Export')

  sheet.columns = [
    { header: 'Kundennr.',   key: 'customerNumber',  width: 12 },
    { header: 'Name',        key: 'customerName',     width: 25 },
    { header: 'Straße',      key: 'street',           width: 25 },
    { header: 'PLZ',         key: 'zip',              width:  8 },
    { header: 'Ort',         key: 'city',             width: 20 },
    { header: 'Projekt',     key: 'projectTitle',     width: 25 },
    { header: 'Aufgabe',     key: 'taskDescription',  width: 25 },
    { header: 'Stichworte',  key: 'tags',             width: 25 },
    { header: 'Zeit',        key: 'time',             width: 12 },
    { header: 'Stundensatz', key: 'rate',             width: 15 },
    { header: 'Betrag',      key: 'amount',           width: 15 },
  ]
  sheet.getRow(1).font = { bold: true }

  const fixedPriceShown = new Set<string>()

  for (const row of rows) {
    const tags = (tagMap[row.taskId] ?? []).join(', ')
    const time = formatSeconds(row.totalSeconds)
    let rate = ''
    let amount = ''

    if (row.pricingMode === 'hourly') {
      rate   = centsToEuroStr(row.hourlyRateCents ?? 0).replace(' €', ' €/h')
      amount = centsToEuroStr(row.totalAmountCents)
    } else {
      if (!fixedPriceShown.has(row.projectId)) {
        amount = centsToEuroStr(row.fixedPriceCents ?? 0)
        fixedPriceShown.add(row.projectId)
      }
    }

    sheet.addRow({
      customerNumber: row.customerNumber,
      customerName:   row.customerName,
      street:         row.street ?? '',
      zip:            row.zip ?? '',
      city:           row.city ?? '',
      projectTitle:   row.projectTitle,
      taskDescription: row.taskDescription,
      tags,
      time,
      rate,
      amount,
    })
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/server && pnpm test src/__tests__/excelRenderer.test.ts 2>&1 | tail -10
```

Expected: 6/6 PASS

- [ ] **Step 5: Run typecheck**

```bash
cd packages/server && pnpm typecheck
```

Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/services/excelRenderer.ts packages/server/src/__tests__/excelRenderer.test.ts
git commit -m "feat(backend): ExcelJS renderer — hourly/fixed-price columns, tag support, Festpreis-once logic"
```

---

### Task 4: Export route + wire into app.ts

**Files:**
- Create: `packages/server/src/routes/export.ts`
- Modify: `packages/server/src/__tests__/export.test.ts` — append Zod unit tests
- Modify: `packages/server/src/app.ts`

- [ ] **Step 1: Write failing Zod unit tests**

Append to `packages/server/src/__tests__/export.test.ts`:

```typescript
import { exportQuerySchema } from '../routes/export.js'

describe('exportQuerySchema', () => {
  it('accepts valid from + to', () => {
    expect(exportQuerySchema.safeParse({ from: '2026-05', to: '2026-05' }).success).toBe(true)
  })

  it('rejects from without leading zero', () => {
    expect(exportQuerySchema.safeParse({ from: '2026-5', to: '2026-05' }).success).toBe(false)
  })

  it('rejects missing to', () => {
    expect(exportQuerySchema.safeParse({ from: '2026-05' }).success).toBe(false)
  })

  it('accepts optional valid customerId UUID', () => {
    expect(exportQuerySchema.safeParse({
      from: '2026-05', to: '2026-05',
      customerId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    }).success).toBe(true)
  })

  it('rejects non-UUID customerId', () => {
    expect(exportQuerySchema.safeParse({
      from: '2026-05', to: '2026-05',
      customerId: 'not-a-uuid',
    }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd packages/server && pnpm test src/__tests__/export.test.ts 2>&1 | grep -E "FAIL|Cannot find"
```

Expected: FAIL "Cannot find module '../routes/export.js'"

- [ ] **Step 3: Create the export route**

Create `packages/server/src/routes/export.ts`:

```typescript
import { z } from 'zod'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { Db } from '../db.js'
import type { AppVariables } from '../middleware/auth.js'
import { createAuthMiddleware } from '../middleware/auth.js'
import { queryExportData } from '../repositories/export.js'
import { renderExcel } from '../services/excelRenderer.js'

export const exportQuerySchema = z.object({
  from:       z.string().regex(/^\d{4}-\d{2}$/, 'Format YYYY-MM required'),
  to:         z.string().regex(/^\d{4}-\d{2}$/, 'Format YYYY-MM required'),
  customerId: z.string().uuid().optional(),
})

function monthStart(ym: string): Date {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1))
}

function monthEnd(ym: string): Date {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m, 1))
}

export function createExportRoute(db: Db, jwtSecret: string) {
  const app = new Hono<{ Variables: AppVariables }>()
  app.use('*', createAuthMiddleware(jwtSecret))

  app.get('/excel', zValidator('query', exportQuerySchema), async (c) => {
    const userId = c.get('userId')
    const { from, to, customerId } = c.req.valid('query')

    const { rows, tagMap } = await queryExportData(db, userId, monthStart(from), monthEnd(to), customerId)
    const buffer = await renderExcel(rows, tagMap)

    return c.body(buffer, 200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="export-${from}-${to}.xlsx"`,
    })
  })

  return app
}
```

- [ ] **Step 4: Mount in app.ts**

Edit `packages/server/src/app.ts` — add import + route mount:

```typescript
import { Hono } from 'hono'
import { healthRoute } from './routes/health.js'
import { createBootstrapRoute } from './routes/auth.js'
import { createSyncRoute } from './routes/sync.js'
import { createExportRoute } from './routes/export.js'
import { db } from './db.js'
import { env } from './env.js'
import type { AppVariables } from './middleware/auth.js'

export function createApp(): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>()
  app.route('/v1', healthRoute)
  app.route('/v1/auth', createBootstrapRoute(db, env.JWT_SECRET))
  app.route('/v1/sync', createSyncRoute(db, env.JWT_SECRET))
  app.route('/v1/exports', createExportRoute(db, env.JWT_SECRET))
  return app
}
```

- [ ] **Step 5: Run all tests to verify**

```bash
cd packages/server && pnpm test 2>&1 | tail -15
```

Expected: all unit tests PASS. Integration tests SKIP (or PASS if DATABASE_URL set).

- [ ] **Step 6: Run typecheck**

```bash
cd packages/server && pnpm typecheck
```

Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add packages/server/src/routes/export.ts packages/server/src/app.ts packages/server/src/__tests__/export.test.ts
git commit -m "feat(backend): GET /v1/exports/excel — auth-protected xlsx endpoint with date-range filter"
```

---

### Task 5: Mobile API function

**Files:**
- Modify: `project-tracker/src/sync/api.ts`

- [ ] **Step 1: Add apiExportExcel to api.ts**

Open `project-tracker/src/sync/api.ts` and append after the `apiPull` function:

```typescript
export async function apiExportExcel(
  baseUrl: string,
  token: string,
  from: string,
  to: string,
  customerId?: string,
): Promise<ArrayBuffer> {
  const params = new URLSearchParams({ from, to })
  if (customerId) params.set('customerId', customerId)

  const res = await fetch(`${baseUrl}/v1/exports/excel?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, text)
  }
  return res.arrayBuffer()
}
```

- [ ] **Step 2: Typecheck**

```bash
cd project-tracker && npx tsc --noEmit 2>&1 | grep -v "app-example"
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add project-tracker/src/sync/api.ts
git commit -m "feat(mobile): add apiExportExcel — downloads xlsx as ArrayBuffer"
```

---

### Task 6: Export screen

**Files:**
- Create: `project-tracker/app/export/index.tsx`
- Modify: `project-tracker/app/_layout.tsx` — declare export stack screen

- [ ] **Step 1: Create the export screen**

Create `project-tracker/app/export/index.tsx`:

```tsx
import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, Pressable, FlatList,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { db } from '../../src/db/client'
import { listCustomers } from '../../src/repositories/customers'
import { useSyncStore } from '../../src/store/syncStore'
import { apiExportExcel } from '../../src/sync/api'
import { API_BASE_URL, LOCAL_USER_ID } from '../../src/sync/config'

type Customer = { id: string; name: string; customerNumber: string }

function currentYYYYMM(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const YYYYMM = /^\d{4}-\d{2}$/

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export default function ExportScreen() {
  const [from, setFrom] = useState(currentYYYYMM())
  const [to, setTo]     = useState(currentYYYYMM())
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const token = useSyncStore(s => s.token)

  useEffect(() => {
    setCustomers(listCustomers(LOCAL_USER_ID) as Customer[])
  }, [])

  async function handleExport() {
    if (!YYYYMM.test(from) || !YYYYMM.test(to)) {
      Alert.alert('Ungültiges Format', 'Format muss YYYY-MM sein (z. B. 2026-05)')
      return
    }
    if (from > to) {
      Alert.alert('Ungültiger Zeitraum', '"Von" darf nicht nach "Bis" liegen')
      return
    }
    if (!token) {
      Alert.alert('Nicht verbunden', 'Bitte warte auf die erste Synchronisierung')
      return
    }

    setLoading(true)
    try {
      const buffer = await apiExportExcel(
        API_BASE_URL,
        token,
        from,
        to,
        selectedCustomerId ?? undefined,
      )

      const filename = `export-${from}-${to}.xlsx`
      const uri = `${FileSystem.cacheDirectory}${filename}`
      await FileSystem.writeAsStringAsync(uri, arrayBufferToBase64(buffer), {
        encoding: FileSystem.EncodingType.Base64,
      })

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Excel-Export teilen',
        })
      } else {
        Alert.alert('Datei bereit', `Gespeichert unter: ${uri}`)
      }
    } catch (e) {
      Alert.alert('Fehler beim Export', String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Von (YYYY-MM)</Text>
      <TextInput
        style={styles.input}
        value={from}
        onChangeText={setFrom}
        placeholder="2026-05"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Von Monat"
      />

      <Text style={styles.label}>Bis (YYYY-MM)</Text>
      <TextInput
        style={styles.input}
        value={to}
        onChangeText={setTo}
        placeholder="2026-05"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Bis Monat"
      />

      <Text style={styles.label}>Kunde (optional)</Text>
      <Pressable
        style={[styles.row, selectedCustomerId === null && styles.rowSelected]}
        onPress={() => setSelectedCustomerId(null)}
        accessibilityRole="radio"
        accessibilityState={{ selected: selectedCustomerId === null }}
        accessibilityLabel="Alle Kunden"
      >
        <Text style={styles.rowText}>Alle Kunden</Text>
        {selectedCustomerId === null && <Text style={styles.check}>✓</Text>}
      </Pressable>

      {customers.map(c => (
        <Pressable
          key={c.id}
          style={[styles.row, selectedCustomerId === c.id && styles.rowSelected]}
          onPress={() => setSelectedCustomerId(c.id)}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedCustomerId === c.id }}
          accessibilityLabel={`${c.customerNumber} ${c.name}`}
        >
          <Text style={styles.rowText}>{c.customerNumber} – {c.name}</Text>
          {selectedCustomerId === c.id && <Text style={styles.check}>✓</Text>}
        </Pressable>
      ))}

      <Pressable
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleExport}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Export erstellen"
      >
        {loading
          ? <ActivityIndicator color="#FFF" />
          : <Text style={styles.btnText}>Export erstellen</Text>}
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content:   { padding: 16, paddingBottom: 40 },
  label:     { fontSize: 14, fontWeight: '600', color: '#555', marginTop: 16, marginBottom: 4 },
  input:     { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, backgroundColor: '#FFF', fontSize: 16 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 6, minHeight: 44 },
  rowSelected: { borderWidth: 2, borderColor: '#4A90D9' },
  rowText:   { fontSize: 15 },
  check:     { color: '#4A90D9', fontWeight: '700' },
  btn:       { backgroundColor: '#4A90D9', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24, minHeight: 52 },
  btnDisabled: { opacity: 0.6 },
  btnText:   { color: '#FFF', fontSize: 16, fontWeight: '600' },
})
```

- [ ] **Step 2: Declare the stack screen in _layout.tsx**

In `project-tracker/app/_layout.tsx`, add inside `<Stack>` (after the last `Stack.Screen`):

```tsx
<Stack.Screen name="export/index" options={{ title: 'Export', presentation: 'modal' }} />
```

The full Stack block should end with:
```tsx
      <Stack.Screen name="time-entries/[id]/edit" options={{ title: 'Zeiteintrag bearbeiten', presentation: 'modal' }} />
      <Stack.Screen name="export/index" options={{ title: 'Export', presentation: 'modal' }} />
    </Stack>
```

- [ ] **Step 3: Typecheck**

```bash
cd project-tracker && npx tsc --noEmit 2>&1 | grep -v "app-example"
```

Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add project-tracker/app/export/index.tsx project-tracker/app/_layout.tsx
git commit -m "feat(mobile): export screen — date range input, customer filter, xlsx download + share"
```

---

### Task 7: Wire Export into Settings screen

**Files:**
- Modify: `project-tracker/app/(tabs)/settings.tsx`

- [ ] **Step 1: Add the export row to settings.tsx**

Replace the existing content of `project-tracker/app/(tabs)/settings.tsx` with:

```tsx
import { View, Pressable, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SyncIndicator } from '../../src/components/SyncIndicator'

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.syncSection}>
        <SyncIndicator />
      </View>
      <Pressable
        style={styles.row}
        onPress={() => router.push('/export/index')}
        accessibilityRole="button"
        accessibilityLabel="Export erstellen"
      >
        <Text style={styles.label}>Export erstellen</Text>
        <Text>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => router.push('/order-types')}>
        <Text style={styles.label}>Auftragsarten</Text>
        <Text>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => router.push('/customers')}>
        <Text style={styles.label}>Kunden</Text>
        <Text>›</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  syncSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
    marginBottom: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 8, minHeight: 44 },
  label: { fontSize: 16 },
})
```

- [ ] **Step 2: Typecheck**

```bash
cd project-tracker && npx tsc --noEmit 2>&1 | grep -v "app-example"
```

Expected: no new errors

- [ ] **Step 3: Run all server tests**

```bash
cd packages/server && pnpm test 2>&1 | tail -10
```

Expected: all unit tests PASS

- [ ] **Step 4: Final commit**

```bash
git add project-tracker/app/(tabs)/settings.tsx
git commit -m "feat(mobile): wire export screen into settings tab"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| Server endpoint `/v1/exports/excel` mit Zeitraum-Filter | T4 |
| ExcelJS-Renderer (Spalten laut CONCEPT.md) | T3 |
| Festpreis-Export: Festpreis-Position + Zeit-Info-Spalte ohne Stundensatz (ADR-013) | T3 |
| Export-Modal (Zeitraum-Picker, Kunden-Filter optional) | T6 |
| Download via System-Sharesheet (expo-sharing) | T6 |
| Auth (JWT Bearer) | T4 |
| Kunden-Filter optional | T4 + T6 |

### Edge Cases Handled

- `fixedPriceShown` Set ensures Festpreis appears only once per project across multiple task rows
- `taskIds.length > 0` guard prevents empty `inArray` SQL
- `btoa` + Base64 FileSystem write handles binary Excel data on React Native
- Validation in export screen: format check, from ≤ to, token required
- `COALESCE(rate_snapshot_cents, 0)` in aggregation ensures fixed-price entries contribute 0 to amount sum
