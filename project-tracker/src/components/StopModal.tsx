import React from 'react'
import { Modal, View, Text, SectionList, Pressable, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { stopTimer, discardTimer } from '../repositories/timers'
import { createTask, listTasks, listTasksForProject } from '../repositories/tasks'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

interface Props {
  visible: boolean
  projectId: string
  onDone: () => void
  onCancel: () => void
  onDiscard: () => void
}

type Task = { id: string; description: string }
type TaskSection = { key: string; title?: string; data: Task[] }

export function StopModal({ visible, projectId, onDone, onCancel, onDiscard }: Props) {
  const insets = useSafeAreaInsets()
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [projectTasks, setProjectTasks] = React.useState<Task[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [newTaskText, setNewTaskText] = React.useState('')

  React.useEffect(() => {
    if (visible) {
      setTasks(listTasks(OWNER_ID))
      setProjectTasks(listTasksForProject(OWNER_ID, projectId))
      setSelectedId(null)
      setNewTaskText('')
    }
  }, [visible, projectId])

  const willCreateNewTask = !selectedId && newTaskText.trim().length > 0
  const saveLabel = willCreateNewTask ? '+ Aufgabe anlegen' : 'Speichern'

  const filterQuery = newTaskText.trim().toLowerCase()
  const filteredTasks = filterQuery
    ? tasks.filter((t) => t.description.toLowerCase().includes(filterQuery))
    : tasks

  let sections: TaskSection[]
  if (filterQuery) {
    // Suche geht immer über ALLE Aufgaben, unabhängig von der Projekt-Gruppierung.
    sections = [{ key: 'filtered', data: filteredTasks }]
  } else if (projectTasks.length > 0) {
    const projectTaskIds = new Set(projectTasks.map((t) => t.id))
    const otherTasks = tasks.filter((t) => !projectTaskIds.has(t.id))
    sections = [
      { key: 'project', title: 'Aus diesem Projekt', data: projectTasks },
      { key: 'all', title: 'Alle Aufgaben', data: otherTasks },
    ]
  } else {
    sections = [{ key: 'all', data: tasks }]
  }

  const handleSave = () => {
    let taskId = selectedId
    if (!taskId && newTaskText.trim()) {
      taskId = createTask(OWNER_ID, newTaskText.trim())
    }
    if (!taskId) {
      Alert.alert('Aufgabe wählen', 'Bitte eine Aufgabe auswählen oder neu eingeben.')
      return
    }
    try {
      stopTimer(OWNER_ID, taskId)
      onDone()
    } catch (e) {
      Alert.alert('Fehler', String(e))
    }
  }

  const handleDiscard = () => {
    Alert.alert(
      'Timer verwerfen?',
      'Die erfasste Zeit wird gelöscht und nicht gespeichert.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ja, verwerfen',
          style: 'destructive',
          onPress: () => {
            try {
              discardTimer(OWNER_ID)
              onDiscard()
            } catch (e) {
              Alert.alert('Fehler', String(e))
            }
          },
        },
      ]
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
          <Text style={styles.heading}>Timer stoppen</Text>
          <Text style={styles.label}>Welche Aufgabe?</Text>
          <SectionList
            sections={sections}
            keyExtractor={(t) => t.id}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) =>
              section.title ? (
                <Text style={styles.sectionHeader} accessibilityRole="header">
                  {section.title}
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.taskRow, item.id === selectedId && styles.taskSelected]}
                onPress={() => { setSelectedId(item.id); setNewTaskText('') }}
                accessibilityRole="radio"
                accessibilityState={{ selected: item.id === selectedId }}
                accessibilityLabel={item.description}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text>{item.id === selectedId ? '◉' : '○'} {item.description}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              filterQuery ? (
                <Text style={styles.emptyHint}>
                  Keine Treffer für „{newTaskText.trim()}“ — Speichern legt sie als neue Aufgabe an.
                </Text>
              ) : null
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Suchen oder neue Aufgabe eingeben"
            value={newTaskText}
            onChangeText={(t) => { setNewTaskText(t); setSelectedId(null) }}
            accessibilityLabel="Aufgabe suchen oder neue Aufgabe eingeben"
          />
          <View style={styles.actions}>
            <Pressable
              style={styles.btnCancel}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Abbrechen"
            >
              <Text>Abbrechen</Text>
            </Pressable>
            <Pressable
              style={styles.btnSave}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel={willCreateNewTask ? 'Neue Aufgabe anlegen und Timer speichern' : 'Timer speichern und stoppen'}
            >
              <Text style={{ color: '#FFF', fontWeight: '600' }}>{saveLabel}</Text>
            </Pressable>
          </View>
          <Pressable
            style={styles.btnDiscard}
            onPress={handleDiscard}
            accessibilityRole="button"
            accessibilityLabel="Zeit verwerfen"
          >
            <Text style={styles.btnDiscardText}>Zeit verwerfen</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 24, paddingHorizontal: 24, paddingBottom: 24 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 14, color: '#666', marginBottom: 8 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
  },
  taskRow: { padding: 14, borderRadius: 8, marginBottom: 6, backgroundColor: '#F5F5F5', minHeight: 44, justifyContent: 'center' },
  taskSelected: { backgroundColor: '#D0E8FF' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginTop: 8, minHeight: 44 },
  emptyHint: { padding: 14, color: '#666', fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnCancel: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#EEE', minHeight: 44, justifyContent: 'center' },
  btnSave: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#4A90D9', minHeight: 44, justifyContent: 'center' },
  btnDiscard: {
    marginTop: 8,
    padding: 14,
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  btnDiscardText: {
    color: '#D32F2F',
    fontWeight: '500',
  },
})
