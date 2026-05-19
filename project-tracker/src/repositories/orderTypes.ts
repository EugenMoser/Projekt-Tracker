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
