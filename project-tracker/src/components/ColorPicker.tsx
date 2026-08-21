import React from 'react'

import { Ionicons } from '@expo/vector-icons'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import ReanimatedColorPicker, { BrightnessSlider, Panel3, Preview } from 'reanimated-color-picker'

import { colors, fontSize, fontWeight, radius, space } from '../theme'

// Projektfarben-Presets: Auswahlmöglichkeiten für ein Datenfeld, keine
// Gestaltung der App. Dass das erste Preset denselben Wert wie
// colors.primary hat, ist Zufall und soll einer bleiben (Spec E6).
// eslint-disable-next-line no-restricted-syntax
const COLORS = ['#4A90D9', '#27AE60', '#E67E22', '#8E44AD', '#E74C3C', '#F1C40F']

interface Props {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: Props) {
  const [wheelVisible, setWheelVisible] = React.useState(false)
  // Tracks the color while the user drags the wheel/slider. A ref (not state) on
  // purpose: onChangeJS fires on every gesture frame, and re-rendering this
  // component on every frame would fight the picker's own Reanimated worklets.
  // The Preview component below animates itself off shared values, so no JS
  // re-render is needed until the user actually confirms.
  const pendingColorRef = React.useRef(value)
  const isCustom = !COLORS.includes(value)

  const openWheel = () => {
    pendingColorRef.current = value
    setWheelVisible(true)
  }

  const handleApply = () => {
    // Normalize to uppercase so a wheel-picked color that exactly matches a
    // preset (library emits lowercase hex) is recognized as that preset by
    // the COLORS.includes()/=== checks above, instead of showing as "custom".
    onChange(pendingColorRef.current.toUpperCase())
    setWheelVisible(false)
  }

  const handleCancel = () => setWheelVisible(false)

  return (
    <View style={styles.row}>
      {COLORS.map((c) => (
        <TouchableOpacity
          key={c}
          onPress={() => onChange(c)}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === c }}
          accessibilityLabel={`Color ${c}`}
          style={[styles.swatch, { backgroundColor: c }, value === c && styles.selected]}
        />
      ))}
      <TouchableOpacity
        onPress={openWheel}
        accessibilityRole="button"
        accessibilityState={{ selected: isCustom }}
        accessibilityLabel={
          isCustom
            ? `Eigene Farbe ${value}, ausgewählt. Antippen zum Ändern.`
            : 'Eigene Farbe wählen'
        }
        style={[
          styles.swatch,
          styles.customSwatch,
          isCustom ? { backgroundColor: value } : undefined,
          isCustom && styles.selected,
        ]}
      >
        {!isCustom && (
          <Ionicons name="color-palette-outline" size={22} color={colors.textSecondary} />
        )}
      </TouchableOpacity>

      <Modal
        visible={wheelVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
        accessibilityViewIsModal
      >
        <Pressable style={styles.backdrop} onPress={handleCancel}>
          <Pressable
            style={styles.dialog}
            onPress={() => {
              /* stop propagation */
            }}
          >
            <Text style={styles.dialogTitle}>Eigene Farbe wählen</Text>
            <ReanimatedColorPicker
              value={value}
              onChangeJS={(colors) => {
                pendingColorRef.current = colors.hex
              }}
              style={styles.pickerWrapper}
            >
              <Panel3
                style={styles.wheel}
                accessibilityLabel="Farbton und Sättigung"
                accessibilityHint="Zum Ändern von Farbton und Sättigung ziehen"
              />
              <BrightnessSlider
                style={styles.brightnessSlider}
                accessibilityLabel="Helligkeit"
                accessibilityHint="Zum Ändern der Helligkeit ziehen"
              />
              <Preview style={styles.preview} colorFormat="hex" />
            </ReanimatedColorPicker>

            <View style={styles.dialogActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={handleCancel}
                accessibilityRole="button"
                accessibilityLabel="Abbrechen"
              >
                <Text style={styles.cancelBtnText}>Abbrechen</Text>
              </Pressable>
              <Pressable
                style={styles.applyBtn}
                onPress={handleApply}
                accessibilityRole="button"
                accessibilityLabel="Farbe speichern"
              >
                <Text style={styles.applyBtnText}>Speichern</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, flexWrap: 'wrap' },
  swatch: { width: 44, height: 44, borderRadius: radius.full },
  // Muss gegen alle sechs Presets und jede frei gewählte Farbe kontrastieren;
  // ein Palette-Grau würde auf dunklen Presets verschwinden (Spec E6).
  // eslint-disable-next-line no-restricted-syntax
  selected: { borderWidth: 3, borderColor: '#000' },
  customSwatch: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.r14,
    padding: space.s20,
    alignItems: 'center',
    gap: space.lg,
  },
  dialogTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  pickerWrapper: { width: '100%', alignItems: 'center', gap: space.lg },
  wheel: { width: 220 },
  brightnessSlider: { width: '100%', height: 28, borderRadius: radius.full },
  preview: { width: '100%', height: 32, borderRadius: radius.md },
  dialogActions: { flexDirection: 'row', gap: space.md, width: '100%' },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  applyBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: colors.textInverse,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
})
