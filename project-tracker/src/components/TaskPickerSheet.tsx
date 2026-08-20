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

import { colors, fontSize, fontWeight } from '../theme'

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
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 34,
    paddingHorizontal: 16,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.buttonDisabled,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: fontSize.label,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  selectRow: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: colors.background,
    marginBottom: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  selectRowActive: { backgroundColor: colors.primarySelected },
  done: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  doneText: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    color: colors.textPrimary,
  },
})
