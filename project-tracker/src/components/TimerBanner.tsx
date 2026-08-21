import React from 'react'

import { Pressable, StyleSheet, Text } from 'react-native'

import { useTimerStore } from '../store/timerStore'
import { colors, fontSize, fontWeight, space } from '../theme'
import { formatDuration } from '../utils/time'

interface Props {
  projectTitle: string
  onPress: () => void
}

export function TimerBanner({ projectTitle, onPress }: Props) {
  const startedAt = useTimerStore((s) => s.startedAt)
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    if (!startedAt) return
    const update = () => setElapsed(Math.round((Date.now() - startedAt.getTime()) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <Pressable
      onPress={onPress}
      style={styles.banner}
      accessibilityRole="button"
      accessibilityLabel={`Active timer: ${projectTitle}, elapsed ${formatDuration(elapsed)}`}
    >
      <Text style={styles.icon}>▶</Text>
      <Text style={styles.title} numberOfLines={1}>
        {projectTitle}
      </Text>
      <Text style={styles.time}>{formatDuration(elapsed)}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surfaceInverse,
    padding: space.md,
    paddingHorizontal: space.lg,
    minHeight: 44,
  },
  icon: { color: colors.success, fontSize: fontSize.bodySmall },
  title: { flex: 1, color: colors.textOnPrimary, fontWeight: fontWeight.semibold },
  time: { color: colors.textOnPrimary, fontFamily: 'monospace', fontSize: fontSize.bodyLarge },
})
