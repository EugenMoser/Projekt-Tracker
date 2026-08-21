import React from 'react'

import { router, useLocalSearchParams } from 'expo-router'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { ColorPicker } from '../../../src/components/ColorPicker'
import { KeyboardAwareScrollView } from '../../../src/components/KeyboardAwareView'
import { RowActionMenu, type RowAction } from '../../../src/components/RowActionMenu'
import { TaskPickerSheet } from '../../../src/components/TaskPickerSheet'
import { db } from '../../../src/db/client'
import { listCustomers } from '../../../src/repositories/customers'
import {
  getProject,
  getProjectTotalSeconds,
  updateProject,
} from '../../../src/repositories/projects'
import { applyRateToProjectEntries } from '../../../src/repositories/rateAdjustments'
import {
  addTaskToProject,
  listTasks,
  listTasksForProject,
  removeTaskFromProject,
} from '../../../src/repositories/tasks'
import { colors, fontSize, fontWeight, radius, space } from '../../../src/theme'

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
  const allTasks = listTasks(OWNER_ID)

  const [title, setTitle] = React.useState(project?.title ?? '')
  const [customerId, setCustomerId] = React.useState(project?.customerId ?? '')
  const [customerMenuVisible, setCustomerMenuVisible] = React.useState(false)
  const [taskMenuVisible, setTaskMenuVisible] = React.useState(false)
  const [description, setDescription] = React.useState(project?.description ?? '')
  // Fallback auf die Vorgabefarbe neuer Projekte, nicht auf die Markenfarbe
  // (Spec E6).
  // eslint-disable-next-line no-restricted-syntax
  const [color, setColor] = React.useState(project?.color ?? '#4A90D9')
  const [pricingMode, setPricingMode] = React.useState<'hourly' | 'fixed'>(
    (project?.pricingMode as 'hourly' | 'fixed') ?? 'hourly',
  )
  const [hourlyRate, setHourlyRate] = React.useState(centsToInput(project?.hourlyRateCents))
  const [fixedPrice, setFixedPrice] = React.useState(centsToInput(project?.fixedPriceCents))
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<string[]>(() =>
    id ? listTasksForProject(OWNER_ID, id).map((t) => t.id) : [],
  )

  if (!project)
    return (
      <View style={styles.empty}>
        <Text>Nicht gefunden</Text>
      </View>
    )

  const selectedCustomer = customers.find((c) => c.id === customerId)

  const taskSummary =
    selectedTaskIds.length === 0
      ? 'Keine Aufgabe ausgewählt'
      : selectedTaskIds.length === 1
        ? '1 Aufgabe ausgewählt'
        : `${selectedTaskIds.length} Aufgaben ausgewählt`

  const toggleTask = (taskId: string) => {
    if (selectedTaskIds.includes(taskId)) {
      removeTaskFromProject(OWNER_ID, id, taskId)
      setSelectedTaskIds((prev) => prev.filter((x) => x !== taskId))
    } else {
      addTaskToProject(OWNER_ID, id, taskId)
      setSelectedTaskIds((prev) => [...prev, taskId])
    }
  }

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

  const persist = (hourlyRateCents: number | undefined, fixedPriceCents: number | undefined) => {
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

    const rateRelevantChange =
      pricingMode === 'hourly' &&
      (project.pricingMode !== 'hourly' || project.hourlyRateCents !== hourlyRateCents)
    const hasEntries = getProjectTotalSeconds(OWNER_ID, id) > 0

    if (rateRelevantChange && hasEntries) {
      const switchingFromFixed = project.pricingMode !== 'hourly'
      const message = switchingFromFixed
        ? 'Bereits erfasste Zeiten haben noch keinen Stundensatz und zählen sonst 0 €, bis du sie einzeln bearbeitest. Neuen Satz rückwirkend auf diese Zeiten anwenden?'
        : 'Soll der neue Satz auch für bereits erfasste Zeiten dieses Projekts gelten?'
      Alert.alert('Stundensatz geändert', message, [
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
      ])
      return
    }

    persist(hourlyRateCents, fixedPriceCents)
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
          placeholder="80,00"
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
          placeholder="1.500,00"
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
        accessibilityLabel="Änderungen speichern"
      >
        <Text
          style={{
            color: colors.textOnPrimary,
            fontWeight: fontWeight.semibold,
            fontSize: fontSize.bodyLarge,
          }}
        >
          Speichern
        </Text>
      </Pressable>
    </KeyboardAwareScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
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
