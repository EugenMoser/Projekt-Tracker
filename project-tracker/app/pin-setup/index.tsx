import React, { useState } from 'react'

import { router, useLocalSearchParams } from 'expo-router'
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'

import { savePin, verifyPin } from '../../src/auth/pinStorage'
import { colors, fontSize, fontWeight, radius, space } from '../../src/theme'

type Step = 'verify-current' | 'enter' | 'confirm'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

const STEP_TITLES: Record<Step, string> = {
  'verify-current': 'Aktuellen PIN eingeben',
  enter: 'Neuen PIN eingeben',
  confirm: 'PIN bestätigen',
}

export default function PinSetupScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>()
  const isChange = mode === 'change'

  const [step, setStep] = useState<Step>(isChange ? 'verify-current' : 'enter')
  const [digits, setDigits] = useState('')
  const [newPin, setNewPin] = useState('')

  const handleKey = (key: string) => {
    if (key === '⌫') {
      setDigits((d) => d.slice(0, -1))
      return
    }
    if (digits.length >= 6) return
    setDigits((d) => d + key)
  }

  const handleConfirm = async () => {
    if (digits.length < 4) return

    if (step === 'verify-current') {
      const ok = await verifyPin(digits)
      if (!ok) {
        Alert.alert('Falscher PIN', 'Bitte versuche es erneut.')
        setDigits('')
        return
      }
      setStep('enter')
      setDigits('')
      return
    }

    if (step === 'enter') {
      setNewPin(digits)
      setStep('confirm')
      setDigits('')
      return
    }

    // step === 'confirm'
    if (digits !== newPin) {
      Alert.alert('PINs stimmen nicht überein', 'Bitte nochmals eingeben.')
      setStep('enter')
      setDigits('')
      setNewPin('')
      return
    }

    await savePin(digits)
    Alert.alert('PIN gespeichert', '', [{ text: 'OK', onPress: () => router.back() }])
  }

  const dotRow = '●'.repeat(digits.length).padEnd(6, '○')

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{STEP_TITLES[step]}</Text>
        <Text style={styles.subtitle}>
          {step === 'enter' ? '4–6 Stellen' : step === 'confirm' ? 'Wiederholen' : ''}
        </Text>
        <Text style={styles.dots} accessibilityLabel={`${digits.length} Stellen`}>
          {dotRow}
        </Text>
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
          style={[styles.confirm, digits.length < 4 && styles.confirmDisabled]}
          onPress={handleConfirm}
          disabled={digits.length < 4}
          accessibilityRole="button"
          accessibilityLabel="Weiter"
        >
          <Text style={styles.confirmText}>{step === 'confirm' ? 'Speichern' : 'Weiter'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  title: { fontSize: fontSize.titleLarge, fontWeight: fontWeight.semibold, marginBottom: space.xs },
  subtitle: { fontSize: fontSize.bodySmall, color: colors.textMuted, marginBottom: space.s20 },
  dots: { fontSize: fontSize.display, letterSpacing: 12, marginBottom: space.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 264, marginBottom: space.xl },
  key: {
    width: 80,
    height: 80,
    margin: space.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyInvisible: { backgroundColor: 'transparent' },
  keyPressed: { backgroundColor: colors.surfacePressed },
  keyText: { fontSize: fontSize.keypad, fontWeight: fontWeight.regular },
  confirm: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: space.huge,
    paddingVertical: space.s14,
  },
  confirmDisabled: { backgroundColor: colors.buttonDisabled },
  confirmText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.bodyXl,
    fontWeight: fontWeight.semibold,
  },
})
