import React, { useCallback, useEffect, useState } from 'react'

import * as LocalAuthentication from 'expo-local-authentication'
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'

import { isBiometryEnabled, verifyPin } from '../auth/pinStorage'
import { useLockStore } from '../store/lockStore'
import { colors, fontSize, fontWeight } from '../theme'

interface Props {
  onUnlock: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export function LockScreen({ onUnlock }: Props) {
  const [digits, setDigits] = useState('')
  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  const { lockoutUntil, recordFailedAttempt, resetAttempts } = useLockStore()

  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutRemaining(0)
      return
    }
    const update = () => {
      const remaining = Math.max(0, lockoutUntil - Date.now())
      setLockoutRemaining(Math.ceil(remaining / 1000))
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [lockoutUntil])

  const tryBiometry = useCallback(async () => {
    const enabled = await isBiometryEnabled()
    if (!enabled) return
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    const isEnrolled = await LocalAuthentication.isEnrolledAsync()
    if (!hasHardware || !isEnrolled) return
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'App entsperren',
      cancelLabel: 'PIN verwenden',
    })
    if (result.success) {
      resetAttempts()
      onUnlock()
    }
  }, [onUnlock, resetAttempts])

  useEffect(() => {
    void tryBiometry()
  }, [tryBiometry])

  const handleKey = (key: string) => {
    if (lockoutRemaining > 0) return
    if (key === '⌫') {
      setDigits((d) => d.slice(0, -1))
      return
    }
    if (digits.length >= 6) return
    setDigits((d) => d + key)
  }

  const handleConfirm = async () => {
    if (digits.length < 4 || lockoutRemaining > 0) return
    const ok = await verifyPin(digits)
    if (ok) {
      resetAttempts()
      onUnlock()
    } else {
      setDigits('')
      const { lockoutMs } = recordFailedAttempt()
      if (lockoutMs) {
        Alert.alert('Zu viele Fehlversuche', `Bitte warte ${Math.ceil(lockoutMs / 1000)} Sekunden.`)
      }
    }
  }

  const dotRow = '●'.repeat(digits.length).padEnd(6, '○')

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>PIN eingeben</Text>
        <Text style={styles.dots} accessibilityLabel={`${digits.length} Stellen eingegeben`}>
          {dotRow}
        </Text>
        {lockoutRemaining > 0 && (
          <Text style={styles.lockout}>Gesperrt — noch {lockoutRemaining} s</Text>
        )}
        <View style={styles.grid}>
          {KEYS.map((key, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [
                styles.key,
                key === '' && styles.keyInvisible,
                pressed && key !== '' && styles.keyPressed,
              ]}
              onPress={() => key && handleKey(key)}
              accessibilityLabel={key === '⌫' ? 'Löschen' : key || undefined}
              accessibilityRole={key ? 'button' : undefined}
              disabled={!key}
            >
              <Text style={styles.keyText}>{key}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[
            styles.confirm,
            (digits.length < 4 || lockoutRemaining > 0) && styles.confirmDisabled,
          ]}
          onPress={handleConfirm}
          disabled={digits.length < 4 || lockoutRemaining > 0}
          accessibilityRole="button"
          accessibilityLabel="Bestätigen"
        >
          <Text style={styles.confirmText}>Bestätigen</Text>
        </Pressable>
        <Pressable
          onPress={tryBiometry}
          style={styles.biometry}
          accessibilityRole="button"
          accessibilityLabel="Biometrie verwenden"
        >
          <Text style={styles.biometryText}>Biometrie</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: fontSize.headline, fontWeight: fontWeight.semibold, marginBottom: 24 },
  dots: { fontSize: fontSize.display, letterSpacing: 12, marginBottom: 16 },
  lockout: { color: colors.danger, fontSize: fontSize.bodySmall, marginBottom: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 264,
    marginBottom: 24,
  },
  key: {
    width: 80,
    height: 80,
    margin: 4,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyInvisible: { backgroundColor: 'transparent' },
  keyPressed: { backgroundColor: colors.surfacePressed },
  keyText: { fontSize: fontSize.keypad, fontWeight: fontWeight.regular },
  confirm: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 48,
    paddingVertical: 14,
    marginBottom: 16,
  },
  confirmDisabled: { backgroundColor: colors.buttonDisabled },
  confirmText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.bodyXl,
    fontWeight: fontWeight.semibold,
  },
  biometry: { padding: 12 },
  biometryText: { color: colors.primary, fontSize: fontSize.bodyLarge },
})
