import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
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
  visible, projectId, selectedId, searchText, onSelect, onSearchChange, onClose,
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
        <Pressable style={styles.sheet} onPress={() => { /* stop propagation */ }}>
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
