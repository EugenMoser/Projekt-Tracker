import React from 'react'
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { listTasksForProject } from '../../../src/repositories/tasks'
import { getTimeEntry, updateTimeEntry, softDeleteTimeEntry } from '../../../src/repositories/timeEntries'
import { applyRateToTimeEntry } from '../../../src/repositories/rateAdjustments'
import { db } from '../../../src/db/client'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

function toTimeStr(d: Date) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function parseDateTimeLocal(dateStr: string, timeStr: string): Date | null {
  const dt = new Date(`${dateStr}T${timeStr}:00`)
  return isNaN(dt.getTime()) ? null : dt
}

export default function EditTimeEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const entry = getTimeEntry(OWNER_ID, id)

  const [dateStr, setDateStr] = React.useState(entry ? toDateStr(entry.startedAt) : '')
  const [startStr, setStartStr] = React.useState(entry ? toTimeStr(entry.startedAt) : '')
  const [endStr, setEndStr] = React.useState(entry ? toTimeStr(entry.endedAt) : '')
  const [taskId, setTaskId] = React.useState(entry?.taskId ?? '')
  const [notes, setNotes] = React.useState(entry?.notes ?? '')

  const isHourly = entry?.pricingModeSnapshot === 'hourly'
  const [rateStr, setRateStr] = React.useState(
    entry?.rateSnapshotCents != null ? (entry.rateSnapshotCents / 100).toFixed(2).replace('.', ',') : '',
  )

  const tasks = entry ? listTasksForProject(OWNER_ID, entry.projectId) : []

  if (!entry) return <View style={s.c}><Text>Nicht gefunden</Text></View>

  const handleSave = () => {
    const startedAt = parseDateTimeLocal(dateStr, startStr)
    const endedAt = parseDateTimeLocal(dateStr, endStr)
    if (!startedAt || !endedAt) { Alert.alert('Ungültig', 'Datum/Uhrzeit ungültig.'); return }
    if (endedAt <= startedAt) { Alert.alert('Ungültig', 'Ende muss nach Start liegen.'); return }
    if (!taskId) { Alert.alert('Pflichtfeld', 'Aufgabe wählen.'); return }

    let newRateCents: number | null = null
    if (isHourly && rateStr.trim() !== '') {
      const parsed = Math.round(parseFloat(rateStr.replace(',', '.')) * 100)
      if (isNaN(parsed) || parsed <= 0) { Alert.alert('Ungültig', 'Stundensatz muss größer als 0 sein.'); return }
      newRateCents = parsed
    }

    updateTimeEntry(OWNER_ID, id, { startedAt, endedAt, taskId, notes: notes.trim() || undefined })

    if (newRateCents !== null && newRateCents !== entry!.rateSnapshotCents) {
      applyRateToTimeEntry(db, OWNER_ID, id, newRateCents)
    }

    router.back()
  }

  const handleDelete = () => {
    Alert.alert('Zeiteintrag löschen?', 'Diese Aktion kann nicht rückgängig gemacht werden.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => { softDeleteTimeEntry(OWNER_ID, id); router.back() } },
    ])
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={s.c} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
      <Text style={s.label}>Datum (YYYY-MM-DD)</Text>
      <TextInput style={s.input} value={dateStr} onChangeText={setDateStr} placeholder="2026-01-15" />
      <Text style={s.label}>Startzeit (HH:MM)</Text>
      <TextInput style={s.input} value={startStr} onChangeText={setStartStr} placeholder="09:00" />
      <Text style={s.label}>Endzeit (HH:MM)</Text>
      <TextInput style={s.input} value={endStr} onChangeText={setEndStr} placeholder="10:30" />
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
          <Text>{t.id === taskId ? '◉' : '○'} {t.description}</Text>
        </Pressable>
      ))}
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
      <Pressable
        style={s.deleteBtn}
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel="Zeiteintrag löschen"
      >
        <Text style={{ color: '#E74C3C', fontWeight: '600' }}>Zeiteintrag löschen</Text>
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16 },
  label: { fontSize: 13, color: '#666' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12 },
  taskRow: { padding: 10, borderRadius: 6, backgroundColor: '#F5F5F5', minHeight: 44 },
  taskSelected: { backgroundColor: '#D0E8FF' },
  btn: { backgroundColor: '#4A90D9', padding: 14, borderRadius: 8, alignItems: 'center', minHeight: 44 },
  deleteBtn: { borderWidth: 1, borderColor: '#E74C3C', padding: 14, borderRadius: 8, alignItems: 'center', minHeight: 44 },
})
