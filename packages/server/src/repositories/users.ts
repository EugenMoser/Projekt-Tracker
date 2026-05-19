import type { Db } from '../db.js'
import { users } from '@projekt-tracker/schema/pg'

export async function createUser(
  db: Db,
  displayName: string
): Promise<string> {
  const [user] = await db
    .insert(users)
    .values({ displayName })
    .returning({ id: users.id })
  return user.id
}
