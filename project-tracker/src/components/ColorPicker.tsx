import React from 'react'
import { View, TouchableOpacity, Pressable, Modal, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ReanimatedColorPicker, { Panel3, BrightnessSlider, Preview } from 'reanimated-color-picker'

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
        accessibilityLabel={isCustom ? `Eigene Farbe ${value}, ausgewählt. Antippen zum Ändern.` : 'Eigene Farbe wählen'}
        style={[
          styles.swatch,
          styles.customSwatch,
          isCustom ? { backgroundColor: value } : undefined,
          isCustom && styles.selected,
        ]}
      >
        {!isCustom && <Ionicons name="color-palette-outline" size={22} color="#666" />}
      </TouchableOpacity>

      <Modal
        visible={wheelVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
        accessibilityViewIsModal
      >
        <Pressable style={styles.backdrop} onPress={handleCancel}>
          <Pressable style={styles.dialog} onPress={() => { /* stop propagation */ }}>
            <Text style={styles.dialogTitle}>Eigene Farbe wählen</Text>
            <ReanimatedColorPicker
              value={value}
              onChangeJS={(colors) => { pendingColorRef.current = colors.hex }}
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
                accessibilityLabel="Farbe übernehmen"
              >
                <Text style={styles.applyBtnText}>Übernehmen</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  swatch: { width: 44, height: 44, borderRadius: 22 },
  selected: { borderWidth: 3, borderColor: '#000' },
  customSwatch: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  dialogTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  pickerWrapper: { width: '100%', alignItems: 'center', gap: 16 },
  wheel: { width: 220 },
  brightnessSlider: { width: '100%', height: 28, borderRadius: 14 },
  preview: { width: '100%', height: 32, borderRadius: 8 },
  dialogActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, backgroundColor: '#F2F2F7', borderRadius: 8,
    minHeight: 44, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { color: '#333', fontSize: 15, fontWeight: '600' },
  applyBtn: {
    flex: 1, backgroundColor: '#4A90D9', borderRadius: 8,
    minHeight: 44, alignItems: 'center', justifyContent: 'center',
  },
  applyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
})
