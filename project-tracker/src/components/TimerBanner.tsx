import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useTimerStore } from '../store/timerStore'
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
      <Text style={styles.title} numberOfLines={1}>{projectTitle}</Text>
      <Text style={styles.time}>{formatDuration(elapsed)}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A1A1A',
    padding: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  icon: { color: '#4CD964', fontSize: 14 },
  title: { flex: 1, color: '#FFF', fontWeight: '600' },
  time: { color: '#FFF', fontFamily: 'monospace', fontSize: 16 },
})
