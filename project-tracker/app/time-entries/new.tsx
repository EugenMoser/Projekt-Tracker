import React from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { KeyboardAwareScrollView } from '../../src/components/KeyboardAwareView'
import { TaskPickerModal } from '../../src/components/TaskPickerModal'
import { createTask, listTasks } from '../../src/repositories/tasks'
import { createTimeEntry } from '../../src/repositories/timeEntries'
import { getProject } from '../../src/repositories/projects'
import { toTimeStr, toDateStr, parseDateTimeLocal } from '../../src/utils/time'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

type Mode = 'duration' | 'end'

export default function NewTimeEntryScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>()
  const project = getProject(OWNER_ID, projectId)
  const allTasks = listTasks(OWNER_ID)

  const now = new Date()
  const [dateStr, setDateStr] = React.useState(toDateStr(now))
  const [startStr, setStartStr] = React.useState(toTimeStr(now))
  const [mode, setMode] = React.useState<Mode>('duration')
  const [endStr, setEndStr] = React.useState('')
  const [hoursStr, setHoursStr] = React.useState('')
  const [minutesStr, setMinutesStr] = React.useState('')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [searchText, setSearchText] = React.useState('')
  const [taskPickerVisible, setTaskPickerVisible] = React.useState(false)
  const [notes, setNotes] = React.useState('')

  const isHourly = project?.pricingMode === 'hourly'
  const [rateStr, setRateStr] = React.useState('')

  if (!project) return <View style={s.c}><Text>Projekt nicht gefunden</Text></View>

  const selectedTask = allTasks.find((t) => t.id === selectedId)
  const taskTriggerLabel = selectedTask
    ? selectedTask.description
    : searchText.trim()
      ? `„${searchText.trim()}“ (neu anlegen)`
      : 'Aufgabe auswählen'

  const handleSave = () => {
    const startedAt = parseDateTimeLocal(dateStr, startStr)
    if (!startedAt) { Alert.alert('Ungültig', 'Datum/Uhrzeit ungültig.'); return }

    let endedAt: Date
    if (mode === 'end') {
      const parsedEnd = parseDateTimeLocal(dateStr, endStr)
      if (!parsedEnd) { Alert.alert('Ungültig', 'Datum/Uhrzeit ungültig.'); return }
      if (parsedEnd <= startedAt) { Alert.alert('Ungültig', 'Ende muss nach Start liegen.'); return }
      endedAt = parsedEnd
    } else {
      const hours = hoursStr.trim() === '' ? 0 : Number(hoursStr.replace(',', '.'))
      const minutes = minutesStr.trim() === '' ? 0 : Number(minutesStr.replace(',', '.'))
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || minutes < 0) {
        Alert.alert('Ungültig', 'Stunden und Minuten müssen gültige Zahlen sein.')
        return
      }
      const durationMs = hours * 3600_000 + minutes * 60_000
      if (durationMs <= 0) { Alert.alert('Ungültig', 'Dauer muss größer als 0 sein.'); return }
      endedAt = new Date(startedAt.getTime() + durationMs)
    }

    let rateOverrideCents: number | undefined
    if (isHourly && rateStr.trim() !== '') {
      const parsed = Math.round(parseFloat(rateStr.replace(',', '.')) * 100)
      if (isNaN(parsed) || parsed <= 0) { Alert.alert('Ungültig', 'Stundensatz muss größer als 0 sein.'); return }
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
    if (!taskId) { Alert.alert('Pflichtfeld', 'Aufgabe wählen.'); return }

    createTimeEntry(OWNER_ID, {
      projectId,
      taskId,
      startedAt,
      endedAt,
      notes: notes.trim() || undefined,
      rateOverrideCents,
    })

    router.back()
  }

  return (
    <KeyboardAwareScrollView style={s.c} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
      <Text style={s.label}>Datum (YYYY-MM-DD)</Text>
      <TextInput style={s.input} value={dateStr} onChangeText={setDateStr} placeholder="2026-01-15" />
      <Text style={s.label}>Startzeit (HH:MM)</Text>
      <TextInput style={s.input} value={startStr} onChangeText={setStartStr} placeholder="09:00" />

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
          accessibilityLabel="Endzeit eingeben"
        >
          <Text style={mode === 'end' ? s.modeTextSelected : s.modeText}>Ende</Text>
        </Pressable>
      </View>

      {mode === 'end' ? (
        <>
          <Text style={s.label}>Endzeit (HH:MM)</Text>
          <TextInput style={s.input} value={endStr} onChangeText={setEndStr} placeholder="10:30" />
        </>
      ) : (
        <View style={s.durationRow}>
          <View style={s.durationField}>
            <Text style={s.label}>Stunden</Text>
            <TextInput
              style={s.input}
              value={hoursStr}
              onChangeText={setHoursStr}
              placeholder="1"
              keyboardType="number-pad"
              accessibilityLabel="Stunden"
            />
          </View>
          <View style={s.durationField}>
            <Text style={s.label}>Minuten</Text>
            <TextInput
              style={s.input}
              value={minutesStr}
              onChangeText={setMinutesStr}
              placeholder="30"
              keyboardType="number-pad"
              accessibilityLabel="Minuten"
            />
          </View>
        </View>
      )}

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
      <TextInput style={[s.input, { height: 72 }]} value={notes} onChangeText={setNotes} multiline />

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
        <Text style={{ color: '#FFF', fontWeight: '600' }}>Speichern</Text>
      </Pressable>
    </KeyboardAwareScrollView>
  )
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16 },
  label: { fontSize: 13, color: '#666' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12 },
  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 12,
    backgroundColor: '#FFF', minHeight: 44,
  },
  dropdownText: { fontSize: 15, color: '#000', flexShrink: 1 },
  dropdownChevron: { fontSize: 14, color: '#666', marginLeft: 8 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  modeBtnSelected: { backgroundColor: '#4A90D9' },
  modeText: { color: '#333', fontWeight: '500' },
  modeTextSelected: { color: '#FFF', fontWeight: '600' },
  durationRow: { flexDirection: 'row', gap: 12 },
  durationField: { flex: 1, gap: 4 },
  btn: { backgroundColor: '#4A90D9', padding: 14, borderRadius: 8, alignItems: 'center', minHeight: 44 },
})
