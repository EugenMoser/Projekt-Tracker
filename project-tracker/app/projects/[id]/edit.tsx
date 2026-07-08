import React from 'react'
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { ColorPicker } from '../../../src/components/ColorPicker'
import { listCustomers } from '../../../src/repositories/customers'
import { getProject, updateProject, getProjectTotalSeconds } from '../../../src/repositories/projects'
import { applyRateToProjectEntries } from '../../../src/repositories/rateAdjustments'
import { db } from '../../../src/db/client'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

function parseEurosToCents(s: string): number | undefined {
  const n = parseFloat(s.replace(',', '.'))
  return isNaN(n) ? undefined : Math.round(n * 100)
}

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const project = getProject(OWNER_ID, id)
  const customers = listCustomers(OWNER_ID)

  const [title, setTitle] = React.useState(project?.title ?? '')
  const [customerId, setCustomerId] = React.useState(project?.customerId ?? '')
  const [description, setDescription] = React.useState(project?.description ?? '')
  const [color, setColor] = React.useState(project?.color ?? '#4A90D9')
  const [pricingMode, setPricingMode] = React.useState<'hourly' | 'fixed'>(
    (project?.pricingMode as 'hourly' | 'fixed') ?? 'hourly',
  )
  const [hourlyRate, setHourlyRate] = React.useState(centsToInput(project?.hourlyRateCents))
  const [fixedPrice, setFixedPrice] = React.useState(centsToInput(project?.fixedPriceCents))

  if (!project) return <View style={styles.empty}><Text>Nicht gefunden</Text></View>

  const persist = (
    hourlyRateCents: number | undefined,
    fixedPriceCents: number | undefined,
  ) => {
    updateProject(OWNER_ID, id, {
      title: title.trim(),
      customerId,
      description: description.trim() || null,
      color,
      pricingMode,
      hourlyRateCents: pricingMode === 'hourly' ? (hourlyRateCents ?? null) : null,
      fixedPriceCents: pricingMode === 'fixed' ? (fixedPriceCents ?? null) : null,
    })
    router.back()
  }

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('Pflichtfeld', 'Titel ist Pflicht.'); return }
    if (!customerId) { Alert.alert('Pflichtfeld', 'Kunde ist Pflicht.'); return }
    if (pricingMode === 'hourly' && !hourlyRate) { Alert.alert('Pflichtfeld', 'Stundensatz ist Pflicht.'); return }
    if (pricingMode === 'fixed' && !fixedPrice) { Alert.alert('Pflichtfeld', 'Festpreis ist Pflicht.'); return }

    const hourlyRateCents = pricingMode === 'hourly' ? parseEurosToCents(hourlyRate) : undefined
    const fixedPriceCents = pricingMode === 'fixed' ? parseEurosToCents(fixedPrice) : undefined
    if (pricingMode === 'hourly' && !hourlyRateCents) { Alert.alert('Ungültig', 'Stundensatz ungültig.'); return }
    if (pricingMode === 'fixed' && !fixedPriceCents) { Alert.alert('Ungültig', 'Festpreis ungültig.'); return }

    const rateRelevantChange =
      pricingMode === 'hourly' &&
      (project.pricingMode !== 'hourly' || project.hourlyRateCents !== hourlyRateCents)
    const hasEntries = getProjectTotalSeconds(OWNER_ID, id) > 0

    if (rateRelevantChange && hasEntries) {
      const switchingFromFixed = project.pricingMode !== 'hourly'
      const message = switchingFromFixed
        ? 'Bereits erfasste Zeiten haben noch keinen Stundensatz und zählen sonst 0 €, bis du sie einzeln bearbeitest. Neuen Satz rückwirkend auf diese Zeiten anwenden?'
        : 'Soll der neue Satz auch für bereits erfasste Zeiten dieses Projekts gelten?'
      Alert.alert(
        'Stundensatz geändert',
        message,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Nur neue Zeiten',
            onPress: () => persist(hourlyRateCents, fixedPriceCents),
          },
          {
            text: 'Auch rückwirkend',
            onPress: () => {
              applyRateToProjectEntries(db, OWNER_ID, id, {
                rateSnapshotCents: hourlyRateCents!,
                pricingModeSnapshot: 'hourly',
              })
              persist(hourlyRateCents, fixedPriceCents)
            },
          },
        ],
      )
      return
    }

    persist(hourlyRateCents, fixedPriceCents)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
        <Text style={styles.label}>Titel *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} accessibilityLabel="Projekttitel" />

        <Text style={styles.label}>Kunde *</Text>
        {customers.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.selectRow, c.id === customerId && styles.selectRowActive]}
            onPress={() => setCustomerId(c.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: c.id === customerId }}
            accessibilityLabel={`Kunde ${c.customerNumber} ${c.name}`}
          >
            <Text style={c.id === customerId ? styles.selectTextActive : undefined}>
              {c.id === customerId ? '◉' : '○'} {c.customerNumber} – {c.name}
            </Text>
          </Pressable>
        ))}

        <Text style={styles.label}>Beschreibung</Text>
        <TextInput style={[styles.input, { height: 72 }]} value={description} onChangeText={setDescription} multiline accessibilityLabel="Projektbeschreibung" />

        <Text style={styles.label}>Farbe</Text>
        <ColorPicker value={color} onChange={setColor} />

        <Text style={[styles.label, { marginTop: 8 }]}>Abrechnung</Text>
        <View style={styles.pricingRow}>
          {(['hourly', 'fixed'] as const).map((mode) => (
            <Pressable
              key={mode}
              style={[styles.pricingBtn, pricingMode === mode && styles.pricingBtnActive]}
              onPress={() => setPricingMode(mode)}
              accessibilityRole="radio"
              accessibilityState={{ checked: pricingMode === mode }}
              accessibilityLabel={mode === 'hourly' ? 'Stundensatz' : 'Festpreis'}
            >
              <Text style={pricingMode === mode ? { color: '#FFF' } : undefined}>
                {mode === 'hourly' ? 'Stundensatz' : 'Festpreis'}
              </Text>
            </Pressable>
          ))}
        </View>
        {pricingMode === 'hourly' && (
          <TextInput style={styles.input} value={hourlyRate} onChangeText={setHourlyRate} placeholder="80,00" placeholderTextColor="#999" keyboardType="decimal-pad" accessibilityLabel="Stundensatz in Euro" />
        )}
        {pricingMode === 'fixed' && (
          <TextInput style={styles.input} value={fixedPrice} onChangeText={setFixedPrice} placeholder="1.500,00" placeholderTextColor="#999" keyboardType="decimal-pad" accessibilityLabel="Festpreis in Euro" />
        )}

        <Pressable style={styles.btn} onPress={handleSave} accessibilityRole="button" accessibilityLabel="Änderungen speichern">
          <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 16 }}>Speichern</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  label: { fontSize: 13, color: '#666' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, backgroundColor: '#FFF', color: '#000' },
  selectRow: { padding: 10, borderRadius: 6, backgroundColor: '#F5F5F5', marginBottom: 4, minHeight: 44, justifyContent: 'center' },
  selectRowActive: { backgroundColor: '#D0E8FF' },
  selectTextActive: { fontWeight: '600', color: '#4A90D9' },
  pricingRow: { flexDirection: 'row', gap: 8 },
  pricingBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#EEE', alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  pricingBtnActive: { backgroundColor: '#4A90D9' },
  btn: { backgroundColor: '#4A90D9', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8, minHeight: 52 },
})
