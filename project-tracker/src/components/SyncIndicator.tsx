import { StyleSheet, Text, View } from 'react-native'

import { useSyncStore } from '../store/syncStore'
import { colors, fontSize, space } from '../theme'

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
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  dot: { fontSize: fontSize.micro, color: colors.textPlaceholder },
  okDot: { color: colors.success },
  errorDot: { color: colors.danger },
  label: { fontSize: fontSize.label, color: colors.textSecondary },
  error: { color: colors.danger },
})
