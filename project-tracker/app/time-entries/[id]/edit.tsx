import React from 'react'

import { router, useLocalSearchParams } from 'expo-router'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { TimerPickerModal } from 'react-native-timer-picker'

import { KeyboardAwareScrollView } from '../../../src/components/KeyboardAwareView'
import {
  TIME_PICKER_CANCEL_BUTTON,
  TIME_PICKER_CONFIRM_BUTTON,
  TIME_PICKER_MODAL_STYLES,
} from '../../../src/components/timePickerModalStyles'
import { db } from '../../../src/db/client'
import { applyRateToTimeEntry } from '../../../src/repositories/rateAdjustments'
import { listTasksForProject } from '../../../src/repositories/tasks'
import {
  getTimeEntry,
  softDeleteTimeEntry,
  updateTimeEntry,
} from '../../../src/repositories/timeEntries'
import { useSettingsStore } from '../../../src/store/settingsStore'
import { colors, fontSize, fontWeight, radius, space } from '../../../src/theme'
import {
  formatHoursMinutes,
  parseDateTimeLocal,
  parseTimeStr,
  toDateStr,
  toTimeStr,
} from '../../../src/utils/time'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

type PickerTarget = 'start' | 'end' | null

export default function EditTimeEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const entry = getTimeEntry(OWNER_ID, id)
  const use12HourFormat = useSettingsStore((s) => s.use12HourFormat)

  const [dateStr, setDateStr] = React.useState(entry ? toDateStr(entry.startedAt) : '')
  const [startStr, setStartStr] = React.useState(entry ? toTimeStr(entry.startedAt) : '')
  const [endStr, setEndStr] = React.useState(entry ? toTimeStr(entry.endedAt) : '')
  const [activePicker, setActivePicker] = React.useState<PickerTarget>(null)
  const [taskId, setTaskId] = React.useState(entry?.taskId ?? '')
  const [notes, setNotes] = React.useState(entry?.notes ?? '')

  const isHourly = entry?.pricingModeSnapshot === 'hourly'
  const [rateStr, setRateStr] = React.useState(
    entry?.rateSnapshotCents != null
      ? (entry.rateSnapshotCents / 100).toFixed(2).replace('.', ',')
      : '',
  )

  const tasks = entry ? listTasksForProject(OWNER_ID, entry.projectId) : []

  if (!entry)
    return (
      <View style={s.c}>
        <Text>Nicht gefunden</Text>
      </View>
    )

  const handleSave = () => {
    const startedAt = parseDateTimeLocal(dateStr, startStr)
    const endedAt = parseDateTimeLocal(dateStr, endStr)
    if (!startedAt || !endedAt) {
      Alert.alert('Ungültig', 'Datum/Uhrzeit ungültig.')
      return
    }
    if (endedAt <= startedAt) {
      Alert.alert('Ungültig', 'Ende muss nach Start liegen.')
      return
    }
    if (!taskId) {
      Alert.alert('Pflichtfeld', 'Aufgabe wählen.')
      return
    }

    let newRateCents: number | null = null
    if (isHourly && rateStr.trim() !== '') {
      const parsed = Math.round(parseFloat(rateStr.replace(',', '.')) * 100)
      if (isNaN(parsed) || parsed <= 0) {
        Alert.alert('Ungültig', 'Stundensatz muss größer als 0 sein.')
        return
      }
      newRateCents = parsed
    }

    updateTimeEntry(OWNER_ID, id, {
      startedAt,
      endedAt,
      taskId,
      notes: notes.trim() || undefined,
    })

    if (newRateCents !== null && newRateCents !== entry!.rateSnapshotCents) {
      applyRateToTimeEntry(db, OWNER_ID, id, newRateCents)
    }

    router.back()
  }

  const handleDelete = () => {
    Alert.alert('Zeiteintrag löschen?', 'Diese Aktion kann nicht rückgängig gemacht werden.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          softDeleteTimeEntry(OWNER_ID, id)
          router.back()
        },
      },
    ])
  }

  return (
    <KeyboardAwareScrollView
      style={s.c}
      contentContainerStyle={{ gap: space.md, paddingBottom: space.xxxl }}
    >
      <Text style={s.label}>Datum (YYYY-MM-DD)</Text>
      <TextInput
        style={s.input}
        value={dateStr}
        onChangeText={setDateStr}
        placeholder="2026-01-15"
        keyboardType="numbers-and-punctuation"
      />
      <Text style={s.label}>Startzeit</Text>
      <Pressable
        style={s.dropdown}
        onPress={() => setActivePicker('start')}
        accessibilityRole="button"
        accessibilityLabel={`Startzeit ${startStr}. Antippen zum Ändern.`}
      >
        <Text style={s.dropdownText}>{startStr}</Text>
        <Text style={s.dropdownChevron}>▾</Text>
      </Pressable>
      <Text style={s.label}>Endzeit</Text>
      <Pressable
        style={s.dropdown}
        onPress={() => setActivePicker('end')}
        accessibilityRole="button"
        accessibilityLabel={`Endzeit ${endStr}. Antippen zum Ändern.`}
      >
        <Text style={s.dropdownText}>{endStr}</Text>
        <Text style={s.dropdownChevron}>▾</Text>
      </Pressable>
      <TimerPickerModal
        visible={activePicker !== null}
        setIsVisible={(visible) => {
          if (!visible) setActivePicker(null)
        }}
        modalTitle={activePicker === 'start' ? 'Startzeit wählen' : 'Endzeit wählen'}
        hideSeconds
        use12HourPicker={use12HourFormat}
        hourLimit={{ min: 0, max: 23 }}
        initialValue={activePicker === 'start' ? parseTimeStr(startStr) : parseTimeStr(endStr)}
        cancelButton={TIME_PICKER_CANCEL_BUTTON}
        confirmButton={TIME_PICKER_CONFIRM_BUTTON}
        styles={TIME_PICKER_MODAL_STYLES}
        onConfirm={({ hours, minutes }) => {
          if (activePicker === 'start') {
            setStartStr(formatHoursMinutes(hours, minutes))
          } else if (activePicker === 'end') {
            setEndStr(formatHoursMinutes(hours, minutes))
          }
          setActivePicker(null)
        }}
        onCancel={() => setActivePicker(null)}
      />
      <Text style={s.label}>Aufgabe</Text>
      {tasks.map((t) => (
        <Pressable
          key={t.id}
          style={[s.taskRow, t.id === taskId && s.taskSelected]}
          onPress={() => setTaskId(t.id)}
          accessibilityRole="radio"
          accessibilityState={{ selected: t.id === taskId }}
          accessibilityLabel={t.description}
        >
          <Text>
            {t.id === taskId ? '◉' : '○'} {t.description}
          </Text>
        </Pressable>
      ))}
      <Text style={s.label}>Notiz</Text>
      <TextInput
        style={[s.input, { height: 72 }]}
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      {isHourly && (
        <>
          <Text style={s.label}>Stundensatz (€/h)</Text>
          <TextInput
            style={s.input}
            value={rateStr}
            onChangeText={setRateStr}
            placeholder="80,00"
            keyboardType="decimal-pad"
            accessibilityLabel="Stundensatz in Euro"
          />
        </>
      )}
      <Pressable
        style={s.btn}
        onPress={handleSave}
        accessibilityRole="button"
        accessibilityLabel="Zeiteintrag speichern"
      >
        <Text style={{ color: colors.textInverse, fontWeight: fontWeight.semibold }}>
          Speichern
        </Text>
      </Pressable>
      <Pressable
        style={s.deleteBtn}
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel="Zeiteintrag löschen"
      >
        <Text style={{ color: colors.danger, fontWeight: fontWeight.semibold }}>
          Zeiteintrag löschen
        </Text>
      </Pressable>
    </KeyboardAwareScrollView>
  )
}

const s = StyleSheet.create({
  c: { flex: 1, padding: space.lg },
  label: { fontSize: fontSize.label, color: colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
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
  taskRow: {
    padding: space.s10,
    borderRadius: radius.r6,
    backgroundColor: colors.background,
    minHeight: 44,
  },
  taskSelected: { backgroundColor: colors.primarySelected },
  btn: {
    backgroundColor: colors.primary,
    padding: space.s14,
    borderRadius: radius.md,
    alignItems: 'center',
    minHeight: 44,
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    padding: space.s14,
    borderRadius: radius.md,
    alignItems: 'center',
    minHeight: 44,
  },
})
