import React from 'react'
import { View, StyleSheet, Pressable, Text, Alert } from 'react-native'
import { FlashList } from '@shopify/flash-list'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { router, useFocusEffect } from 'expo-router'
import { listActiveProjects } from '../../src/repositories/projects'
import { getActiveTimer, startTimer } from '../../src/repositories/timers'
import { useTimerStore } from '../../src/store/timerStore'
import { ProjectTile } from '../../src/components/ProjectTile'
import { TimerBanner } from '../../src/components/TimerBanner'
import { StopModal } from '../../src/components/StopModal'
import { SwipeToStop } from '../../src/components/SwipeToStop'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

type Project = ReturnType<typeof listActiveProjects>[number]
type ProjectWithCustomerName = Project & { customerName: string }

export default function HomeScreen() {
  const [projects, setProjects] = React.useState<ProjectWithCustomerName[]>([])
  const [activeProjectTitle, setActiveProjectTitle] = React.useState<string | null>(null)
  const { activeProjectId, setActive, clearActive, setPendingStop } = useTimerStore()
  const pendingStopProjectId = useTimerStore((s) => s.pendingStopProjectId)

  const load = React.useCallback(() => {
    const rows = listActiveProjects(OWNER_ID)
    setProjects(rows.map((p) => ({ ...p, customerName: '' })))
    const timer = getActiveTimer(OWNER_ID)
    if (timer) {
      const active = rows.find((p) => p.id === timer.projectId)
      setActive(timer.projectId, timer.startedAt)
      setActiveProjectTitle(active?.title ?? '')
    } else {
      clearActive()
      setActiveProjectTitle(null)
    }
  }, [setActive, clearActive])

  useFocusEffect(React.useCallback(() => { load() }, [load]))

  const handleTilePress = (project: ProjectWithCustomerName) => {
    if (activeProjectId === project.id) {
      setPendingStop(project.id)
      return
    }
    if (activeProjectId) {
      Alert.alert(
        'Timer läuft noch',
        `"${activeProjectTitle}" ist noch aktiv. Erst stoppen?`,
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Stoppen & neues starten',
            onPress: () => { setPendingStop(activeProjectId) },
          },
        ]
      )
      return
    }
    try {
      startTimer(OWNER_ID, project.id)
      setActive(project.id, new Date())
      setActiveProjectTitle(project.title)
    } catch (e) {
      Alert.alert('Fehler', String(e))
    }
  }

  return (
    <View style={styles.container}>
      {activeProjectId && activeProjectTitle && (
        <SwipeToStop enabled={!!activeProjectId} onStop={() => setPendingStop(activeProjectId!)}>
          <TimerBanner projectTitle={activeProjectTitle!} onPress={() => setPendingStop(activeProjectId!)} />
        </SwipeToStop>
      )}
      <FlashList
        data={projects}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectTile
            id={item.id}
            title={item.title}
            customerName={item.customerName}
            color={item.color}
            isActive={item.id === activeProjectId}
            onPress={() => handleTilePress(item)}
            onEditPress={() => router.push(`/projects/${item.id}` as never)}
          />
        )}
        contentContainerStyle={styles.list}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/projects/new' as never)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
      <StopModal
        visible={!!pendingStopProjectId}
        projectId={pendingStopProjectId ?? ''}
        onDone={() => { setPendingStop(null); load() }}
        onCancel={() => setPendingStop(null)}
        onDiscard={() => { setPendingStop(null); load() }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  list: { padding: 6 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4A90D9', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  fabText: { color: '#FFF', fontSize: 28, lineHeight: 32 },
})
