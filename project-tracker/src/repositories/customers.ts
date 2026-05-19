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
