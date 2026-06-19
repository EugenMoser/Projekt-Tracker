import React from 'react'
import { Modal, View, Text, FlatList, Pressable, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { stopTimer } from '../repositories/timers'
import { listTasksForProject, createTask, listTasks } from '../repositories/tasks'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

interface Props {
  visible: boolean
  projectId: string
  onDone: () => void
  onCancel: () => void
}

type Task = { id: string; description: string }

export function StopModal({ visible, projectId, onDone, onCancel }: Props) {
  const insets = useSafeAreaInsets()
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [newTaskText, setNewTaskText] = React.useState('')

  React.useEffect(() => {
    if (visible) {
      const projectTasks = listTasksForProject(OWNER_ID, projectId)
      setTasks(projectTasks.length > 0 ? projectTasks : listTasks(OWNER_ID))
      setSelectedId(null)
    }
  }, [visible, projectId])

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
          <FlatList
            data={tasks}
            keyExtractor={(t) => t.id}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
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
          />
          <TextInput
            style={styles.input}
            placeholder="+ Neue Aufgabe"
            value={newTaskText}
            onChangeText={(t) => { setNewTaskText(t); setSelectedId(null) }}
            accessibilityLabel="Neue Aufgabe eingeben"
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
              accessibilityLabel="Timer speichern und stoppen"
            >
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Speichern</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 24, paddingHorizontal: 24, paddingBottom: 24 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 14, color: '#666', marginBottom: 8 },
  taskRow: { padding: 14, borderRadius: 8, marginBottom: 6, backgroundColor: '#F5F5F5', minHeight: 44, justifyContent: 'center' },
  taskSelected: { backgroundColor: '#D0E8FF' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginTop: 8, minHeight: 44 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnCancel: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#EEE', minHeight: 44, justifyContent: 'center' },
  btnSave: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 8, backgroundColor: '#4A90D9', minHeight: 44, justifyContent: 'center' },
})
