import path from 'path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@projekt-tracker/schema/pg': path.resolve(__dirname, '../schema/src/pg.ts'),
      '@projekt-tracker/schema/sqlite': path.resolve(__dirname, '../schema/src/sqlite.ts'),
      '@projekt-tracker/schema': path.resolve(__dirname, '../schema/src/index.ts'),
    },
  },
})
