import * as schema from '@projekt-tracker/schema'
import { drizzle } from 'drizzle-orm/expo-sqlite'
import * as SQLite from 'expo-sqlite'

const sqlite = SQLite.openDatabaseSync('projekt-tracker.db', {
  enableChangeListener: true,
})

export const db = drizzle(sqlite, { schema })
export { sqlite }
