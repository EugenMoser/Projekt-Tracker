import { eq, and, isNull } from 'drizzle-orm'
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

export function updateTask(userId: string, id: string, description: string) {
  db.update(schema.tasks)
    .set({ description, updatedAt: new Date() })
    .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, userId)))
    .run()
}

export function deleteTask(userId: string, id: string) {
  db.update(schema.tasks)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, userId)))
    .run()
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
  db.delete(schema.taskTags).where(and(eq(schema.taskTags.taskId, taskId), eq(schema.taskTags.userId, userId))).run()
  for (const tagId of tagIds) {
    db.insert(schema.taskTags).values({ taskId, tagId, userId }).run()
  }
}

export function getTagsForTask(userId: string, taskId: string) {
  return db.select({ tag: schema.tags })
    .from(schema.taskTags)
    .innerJoin(schema.tags, eq(schema.taskTags.tagId, schema.tags.id))
    .where(and(eq(schema.taskTags.taskId, taskId), eq(schema.taskTags.userId, userId)))
    .all()
    .map((r) => r.tag)
}
