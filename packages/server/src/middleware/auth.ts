import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'

export type AppVariables = { userId: string }

export function createAuthMiddleware(secret: string) {
  return createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const auth = c.req.header('Authorization')
    if (!auth?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    const token = auth.slice(7)
    try {
      const payload = await verify(token, secret, 'HS256')
      if (typeof payload.sub !== 'string') {
        return c.json({ error: 'Unauthorized' }, 401)
      }
      c.set('userId', payload.sub)
      await next()
    } catch {
      return c.json({ error: 'Unauthorized' }, 401)
    }
  })
}
