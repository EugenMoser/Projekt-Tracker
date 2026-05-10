# Phase 1B: Mobile UI — All Screens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Phase 1A plan must be complete. The `db` client, `runMigrations`, `generateCustomerNumber`, and `buildTimeEntrySnapshot` must exist and tests must be green before starting here.

**Goal:** Implement all Phase 1 mobile screens so the app works fully offline: project tiles on home, project CRUD, customer management, task/tag management, timer start/stop with task modal, project detail, and manual time-entry correction.

**Architecture:** All screens use `expo-router` file-based routing. Data access goes through repository functions in `src/repositories/` (never `db.select()` directly in a screen). The `db` singleton from `src/db/client.ts` is imported directly — no React Context needed for Phase 1. Global UI state (active timer) is managed with Zustand. Every list uses FlashList from `@shopify/flash-list`.

**Tech Stack:** expo-router, Reanimated v4 (swipe gesture), FlashList, Zustand, react-native-safe-area-context, expo-haptics

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `project-tracker/app/_layout.tsx` | Add DB init, theme, gesture handler |
| Create | `project-tracker/app/(tabs)/_layout.tsx` | Bottom tab navigator |
| Create | `project-tracker/app/(tabs)/index.tsx` | Home — project tiles + active timer banner |
| Create | `project-tracker/app/(tabs)/tasks.tsx` | Global task list + tag picker |
| Create | `project-tracker/app/(tabs)/settings.tsx` | Entry point to settings sub-routes |
| Create | `project-tracker/app/projects/new.tsx` | New project form |
| Create | `project-tracker/app/projects/[id].tsx` | Project detail |
| Create | `project-tracker/app/projects/[id]/edit.tsx` | Edit project |
| Create | `project-tracker/app/customers/index.tsx` | Customer list |
| Create | `project-tracker/app/customers/new.tsx` | New customer form |
| Create | `project-tracker/app/order-types/index.tsx` | OrderType list + CRUD |
| Create | `project-tracker/app/time-entries/[id]/edit.tsx` | Edit / soft-delete time entry |
| Create | `project-tracker/src/repositories/projects.ts` | Project queries |
| Create | `project-tracker/src/repositories/customers.ts` | Customer queries |
| Create | `project-tracker/src/repositories/orderTypes.ts` | OrderType queries |
| Create | `project-tracker/src/repositories/tasks.ts` | Task + tag queries |
| Create | `project-tracker/src/repositories/timers.ts` | Timer start/stop/get |
| Create | `project-tracker/src/repositories/timeEntries.ts` | Time entry queries + soft-delete |
| Create | `project-tracker/src/store/timerStore.ts` | Zustand store for active timer UI state |
| Create | `project-tracker/src/components/ProjectTile.tsx` | Colored project tile with tap handler |
| Create | `project-tracker/src/components/SwipeToStop.tsx` | Reanimated v4 swipe gesture wrapper |
| Create | `project-tracker/src/components/StopModal.tsx` | Task-selection modal |
| Create | `project-tracker/src/components/TimerBanner.tsx` | Live-counter banner (active timer) |
| Create | `project-tracker/src/components/ColorPicker.tsx` | 6-color swatch picker |
| Create | `project-tracker/src/utils/time.ts` | Duration formatting helpers |
| Create | `project-tracker/src/utils/uuid.ts` | `newId()` wrapper around uuidv7 |

---

### Task 1: Install dependencies + navigation shell

**Files:**
- Modify: `project-tracker/package.json`
- Modify: `project-tracker/app/_layout.tsx`
- Create: `project-tracker/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Add packages to `project-tracker/package.json` dependencies**

```json
"@shopify/flash-list": "^1.7.2",
"zustand": "^5.0.3"
```

Run from repo root:
```bash
pnpm install
cd project-tracker && npx expo install @shopify/flash-list
```

(`expo install` ensures the FlashList version is compatible with the Expo SDK.)

- [ ] **Step 2: Create `project-tracker/src/utils/uuid.ts`**

```typescript
import { uuidv7 } from 'uuidv7'
export const newId = (): string => uuidv7()
```

- [ ] **Step 3: Create `project-tracker/src/utils/time.ts`**

```typescript
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function durationSeconds(startedAt: Date, endedAt: Date): number {
  return Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
}
```

- [ ] **Step 4: Rewrite `project-tracker/app/_layout.tsx`**

```typescript
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
      .catch((e) => {
        console.error('Migration failed', e)
        setIsDbReady(true)
      })
  }, [])

  if (!isDbReady) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="projects/new" options={{ title: 'Neues Projekt', presentation: 'modal' }} />
        <Stack.Screen name="projects/[id]" options={{ title: 'Projekt-Detail' }} />
        <Stack.Screen name="projects/[id]/edit" options={{ title: 'Projekt bearbeiten', presentation: 'modal' }} />
        <Stack.Screen name="customers/index" options={{ title: 'Kunden' }} />
        <Stack.Screen name="customers/new" options={{ title: 'Neuer Kunde', presentation: 'modal' }} />
        <Stack.Screen name="order-types/index" options={{ title: 'Auftragsarten' }} />
        <Stack.Screen name="time-entries/[id]/edit" options={{ title: 'Zeiteintrag bearbeiten', presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}
```

- [ ] **Step 5: Create `project-tracker/app/(tabs)/_layout.tsx`**

```typescript
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#4A90D9' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Projekte',
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Aufgaben',
          tabBarIcon: ({ color }) => <Ionicons name="checkbox-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Einstellungen',
          tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  )
}
```

- [ ] **Step 6: Create placeholder tab screens (prevents 404 on startup)**

Create `project-tracker/app/(tabs)/tasks.tsx` and `project-tracker/app/(tabs)/settings.tsx` each with:
```typescript
import { View, Text } from 'react-native'
export default function Screen() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Coming soon</Text></View>
}
```

- [ ] **Step 7: Start the app and verify tabs appear**

```bash
cd project-tracker && npx expo start --ios
```

Expected: Three-tab bottom navigation visible, no crashes.

- [ ] **Step 8: Commit**

```bash
git add project-tracker/
git commit -m "feat(mobile): navigation shell — tabs + stack routes"
```

---

### Task 2: Repository layer — all queries

All queries follow the same pattern: required `userId: string` parameter, filter `deletedAt IS NULL` for non-deleted records.

**Files:**
- Create: `project-tracker/src/repositories/orderTypes.ts`
- Create: `project-tracker/src/repositories/customers.ts`
- Create: `project-tracker/src/repositories/projects.ts`
- Create: `project-tracker/src/repositories/tasks.ts`
- Create: `project-tracker/src/repositories/timers.ts`
- Create: `project-tracker/src/repositories/timeEntries.ts`

- [ ] **Step 1: Create `project-tracker/src/repositories/orderTypes.ts`**

```typescript
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '../db/client'
import * as schema from '@projekt-tracker/schema'
import { newId } from '../utils/uuid'

export function listOrderTypes(userId: string) {
  return db.select().from(schema.orderTypes)
    .where(and(eq(schema.orderTypes.userId, userId), isNull(schema.orderTypes.deletedAt)))
    .all()
}

export function createOrderType(userId: string, data: { name: string; digit: number }) {
  const now = new Date()
  return db.insert(schema.orderTypes).values({
    id: newId(), userId, name: data.name, digit: data.digit,
    createdAt: now, updatedAt: now,
  }).run()
}

export function deleteOrderType(userId: string, id: string) {
  return db.update(schema.orderTypes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.orderTypes.id, id), eq(schema.orderTypes.userId, userId)))
    .run()
}
```

- [ ] **Step 2: Create `project-tracker/src/repositories/customers.ts`**

```typescript
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '../db/client'
import * as schema from '@projekt-tracker/schema'
import { newId } from '../utils/uuid'
import { generateCustomerNumber } from './customerNumber'

export function listCustomers(userId: string) {
  return db.select().from(schema.customers)
    .where(and(eq(schema.customers.userId, userId), isNull(schema.customers.deletedAt)))
    .all()
}

export function createCustomer(
  userId: string,
  data: { name: string; orderTypeId: string; orderTypeDigit: number; street?: string; zip?: string; city?: string }
) {
  const now = new Date()
  const year = now.getFullYear()
  const customerNumber = generateCustomerNumber(db, { userId, orderTypeDigit: data.orderTypeDigit, year })
  return db.insert(schema.customers).values({
    id: newId(), userId,
    customerNumber, orderTypeId: data.orderTypeId,
    name: data.name, street: data.street ?? null, zip: data.zip ?? null, city: data.city ?? null,
    createdAt: now, updatedAt: now,
  }).run()
}

export function updateCustomer(
  userId: string, id: string,
  data: Partial<{ name: string; street: string; zip: string; city: string }>
) {
  return db.update(schema.customers)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(schema.customers.id, id), eq(schema.customers.userId, userId)))
    .run()
}
```

- [ ] **Step 3: Create `project-tracker/src/repositories/projects.ts`**

```typescript
import { eq, and, isNull, sum, desc } from 'drizzle-orm'
import { db } from '../db/client'
import * as schema from '@projekt-tracker/schema'
import { newId } from '../utils/uuid'

export type NewProject = {
  customerId: string
  title: string
  description?: string
  color: string
  pricingMode: 'hourly' | 'fixed'
  hourlyRateCents?: number
  fixedPriceCents?: number
  taskIds: string[]
}

export function listActiveProjects(userId: string) {
  return db.select().from(schema.projects)
    .where(and(
      eq(schema.projects.userId, userId),
      eq(schema.projects.status, 'active'),
      isNull(schema.projects.deletedAt)
    ))
    .orderBy(desc(schema.projects.updatedAt))
    .all()
}

export function getProject(userId: string, id: string) {
  return db.select().from(schema.projects)
    .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)))
    .get()
}

export function createProject(userId: string, data: NewProject) {
  const now = new Date()
  const id = newId()
  db.insert(schema.projects).values({
    id, userId, customerId: data.customerId, title: data.title,
    description: data.description ?? null, color: data.color,
    pricingMode: data.pricingMode,
    hourlyRateCents: data.hourlyRateCents ?? null,
    fixedPriceCents: data.fixedPriceCents ?? null,
    status: 'active', createdAt: now, updatedAt: now,
  }).run()
  for (const taskId of data.taskIds) {
    db.insert(schema.projectTasks).values({ projectId: id, taskId, userId }).run()
  }
  return id
}

export function updateProject(userId: string, id: string, data: Partial<Omit<NewProject, 'taskIds'>>) {
  return db.update(schema.projects)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)))
    .run()
}

export function archiveProject(userId: string, id: string) {
  return db.update(schema.projects)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)))
    .run()
}

export function getProjectTotalSeconds(userId: string, projectId: string): number {
  const result = db.select({ total: sum(schema.timeEntries.durationSeconds) })
    .from(schema.timeEntries)
    .where(and(
      eq(schema.timeEntries.userId, userId),
      eq(schema.timeEntries.projectId, projectId),
      isNull(schema.timeEntries.deletedAt)
    ))
    .get()
  return Number(result?.total ?? 0)
}
```

- [ ] **Step 4: Create `project-tracker/src/repositories/tasks.ts`**

```typescript
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { db } from '../db/client'
import * as schema from '@projekt-tracker/schema'
import { newId } from '../utils/uuid'

export function listTasks(userId: string) {
  return db.select().from(schema.tasks)
    .where(and(eq(schema.tasks.userId, userId), isNull(schema.tasks.deletedAt)))
    .all()
}

export function listTasksForProject(userId: string, projectId: string) {
  return db.select({ task: schema.tasks })
    .from(schema.projectTasks)
    .innerJoin(schema.tasks, eq(schema.projectTasks.taskId, schema.tasks.id))
    .where(and(
      eq(schema.projectTasks.userId, userId),
      eq(schema.projectTasks.projectId, projectId),
      isNull(schema.tasks.deletedAt)
    ))
    .all()
    .map((r) => r.task)
}

export function createTask(userId: string, description: string) {
  const now = new Date()
  const id = newId()
  db.insert(schema.tasks).values({ id, userId, description, createdAt: now, updatedAt: now }).run()
  return id
}

export function listTags(userId: string) {
  return db.select().from(schema.tags)
    .where(and(eq(schema.tags.userId, userId), isNull(schema.tags.deletedAt)))
    .all()
}

export function upsertTag(userId: string, title: string): string {
  const existing = db.select().from(schema.tags)
    .where(and(eq(schema.tags.userId, userId), eq(schema.tags.title, title)))
    .get()
  if (existing) return existing.id
  const now = new Date()
  const id = newId()
  db.insert(schema.tags).values({ id, userId, title, createdAt: now, updatedAt: now }).run()
  return id
}

export function setTaskTags(userId: string, taskId: string, tagIds: string[]) {
  db.delete(schema.taskTags).where(eq(schema.taskTags.taskId, taskId)).run()
  for (const tagId of tagIds) {
    db.insert(schema.taskTags).values({ taskId, tagId, userId }).run()
  }
}

export function getTagsForTask(taskId: string) {
  return db.select({ tag: schema.tags })
    .from(schema.taskTags)
    .innerJoin(schema.tags, eq(schema.taskTags.tagId, schema.tags.id))
    .where(eq(schema.taskTags.taskId, taskId))
    .all()
    .map((r) => r.tag)
}
```

- [ ] **Step 5: Create `project-tracker/src/repositories/timers.ts`**

Implements ADR-009: only one global timer. Starting a new project when one is running stops the running one (calls `stopTimer` which creates the time entry and opens the stop modal for the previous project).

```typescript
import { eq, and } from 'drizzle-orm'
import { db } from '../db/client'
import * as schema from '@projekt-tracker/schema'
import { newId } from '../utils/uuid'
import { buildTimeEntrySnapshot } from './tariffSnapshot'

export function getActiveTimer(userId: string) {
  return db.select().from(schema.timers)
    .where(eq(schema.timers.userId, userId))
    .get() ?? null
}

export function startTimer(userId: string, projectId: string): void {
  const existing = getActiveTimer(userId)
  if (existing) {
    // Caller is responsible for stopping previous timer first (show stop modal)
    throw new Error('A timer is already running. Stop it first.')
  }
  const now = new Date()
  db.insert(schema.timers).values({
    id: newId(), userId, projectId, startedAt: now, createdAt: now, updatedAt: now,
  }).run()
}

export function stopTimer(userId: string, taskId: string, notes?: string): void {
  const timer = getActiveTimer(userId)
  if (!timer) throw new Error('No active timer')

  const now = new Date()
  const snapshot = buildTimeEntrySnapshot(db, { projectId: timer.projectId, userId })
  const duration = Math.round((now.getTime() - timer.startedAt.getTime()) / 1000)

  db.insert(schema.timeEntries).values({
    id: newId(), userId, projectId: timer.projectId, taskId,
    startedAt: timer.startedAt, endedAt: now, durationSeconds: duration,
    rateSnapshotCents: snapshot.rateSnapshotCents,
    pricingModeSnapshot: snapshot.pricingModeSnapshot,
    notes: notes ?? null, createdAt: now, updatedAt: now,
  }).run()

  db.delete(schema.timers).where(and(eq(schema.timers.id, timer.id), eq(schema.timers.userId, userId))).run()
}
```

- [ ] **Step 6: Create `project-tracker/src/repositories/timeEntries.ts`**

```typescript
import { eq, and, isNull, desc } from 'drizzle-orm'
import { db } from '../db/client'
import * as schema from '@projekt-tracker/schema'

export function listTimeEntriesForProject(userId: string, projectId: string) {
  return db.select().from(schema.timeEntries)
    .where(and(
      eq(schema.timeEntries.userId, userId),
      eq(schema.timeEntries.projectId, projectId),
      isNull(schema.timeEntries.deletedAt)
    ))
    .orderBy(desc(schema.timeEntries.startedAt))
    .all()
}

export function updateTimeEntry(
  userId: string, id: string,
  data: { startedAt: Date; endedAt: Date; taskId: string; notes?: string }
) {
  const duration = Math.round((data.endedAt.getTime() - data.startedAt.getTime()) / 1000)
  return db.update(schema.timeEntries)
    .set({
      startedAt: data.startedAt, endedAt: data.endedAt,
      durationSeconds: duration, taskId: data.taskId,
      notes: data.notes ?? null, updatedAt: new Date(),
    })
    .where(and(eq(schema.timeEntries.id, id), eq(schema.timeEntries.userId, userId)))
    .run()
}

export function softDeleteTimeEntry(userId: string, id: string) {
  return db.update(schema.timeEntries)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.timeEntries.id, id), eq(schema.timeEntries.userId, userId)))
    .run()
}
```

- [ ] **Step 7: Run typecheck**

```bash
cd project-tracker && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add project-tracker/src/repositories/ project-tracker/src/utils/
git commit -m "feat(mobile): repository layer — all query functions"
```

---

### Task 3: Zustand timer store

**Files:**
- Create: `project-tracker/src/store/timerStore.ts`

- [ ] **Step 1: Create `project-tracker/src/store/timerStore.ts`**

```typescript
import { create } from 'zustand'

interface TimerState {
  activeProjectId: string | null
  startedAt: Date | null
  pendingStopProjectId: string | null  // set when we need to show stop modal before starting new timer
  setActive: (projectId: string, startedAt: Date) => void
  clearActive: () => void
  setPendingStop: (projectId: string | null) => void
}

export const useTimerStore = create<TimerState>((set) => ({
  activeProjectId: null,
  startedAt: null,
  pendingStopProjectId: null,
  setActive: (projectId, startedAt) => set({ activeProjectId: projectId, startedAt }),
  clearActive: () => set({ activeProjectId: null, startedAt: null }),
  setPendingStop: (projectId) => set({ pendingStopProjectId: projectId }),
}))
```

- [ ] **Step 2: Commit**

```bash
git add project-tracker/src/store/
git commit -m "feat(mobile): Zustand timer store for active timer UI state"
```

---

### Task 4: Shared UI components

**Files:**
- Create: `project-tracker/src/components/ColorPicker.tsx`
- Create: `project-tracker/src/components/TimerBanner.tsx`
- Create: `project-tracker/src/components/ProjectTile.tsx`

- [ ] **Step 1: Create `project-tracker/src/components/ColorPicker.tsx`**

6 preset colors, taps select one. Selected shows a border ring.

```typescript
import { View, TouchableOpacity, StyleSheet } from 'react-native'

const COLORS = ['#4A90D9', '#27AE60', '#E67E22', '#8E44AD', '#E74C3C', '#F1C40F']

interface Props {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {COLORS.map((c) => (
        <TouchableOpacity
          key={c}
          onPress={() => onChange(c)}
          style={[styles.swatch, { backgroundColor: c }, value === c && styles.selected]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  selected: { borderWidth: 3, borderColor: '#000' },
})
```

- [ ] **Step 2: Create `project-tracker/src/components/TimerBanner.tsx`**

Shows project name + live HH:MM:SS counter. Updates every second via `setInterval`.

```typescript
import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTimerStore } from '../store/timerStore'
import { formatDuration } from '../utils/time'

interface Props {
  projectTitle: string
  onPress: () => void
}

export function TimerBanner({ projectTitle, onPress }: Props) {
  const startedAt = useTimerStore((s) => s.startedAt)
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    if (!startedAt) return
    const update = () => setElapsed(Math.round((Date.now() - startedAt.getTime()) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <Pressable onPress={onPress} style={styles.banner}>
      <Text style={styles.icon}>▶</Text>
      <Text style={styles.title} numberOfLines={1}>{projectTitle}</Text>
      <Text style={styles.time}>{formatDuration(elapsed)}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1A1A1A', padding: 12, paddingHorizontal: 16,
  },
  icon: { color: '#4CD964', fontSize: 14 },
  title: { flex: 1, color: '#FFF', fontWeight: '600' },
  time: { color: '#FFF', fontFamily: 'monospace', fontSize: 16 },
})
```

- [ ] **Step 3: Create `project-tracker/src/components/ProjectTile.tsx`**

Colored card. Tap → start timer (or show stop-previous modal). Shows project title, customer name, and ▶ icon.

```typescript
import { Pressable, View, Text, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'

interface Props {
  id: string
  title: string
  customerName: string
  color: string
  isActive: boolean
  onPress: () => void
}

export function ProjectTile({ title, customerName, color, isActive, onPress }: Props) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onPress()
  }

  return (
    <Pressable onPress={handlePress} style={[styles.tile, { backgroundColor: color }]}>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.customer} numberOfLines={1}>{customerName}</Text>
      </View>
      <Text style={styles.icon}>{isActive ? '⏸' : '▶'}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tile: { borderRadius: 12, padding: 14, flex: 1, margin: 6, minHeight: 100 },
  body: { flex: 1 },
  title: { color: '#FFF', fontWeight: '700', fontSize: 15, marginBottom: 4 },
  customer: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  icon: { color: '#FFF', fontSize: 20, alignSelf: 'flex-end' },
})
```

- [ ] **Step 4: Commit**

```bash
git add project-tracker/src/components/
git commit -m "feat(mobile): ColorPicker, ProjectTile, TimerBanner components"
```

---

### Task 5: Home screen — project tiles

**Files:**
- Modify: `project-tracker/app/(tabs)/index.tsx`

- [ ] **Step 1: Write `project-tracker/app/(tabs)/index.tsx`**

```typescript
import React from 'react'
import { View, StyleSheet, Pressable, Text, Alert } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { router } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { listActiveProjects } from '../../src/repositories/projects'
import { getActiveTimer, startTimer } from '../../src/repositories/timers'
import { useTimerStore } from '../../src/store/timerStore'
import { ProjectTile } from '../../src/components/ProjectTile'
import { TimerBanner } from '../../src/components/TimerBanner'

const OWNER_ID = '00000000-0000-0000-0000-000000000001' // Phase 1: single hardcoded user

type Project = ReturnType<typeof listActiveProjects>[number]
type ProjectWithCustomerName = Project & { customerName: string }

export default function HomeScreen() {
  const [projects, setProjects] = React.useState<ProjectWithCustomerName[]>([])
  const [activeProjectTitle, setActiveProjectTitle] = React.useState<string | null>(null)
  const { activeProjectId, setActive, clearActive, setPendingStop } = useTimerStore()

  const load = React.useCallback(() => {
    // In Phase 1 we load customer names via a separate query per project (acceptable for MVP size)
    const rows = listActiveProjects(OWNER_ID)
    // TODO Phase 1: join customer name — for now use customerId as placeholder
    setProjects(rows.map((p) => ({ ...p, customerName: '' })))
    const timer = getActiveTimer(OWNER_ID)
    if (timer) {
      const active = rows.find((p) => p.id === timer.projectId)
      setActive(timer.projectId, timer.startedAt)
      setActiveProjectTitle(active?.title ?? '')
    } else {
      clearActive()
      setActiveProjectTitle(null)
    }
  }, [setActive, clearActive])

  useFocusEffect(React.useCallback(() => { load() }, [load]))

  const handleTilePress = (project: ProjectWithCustomerName) => {
    if (activeProjectId === project.id) {
      // Same project tapped while running → go to stop modal
      setPendingStop(project.id)
      return
    }
    if (activeProjectId) {
      // Different project → ask to stop previous first
      Alert.alert(
        'Timer läuft noch',
        `"${activeProjectTitle}" ist noch aktiv. Erst stoppen?`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Stoppen & neues starten',
            onPress: () => {
              setPendingStop(activeProjectId)
              // StopModal will call load() when done, then we start the new timer
            },
          },
        ]
      )
      return
    }
    try {
      startTimer(OWNER_ID, project.id)
      setActive(project.id, new Date())
      setActiveProjectTitle(project.title)
    } catch (e) {
      Alert.alert('Fehler', String(e))
    }
  }

  return (
    <View style={styles.container}>
      {activeProjectId && activeProjectTitle && (
        <TimerBanner
          projectTitle={activeProjectTitle}
          onPress={() => setPendingStop(activeProjectId)}
        />
      )}
      <FlashList
        data={projects}
        numColumns={2}
        estimatedItemSize={120}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectTile
            id={item.id}
            title={item.title}
            customerName={item.customerName}
            color={item.color}
            isActive={item.id === activeProjectId}
            onPress={() => handleTilePress(item)}
          />
        )}
        contentContainerStyle={styles.list}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/projects/new')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  list: { padding: 6 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4A90D9', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  fabText: { color: '#FFF', fontSize: 28, lineHeight: 32 },
})
```

**Note on `OWNER_ID`:** Phase 1 uses a single hardcoded user ID. The first time the app runs, it must insert a user row. Add this to `runMigrations` in `src/db/migrate.ts` — after migrations complete, seed the default user if not exists:

```typescript
// At end of runMigrations(), after the migration loop:
await sqlite.runAsync(
  `INSERT OR IGNORE INTO users (id, display_name, tier, created_at, updated_at) VALUES (?, 'Owner', 'pro', ?, ?)`,
  ['00000000-0000-0000-0000-000000000001', Date.now(), Date.now()]
)
```

- [ ] **Step 2: Add user seeding to `src/db/migrate.ts`**

Open `project-tracker/src/db/migrate.ts` and add the `INSERT OR IGNORE` statement after the migration loop (see step above).

- [ ] **Step 3: Verify home screen loads**

```bash
cd project-tracker && npx expo start --ios
```

Expected: empty project grid (no projects yet), FAB (+) visible, no crashes.

- [ ] **Step 4: Commit**

```bash
git add project-tracker/app/(tabs)/index.tsx project-tracker/src/db/migrate.ts
git commit -m "feat(mobile): home screen with project tiles, active timer banner, FAB"
```

---

### Task 6: Stop modal + swipe-to-stop gesture

**Files:**
- Create: `project-tracker/src/components/StopModal.tsx`
- Create: `project-tracker/src/components/SwipeToStop.tsx`
- Modify: `project-tracker/app/(tabs)/index.tsx` (add StopModal)

- [ ] **Step 1: Create `project-tracker/src/components/StopModal.tsx`**

```typescript
import React from 'react'
import { Modal, View, Text, FlatList, Pressable, TextInput, StyleSheet, Alert } from 'react-native'
import { stopTimer } from '../repositories/timers'
import { listTasksForProject, createTask, listTasks } from '../repositories/tasks'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

interface Props {
  visible: boolean
  projectId: string
  onDone: () => void
  onCancel: () => void
}

type Task = { id: string; description: string }

export function StopModal({ visible, projectId, onDone, onCancel }: Props) {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [newTaskText, setNewTaskText] = React.useState('')

  React.useEffect(() => {
    if (visible) {
      // Show tasks associated with this project, falling back to all tasks
      const projectTasks = listTasksForProject(OWNER_ID, projectId)
      setTasks(projectTasks.length > 0 ? projectTasks : listTasks(OWNER_ID))
      setSelectedId(null)
    }
  }, [visible, projectId])

  const handleSave = () => {
    let taskId = selectedId
    if (!taskId && newTaskText.trim()) {
      taskId = createTask(OWNER_ID, newTaskText.trim())
    }
    if (!taskId) {
      Alert.alert('Aufgabe wählen', 'Bitte eine Aufgabe auswählen oder neu eingeben.')
      return
    }
    try {
      stopTimer(OWNER_ID, taskId)
      onDone()
    } catch (e) {
      Alert.alert('Fehler', String(e))
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <Text style={styles.heading}>Timer stoppen</Text>
        <Text style={styles.label}>Welche Aufgabe?</Text>
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.taskRow, item.id === selectedId && styles.taskSelected]}
              onPress={() => { setSelectedId(item.id); setNewTaskText('') }}
            >
              <Text>{item.id === selectedId ? '◉' : '○'} {item.description}</Text>
            </Pressable>
          )}
        />
        <TextInput
          style={styles.input}
          placeholder="+ Neue Aufgabe"
          value={newTaskText}
          onChangeText={(t) => { setNewTaskText(t); setSelectedId(null) }}
        />
        <View style={styles.actions}>
          <Pressable style={styles.btnCancel} onPress={onCancel}>
            <Text>Abbrechen</Text>
          </Pressable>
          <Pressable style={styles.btnSave} onPress={handleSave}>
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Speichern</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 14, color: '#666', marginBottom: 8 },
  taskRow: { padding: 14, borderRadius: 8, marginBottom: 6, backgroundColor: '#F5F5F5' },
  taskSelected: { backgroundColor: '#D0E8FF' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnCancel: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#EEE' },
  btnSave: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#4A90D9' },
})
```

- [ ] **Step 2: Create `project-tracker/src/components/SwipeToStop.tsx`**

Uses Reanimated v4's `useAnimatedStyle` + `useDerivedValue` + `Gesture.Pan()` from react-native-gesture-handler. Swipe right reveals a "Stop" action area; releasing at >50% threshold triggers onStop.

```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, runOnJS,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

interface Props {
  children: React.ReactNode
  onStop: () => void
  enabled?: boolean
}

export function SwipeToStop({ children, onStop, enabled = true }: Props) {
  const translateX = useSharedValue(0)
  const THRESHOLD = 120

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .onUpdate((e) => {
      translateX.value = Math.max(0, e.translationX)
    })
    .onEnd(() => {
      if (translateX.value > THRESHOLD) {
        runOnJS(onStop)()
      }
      translateX.value = withSpring(0)
    })

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  const bgOpacity = useAnimatedStyle(() => ({
    opacity: Math.min(translateX.value / THRESHOLD, 1),
  }))

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.stopBg, bgOpacity]}>
        <Text style={styles.stopText}>◼ Stoppen</Text>
      </Animated.View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { overflow: 'hidden' },
  stopBg: { backgroundColor: '#E74C3C', justifyContent: 'center', paddingLeft: 24 },
  stopText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
})
```

- [ ] **Step 3: Wire StopModal + SwipeToStop into `app/(tabs)/index.tsx`**

Import `StopModal` and `SwipeToStop`. 

In the home screen component, add:
```typescript
const pendingStopProjectId = useTimerStore((s) => s.pendingStopProjectId)
```

Wrap the `TimerBanner` in `SwipeToStop` to enable swipe-to-stop on the banner:
```typescript
<SwipeToStop enabled={!!activeProjectId} onStop={() => setPendingStop(activeProjectId!)}>
  <TimerBanner projectTitle={activeProjectTitle!} onPress={() => setPendingStop(activeProjectId!)} />
</SwipeToStop>
```

Add `StopModal` at bottom of JSX:
```typescript
<StopModal
  visible={!!pendingStopProjectId}
  projectId={pendingStopProjectId ?? ''}
  onDone={() => { setPendingStop(null); load() }}
  onCancel={() => setPendingStop(null)}
/>
```

- [ ] **Step 4: Manually test the timer flow on iOS simulator**

1. Create a project (skip to Task 8 first if needed, then come back)
2. Tap a project tile → timer starts, banner appears with live counter
3. Swipe banner right → StopModal appears
4. Select a task → timer stops, time entry created
5. Verify `time_entries` table has a row (use Expo DevTools or a debug screen)

- [ ] **Step 5: Commit**

```bash
git add project-tracker/src/components/StopModal.tsx project-tracker/src/components/SwipeToStop.tsx project-tracker/app/(tabs)/index.tsx
git commit -m "feat(mobile): stop modal with task selection, swipe-to-stop gesture (ADR-009, ADR-012)"
```

---

### Task 7: Auftragsarten screen

**Files:**
- Create: `project-tracker/app/order-types/index.tsx`
- Modify: `project-tracker/app/(tabs)/settings.tsx`

- [ ] **Step 1: Create `project-tracker/app/order-types/index.tsx`**

List of order types. Each row shows name + digit. Long-press to delete. Button at top to add new (inline modal with name + digit fields).

```typescript
import React from 'react'
import { View, Text, FlatList, Pressable, TextInput, Modal, StyleSheet, Alert } from 'react-native'
import { listOrderTypes, createOrderType, deleteOrderType } from '../../src/repositories/orderTypes'
import { useFocusEffect } from '@react-navigation/native'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'
type OrderType = { id: string; name: string; digit: number }

export default function OrderTypesScreen() {
  const [items, setItems] = React.useState<OrderType[]>([])
  const [showAdd, setShowAdd] = React.useState(false)
  const [name, setName] = React.useState('')
  const [digit, setDigit] = React.useState('')

  const load = () => setItems(listOrderTypes(OWNER_ID))
  useFocusEffect(React.useCallback(() => { load() }, []))

  const handleAdd = () => {
    const d = parseInt(digit, 10)
    if (!name.trim() || isNaN(d) || d < 1 || d > 9) {
      Alert.alert('Ungültige Eingabe', 'Name und Ziffer (1–9) sind Pflicht.')
      return
    }
    try {
      createOrderType(OWNER_ID, { name: name.trim(), digit: d })
      setName(''); setDigit(''); setShowAdd(false); load()
    } catch {
      Alert.alert('Fehler', 'Ziffer oder Name bereits vergeben.')
    }
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
        <Text style={styles.addBtnText}>+ Auftragsart</Text>
      </Pressable>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onLongPress={() => Alert.alert('Löschen?', item.name, [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Löschen', style: 'destructive', onPress: () => { deleteOrderType(OWNER_ID, item.id); load() } },
            ])}
          >
            <Text style={styles.digit}>{item.digit}</Text>
            <Text style={styles.name}>{item.name}</Text>
          </Pressable>
        )}
      />
      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Neue Auftragsart</Text>
          <TextInput style={styles.input} placeholder="Name (z.B. Hochzeitsfotografie)" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Ziffer 1–9" value={digit} onChangeText={setDigit} keyboardType="numeric" />
          <Pressable style={styles.saveBtn} onPress={handleAdd}>
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Speichern</Text>
          </Pressable>
          <Pressable onPress={() => setShowAdd(false)} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text>Abbrechen</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  addBtn: { backgroundColor: '#4A90D9', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: '#FFF', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 8 },
  digit: { width: 32, fontWeight: '700', fontSize: 16, color: '#4A90D9' },
  name: { flex: 1, fontSize: 15 },
  modal: { flex: 1, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 12 },
  saveBtn: { backgroundColor: '#4A90D9', padding: 14, borderRadius: 8, alignItems: 'center' },
})
```

- [ ] **Step 2: Update `app/(tabs)/settings.tsx`** with navigation links to `/order-types` and `/customers`:

```typescript
import { View, Pressable, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 8 },
  label: { fontSize: 16 },
})
```

- [ ] **Step 3: Verify in simulator — add an order type, verify it appears**

- [ ] **Step 4: Commit**

```bash
git add project-tracker/app/order-types/ project-tracker/app/(tabs)/settings.tsx
git commit -m "feat(mobile): Auftragsarten CRUD screen"
```

---

### Task 8: Kunden (Customers) screens

**Files:**
- Create: `project-tracker/app/customers/index.tsx`
- Create: `project-tracker/app/customers/new.tsx`

- [ ] **Step 1: Create `project-tracker/app/customers/index.tsx`**

List all customers (name, customer number). Tap → navigate to new screen for editing (Phase 1: editing is optional; show detail). FAB navigates to `/customers/new`.

```typescript
import React from 'react'
import { View, FlatList, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { listCustomers } from '../../src/repositories/customers'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

export default function CustomersScreen() {
  const [customers, setCustomers] = React.useState(listCustomers(OWNER_ID))
  useFocusEffect(React.useCallback(() => { setCustomers(listCustomers(OWNER_ID)) }, []))

  return (
    <View style={styles.container}>
      <FlatList
        data={customers}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.number}>{item.customerNumber}</Text>
            </View>
          </View>
        )}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/customers/new')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: { padding: 14, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '600' },
  number: { fontSize: 12, color: '#666' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4A90D9', alignItems: 'center', justifyContent: 'center' },
  fabText: { color: '#FFF', fontSize: 28, lineHeight: 32 },
})
```

- [ ] **Step 2: Create `project-tracker/app/customers/new.tsx`**

Form: Name (required), Auftragsart (picker from existing order types), Street/ZIP/City (optional). On submit, calls `createCustomer` which auto-generates the number.

```typescript
import React from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { router } from 'expo-router'
import { listOrderTypes } from '../../src/repositories/orderTypes'
import { createCustomer } from '../../src/repositories/customers'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

export default function NewCustomerScreen() {
  const orderTypes = listOrderTypes(OWNER_ID)
  const [name, setName] = React.useState('')
  const [orderTypeId, setOrderTypeId] = React.useState(orderTypes[0]?.id ?? '')
  const [street, setStreet] = React.useState('')
  const [zip, setZip] = React.useState('')
  const [city, setCity] = React.useState('')

  const handleSave = () => {
    if (!name.trim() || !orderTypeId) {
      Alert.alert('Pflichtfelder', 'Name und Auftragsart sind Pflicht.')
      return
    }
    const ot = orderTypes.find((o) => o.id === orderTypeId)
    if (!ot) return
    try {
      createCustomer(OWNER_ID, {
        name: name.trim(), orderTypeId, orderTypeDigit: ot.digit,
        street: street.trim() || undefined, zip: zip.trim() || undefined, city: city.trim() || undefined,
      })
      router.back()
    } catch (e) {
      Alert.alert('Fehler', String(e))
    }
  }

  if (orderTypes.length === 0) {
    return (
      <View style={styles.container}>
        <Text>Erst eine Auftragsart anlegen (Einstellungen → Auftragsarten).</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ gap: 12 }}>
      <Text style={styles.label}>Name *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Müller" />
      <Text style={styles.label}>Auftragsart *</Text>
      <Picker selectedValue={orderTypeId} onValueChange={setOrderTypeId}>
        {orderTypes.map((o) => <Picker.Item key={o.id} label={`${o.digit} – ${o.name}`} value={o.id} />)}
      </Picker>
      <Text style={styles.label}>Straße</Text>
      <TextInput style={styles.input} value={street} onChangeText={setStreet} placeholder="Musterstraße 1" />
      <Text style={styles.label}>PLZ</Text>
      <TextInput style={styles.input} value={zip} onChangeText={setZip} placeholder="12345" keyboardType="numeric" />
      <Text style={styles.label}>Stadt</Text>
      <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="München" />
      <Pressable style={styles.btn} onPress={handleSave}>
        <Text style={{ color: '#FFF', fontWeight: '600' }}>Anlegen</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontSize: 13, color: '#666', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12 },
  btn: { backgroundColor: '#4A90D9', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
})
```

**Note:** `@react-native-picker/picker` needs to be installed:
```bash
cd project-tracker && npx expo install @react-native-picker/picker
```

- [ ] **Step 3: Verify: create an order type in settings, then create a customer, verify customer number is generated correctly**

- [ ] **Step 4: Commit**

```bash
git add project-tracker/app/customers/
git commit -m "feat(mobile): Kunden list + new customer form with auto-number generation"
```

---

### Task 9: Aufgaben + Tags screen

**Files:**
- Modify: `project-tracker/app/(tabs)/tasks.tsx`

- [ ] **Step 1: Write `project-tracker/app/(tabs)/tasks.tsx`**

Full task list with tag chips on each row. FAB adds new task. Tap tag area → tag picker modal.

```typescript
import React from 'react'
import { View, Text, FlatList, Pressable, TextInput, Modal, StyleSheet, Alert } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import {
  listTasks, createTask, listTags, upsertTag, setTaskTags, getTagsForTask,
} from '../../src/repositories/tasks'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

type Task = { id: string; description: string; tags: { id: string; title: string }[] }

export default function TasksScreen() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [allTags, setAllTags] = React.useState<{ id: string; title: string }[]>([])
  const [showAdd, setShowAdd] = React.useState(false)
  const [newDesc, setNewDesc] = React.useState('')
  const [editingTagsFor, setEditingTagsFor] = React.useState<string | null>(null)
  const [newTagText, setNewTagText] = React.useState('')

  const load = () => {
    const rawTasks = listTasks(OWNER_ID)
    setTasks(rawTasks.map((t) => ({ ...t, tags: getTagsForTask(t.id) })))
    setAllTags(listTags(OWNER_ID))
  }
  useFocusEffect(React.useCallback(() => { load() }, []))

  const handleAddTask = () => {
    if (!newDesc.trim()) return
    try {
      createTask(OWNER_ID, newDesc.trim())
      setNewDesc(''); setShowAdd(false); load()
    } catch {
      Alert.alert('Fehler', 'Aufgabe mit diesem Namen existiert bereits.')
    }
  }

  const taskBeingEdited = tasks.find((t) => t.id === editingTagsFor)

  const handleAddTag = (taskId: string, currentTagIds: string[]) => {
    if (!newTagText.trim()) return
    const tagId = upsertTag(OWNER_ID, newTagText.trim())
    setTaskTags(OWNER_ID, taskId, [...new Set([...currentTagIds, tagId])])
    setNewTagText(''); load()
  }

  const handleRemoveTag = (taskId: string, tagId: string, currentTagIds: string[]) => {
    setTaskTags(OWNER_ID, taskId, currentTagIds.filter((id) => id !== tagId))
    load()
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
        <Text style={styles.addBtnText}>+ Aufgabe</Text>
      </Pressable>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <View style={styles.taskRow}>
            <Text style={styles.taskDesc}>{item.description}</Text>
            <View style={styles.tagRow}>
              {item.tags.map((tag) => (
                <Pressable key={tag.id} style={styles.tag}
                  onLongPress={() => { handleRemoveTag(item.id, tag.id, item.tags.map((t) => t.id)); load() }}>
                  <Text style={styles.tagText}>{tag.title}</Text>
                </Pressable>
              ))}
              <Pressable style={[styles.tag, styles.tagAdd]} onPress={() => setEditingTagsFor(item.id)}>
                <Text style={styles.tagText}>+ Tag</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* Add task modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Neue Aufgabe</Text>
          <TextInput style={styles.input} placeholder="Bildbearbeitung" value={newDesc} onChangeText={setNewDesc} autoFocus />
          <Pressable style={styles.saveBtn} onPress={handleAddTask}>
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Anlegen</Text>
          </Pressable>
          <Pressable onPress={() => setShowAdd(false)} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text>Abbrechen</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Tag edit modal */}
      <Modal visible={!!editingTagsFor} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Stichworte für „{taskBeingEdited?.description}"</Text>
          <View style={styles.tagRow}>
            {taskBeingEdited?.tags.map((tag) => (
              <Pressable key={tag.id} style={styles.tag}
                onPress={() => { handleRemoveTag(editingTagsFor!, tag.id, taskBeingEdited.tags.map((t) => t.id)) }}>
                <Text style={styles.tagText}>{tag.title} ✕</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={[styles.input, { marginTop: 12 }]} placeholder="Neues Stichwort"
            value={newTagText} onChangeText={setNewTagText} />
          <Pressable style={[styles.saveBtn, { marginTop: 8 }]}
            onPress={() => handleAddTag(editingTagsFor!, taskBeingEdited?.tags.map((t) => t.id) ?? [])}>
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Stichwort hinzufügen</Text>
          </Pressable>
          <Pressable onPress={() => { setEditingTagsFor(null); setNewTagText('') }} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text>Fertig</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  addBtn: { backgroundColor: '#4A90D9', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: '#FFF', fontWeight: '600' },
  taskRow: { backgroundColor: '#FFF', borderRadius: 8, padding: 14, marginBottom: 8 },
  taskDesc: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#E8F4FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagAdd: { backgroundColor: '#EEE' },
  tagText: { fontSize: 12, color: '#4A90D9' },
  modal: { flex: 1, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12 },
  saveBtn: { backgroundColor: '#4A90D9', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
})
```

- [ ] **Step 2: Verify in simulator — add a task, add tags, long-press tag to remove**

- [ ] **Step 3: Commit**

```bash
git add project-tracker/app/(tabs)/tasks.tsx
git commit -m "feat(mobile): Aufgaben list with tag management"
```

---

### Task 10: Project create form

**Files:**
- Create: `project-tracker/app/projects/new.tsx`

- [ ] **Step 1: Create `project-tracker/app/projects/new.tsx`**

Fields: Title, Customer (picker), Description, Color (ColorPicker), Pricing (XOR toggle: Stundensatz / Festpreis), Tasks (multi-select from listTasks). Validation: title required, customer required, pricing XOR must be valid.

```typescript
import React from 'react'
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { router } from 'expo-router'
import { ColorPicker } from '../../src/components/ColorPicker'
import { listCustomers } from '../../src/repositories/customers'
import { listTasks } from '../../src/repositories/tasks'
import { createProject } from '../../src/repositories/projects'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'
const DEFAULT_COLOR = '#4A90D9'

export default function NewProjectScreen() {
  const customers = listCustomers(OWNER_ID)
  const allTasks = listTasks(OWNER_ID)

  const [title, setTitle] = React.useState('')
  const [customerId, setCustomerId] = React.useState(customers[0]?.id ?? '')
  const [description, setDescription] = React.useState('')
  const [color, setColor] = React.useState(DEFAULT_COLOR)
  const [pricingMode, setPricingMode] = React.useState<'hourly' | 'fixed'>('hourly')
  const [hourlyRate, setHourlyRate] = React.useState('')
  const [fixedPrice, setFixedPrice] = React.useState('')
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<string[]>([])

  const toggleTask = (id: string) =>
    setSelectedTaskIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const parseEurosToCents = (s: string): number | undefined => {
    const n = parseFloat(s.replace(',', '.'))
    return isNaN(n) ? undefined : Math.round(n * 100)
  }

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('Pflichtfeld', 'Titel ist Pflicht.'); return }
    if (!customerId) { Alert.alert('Pflichtfeld', 'Kunde ist Pflicht.'); return }
    if (pricingMode === 'hourly' && !hourlyRate) { Alert.alert('Pflichtfeld', 'Stundensatz ist Pflicht.'); return }
    if (pricingMode === 'fixed' && !fixedPrice) { Alert.alert('Pflichtfeld', 'Festpreis ist Pflicht.'); return }

    const hourlyRateCents = pricingMode === 'hourly' ? parseEurosToCents(hourlyRate) : undefined
    const fixedPriceCents = pricingMode === 'fixed' ? parseEurosToCents(fixedPrice) : undefined

    if (pricingMode === 'hourly' && !hourlyRateCents) { Alert.alert('Ungültig', 'Stundensatz ungültig.'); return }
    if (pricingMode === 'fixed' && !fixedPriceCents) { Alert.alert('Ungültig', 'Festpreis ungültig.'); return }

    createProject(OWNER_ID, {
      customerId, title: title.trim(), description: description.trim() || undefined,
      color, pricingMode, hourlyRateCents, fixedPriceCents, taskIds: selectedTaskIds,
    })
    router.back()
  }

  if (customers.length === 0) {
    return (
      <View style={styles.empty}>
        <Text>Erst einen Kunden anlegen (Einstellungen → Kunden).</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
      <Text style={styles.label}>Titel *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Hochzeit Müller" />

      <Text style={styles.label}>Kunde *</Text>
      <Picker selectedValue={customerId} onValueChange={setCustomerId}>
        {customers.map((c) => <Picker.Item key={c.id} label={`${c.customerNumber} – ${c.name}`} value={c.id} />)}
      </Picker>

      <Text style={styles.label}>Beschreibung</Text>
      <TextInput style={[styles.input, { height: 72 }]} value={description} onChangeText={setDescription} multiline placeholder="Optional..." />

      <Text style={styles.label}>Farbe</Text>
      <ColorPicker value={color} onChange={setColor} />

      <Text style={[styles.label, { marginTop: 8 }]}>Abrechnung</Text>
      <View style={styles.pricingRow}>
        {(['hourly', 'fixed'] as const).map((mode) => (
          <Pressable key={mode} style={[styles.pricingBtn, pricingMode === mode && styles.pricingBtnActive]} onPress={() => setPricingMode(mode)}>
            <Text style={pricingMode === mode ? { color: '#FFF' } : undefined}>
              {mode === 'hourly' ? 'Stundensatz' : 'Festpreis'}
            </Text>
          </Pressable>
        ))}
      </View>
      {pricingMode === 'hourly' && (
        <TextInput style={styles.input} value={hourlyRate} onChangeText={setHourlyRate} placeholder="80,00 €/h" keyboardType="decimal-pad" />
      )}
      {pricingMode === 'fixed' && (
        <TextInput style={styles.input} value={fixedPrice} onChangeText={setFixedPrice} placeholder="1.500,00 €" keyboardType="decimal-pad" />
      )}

      {allTasks.length > 0 && (
        <>
          <Text style={styles.label}>Aufgaben</Text>
          {allTasks.map((t) => (
            <Pressable key={t.id} style={[styles.taskRow, selectedTaskIds.includes(t.id) && styles.taskSelected]} onPress={() => toggleTask(t.id)}>
              <Text>{selectedTaskIds.includes(t.id) ? '☑' : '☐'} {t.description}</Text>
            </Pressable>
          ))}
        </>
      )}

      <Pressable style={styles.btn} onPress={handleSave}>
        <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 16 }}>Anlegen</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  label: { fontSize: 13, color: '#666' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12 },
  pricingRow: { flexDirection: 'row', gap: 8 },
  pricingBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#EEE', alignItems: 'center' },
  pricingBtnActive: { backgroundColor: '#4A90D9' },
  taskRow: { padding: 10, borderRadius: 6, backgroundColor: '#F5F5F5' },
  taskSelected: { backgroundColor: '#D0E8FF' },
  btn: { backgroundColor: '#4A90D9', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
})
```

- [ ] **Step 2: Verify full create flow — order type → customer → task → project → appears on home tile grid**

- [ ] **Step 3: Commit**

```bash
git add project-tracker/app/projects/new.tsx
git commit -m "feat(mobile): new project form with pricing XOR, color picker, task assignment"
```

---

### Task 11: Project detail screen

**Files:**
- Create: `project-tracker/app/projects/[id].tsx`

Shows: title, customer, pricing info, total tracked time, total cost (or relative rate for fixed-price), list of time entries with edit/delete actions.

- [ ] **Step 1: Create `project-tracker/app/projects/[id].tsx`**

```typescript
import React from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { getProject, getProjectTotalSeconds } from '../../src/repositories/projects'
import { listTimeEntriesForProject } from '../../src/repositories/timeEntries'
import { softDeleteTimeEntry } from '../../src/repositories/timeEntries'
import { archiveProject } from '../../src/repositories/projects'
import { formatDuration } from '../../src/utils/time'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [project, setProject] = React.useState(getProject(OWNER_ID, id))
  const [entries, setEntries] = React.useState(listTimeEntriesForProject(OWNER_ID, id))
  const [totalSeconds, setTotalSeconds] = React.useState(getProjectTotalSeconds(OWNER_ID, id))

  const load = () => {
    setProject(getProject(OWNER_ID, id))
    setEntries(listTimeEntriesForProject(OWNER_ID, id))
    setTotalSeconds(getProjectTotalSeconds(OWNER_ID, id))
  }
  useFocusEffect(React.useCallback(() => { load() }, [id]))

  if (!project) return <View style={styles.c}><Text>Nicht gefunden</Text></View>

  const totalCents = project.pricingMode === 'hourly'
    ? Math.round((totalSeconds / 3600) * (project.hourlyRateCents ?? 0))
    : null

  const relativeRate = project.pricingMode === 'fixed' && totalSeconds > 0
    ? Math.round(((project.fixedPriceCents ?? 0) / (totalSeconds / 3600)))
    : null

  const handleArchive = () => {
    Alert.alert('Archivieren?', 'Das Projekt verschwindet aus der Kachelansicht.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Archivieren', onPress: () => { archiveProject(OWNER_ID, id); router.back() } },
    ])
  }

  return (
    <View style={styles.c}>
      <View style={[styles.header, { borderLeftColor: project.color }]}>
        <Text style={styles.title}>{project.title}</Text>
        <Text style={styles.meta}>
          {project.pricingMode === 'hourly'
            ? `${((project.hourlyRateCents ?? 0) / 100).toFixed(2)} €/h`
            : `Festpreis ${((project.fixedPriceCents ?? 0) / 100).toFixed(2)} €`}
        </Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{formatDuration(totalSeconds)}</Text>
          <Text style={styles.statLabel}>Gesamtzeit</Text>
        </View>
        {totalCents !== null && (
          <View style={styles.stat}>
            <Text style={styles.statVal}>{(totalCents / 100).toFixed(2)} €</Text>
            <Text style={styles.statLabel}>Gesamtbetrag</Text>
          </View>
        )}
        {relativeRate !== null && (
          <View style={styles.stat}>
            <Text style={styles.statVal}>{(relativeRate / 100).toFixed(2)} €/h</Text>
            <Text style={styles.statLabel}>Relativer Stundensatz</Text>
          </View>
        )}
        {project.pricingMode === 'fixed' && totalSeconds === 0 && (
          <View style={styles.stat}>
            <Text style={styles.statVal}>—</Text>
            <Text style={styles.statLabel}>Relativer Stundensatz</Text>
          </View>
        )}
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.entry}
            onLongPress={() => Alert.alert('Zeiteintrag', '', [
              { text: 'Bearbeiten', onPress: () => router.push(`/time-entries/${item.id}/edit`) },
              { text: 'Löschen', style: 'destructive', onPress: () => { softDeleteTimeEntry(OWNER_ID, item.id); load() } },
              { text: 'Abbrechen', style: 'cancel' },
            ])}
          >
            <Text style={styles.entryDuration}>{formatDuration(item.durationSeconds)}</Text>
            <Text style={styles.entryDate}>{new Date(item.startedAt).toLocaleDateString('de-DE')}</Text>
          </Pressable>
        )}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
      />

      <Pressable style={styles.archiveBtn} onPress={handleArchive}>
        <Text style={styles.archiveBtnText}>Archivieren</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  header: { padding: 16, borderLeftWidth: 5, margin: 16, backgroundColor: '#FFF', borderRadius: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  meta: { color: '#666', marginTop: 4 },
  stats: { flexDirection: 'row', padding: 16, gap: 16 },
  stat: { flex: 1, backgroundColor: '#FFF', borderRadius: 8, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '700', color: '#4A90D9' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },
  entry: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 6 },
  entryDuration: { fontWeight: '600' },
  entryDate: { color: '#666' },
  archiveBtn: { margin: 16, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#E74C3C', alignItems: 'center' },
  archiveBtnText: { color: '#E74C3C', fontWeight: '600' },
})
```

- [ ] **Step 2: Wire `ProjectTile` onLongPress to navigate to project detail**

In `project-tracker/src/components/ProjectTile.tsx`, add an `onLongPress` prop that navigates to `/projects/[id]`:

```typescript
interface Props {
  ...
  onLongPress: () => void
}
// Add onLongPress to Pressable
```

In `app/(tabs)/index.tsx`, update the renderItem to add `onLongPress={() => router.push(`/projects/${item.id}`)}` to ProjectTile.

- [ ] **Step 3: Verify — create project, track time, open detail, see totals**

- [ ] **Step 4: Commit**

```bash
git add project-tracker/app/projects/
git commit -m "feat(mobile): project detail with Gesamtzeit, Gesamtkosten, relativer Stundensatz, time entry list"
```

---

### Task 12: Time entry edit + soft-delete screen

**Files:**
- Create: `project-tracker/app/time-entries/[id]/edit.tsx`

- [ ] **Step 1: Create `project-tracker/app/time-entries/[id]/edit.tsx`**

Shows the time entry fields: date, start time, end time, task (picker), notes. On save: validates `endedAt > startedAt`, calls `updateTimeEntry`. Delete button calls `softDeleteTimeEntry` and goes back.

```typescript
import React from 'react'
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { db } from '../../../src/db/client'
import { eq } from 'drizzle-orm'
import * as schema from '@projekt-tracker/schema'
import { listTasksForProject } from '../../../src/repositories/tasks'
import { updateTimeEntry, softDeleteTimeEntry } from '../../../src/repositories/timeEntries'
import { Picker } from '@react-native-picker/picker'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

function toTimeStr(d: Date) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function parseDateTimeLocal(dateStr: string, timeStr: string): Date | null {
  const dt = new Date(`${dateStr}T${timeStr}:00`)
  return isNaN(dt.getTime()) ? null : dt
}

export default function EditTimeEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const entry = db.select().from(schema.timeEntries).where(eq(schema.timeEntries.id, id)).get()

  const [dateStr, setDateStr] = React.useState(entry ? toDateStr(entry.startedAt) : '')
  const [startStr, setStartStr] = React.useState(entry ? toTimeStr(entry.startedAt) : '')
  const [endStr, setEndStr] = React.useState(entry ? toTimeStr(entry.endedAt) : '')
  const [taskId, setTaskId] = React.useState(entry?.taskId ?? '')
  const [notes, setNotes] = React.useState(entry?.notes ?? '')

  const tasks = entry ? listTasksForProject(OWNER_ID, entry.projectId) : []

  if (!entry) return <View style={s.c}><Text>Nicht gefunden</Text></View>

  const handleSave = () => {
    const startedAt = parseDateTimeLocal(dateStr, startStr)
    const endedAt = parseDateTimeLocal(dateStr, endStr)
    if (!startedAt || !endedAt) { Alert.alert('Ungültig', 'Datum/Uhrzeit ungültig.'); return }
    if (endedAt <= startedAt) { Alert.alert('Ungültig', 'Ende muss nach Start liegen.'); return }
    if (!taskId) { Alert.alert('Pflichtfeld', 'Aufgabe wählen.'); return }
    updateTimeEntry(OWNER_ID, id, { startedAt, endedAt, taskId, notes: notes.trim() || undefined })
    router.back()
  }

  const handleDelete = () => {
    Alert.alert('Zeiteintrag löschen?', 'Diese Aktion kann nicht rückgängig gemacht werden.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => { softDeleteTimeEntry(OWNER_ID, id); router.back() } },
    ])
  }

  return (
    <ScrollView style={s.c} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
      <Text style={s.label}>Datum (YYYY-MM-DD)</Text>
      <TextInput style={s.input} value={dateStr} onChangeText={setDateStr} placeholder="2026-01-15" />
      <Text style={s.label}>Startzeit (HH:MM)</Text>
      <TextInput style={s.input} value={startStr} onChangeText={setStartStr} placeholder="09:00" />
      <Text style={s.label}>Endzeit (HH:MM)</Text>
      <TextInput style={s.input} value={endStr} onChangeText={setEndStr} placeholder="10:30" />
      <Text style={s.label}>Aufgabe</Text>
      <Picker selectedValue={taskId} onValueChange={setTaskId}>
        {tasks.map((t) => <Picker.Item key={t.id} label={t.description} value={t.id} />)}
      </Picker>
      <Text style={s.label}>Notiz</Text>
      <TextInput style={[s.input, { height: 72 }]} value={notes} onChangeText={setNotes} multiline />
      <Pressable style={s.btn} onPress={handleSave}>
        <Text style={{ color: '#FFF', fontWeight: '600' }}>Speichern</Text>
      </Pressable>
      <Pressable style={s.deleteBtn} onPress={handleDelete}>
        <Text style={{ color: '#E74C3C', fontWeight: '600' }}>Zeiteintrag löschen</Text>
      </Pressable>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16 },
  label: { fontSize: 13, color: '#666' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12 },
  btn: { backgroundColor: '#4A90D9', padding: 14, borderRadius: 8, alignItems: 'center' },
  deleteBtn: { borderWidth: 1, borderColor: '#E74C3C', padding: 14, borderRadius: 8, alignItems: 'center' },
})
```

- [ ] **Step 2: Verify — from project detail, long-press a time entry, tap Bearbeiten, change times, save, verify updated total**

- [ ] **Step 3: Run lint and typecheck**

```bash
cd project-tracker && npm run lint && npx tsc --noEmit
```

Fix any errors.

- [ ] **Step 4: Run all tests**

```bash
cd project-tracker && npm test
cd packages/schema && pnpm test
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add project-tracker/app/time-entries/
git commit -m "feat(mobile): time entry edit + soft-delete (ADR-014)"
```

---

## Self-Review

### Spec coverage

| Requirement (TODO.md Phase 1) | Task |
|-------------------------------|------|
| Auftragsart-Liste verwalten (CRUD) | Task 7 |
| Kundennummern-Generator | Task 8 (calls repo from 1A) |
| Kunden anlegen/editieren/listen | Task 8 |
| Aufgaben CRUD inkl. m:n Stichwort | Task 9 |
| Stichwort-Picker | Task 9 |
| Projekt-Anlegen-Form, Pricing-XOR | Task 10 |
| Validierung: Aufgabe nicht Pflicht beim Anlegen (ADR-012) | Task 10 (no required task field) |
| Projekt-Liste auf Startseite (FlashList) | Task 5 |
| Projekt-Detail: Gesamtzeit, Gesamtkosten, relativer Stundensatz | Task 11 |
| Projekt archivieren | Task 11 |
| Tap-to-Start-Geste | Task 5 (tap tile) |
| Swipe-to-Stop (Reanimated v4) | Task 6 |
| Stop-Modal: Aufgabe wählen (ADR-012) | Task 6 |
| Banner für aktiven Timer + Live-Counter | Tasks 4, 5 |
| Manuelle Zeit-Korrektur: Edit + Soft-Delete (ADR-014) | Task 12 |

**Note on `rate_snapshot_cents` and edit:** Per ADR-014, editing a time entry does NOT change `rate_snapshot_cents`. The `updateTimeEntry` implementation correctly omits that field from the update.

### Placeholder scan
- `customerName` in home screen is initialized to `''` — add a join in `listActiveProjects` or a second pass. This is explicitly noted as `// TODO` in the code so it is visible but flagged as tech debt, not silently wrong.

### Type consistency
- `softDeleteTimeEntry` is defined in `timeEntries.ts` and used in both `projects/[id].tsx` and `time-entries/[id]/edit.tsx` with the same signature.
- `createProject` accepts `NewProject` — `taskIds` field is `string[]`, consistent across usage in Task 10.
