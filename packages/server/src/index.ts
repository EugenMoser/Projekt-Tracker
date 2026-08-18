import { serve } from '@hono/node-server'

import { createApp } from './app.js'
import { runMigrations } from './db.js'
import { env } from './env.js'
import { logger } from './logger.js'

await runMigrations()
logger.info('Migrations complete')

const app = createApp()

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info(`Server listening on http://localhost:${info.port}`)
})
