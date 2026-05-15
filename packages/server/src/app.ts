import { Hono } from 'hono'
import { healthRoute } from './routes/health.js'
import { createBootstrapRoute } from './routes/auth.js'
import { createSyncRoute } from './routes/sync.js'
import { db } from './db.js'
import { env } from './env.js'
import type { AppVariables } from './middleware/auth.js'

export function createApp(): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>()
  app.route('/v1', healthRoute)
  app.route('/v1/auth', createBootstrapRoute(db, env.JWT_SECRET))
  app.route('/v1/sync', createSyncRoute(db, env.JWT_SECRET))
  return app
}
