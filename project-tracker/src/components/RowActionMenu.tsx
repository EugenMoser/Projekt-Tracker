import React from 'react'

import { GestureResponderEvent, Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, fontSize, fontWeight, radius, space } from '../theme'

export interface RowAction {
  label: string
  onPress: () => void
  destructive?: boolean
}

interface RowActionMenuProps {
  visible: boolean
  title?: string
  actions: RowAction[]
  onClose: () => void
}

export function RowActionMenu({ visible, title, actions, onClose }: RowActionMenuProps) {
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
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {actions.map((action) => (
            <Pressable
              key={action.label}
              style={styles.action}
              onPress={action.onPress}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Text style={[styles.actionText, action.destructive && styles.danger]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
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

interface DotsButtonProps {
  onPress: (event: GestureResponderEvent) => void
  accessibilityLabel: string
  color?: string
}

export function DotsButton({
  onPress,
  accessibilityLabel,
  color = colors.textPrimary,
}: DotsButtonProps) {
  return (
    <Pressable
      style={styles.dots}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <Text style={[styles.dotsText, { color }]}>•••</Text>
    </Pressable>
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
  dots: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsText: {
    fontSize: fontSize.titleLarge,
    fontWeight: fontWeight.bold,
    letterSpacing: 2,
    color: colors.textPrimary,
  },
})
