import React from 'react'
import { Stack } from 'expo-router'
import { sqlite } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = React.useState(false)

  React.useEffect(() => {
    sqlite.execSync('PRAGMA foreign_keys = ON')
    runMigrations(sqlite)
      .then(() => setIsDbReady(true))
      .catch((e) => {
        console.error('DB migration failed', e)
        setIsDbReady(true)
      })
  }, [])

  if (!isDbReady) return null

  return <Stack />
}
