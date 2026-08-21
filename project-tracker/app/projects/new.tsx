import React from 'react'

import { router } from 'expo-router'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { ColorPicker } from '../../src/components/ColorPicker'
import { KeyboardAwareScrollView } from '../../src/components/KeyboardAwareView'
import { RowActionMenu, type RowAction } from '../../src/components/RowActionMenu'
import { TaskPickerSheet } from '../../src/components/TaskPickerSheet'
import { listCustomers } from '../../src/repositories/customers'
import { createProject } from '../../src/repositories/projects'
import { listTasks } from '../../src/repositories/tasks'
import { colors, fontSize, fontWeight, radius, space } from '../../src/theme'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'
// Startwert eines Datenfelds, nicht die Markenfarbe: Eine Änderung an
// colors.primary darf die Vorgabefarbe neuer Projekte nicht mitziehen (Spec E6).
// eslint-disable-next-line no-restricted-syntax
const DEFAULT_COLOR = '#4A90D9'

export default function NewProjectScreen() {
  const customers = listCustomers(OWNER_ID)
  const allTasks = listTasks(OWNER_ID)

  const [title, setTitle] = React.useState('')
  const [customerId, setCustomerId] = React.useState(customers[0]?.id ?? '')
  const [customerMenuVisible, setCustomerMenuVisible] = React.useState(false)
  const [taskMenuVisible, setTaskMenuVisible] = React.useState(false)
  const [description, setDescription] = React.useState('')
  const [color, setColor] = React.useState(DEFAULT_COLOR)
  const [pricingMode, setPricingMode] = React.useState<'hourly' | 'fixed'>('hourly')
  const [hourlyRate, setHourlyRate] = React.useState('')
  const [fixedPrice, setFixedPrice] = React.useState('')
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<string[]>([])

  const toggleTask = (id: string) =>
    setSelectedTaskIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const selectedCustomer = customers.find((c) => c.id === customerId)

  const taskSummary =
    selectedTaskIds.length === 0
      ? 'Keine Aufgabe ausgewählt'
      : selectedTaskIds.length === 1
        ? '1 Aufgabe ausgewählt'
        : `${selectedTaskIds.length} Aufgaben ausgewählt`

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
    if (!title.trim()) {
      Alert.alert('Pflichtfeld', 'Titel ist Pflicht.')
      return
    }
    if (!customerId) {
      Alert.alert('Pflichtfeld', 'Kunde ist Pflicht.')
      return
    }
    if (pricingMode === 'hourly' && !hourlyRate) {
      Alert.alert('Pflichtfeld', 'Stundensatz ist Pflicht.')
      return
    }
    if (pricingMode === 'fixed' && !fixedPrice) {
      Alert.alert('Pflichtfeld', 'Festpreis ist Pflicht.')
      return
    }

    const hourlyRateCents = pricingMode === 'hourly' ? parseEurosToCents(hourlyRate) : undefined
    const fixedPriceCents = pricingMode === 'fixed' ? parseEurosToCents(fixedPrice) : undefined

    if (pricingMode === 'hourly' && !hourlyRateCents) {
      Alert.alert('Ungültig', 'Stundensatz ungültig.')
      return
    }
    if (pricingMode === 'fixed' && !fixedPriceCents) {
      Alert.alert('Ungültig', 'Festpreis ungültig.')
      return
    }

    createProject(OWNER_ID, {
      customerId,
      title: title.trim(),
      description: description.trim() || undefined,
      color,
      pricingMode,
      hourlyRateCents,
      fixedPriceCents,
      taskIds: selectedTaskIds,
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
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={{ gap: space.md, paddingBottom: space.xxxl }}
    >
      <Text style={styles.label}>Titel *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Hochzeit Müller"
        placeholderTextColor={colors.textPlaceholder}
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
          {selectedCustomer
            ? `${selectedCustomer.customerNumber} – ${selectedCustomer.name}`
            : 'Kunde auswählen'}
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
        placeholderTextColor={colors.textPlaceholder}
        accessibilityLabel="Projektbeschreibung"
      />

      <Text style={styles.label}>Farbe</Text>
      <ColorPicker value={color} onChange={setColor} />

      <Text style={[styles.label, { marginTop: space.sm }]}>Abrechnung</Text>
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
            <Text style={pricingMode === mode ? { color: colors.textOnPrimary } : undefined}>
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
          placeholderTextColor={colors.textPlaceholder}
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
          placeholderTextColor={colors.textPlaceholder}
          keyboardType="decimal-pad"
          accessibilityLabel="Festpreis in Euro"
        />
      )}

      {allTasks.length > 0 && (
        <>
          <Text style={styles.label}>Aufgaben</Text>
          <Pressable
            style={styles.dropdown}
            onPress={() => setTaskMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`${taskSummary}. Antippen zum Ändern.`}
          >
            <Text style={styles.dropdownText}>{taskSummary}</Text>
            <Text style={styles.dropdownChevron}>▾</Text>
          </Pressable>
          <TaskPickerSheet
            visible={taskMenuVisible}
            tasks={allTasks}
            selectedIds={selectedTaskIds}
            onToggle={toggleTask}
            onClose={() => setTaskMenuVisible(false)}
          />
        </>
      )}

      <Pressable
        style={styles.btn}
        onPress={handleSave}
        accessibilityRole="button"
        accessibilityLabel="Projekt anlegen"
      >
        <Text
          style={{
            color: colors.textOnPrimary,
            fontWeight: fontWeight.semibold,
            fontSize: fontSize.bodyLarge,
          }}
        >
          Anlegen
        </Text>
      </Pressable>
    </KeyboardAwareScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.lg },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.lg,
  },
  emptyText: { fontSize: fontSize.bodyLarge, color: colors.textSecondary, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.s14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.body,
  },
  label: { fontSize: fontSize.label, color: colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
    minHeight: 44,
  },
  dropdownText: { fontSize: fontSize.body, color: colors.textPrimary, flexShrink: 1 },
  dropdownChevron: {
    fontSize: fontSize.bodySmall,
    color: colors.textSecondary,
    marginLeft: space.sm,
  },
  pricingRow: { flexDirection: 'row', gap: space.sm },
  pricingBtn: {
    flex: 1,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  pricingBtnActive: { backgroundColor: colors.primary },
  btn: {
    backgroundColor: colors.primary,
    padding: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: space.sm,
    minHeight: 52,
  },
})
