import React from 'react'
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { ColorPicker } from '../../src/components/ColorPicker'
import { RowActionMenu, type RowAction } from '../../src/components/RowActionMenu'
import { listCustomers } from '../../src/repositories/customers'
import { listTasks } from '../../src/repositories/tasks'
import { createProject } from '../../src/repositories/projects'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'
const DEFAULT_COLOR = '#4A90D9'

export default function NewProjectScreen() {
  const customers = listCustomers(OWNER_ID)
  const allTasks = listTasks(OWNER_ID)

  const [title, setTitle] = React.useState('')
  const [customerId, setCustomerId] = React.useState(customers[0]?.id ?? '')
  const [customerMenuVisible, setCustomerMenuVisible] = React.useState(false)
  const [description, setDescription] = React.useState('')
  const [color, setColor] = React.useState(DEFAULT_COLOR)
  const [pricingMode, setPricingMode] = React.useState<'hourly' | 'fixed'>('hourly')
  const [hourlyRate, setHourlyRate] = React.useState('')
  const [fixedPrice, setFixedPrice] = React.useState('')
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<string[]>([])

  const toggleTask = (id: string) =>
    setSelectedTaskIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const selectedCustomer = customers.find((c) => c.id === customerId)

  const customerMenuActions: RowAction[] = [
    ...customers.map((c) => ({
      label: `${c.customerNumber} – ${c.name}`,
      onPress: () => {
        setCustomerId(c.id)
        setCustomerMenuVisible(false)
      },
    })),
    {
      label: '+ Neuen Kunden anlegen',
      onPress: () => {
        setCustomerMenuVisible(false)
        router.push('/customers/new')
      },
    },
  ]

  const parseEurosToCents = (s: string): number | undefined => {
    const n = parseFloat(s.replace(',', '.'))
    return isNaN(n) ? undefined : Math.round(n * 100)
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

    createProject(OWNER_ID, {
      customerId, title: title.trim(), description: description.trim() || undefined,
      color, pricingMode, hourlyRateCents, fixedPriceCents, taskIds: selectedTaskIds,
    })
    router.back()
  }

  if (customers.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Noch kein Kunde vorhanden.</Text>
        <Pressable
          style={styles.emptyBtn}
          onPress={() => router.push('/customers/new')}
          accessibilityRole="button"
          accessibilityLabel="Kunden anlegen"
        >
          <Text style={styles.emptyBtnText}>Kunden anlegen →</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={styles.container} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
      <Text style={styles.label}>Titel *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Hochzeit Müller"
        placeholderTextColor="#999"
        accessibilityLabel="Projekttitel"
      />

      <Text style={styles.label}>Kunde *</Text>
      <Pressable
        style={styles.dropdown}
        onPress={() => setCustomerMenuVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={
          selectedCustomer
            ? `Kunde: ${selectedCustomer.customerNumber} ${selectedCustomer.name}. Antippen zum Ändern.`
            : 'Kunde auswählen'
        }
      >
        <Text style={styles.dropdownText}>
          {selectedCustomer ? `${selectedCustomer.customerNumber} – ${selectedCustomer.name}` : 'Kunde auswählen'}
        </Text>
        <Text style={styles.dropdownChevron}>▾</Text>
      </Pressable>
      <RowActionMenu
        visible={customerMenuVisible}
        title="Kunde auswählen"
        actions={customerMenuActions}
        onClose={() => setCustomerMenuVisible(false)}
      />

      <Text style={styles.label}>Beschreibung</Text>
      <TextInput
        style={[styles.input, { height: 72 }]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Optional..."
        placeholderTextColor="#999"
        accessibilityLabel="Projektbeschreibung"
      />

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
        <TextInput
          style={styles.input}
          value={hourlyRate}
          onChangeText={setHourlyRate}
          placeholder="80,00 €/h"
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
          accessibilityLabel="Stundensatz in Euro"
        />
      )}
      {pricingMode === 'fixed' && (
        <TextInput
          style={styles.input}
          value={fixedPrice}
          onChangeText={setFixedPrice}
          placeholder="1.500,00 €"
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
          accessibilityLabel="Festpreis in Euro"
        />
      )}

      {allTasks.length > 0 && (
        <>
          <Text style={styles.label}>Aufgaben</Text>
          {allTasks.map((t) => (
            <Pressable
              key={t.id}
              style={[styles.selectRow, selectedTaskIds.includes(t.id) && styles.selectRowActive]}
              onPress={() => toggleTask(t.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selectedTaskIds.includes(t.id) }}
              accessibilityLabel={`Aufgabe ${t.description}`}
            >
              <Text>{selectedTaskIds.includes(t.id) ? '☑' : '☐'} {t.description}</Text>
            </Pressable>
          ))}
        </>
      )}

      <Pressable
        style={styles.btn}
        onPress={handleSave}
        accessibilityRole="button"
        accessibilityLabel="Projekt anlegen"
      >
        <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 16 }}>Anlegen</Text>
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  emptyText: { fontSize: 16, color: '#555', textAlign: 'center' },
  emptyBtn: {
    backgroundColor: '#4A90D9', borderRadius: 8,
    paddingHorizontal: 24, paddingVertical: 14,
    minHeight: 44, alignItems: 'center', justifyContent: 'center',
  },
  emptyBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  label: { fontSize: 13, color: '#666' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, backgroundColor: '#FFF', color: '#000' },
  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 12,
    backgroundColor: '#FFF', minHeight: 44,
  },
  dropdownText: { fontSize: 15, color: '#000', flexShrink: 1 },
  dropdownChevron: { fontSize: 14, color: '#666', marginLeft: 8 },
  selectRow: { padding: 10, borderRadius: 6, backgroundColor: '#F5F5F5', marginBottom: 4, minHeight: 44, justifyContent: 'center' },
  selectRowActive: { backgroundColor: '#D0E8FF' },
  selectTextActive: { fontWeight: '600', color: '#4A90D9' },
  pricingRow: { flexDirection: 'row', gap: 8 },
  pricingBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#EEE', alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  pricingBtnActive: { backgroundColor: '#4A90D9' },
  btn: { backgroundColor: '#4A90D9', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8, minHeight: 52 },
})
