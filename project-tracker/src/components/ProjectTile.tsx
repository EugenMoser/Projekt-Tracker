import { Pressable, View, Text, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'

interface Props {
  id: string
  title: string
  customerName: string
  color: string
  isActive: boolean
  onPress: () => void
  onLongPress: () => void
}

export function ProjectTile({ title, customerName, color, isActive, onPress, onLongPress }: Props) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onPress()
  }

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      style={[styles.tile, { backgroundColor: color }]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${customerName}${isActive ? ', timer active' : ''}`}
      accessibilityState={{ selected: isActive }}
    >
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.customer} numberOfLines={1}>{customerName}</Text>
      </View>
      <Text style={styles.icon} accessibilityElementsHidden>{isActive ? '⏸' : '▶'}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tile: { borderRadius: 12, padding: 14, flex: 1, margin: 6, minHeight: 100 },
  body: { flex: 1 },
  title: { color: '#FFF', fontWeight: '700', fontSize: 15, marginBottom: 4 },
  customer: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  icon: { color: '#FFF', fontSize: 20, alignSelf: 'flex-end' },
})
