import React from 'react'

import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { createTask } from '../repositories/tasks'
import { discardTimer, stopTimer } from '../repositories/timers'
import { KeyboardAwareView } from './KeyboardAwareView'
import { TaskPicker } from './TaskPicker'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

interface Props {
  visible: boolean
  projectId: string
  onDone: () => void
  onCancel: () => void
  onDiscard: () => void
}

export function StopModal({ visible, projectId, onDone, onCancel, onDiscard }: Props) {
  const insets = useSafeAreaInsets()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [newTaskText, setNewTaskText] = React.useState('')

  React.useEffect(() => {
    if (visible) {
      setSelectedId(null)
      setNewTaskText('')
    }
  }, [visible, projectId])

  const willCreateNewTask = !selectedId && newTaskText.trim().length > 0
  const saveLabel = willCreateNewTask ? '+ Aufgabe anlegen' : 'Speichern'

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
    Alert.alert('Timer verwerfen?', 'Die erfasste Zeit wird gelöscht und nicht gespeichert.', [
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
    ])
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      accessibilityViewIsModal
    >
      <KeyboardAwareView insideModal>
        <View style={[styles.container, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
          <Text style={styles.heading}>Timer stoppen</Text>
          <Text style={styles.label}>Welche Aufgabe?</Text>
          <TaskPicker
            projectId={projectId}
            selectedId={selectedId}
            searchText={newTaskText}
            onSelect={setSelectedId}
            onSearchChange={setNewTaskText}
            active={visible}
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
              accessibilityLabel={
                willCreateNewTask
                  ? 'Neue Aufgabe anlegen und Timer speichern'
                  : 'Timer speichern und stoppen'
              }
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
      </KeyboardAwareView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 24, paddingHorizontal: 24, paddingBottom: 24 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 14, color: '#666', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnCancel: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#EEE',
    minHeight: 44,
    justifyContent: 'center',
  },
  btnSave: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#4A90D9',
    minHeight: 44,
    justifyContent: 'center',
  },
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
