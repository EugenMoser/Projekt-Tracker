import { StyleSheet, Text, View } from 'react-native'

import { useSyncStore } from '../store/syncStore'

export function SyncIndicator() {
  const { status, lastError, lastSyncedAt } = useSyncStore()

  if (status === 'syncing') {
    return (
      <View style={styles.row}>
        <Text style={styles.dot}>●</Text>
        <Text style={styles.label}>Synchronisiert...</Text>
      </View>
    )
  }

  if (status === 'error') {
    return (
      <View style={styles.row}>
        <Text style={[styles.dot, styles.errorDot]}>●</Text>
        <Text style={[styles.label, styles.error]}>
          Sync-Fehler{lastError ? `: ${lastError}` : ''}
        </Text>
      </View>
    )
  }

  const timeStr = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : 'Noch nicht synchronisiert'

  return (
    <View style={styles.row}>
      <Text style={[styles.dot, styles.okDot]}>●</Text>
      <Text style={styles.label}>Synchronisiert: {timeStr}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  dot: { fontSize: 10, color: '#999' },
  okDot: { color: '#27AE60' },
  errorDot: { color: '#C0392B' },
  label: { fontSize: 13, color: '#666' },
  error: { color: '#C0392B' },
})
