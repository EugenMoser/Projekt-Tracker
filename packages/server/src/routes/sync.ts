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
