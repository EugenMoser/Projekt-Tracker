import { Pressable, View, Text, StyleSheet, GestureResponderEvent } from 'react-native'
import * as Haptics from 'expo-haptics'
import { DotsButton } from './RowActionMenu'
import { getContrastTextColor } from '../utils/color'

interface Props {
  id: string
  title: string
  customerName: string
  color: string
  isActive: boolean
  onPress: () => void
  onEditPress: () => void
}

export function ProjectTile({ title, customerName, color, isActive, onPress, onEditPress }: Props) {
  const textColor = getContrastTextColor(color)
  const secondaryTextColor = textColor === '#000000' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)'

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onPress()
  }

  const handleEditPress = (e: GestureResponderEvent) => {
    e.stopPropagation()
    onEditPress()
  }

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.tile, { backgroundColor: color }]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${customerName}${isActive ? ', timer active' : ''}`}
      accessibilityState={{ selected: isActive }}
    >
      <View style={styles.body}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>{title}</Text>
        <Text style={[styles.customer, { color: secondaryTextColor }]} numberOfLines={1}>{customerName}</Text>
      </View>
      <View style={styles.footer}>
        <DotsButton
          onPress={handleEditPress}
          accessibilityLabel={`${title} bearbeiten`}
          color={textColor}
        />
        <Text style={[styles.icon, { color: textColor }]} accessibilityElementsHidden>{isActive ? '⏸' : '▶'}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tile: { borderRadius: 12, padding: 14, flex: 1, margin: 6, minHeight: 100 },
  body: { flex: 1 },
  title: { fontWeight: '700', fontSize: 15, marginBottom: 4 },
  customer: { fontSize: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  icon: { fontSize: 20 },
})
