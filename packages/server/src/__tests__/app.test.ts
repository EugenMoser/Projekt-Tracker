import { describe, it, expect, beforeAll } from 'vitest'
import type { Hono } from 'hono'
import type { AppVariables } from '../middleware/auth.js'

// env singleton is parsed at module load time, so set required vars before importing app
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://test:test@localhost:5432/test'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-at-least-32-characters-long'

let createApp: () => Hono<{ Variables: AppVariables }>

beforeAll(async () => {
  const mod = await import('../app.js')
  createApp = mod.createApp
})

describe('createApp() middleware', () => {
  it('does not set CORS headers when ALLOWED_ORIGINS is empty (default)', async () => {
    const app = createApp()
    const res = await app.request('/v1/healthz')
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })
})
