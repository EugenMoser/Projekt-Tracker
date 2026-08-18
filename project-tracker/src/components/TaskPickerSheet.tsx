import React from 'react'

import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'

interface Task {
  id: string
  description: string
}

interface Props {
  visible: boolean
  tasks: Task[]
  selectedIds: string[]
  onToggle: (taskId: string) => void
  onClose: () => void
}

export function TaskPickerSheet({ visible, tasks, selectedIds, onToggle, onClose }: Props) {
  const { height: windowHeight } = useWindowDimensions()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={styles.sheet}
          onPress={() => {
            /* stop propagation */
          }}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Aufgaben auswählen</Text>
          <FlatList
            style={{ maxHeight: windowHeight * 0.6 }}
            data={tasks}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => {
              const checked = selectedIds.includes(item.id)
              return (
                <Pressable
                  style={[styles.selectRow, checked && styles.selectRowActive]}
                  onPress={() => onToggle(item.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={`Aufgabe ${item.description}`}
                >
                  <Text>
                    {checked ? '☑' : '☐'} {item.description}
                  </Text>
                </Pressable>
              )
            }}
          />
          <Pressable
            style={styles.done}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fertig"
          >
            <Text style={styles.doneText}>Fertig</Text>
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
  title: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  selectRow: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
    marginBottom: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  selectRowActive: { backgroundColor: '#D0E8FF' },
  done: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
})
