import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { createAuthMiddleware } from '../middleware/auth.js'
import type { AppVariables } from '../middleware/auth.js'

const SECRET = 'test-jwt-secret-must-be-32chars!!'

const testApp = new Hono<{ Variables: AppVariables }>()
testApp.get('/protected', createAuthMiddleware(SECRET), (c) =>
  c.json({ userId: c.get('userId') })
)

describe('createAuthMiddleware', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await testApp.request('/protected')
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toHaveProperty('error', 'Unauthorized')
  })

  it('returns 401 when token has wrong format (not Bearer)', async () => {
    const res = await testApp.request('/protected', {
      headers: { Authorization: 'Basic some-base64-stuff' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    const res = await testApp.request('/protected', {
      headers: { Authorization: 'Bearer invalid.token.value' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is signed with wrong secret', async () => {
    const token = await sign({ sub: 'user-123' }, 'wrong-secret-also-32-chars-long!!', 'HS256')
    const res = await testApp.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(401)
  })

  it('sets userId and calls next on valid token', async () => {
    const token = await sign({ sub: 'user-abc-123' }, SECRET, 'HS256')
    const res = await testApp.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ userId: 'user-abc-123' })
  })

  it('returns 401 when payload has no sub claim', async () => {
    const token = await sign({ role: 'admin' }, SECRET, 'HS256')
    const res = await testApp.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(401)
  })
})
