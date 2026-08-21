import React from 'react'

import { router, useFocusEffect } from 'expo-router'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedRef } from 'react-native-reanimated'
import type { SortableGridDragEndParams } from 'react-native-sortables'
import Sortable from 'react-native-sortables'

import { ProjectTile } from '../../src/components/ProjectTile'
import { StopModal } from '../../src/components/StopModal'
import { SwipeToStop } from '../../src/components/SwipeToStop'
import { TimerBanner } from '../../src/components/TimerBanner'
import { listCustomers } from '../../src/repositories/customers'
import { listActiveProjects, moveProject } from '../../src/repositories/projects'
import { getActiveTimer, startTimer } from '../../src/repositories/timers'
import { useTimerStore } from '../../src/store/timerStore'
import { colors, fontSize, radius, space } from '../../src/theme'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

type Project = ReturnType<typeof listActiveProjects>[number]
type ProjectWithCustomerName = Project & { customerName: string }

export default function HomeScreen() {
  const [projects, setProjects] = React.useState<ProjectWithCustomerName[]>([])
  const [activeProjectTitle, setActiveProjectTitle] = React.useState<string | null>(null)
  const { activeProjectId, setActive, clearActive, setPendingStop } = useTimerStore()
  const pendingStopProjectId = useTimerStore((s) => s.pendingStopProjectId)
  const scrollableRef = useAnimatedRef<Animated.ScrollView>()

  const load = React.useCallback(() => {
    const rows = listActiveProjects(OWNER_ID)
    const customerNames = new Map(listCustomers(OWNER_ID).map((c) => [c.id, c.name]))
    setProjects(rows.map((p) => ({ ...p, customerName: customerNames.get(p.customerId) ?? '' })))
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

  useFocusEffect(
    React.useCallback(() => {
      load()
    }, [load]),
  )

  const handleTilePress = (project: ProjectWithCustomerName) => {
    if (activeProjectId === project.id) {
      setPendingStop(project.id)
      return
    }
    if (activeProjectId) {
      Alert.alert('Timer läuft noch', `"${activeProjectTitle}" ist noch aktiv. Erst stoppen?`, [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Stoppen & neues starten',
          onPress: () => {
            setPendingStop(activeProjectId)
          },
        },
      ])
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

  const handleDragEnd = ({
    data,
    fromIndex,
    toIndex,
  }: SortableGridDragEndParams<ProjectWithCustomerName>) => {
    // The library fires onDragEnd even for a long-press-and-release without an
    // actual position change. Writing in that case would still stamp a fresh
    // updated_at and could clobber a concurrent edit made from another device.
    if (fromIndex === toIndex) return
    const moved = data[toIndex]
    if (!moved) return
    const prevId = toIndex > 0 ? data[toIndex - 1].id : null
    const nextId = toIndex < data.length - 1 ? data[toIndex + 1].id : null
    try {
      moveProject(OWNER_ID, moved.id, prevId, nextId)
      setProjects(data)
    } catch {
      // Neighbours no longer describe a valid position — the drop was not
      // persisted, so re-sync the visible order with the database instead of
      // silently keeping a state the DB does not have.
      load()
    }
  }

  return (
    <View style={styles.container}>
      {activeProjectId && activeProjectTitle && (
        <SwipeToStop enabled={!!activeProjectId} onStop={() => setPendingStop(activeProjectId!)}>
          <TimerBanner
            projectTitle={activeProjectTitle!}
            onPress={() => setPendingStop(activeProjectId!)}
          />
        </SwipeToStop>
      )}
      <Animated.ScrollView
        ref={scrollableRef}
        style={styles.scroll}
        contentContainerStyle={styles.list}
      >
        <Sortable.Grid
          columns={2}
          data={projects}
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
          onDragEnd={handleDragEnd}
          hapticsEnabled
          scrollableRef={scrollableRef}
        />
      </Animated.ScrollView>
      <Pressable style={styles.fab} onPress={() => router.push('/projects/new' as never)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
      <StopModal
        visible={!!pendingStopProjectId}
        projectId={pendingStopProjectId ?? ''}
        onDone={() => {
          setPendingStop(null)
          load()
        }}
        onCancel={() => setPendingStop(null)}
        onDiscard={() => {
          setPendingStop(null)
          load()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  list: { padding: space.s6 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: { color: colors.textInverse, fontSize: fontSize.display, lineHeight: 32 },
})
