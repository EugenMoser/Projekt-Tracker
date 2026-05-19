import { View, TouchableOpacity, StyleSheet } from 'react-native'

const COLORS = ['#4A90D9', '#27AE60', '#E67E22', '#8E44AD', '#E74C3C', '#F1C40F']

interface Props {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: Props) {
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
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  swatch: { width: 44, height: 44, borderRadius: 22 },
  selected: { borderWidth: 3, borderColor: '#000' },
})
