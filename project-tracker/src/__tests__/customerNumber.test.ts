import * as schema from '@projekt-tracker/schema'
import { migrations } from '@projekt-tracker/schema'
import BetterSQLite from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

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
  db.insert(schema.users)
    .values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW })
    .run()
  db.insert(schema.orderTypes)
    .values({ id: OT, userId: U, name: 'Hochzeit', digit: 1, createdAt: NOW, updatedAt: NOW })
    .run()
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
    db.insert(schema.customers)
      .values({
        id: C1,
        userId: U,
        customerNumber: '26101',
        orderTypeId: OT,
        name: 'First',
        createdAt: NOW,
        updatedAt: NOW,
      })
      .run()
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
      db.insert(schema.customers)
        .values({
          id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
          userId: U,
          customerNumber: `261${String(i).padStart(2, '0')}`,
          orderTypeId: OT,
          name: `C${i}`,
          createdAt: NOW,
          updatedAt: NOW,
        })
        .run()
    }
    const num = generateCustomerNumber(db, { userId: U, orderTypeDigit: 1, year: 2026 })
    expect(num).toBe('26199')
  })

  it('100th customer gets 3-digit LL (261100)', () => {
    const db = makeTestDb()
    seedBase(db)
    for (let i = 1; i <= 99; i++) {
      db.insert(schema.customers)
        .values({
          id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
          userId: U,
          customerNumber: `261${String(i).padStart(2, '0')}`,
          orderTypeId: OT,
          name: `C${i}`,
          createdAt: NOW,
          updatedAt: NOW,
        })
        .run()
    }
    const num = generateCustomerNumber(db, { userId: U, orderTypeDigit: 1, year: 2026 })
    expect(num).toBe('261100')
  })
})
