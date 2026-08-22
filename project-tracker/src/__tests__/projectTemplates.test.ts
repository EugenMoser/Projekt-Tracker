import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import * as schema from '@projekt-tracker/schema'
import { eq } from 'drizzle-orm'

import { db as mockDb } from '../db/client'
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
} from '../repositories/projectTemplates'

jest.mock('../db/client', () => {
  const BetterSQLite = require('better-sqlite3')
  const { drizzle } = require('drizzle-orm/better-sqlite3')
  const schema = require('@projekt-tracker/schema')
  const sqlite = new BetterSQLite(':memory:')
  sqlite.pragma('foreign_keys = ON')
  for (const m of schema.migrations) sqlite.exec(m.sql)
  return { db: drizzle(sqlite, { schema }) }
})

const NOW = new Date('2026-08-22T10:00:00Z')
const U = '00000000-0000-0000-0000-000000000001'
const U2 = '00000000-0000-0000-0000-0000000000ff'
const TASK_A = '00000000-0000-0000-0000-000000000005'
const TASK_B = '00000000-0000-0000-0000-000000000006'

beforeEach(() => {
  mockDb.delete(schema.templateTasks).run()
  mockDb.delete(schema.projectTemplates).run()
  mockDb.delete(schema.tasks).run()
  mockDb.delete(schema.users).run()
})

function seedBase() {
  mockDb
    .insert(schema.users)
    .values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW })
    .run()
  mockDb
    .insert(schema.users)
    .values({ id: U2, displayName: 'Other', tier: 'pro', createdAt: NOW, updatedAt: NOW })
    .run()
  mockDb
    .insert(schema.tasks)
    .values({ id: TASK_A, userId: U, description: 'Shooting', createdAt: NOW, updatedAt: NOW })
    .run()
  mockDb
    .insert(schema.tasks)
    .values({ id: TASK_B, userId: U, description: 'Schnitt', createdAt: NOW, updatedAt: NOW })
    .run()
}

describe('createTemplate + getTemplate', () => {
  it('round-trips name, pricing and task selection', () => {
    seedBase()
    const id = createTemplate(U, {
      name: 'Hochzeit',
      pricingMode: 'hourly',
      hourlyRateCents: 8000,
      taskIds: [TASK_A, TASK_B],
    })

    const template = getTemplate(U, id)
    expect(template?.name).toBe('Hochzeit')
    expect(template?.pricingMode).toBe('hourly')
    expect(template?.hourlyRateCents).toBe(8000)
    expect([...(template?.taskIds ?? [])].sort()).toEqual([TASK_A, TASK_B].sort())
  })

  it('stores fixed pricing without an hourly rate', () => {
    seedBase()
    const id = createTemplate(U, {
      name: 'Logo-Design',
      pricingMode: 'fixed',
      fixedPriceCents: 150000,
      taskIds: [],
    })

    const template = getTemplate(U, id)
    expect(template?.pricingMode).toBe('fixed')
    expect(template?.fixedPriceCents).toBe(150000)
    expect(template?.taskIds).toEqual([])
  })

  it('excludes soft-deleted tasks from taskIds', () => {
    seedBase()
    const id = createTemplate(U, {
      name: 'Hochzeit',
      pricingMode: 'hourly',
      hourlyRateCents: 8000,
      taskIds: [TASK_A, TASK_B],
    })
    mockDb.update(schema.tasks).set({ deletedAt: NOW }).where(eq(schema.tasks.id, TASK_B)).run()

    const template = getTemplate(U, id)
    expect(template?.taskIds).toEqual([TASK_A])
  })

  it("returns undefined for another user's template", () => {
    seedBase()
    const id = createTemplate(U, {
      name: 'Hochzeit',
      pricingMode: 'hourly',
      hourlyRateCents: 8000,
      taskIds: [],
    })

    expect(getTemplate(U2, id)).toBeUndefined()
  })
})

describe('listTemplates', () => {
  it('excludes soft-deleted templates', () => {
    seedBase()
    const id = createTemplate(U, {
      name: 'Hochzeit',
      pricingMode: 'hourly',
      hourlyRateCents: 8000,
      taskIds: [],
    })
    deleteTemplate(U, id)

    expect(listTemplates(U).find((t) => t.id === id)).toBeUndefined()
  })

  it("does not return another user's templates", () => {
    seedBase()
    createTemplate(U2, {
      name: 'Fremd',
      pricingMode: 'hourly',
      hourlyRateCents: 5000,
      taskIds: [],
    })

    expect(listTemplates(U)).toEqual([])
  })
})

describe('updateTemplate', () => {
  it('replaces the task set entirely', () => {
    seedBase()
    const id = createTemplate(U, {
      name: 'Hochzeit',
      pricingMode: 'hourly',
      hourlyRateCents: 8000,
      taskIds: [TASK_A],
    })

    updateTemplate(U, id, { taskIds: [TASK_B] })

    expect(getTemplate(U, id)?.taskIds).toEqual([TASK_B])
  })

  it('updates pricing fields without touching the task set', () => {
    seedBase()
    const id = createTemplate(U, {
      name: 'Hochzeit',
      pricingMode: 'hourly',
      hourlyRateCents: 8000,
      taskIds: [TASK_A],
    })

    updateTemplate(U, id, {
      pricingMode: 'fixed',
      fixedPriceCents: 200000,
      hourlyRateCents: null,
    })

    const template = getTemplate(U, id)
    expect(template?.pricingMode).toBe('fixed')
    expect(template?.fixedPriceCents).toBe(200000)
    expect(template?.hourlyRateCents).toBeNull()
    expect(template?.taskIds).toEqual([TASK_A])
  })

  it("does not update another user's template (tenant isolation)", () => {
    seedBase()
    const id = createTemplate(U, {
      name: 'Hochzeit',
      pricingMode: 'hourly',
      hourlyRateCents: 8000,
      taskIds: [],
    })

    updateTemplate(U2, id, { name: 'Gehackt' })

    expect(getTemplate(U, id)?.name).toBe('Hochzeit')
  })
})

describe('deleteTemplate', () => {
  it('is a soft delete: row stays but deletedAt is set', () => {
    seedBase()
    const id = createTemplate(U, {
      name: 'Hochzeit',
      pricingMode: 'hourly',
      hourlyRateCents: 8000,
      taskIds: [],
    })

    deleteTemplate(U, id)

    const row = mockDb
      .select()
      .from(schema.projectTemplates)
      .where(eq(schema.projectTemplates.id, id))
      .get()
    expect(row?.deletedAt).not.toBeNull()
  })
})
