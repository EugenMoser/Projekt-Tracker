import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import * as schema from '@projekt-tracker/schema'

import { db as mockDb } from '../db/client'
import { deleteCustomer, listCustomers, updateCustomer } from '../repositories/customers'

// `../repositories/customers` imports the singleton `db` from `../db/client`,
// which normally opens a native expo-sqlite database. In tests we swap that
// singleton for a real in-memory better-sqlite3 instance (same Drizzle API),
// so the repository under test runs against a real SQLite DB — no mocked
// query results, just a different physical backend.
jest.mock('../db/client', () => {
  const BetterSQLite = require('better-sqlite3')
  const { drizzle } = require('drizzle-orm/better-sqlite3')
  const schema = require('@projekt-tracker/schema')
  const sqlite = new BetterSQLite(':memory:')
  sqlite.pragma('foreign_keys = ON')
  for (const m of schema.migrations) sqlite.exec(m.sql)
  return { db: drizzle(sqlite, { schema }) }
})

const NOW = new Date('2026-07-01T10:00:00Z')
const U = '00000000-0000-0000-0000-000000000001'
const U2 = '00000000-0000-0000-0000-0000000000ff'
const OT1 = '00000000-0000-0000-0000-000000000002'
const OT2 = '00000000-0000-0000-0000-000000000003'
const CU = '00000000-0000-0000-0000-000000000004'

beforeEach(() => {
  // mockDb is a module-level singleton shared across tests (jest.mock only
  // registers it once), so we reset state before each test instead of
  // recreating the database.
  mockDb.delete(schema.customers).run()
  mockDb.delete(schema.orderTypes).run()
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
    .insert(schema.orderTypes)
    .values({ id: OT1, userId: U, name: 'Hochzeit', digit: 1, createdAt: NOW, updatedAt: NOW })
    .run()
  mockDb
    .insert(schema.orderTypes)
    .values({ id: OT2, userId: U, name: 'Taufe', digit: 2, createdAt: NOW, updatedAt: NOW })
    .run()
  mockDb
    .insert(schema.customers)
    .values({
      id: CU,
      userId: U,
      customerNumber: '26101',
      orderTypeId: OT1,
      name: 'Müller',
      createdAt: NOW,
      updatedAt: NOW,
    })
    .run()
}

describe('updateCustomer', () => {
  it('changes name correctly', () => {
    seedBase()
    updateCustomer(U, CU, { name: 'Meyer' })
    const customer = listCustomers(U).find((c) => c.id === CU)
    expect(customer?.name).toBe('Meyer')
  })

  it('changes orderTypeId correctly', () => {
    seedBase()
    updateCustomer(U, CU, { orderTypeId: OT2 })
    const customer = listCustomers(U).find((c) => c.id === CU)
    expect(customer?.orderTypeId).toBe(OT2)
  })

  it('does not change anything with wrong userId (tenant isolation)', () => {
    seedBase()
    updateCustomer(U2, CU, { name: 'Fremd' })
    const customer = listCustomers(U).find((c) => c.id === CU)
    expect(customer?.name).toBe('Müller')
  })
})

describe('deleteCustomer', () => {
  it('sets deletedAt so the customer no longer appears in listCustomers', () => {
    seedBase()
    deleteCustomer(U, CU)
    const customers = listCustomers(U)
    expect(customers.find((c) => c.id === CU)).toBeUndefined()
  })

  it('does not delete anything with wrong userId (tenant isolation)', () => {
    seedBase()
    deleteCustomer(U2, CU)
    const customers = listCustomers(U)
    expect(customers.find((c) => c.id === CU)).toBeDefined()
  })
})
