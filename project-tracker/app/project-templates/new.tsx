import React from 'react'

import { router } from 'expo-router'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { KeyboardAwareScrollView } from '../../src/components/KeyboardAwareView'
import { TaskPickerSheet } from '../../src/components/TaskPickerSheet'
import { createTemplate } from '../../src/repositories/projectTemplates'
import { listTasks } from '../../src/repositories/tasks'
import { colors, fontSize, fontWeight, radius, space } from '../../src/theme'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

export default function NewTemplateScreen() {
  const allTasks = listTasks(OWNER_ID)

  const [name, setName] = React.useState('')
  const [pricingMode, setPricingMode] = React.useState<'hourly' | 'fixed'>('hourly')
  const [hourlyRate, setHourlyRate] = React.useState('')
  const [fixedPrice, setFixedPrice] = React.useState('')
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<string[]>([])
  const [taskMenuVisible, setTaskMenuVisible] = React.useState(false)

  const toggleTask = (id: string) =>
    setSelectedTaskIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const taskSummary =
    selectedTaskIds.length === 0
      ? 'Keine Aufgabe ausgewählt'
      : selectedTaskIds.length === 1
        ? '1 Aufgabe ausgewählt'
        : `${selectedTaskIds.length} Aufgaben ausgewählt`

  const parseEurosToCents = (s: string): number | undefined => {
    const n = parseFloat(s.replace(',', '.'))
    return isNaN(n) ? undefined : Math.round(n * 100)
  }

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Pflichtfeld', 'Name ist Pflicht.')
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

    try {
      createTemplate(OWNER_ID, {
        name: name.trim(),
        pricingMode,
        hourlyRateCents,
        fixedPriceCents,
        taskIds: selectedTaskIds,
      })
      router.back()
    } catch {
      Alert.alert('Fehler', 'Eine Vorlage mit diesem Namen existiert bereits.')
    }
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={{ gap: space.md, paddingBottom: space.xxxl }}
    >
      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Hochzeit"
        placeholderTextColor={colors.textPlaceholder}
        accessibilityLabel="Vorlagenname"
      />

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
            <Text style={pricingMode === mode ? { color: colors.textInverse } : undefined}>
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
        accessibilityLabel="Vorlage anlegen"
      >
        <Text
          style={{
            color: colors.textInverse,
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
