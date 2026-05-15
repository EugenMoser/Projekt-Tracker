import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { healthRoute } from '../routes/health.js'

describe('GET /v1/healthz', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const app = new Hono()
    app.route('/v1', healthRoute)
    const res = await app.request('/v1/healthz')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })
})
