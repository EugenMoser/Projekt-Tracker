import { z } from 'zod'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { Db } from '../db.js'
import type { AppVariables } from '../middleware/auth.js'
import { createAuthMiddleware } from '../middleware/auth.js'
import { queryExportData } from '../repositories/export.js'
import { renderExcel } from '../services/excelRenderer.js'

export const exportQuerySchema = z.object({
  from:       z.string().regex(/^\d{4}-\d{2}$/, 'Format YYYY-MM required'),
  to:         z.string().regex(/^\d{4}-\d{2}$/, 'Format YYYY-MM required'),
  customerId: z.string().uuid().optional(),
})

function monthStart(ym: string): Date {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1))
}

function monthEnd(ym: string): Date {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m, 1))
}

export function createExportRoute(db: Db, jwtSecret: string) {
  const app = new Hono<{ Variables: AppVariables }>()
  app.use('*', createAuthMiddleware(jwtSecret))

  app.get('/excel', zValidator('query', exportQuerySchema), async (c) => {
    const userId = c.get('userId')
    const { from, to, customerId } = c.req.valid('query')

    const { rows, tagMap } = await queryExportData(db, userId, monthStart(from), monthEnd(to), customerId)
    const buffer = await renderExcel(rows, tagMap)

    return c.body(new Uint8Array(buffer), 200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="export-${from}-${to}.xlsx"`,
    })
  })

  return app
}
