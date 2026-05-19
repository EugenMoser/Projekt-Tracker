import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { sign } from 'hono/jwt'
import type { Db } from '../db.js'
import { createUser } from '../repositories/users.js'
import type { AppVariables } from '../middleware/auth.js'

const bootstrapSchema = z.object({
  displayName: z.string().min(1),
})

export function createBootstrapRoute(db: Db, jwtSecret: string) {
  const route = new Hono<{ Variables: AppVariables }>()

  route.post('/bootstrap', zValidator('json', bootstrapSchema), async (c) => {
    const { displayName } = c.req.valid('json')
    const userId = await createUser(db, displayName)
    // long-lived device JWT — no expiry by design (Single-User MVP, see SECURITY.md)
    const token = await sign({ sub: userId, tier: 'pro' }, jwtSecret, 'HS256')
    return c.json({ token, userId }, 201)
  })

  return route
}
