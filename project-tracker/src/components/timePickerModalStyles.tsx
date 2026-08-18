import React from "react";

import { Pressable, StyleSheet, Text } from "react-native";

// Shared look for every react-native-timer-picker modal in the app (manual
// time entry create + edit). The library's own button styling is TextStyle
// merged onto an unstyled TouchableOpacity via a style ARRAY — fragile to
// reason about and, in practice, rendered invisible/unstyled text. Supplying
// full custom elements via the cancelButton/confirmButton props sidesteps
// that: the library only clones them to inject onPress, everything else is
// ordinary app styling identical to the Abbrechen/Speichern buttons
// elsewhere (e.g. StopModal).
const styles = StyleSheet.create({
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#EEE",
    minHeight: 44,
  },
  cancelBtnText: { color: "#333", fontWeight: "600", fontSize: 14 },
  confirmBtn: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#4A90D9",
    minHeight: 44,
  },
  confirmBtnText: { color: "#FFF", fontWeight: "600", fontSize: 14 },
});

export const TIME_PICKER_MODAL_STYLES = {
  modalTitle: styles.modalTitle,
  buttonContainer: styles.buttonRow,
  contentContainer: { width: "70%" as const },
  pickerColumnWidth: {
    hours: 100,
    minutes: 100,
  },
};

export const TIME_PICKER_CANCEL_BUTTON = (
  <Pressable
    style={styles.cancelBtn}
    accessibilityRole="button"
    accessibilityLabel="Abbrechen"
  >
    <Text style={styles.cancelBtnText}>Abbrechen</Text>
  </Pressable>
);

export const TIME_PICKER_CONFIRM_BUTTON = (
  <Pressable
    style={styles.confirmBtn}
    accessibilityRole="button"
    accessibilityLabel="Speichern"
  >
    <Text style={styles.confirmBtnText}>Speichern</Text>
  </Pressable>
);
