import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { formatDuration } from '../utils/time'

interface Props {
  visible: boolean
  taskName: string
  entry: {
    id: string
    durationSeconds: number
    startedAt: Date
    notes: string | null
  } | null
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export function EntryActionModal({ visible, taskName, entry, onEdit, onDelete, onClose }: Props) {
  if (!entry) return null

  const date = new Date(entry.startedAt).toLocaleDateString('de-DE')
  const duration = formatDuration(entry.durationSeconds)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => { /* stop propagation */ }}>
          <View style={styles.handle} />
          <Text style={styles.context}>
            {taskName} · {date} · {duration}
          </Text>
          <Pressable
            style={styles.action}
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel="Zeiteintrag bearbeiten"
          >
            <Text style={styles.actionText}>Bearbeiten</Text>
          </Pressable>
          <Pressable
            style={styles.action}
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel="Zeiteintrag löschen"
          >
            <Text style={[styles.actionText, styles.danger]}>Löschen</Text>
          </Pressable>
          <Pressable
            style={styles.cancel}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Abbrechen"
          >
            <Text style={styles.cancelText}>Abbrechen</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 34,
    paddingHorizontal: 16,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#C7C7CC',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  context: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  action: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  danger: {
    color: '#E74C3C',
  },
  cancel: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
})
