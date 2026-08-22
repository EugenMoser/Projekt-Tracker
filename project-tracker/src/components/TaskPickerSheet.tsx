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
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, fontSize, fontWeight, radius, space } from '../theme'

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
  const insets = useSafeAreaInsets()

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
          style={[styles.sheet, { paddingBottom: Math.max(space.sheetBottom, insets.bottom) }]}
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
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.lg,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.sheetHandle,
    borderRadius: radius.xs,
    alignSelf: 'center',
    marginTop: space.sm,
    marginBottom: space.lg,
  },
  title: {
    fontSize: fontSize.label,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: space.lg,
  },
  selectRow: {
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    marginBottom: space.xs,
    minHeight: 44,
    justifyContent: 'center',
  },
  selectRowActive: { backgroundColor: colors.primarySelected },
  done: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.sm,
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
