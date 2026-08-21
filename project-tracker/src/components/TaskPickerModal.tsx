import React from 'react'

import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { colors, fontSize, fontWeight, radius, space } from '../theme'
import { TaskPicker } from './TaskPicker'

interface Props {
  visible: boolean
  projectId: string
  selectedId: string | null
  searchText: string
  onSelect: (id: string | null) => void
  onSearchChange: (text: string) => void
  onClose: () => void
}

/**
 * Bottom-sheet wrapper around the single-select `TaskPicker` (search +
 * sectioned list + inline "create new" hint). Exists so the picker's
 * SectionList lives inside a Modal instead of nested in a screen's outer
 * ScrollView — see PROGRESS.md 2026-08-16 for why that nesting broke
 * scrolling past the first ~240px of tasks.
 */
export function TaskPickerModal({
  visible,
  projectId,
  selectedId,
  searchText,
  onSelect,
  onSearchChange,
  onClose,
}: Props) {
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
          <Text style={styles.title}>Aufgabe auswählen</Text>
          <View style={{ height: windowHeight * 0.5 }}>
            <TaskPicker
              projectId={projectId}
              selectedId={selectedId}
              searchText={searchText}
              onSelect={onSelect}
              onSearchChange={onSearchChange}
              active={visible}
            />
          </View>
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
    paddingBottom: space.sheetBottom,
    paddingHorizontal: space.lg,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.buttonDisabled,
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
  done: {
    backgroundColor: colors.surface,
    borderRadius: radius.r10,
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
