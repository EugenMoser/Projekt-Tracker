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
        // include soft-deleted: customer numbers must never be recycled
        like(schema.customers.customerNumber, `${prefix}%`),
      )
    )
    .get()

  const seq = (result?.count ?? 0) + 1
  // LL is 2 digits until 99, then extends to 3 (schema allows varchar(8))
  const ll = seq <= 99 ? String(seq).padStart(2, '0') : String(seq)
  return `${prefix}${ll}`
}
