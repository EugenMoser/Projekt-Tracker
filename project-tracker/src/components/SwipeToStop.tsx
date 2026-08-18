import React from 'react'

import { StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

interface Props {
  children: React.ReactNode
  onStop: () => void
  enabled?: boolean
}

export function SwipeToStop({ children, onStop, enabled = true }: Props) {
  const translateX = useSharedValue(0)
  const THRESHOLD = 120

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .onUpdate((e) => {
      translateX.value = Math.max(0, e.translationX)
    })
    .onEnd(() => {
      if (translateX.value > THRESHOLD) {
        runOnJS(onStop)()
      }
      translateX.value = withSpring(0)
    })

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  const bgOpacity = useAnimatedStyle(() => ({
    opacity: Math.min(translateX.value / THRESHOLD, 1),
  }))

  return (
    <View
      style={styles.wrapper}
      accessibilityLabel="Wisch nach rechts um den Timer zu stoppen"
      accessibilityHint="Wische nach rechts um den Timer zu stoppen"
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.stopBg, bgOpacity]}>
        <Text style={styles.stopText}>◼ Stoppen</Text>
      </Animated.View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { overflow: 'hidden' },
  stopBg: { backgroundColor: '#E74C3C', justifyContent: 'center', paddingLeft: 24 },
  stopText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
})
