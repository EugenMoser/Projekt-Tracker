import React from 'react'

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, fontSize, fontWeight, radius, space } from '../theme'
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
        <Pressable
          style={styles.sheet}
          onPress={() => {
            /* stop propagation */
          }}
        >
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
  context: {
    fontSize: fontSize.label,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: space.lg,
  },
  action: {
    backgroundColor: colors.surface,
    borderRadius: radius.r10,
    padding: space.lg,
    marginBottom: space.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: fontSize.bodyLarge,
    textAlign: 'center',
  },
  danger: {
    color: colors.danger,
  },
  cancel: {
    backgroundColor: colors.surface,
    borderRadius: radius.r10,
    padding: space.lg,
    marginTop: space.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    color: colors.textPrimary,
  },
})
