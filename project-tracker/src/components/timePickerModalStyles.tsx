import React from 'react'

import { Pressable, StyleSheet, Text } from 'react-native'

import { colors, fontSize, fontWeight, radius, space } from '../theme'

// Shared look for every react-native-timer-picker modal in the app (manual
// time entry create + edit). The library's own button styling is TextStyle
// merged onto an unstyled TouchableOpacity via a style ARRAY — fragile to
// reason about and, in practice, rendered invisible/unstyled text. Supplying
// full custom elements via the cancelButton/confirmButton props sidesteps
// that: the library only clones them to inject onPress, everything else is
// ordinary app styling identical to the Abbrechen/Speichern buttons
// elsewhere (e.g. StopModal).
const styles = StyleSheet.create({
  modalTitle: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.xl,
    marginBottom: space.xl,
    paddingHorizontal: space.lg,
    justifyContent: 'space-between',
  },
  cancelBtn: {
    flex: 1,
    padding: space.s14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    minHeight: 44,
  },
  cancelBtnText: {
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.bodySmall,
  },
  confirmBtn: {
    flex: 1,
    padding: space.s14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    minHeight: 44,
  },
  confirmBtnText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.bodySmall,
  },
})

export const TIME_PICKER_MODAL_STYLES = {
  modalTitle: styles.modalTitle,
  buttonContainer: styles.buttonRow,
  contentContainer: { width: '70%' as const },

  pickerColumnWidth: {
    hours: 120,
    minutes: 120,
  },
}

export const TIME_PICKER_CANCEL_BUTTON = (
  <Pressable style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel="Abbrechen">
    <Text style={styles.cancelBtnText}>Abbrechen</Text>
  </Pressable>
)

export const TIME_PICKER_CONFIRM_BUTTON = (
  <Pressable style={styles.confirmBtn} accessibilityRole="button" accessibilityLabel="Speichern">
    <Text style={styles.confirmBtnText}>Speichern</Text>
  </Pressable>
)
