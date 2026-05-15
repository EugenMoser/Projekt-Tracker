import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Hono } from 'hono'
import { verify } from 'hono/jwt'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as schema from '@projekt-tracker/schema/pg'
import { createBootstrapRoute } from '../routes/auth.js'
import type { AppVariables } from '../middleware/auth.js'

const DB_URL = process.env.DATABASE_URL
const SECRET = 'integration-test-secret-32chars!!'

describe.skipIf(!DB_URL)('POST /v1/auth/bootstrap (integration)', () => {
  let sql: ReturnType<typeof postgres>
  let db: ReturnType<typeof drizzle<typeof schema>>

  beforeAll(async () => {
    sql = postgres(DB_URL!, { max: 1 })
    db = drizzle(sql, { schema })
    const migrationsFolder = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../migrations'
    )
    const migrationSql = postgres(DB_URL!, { max: 1 })
    await migrate(drizzle(migrationSql), { migrationsFolder })
    await migrationSql.end()
  })

  afterAll(async () => {
    await sql.end()
  })

  it('creates a user and returns a JWT with userId', async () => {
    const app = new Hono<{ Variables: AppVariables }>()
    app.route('/v1/auth', createBootstrapRoute(db, SECRET))

    const res = await app.request('/v1/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Test Owner' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json() as { token: string; userId: string }
    expect(typeof body.token).toBe('string')
    expect(typeof body.userId).toBe('string')

    const payload = await verify(body.token, SECRET, 'HS256')
    expect(payload.sub).toBe(body.userId)
    expect(payload.tier).toBe('pro')
  })

  it('returns 400 when displayName is missing', async () => {
    const app = new Hono<{ Variables: AppVariables }>()
    app.route('/v1/auth', createBootstrapRoute(db, SECRET))

    const res = await app.request('/v1/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
  })
})
