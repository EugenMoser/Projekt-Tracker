import React from 'react'

import { router, useLocalSearchParams } from 'expo-router'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { TimerPickerModal } from 'react-native-timer-picker'

import { KeyboardAwareScrollView } from '../../src/components/KeyboardAwareView'
import { TaskPickerModal } from '../../src/components/TaskPickerModal'
import {
  TIME_PICKER_CANCEL_BUTTON,
  TIME_PICKER_CONFIRM_BUTTON,
  TIME_PICKER_MODAL_STYLES,
} from '../../src/components/timePickerModalStyles'
import { getProject } from '../../src/repositories/projects'
import { createTask, listTasks } from '../../src/repositories/tasks'
import { createTimeEntry } from '../../src/repositories/timeEntries'
import { useSettingsStore } from '../../src/store/settingsStore'
import { colors, fontSize, fontWeight, radius, space } from '../../src/theme'
import {
  formatHoursMinutes,
  parseDateTimeLocal,
  parseTimeStr,
  toDateStr,
  toTimeStr,
} from '../../src/utils/time'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

type Mode = 'duration' | 'end'
type PickerTarget = 'start' | 'end' | 'duration' | null

export default function NewTimeEntryScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>()
  const project = getProject(OWNER_ID, projectId)
  const allTasks = listTasks(OWNER_ID)
  const use12HourFormat = useSettingsStore((s) => s.use12HourFormat)

  const now = new Date()
  // Manual entries are almost always logged after the fact (ADR-018: "forgot
  // to track"), so defaulting the start to "right now" would force an edit on
  // every use. One hour ago is a closer guess at the common case.
  const defaultStart = new Date(now.getTime() - 60 * 60 * 1000)
  const [dateStr, setDateStr] = React.useState(toDateStr(now))
  const [startStr, setStartStr] = React.useState(toTimeStr(defaultStart))
  const [mode, setMode] = React.useState<Mode>('duration')
  const [endStr, setEndStr] = React.useState(toTimeStr(now))
  const [durationHours, setDurationHours] = React.useState(0)
  const [durationMinutes, setDurationMinutes] = React.useState(0)
  const [activePicker, setActivePicker] = React.useState<PickerTarget>(null)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [searchText, setSearchText] = React.useState('')
  const [taskPickerVisible, setTaskPickerVisible] = React.useState(false)
  const [notes, setNotes] = React.useState('')
  const [nonBillable, setNonBillable] = React.useState(false)

  const isHourly = project?.pricingMode === 'hourly'
  const [rateStr, setRateStr] = React.useState('')

  if (!project)
    return (
      <View style={s.c}>
        <Text>Projekt nicht gefunden</Text>
      </View>
    )

  const selectedTask = allTasks.find((t) => t.id === selectedId)
  const taskTriggerLabel = selectedTask
    ? selectedTask.description
    : searchText.trim()
      ? `„${searchText.trim()}“ (neu anlegen)`
      : 'Aufgabe auswählen'

  const handleSave = () => {
    let startedAt: Date
    let endedAt: Date

    if (mode === 'end') {
      const parsedStart = parseDateTimeLocal(dateStr, startStr)
      const parsedEnd = parseDateTimeLocal(dateStr, endStr)
      if (!parsedStart || !parsedEnd) {
        Alert.alert('Ungültig', 'Datum/Uhrzeit ungültig.')
        return
      }
      if (parsedEnd <= parsedStart) {
        Alert.alert('Ungültig', 'Ende muss nach Start liegen.')
        return
      }
      startedAt = parsedStart
      endedAt = parsedEnd
    } else {
      const durationMs = durationHours * 3600_000 + durationMinutes * 60_000
      if (durationMs <= 0) {
        Alert.alert('Ungültig', 'Dauer muss größer als 0 sein.')
        return
      }
      // No explicit end time in this mode — anchor "now" (time of day) onto
      // the chosen date, so a past Datum still yields a plausible end.
      const parsedDate = parseDateTimeLocal(dateStr, toTimeStr(new Date()))
      if (!parsedDate) {
        Alert.alert('Ungültig', 'Datum ungültig.')
        return
      }
      endedAt = parsedDate
      startedAt = new Date(endedAt.getTime() - durationMs)
    }

    let rateOverrideCents: number | undefined
    if (isHourly && rateStr.trim() !== '') {
      const parsed = Math.round(parseFloat(rateStr.replace(',', '.')) * 100)
      if (isNaN(parsed) || parsed <= 0) {
        Alert.alert('Ungültig', 'Stundensatz muss größer als 0 sein.')
        return
      }
      rateOverrideCents = parsed
    }

    // Resolve the task last: createTask is the only side-effecting call
    // before createTimeEntry itself, so it must only run once every other
    // guard above has passed — otherwise a retry after a validation error
    // (e.g. an invalid rate) would insert a duplicate task on every attempt.
    let taskId = selectedId
    if (!taskId && searchText.trim()) {
      taskId = createTask(OWNER_ID, searchText.trim())
    }
    if (!taskId) {
      Alert.alert('Pflichtfeld', 'Aufgabe wählen.')
      return
    }

    createTimeEntry(OWNER_ID, {
      projectId,
      taskId,
      startedAt,
      endedAt,
      notes: notes.trim() || undefined,
      rateOverrideCents,
      billable: !nonBillable,
    })

    router.back()
  }

  const pickerInitialValue =
    activePicker === 'duration'
      ? { hours: durationHours, minutes: durationMinutes }
      : activePicker === 'start'
        ? parseTimeStr(startStr)
        : activePicker === 'end'
          ? parseTimeStr(endStr)
          : undefined

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

      <View style={s.modeRow}>
        <Pressable
          style={[s.modeBtn, mode === 'duration' && s.modeBtnSelected]}
          onPress={() => setMode('duration')}
          accessibilityRole="radio"
          accessibilityState={{ selected: mode === 'duration' }}
          accessibilityLabel="Dauer eingeben"
        >
          <Text style={mode === 'duration' ? s.modeTextSelected : s.modeText}>Dauer</Text>
        </Pressable>
        <Pressable
          style={[s.modeBtn, mode === 'end' && s.modeBtnSelected]}
          onPress={() => setMode('end')}
          accessibilityRole="radio"
          accessibilityState={{ selected: mode === 'end' }}
          accessibilityLabel="Von/Bis-Zeit eingeben"
        >
          <Text style={mode === 'end' ? s.modeTextSelected : s.modeText}>Zeit</Text>
        </Pressable>
      </View>

      {mode === 'end' ? (
        <>
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
        </>
      ) : (
        <>
          <Text style={s.label}>Dauer</Text>
          <Pressable
            style={s.dropdown}
            onPress={() => setActivePicker('duration')}
            accessibilityRole="button"
            accessibilityLabel={`Dauer ${durationHours} Stunden ${durationMinutes} Minuten. Antippen zum Ändern.`}
          >
            <Text style={s.dropdownText}>
              {durationHours} Std {durationMinutes} Min
            </Text>
            <Text style={s.dropdownChevron}>▾</Text>
          </Pressable>
        </>
      )}

      <TimerPickerModal
        visible={activePicker !== null}
        setIsVisible={(visible) => {
          if (!visible) setActivePicker(null)
        }}
        modalTitle={
          activePicker === 'duration'
            ? 'Dauer wählen'
            : activePicker === 'start'
              ? 'Startzeit wählen'
              : 'Endzeit wählen'
        }
        hideSeconds
        use12HourPicker={activePicker !== 'duration' && use12HourFormat}
        hourLimit={activePicker === 'duration' ? undefined : { min: 0, max: 23 }}
        initialValue={pickerInitialValue}
        cancelButton={TIME_PICKER_CANCEL_BUTTON}
        confirmButton={TIME_PICKER_CONFIRM_BUTTON}
        styles={TIME_PICKER_MODAL_STYLES}
        onConfirm={({ hours, minutes }) => {
          if (activePicker === 'duration') {
            setDurationHours(hours)
            setDurationMinutes(minutes)
          } else if (activePicker === 'start') {
            setStartStr(formatHoursMinutes(hours, minutes))
          } else if (activePicker === 'end') {
            setEndStr(formatHoursMinutes(hours, minutes))
          }
          setActivePicker(null)
        }}
        onCancel={() => setActivePicker(null)}
      />

      <Text style={s.label}>Aufgabe</Text>
      <Pressable
        style={s.dropdown}
        onPress={() => setTaskPickerVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`${taskTriggerLabel}. Antippen zum Ändern.`}
      >
        <Text style={s.dropdownText}>{taskTriggerLabel}</Text>
        <Text style={s.dropdownChevron}>▾</Text>
      </Pressable>
      <TaskPickerModal
        visible={taskPickerVisible}
        projectId={projectId}
        selectedId={selectedId}
        searchText={searchText}
        onSelect={setSelectedId}
        onSearchChange={setSearchText}
        onClose={() => setTaskPickerVisible(false)}
      />

      <Text style={s.label}>Notiz</Text>
      <TextInput
        style={[s.input, { height: 72 }]}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <Pressable
        style={s.checkboxRow}
        onPress={() => setNonBillable((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: nonBillable }}
        accessibilityLabel="Nicht fakturierbar"
      >
        <Text style={s.checkboxGlyph}>{nonBillable ? '☑' : '☐'}</Text>
        <Text style={s.checkboxLabel}>Nicht fakturierbar</Text>
      </Pressable>

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
    </KeyboardAwareScrollView>
  )
}

const s = StyleSheet.create({
  c: { flex: 1, padding: space.lg },
  label: { fontSize: fontSize.label, color: colors.textSecondary },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md },
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
  modeRow: { flexDirection: 'row', gap: space.sm },
  modeBtn: {
    flex: 1,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  modeBtnSelected: { backgroundColor: colors.primary },
  modeText: { color: colors.textPrimary, fontWeight: fontWeight.medium },
  modeTextSelected: { color: colors.textInverse, fontWeight: fontWeight.semibold },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  checkboxGlyph: { fontSize: fontSize.body, color: colors.textPrimary },
  checkboxLabel: { fontSize: fontSize.body, color: colors.textPrimary },
  btn: {
    backgroundColor: colors.primary,
    padding: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    minHeight: 44,
  },
})
