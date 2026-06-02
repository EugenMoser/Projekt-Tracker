import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { healthRoute } from './routes/health.js'
import { createBootstrapRoute } from './routes/auth.js'
import { createSyncRoute } from './routes/sync.js'
import { createExportRoute } from './routes/export.js'
import { db } from './db.js'
import { env } from './env.js'
import type { AppVariables } from './middleware/auth.js'

export function createApp(): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>()

  if (env.NODE_ENV === 'production') {
    app.use('*', secureHeaders())
  }

  if (env.ALLOWED_ORIGINS) {
    app.use(
      '*',
      cors({ origin: env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean) }),
    )
  }

  app.route('/v1', healthRoute)
  app.route('/v1/auth', createBootstrapRoute(db, env.JWT_SECRET))
  app.route('/v1/sync', createSyncRoute(db, env.JWT_SECRET))
  app.route('/v1/exports', createExportRoute(db, env.JWT_SECRET))
  return app
}
