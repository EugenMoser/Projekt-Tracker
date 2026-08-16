import React, { useState, useCallback } from 'react'
import { View, Pressable, Text, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import * as LocalAuthentication from 'expo-local-authentication'
import { SyncIndicator } from '../../src/components/SyncIndicator'
import {
  isPinSet,
  clearPin,
  isBiometryEnabled,
  setBiometryEnabled,
} from '../../src/auth/pinStorage'
import { setUse12HourFormat as persistUse12HourFormat } from '../../src/settings/timeFormat'
import { useLockStore } from '../../src/store/lockStore'
import { useSettingsStore } from '../../src/store/settingsStore'

export default function SettingsScreen() {
  const [pinEnabled, setPinEnabled] = useState(false)
  const [biometrySupported, setBiometrySupported] = useState(false)
  const [biometryEnabled, setBiometryEnabledState] = useState(false)
  const { resetAttempts } = useLockStore()
  const use12HourFormat = useSettingsStore((s) => s.use12HourFormat)
  const setUse12HourFormat = useSettingsStore((s) => s.setUse12HourFormat)

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const [pinSet, bioEnabled, hasHardware, isEnrolled] = await Promise.all([
          isPinSet(),
          isBiometryEnabled(),
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ])
        setPinEnabled(pinSet)
        setBiometryEnabledState(bioEnabled)
        setBiometrySupported(hasHardware && isEnrolled)
      })()
    }, [])
  )

  const handleDisablePin = () => {
    Alert.alert(
      'PIN deaktivieren',
      'Die App ist danach nicht mehr durch einen PIN geschützt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Deaktivieren',
          style: 'destructive',
          onPress: async () => {
            await clearPin()
            await setBiometryEnabled(false)
            resetAttempts()
            setPinEnabled(false)
            setBiometryEnabledState(false)
          },
        },
      ]
    )
  }

  const handleBiometryToggle = async () => {
    const next = !biometryEnabled
    await setBiometryEnabled(next)
    setBiometryEnabledState(next)
  }

  const handleTimeFormatToggle = async () => {
    const next = !use12HourFormat
    await persistUse12HourFormat(next)
    setUse12HourFormat(next)
  }

  return (
    <View style={styles.container}>
      <View style={styles.syncSection}>
        <SyncIndicator />
      </View>

      {/* Anzeige */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Anzeige</Text>
        <Pressable
          style={styles.row}
          onPress={handleTimeFormatToggle}
          accessibilityRole="button"
          accessibilityLabel={`Uhrzeitformat: ${use12HourFormat ? '12-Stunden mit AM/PM' : '24-Stunden'}. Antippen zum Ändern.`}
        >
          <Text style={styles.label}>Uhrzeitformat</Text>
          <Text style={{ color: '#8E8E93' }}>{use12HourFormat ? '12h (AM/PM)' : '24h'}</Text>
        </Pressable>
      </View>

      {/* PIN-Sektion */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Sicherheit</Text>
        <Pressable
          style={styles.row}
          onPress={() =>
            router.push(
              pinEnabled
                ? ('/pin-setup/index?mode=change' as any)
                : ('/pin-setup/index' as any)
            )
          }
          accessibilityRole="button"
          accessibilityLabel={pinEnabled ? 'PIN ändern' : 'PIN einrichten'}
        >
          <Text style={styles.label}>{pinEnabled ? 'PIN ändern' : 'PIN einrichten'}</Text>
          <Text>›</Text>
        </Pressable>
        {pinEnabled && (
          <Pressable
            style={styles.row}
            onPress={handleDisablePin}
            accessibilityRole="button"
            accessibilityLabel="PIN deaktivieren"
          >
            <Text style={[styles.label, styles.destructive]}>PIN deaktivieren</Text>
          </Pressable>
        )}
        {pinEnabled && biometrySupported && (
          <Pressable
            style={styles.row}
            onPress={handleBiometryToggle}
            accessibilityRole="button"
            accessibilityLabel={biometryEnabled ? 'Biometrie deaktivieren' : 'Biometrie aktivieren'}
          >
            <Text style={styles.label}>
              Biometrie {biometryEnabled ? 'deaktivieren' : 'aktivieren'}
            </Text>
            <Text style={{ color: biometryEnabled ? '#34C759' : '#8E8E93' }}>
              {biometryEnabled ? 'An' : 'Aus'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Export + Verwaltung */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Daten</Text>
        <Pressable
          style={styles.row}
          onPress={() => router.push('/export' as any)}
          accessibilityRole="button"
          accessibilityLabel="Export erstellen"
        >
          <Text style={styles.label}>Export erstellen</Text>
          <Text>›</Text>
        </Pressable>
        <Pressable style={styles.row} onPress={() => router.push('/order-types')}>
          <Text style={styles.label}>Auftragsarten</Text>
          <Text>›</Text>
        </Pressable>
        <Pressable style={styles.row} onPress={() => router.push('/archived-projects' as any)}>
          <Text style={styles.label}>Archivierte Projekte</Text>
          <Text>›</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  syncSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
    marginBottom: 16,
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 8,
    minHeight: 44,
  },
  label: { fontSize: 16 },
  destructive: { color: '#FF3B30' },
})
