import React from 'react'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { sqlite } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = React.useState(false)

  React.useEffect(() => {
    runMigrations(sqlite)
      .then(() => setIsDbReady(true))
      .catch((e) => {
        console.error('Migration failed', e)
        setIsDbReady(true)
      })
  }, [])

  if (!isDbReady) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="projects/new" options={{ title: 'Neues Projekt', presentation: 'modal' }} />
        <Stack.Screen name="projects/[id]" options={{ title: 'Projekt-Detail' }} />
        <Stack.Screen name="customers" options={{ title: 'Kunden' }} />
        <Stack.Screen name="customers/new" options={{ title: 'Neuer Kunde', presentation: 'modal' }} />
        <Stack.Screen name="order-types" options={{ title: 'Auftragsarten' }} />
        <Stack.Screen name="time-entries/[id]/edit" options={{ title: 'Zeiteintrag bearbeiten', presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}
