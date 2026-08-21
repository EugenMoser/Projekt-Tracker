import * as Haptics from 'expo-haptics'
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native'

import { fontSize, fontWeight, radius, space } from '../theme'
import { getContrastTextColor } from '../utils/color'
import { DotsButton } from './RowActionMenu'

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
  // Aus der Projektfarbe berechnet, nicht aus der Palette gewählt: Ein festes
  // Token würde genau die Anpassung an eine zur Bauzeit unbekannte Nutzerfarbe
  // zerstören (Spec E6). textColor stammt aus getContrastTextColor().
  // eslint-disable-next-line no-restricted-syntax
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
        <Text style={[styles.title, { color: textColor }]} numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>
        <Text style={[styles.customer, { color: secondaryTextColor }]} numberOfLines={1}>
          {customerName}
        </Text>
      </View>
      <View style={styles.footer}>
        <DotsButton
          onPress={handleEditPress}
          accessibilityLabel={`${title} bearbeiten`}
          color={textColor}
        />
        <Text style={[styles.icon, { color: textColor }]} accessibilityElementsHidden>
          {isActive ? '⏸' : '▶'}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.lg, padding: space.lg, flex: 1, margin: space.sm, height: 128 },
  body: { flex: 1 },
  title: { fontWeight: fontWeight.bold, fontSize: fontSize.body, marginBottom: space.xs },
  customer: { fontSize: fontSize.captionLarge },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  icon: { fontSize: fontSize.titleLarge },
})
