import React from 'react'

import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { TaskAccordionCard } from '../../src/components/TaskAccordionCard'
import { getCustomer } from '../../src/repositories/customers'
import { archiveProject, getProject, getProjectTotalSeconds } from '../../src/repositories/projects'
import { listTasksByIds } from '../../src/repositories/tasks'
import { listTimeEntriesForProject, softDeleteTimeEntry } from '../../src/repositories/timeEntries'
import { colors, fontSize, fontWeight } from '../../src/theme'
import { taskAmountCents } from '../../src/utils/money'
import { formatDuration } from '../../src/utils/time'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

type Task = { id: string; description: string }
type Entry = {
  id: string
  taskId: string
  durationSeconds: number
  startedAt: Date
  notes: string | null
  rateSnapshotCents: number | null
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [project, setProject] = React.useState(getProject(OWNER_ID, id))
  const [entries, setEntries] = React.useState<Entry[]>(
    listTimeEntriesForProject(OWNER_ID, id) as Entry[],
  )
  const [tasks, setTasks] = React.useState<Task[]>(() => {
    const e = listTimeEntriesForProject(OWNER_ID, id) as Entry[]
    const ids = [...new Set(e.map((x) => x.taskId))]
    return listTasksByIds(OWNER_ID, ids)
  })
  const [totalSeconds, setTotalSeconds] = React.useState(getProjectTotalSeconds(OWNER_ID, id))
  const [customerName, setCustomerName] = React.useState<string | null>(null)

  const load = () => {
    const p = getProject(OWNER_ID, id)
    setProject(p)
    setCustomerName(p ? (getCustomer(OWNER_ID, p.customerId)?.name ?? null) : null)
    const rawEntries = listTimeEntriesForProject(OWNER_ID, id) as Entry[]
    setEntries(rawEntries)
    const taskIds = [...new Set(rawEntries.map((e) => e.taskId))]
    setTasks(listTasksByIds(OWNER_ID, taskIds))
    setTotalSeconds(getProjectTotalSeconds(OWNER_ID, id))
  }

  useFocusEffect(
    React.useCallback(() => {
      load()
    }, [id]),
  )

  if (!project)
    return (
      <View style={styles.c}>
        <Text>Nicht gefunden</Text>
      </View>
    )

  // Group entries by task, sorted by task total seconds desc
  const taskMap = Object.fromEntries(tasks.map((t) => [t.id, t]))
  const groupedMap: Record<string, Entry[]> = {}
  for (const entry of entries) {
    if (!groupedMap[entry.taskId]) groupedMap[entry.taskId] = []
    groupedMap[entry.taskId].push(entry)
  }
  const taskGroups = Object.entries(groupedMap)
    .map(([taskId, taskEntries]) => ({
      task: taskMap[taskId] ?? { id: taskId, description: 'Unbekannte Aufgabe' },
      entries: taskEntries,
      totalSeconds: taskEntries.reduce((s, e) => s + e.durationSeconds, 0),
    }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds)

  const totalCents =
    project.pricingMode === 'hourly'
      ? taskGroups.reduce((sum, g) => sum + taskAmountCents(g.entries), 0)
      : null

  const relativeRate =
    project.pricingMode === 'fixed' && totalSeconds > 0
      ? Math.round((project.fixedPriceCents ?? 0) / (totalSeconds / 3600))
      : null

  const handleArchive = () => {
    Alert.alert('Archivieren?', 'Das Projekt verschwindet aus der Kachelansicht.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Archivieren',
        onPress: () => {
          archiveProject(OWNER_ID, id)
          router.back()
        },
      },
    ])
  }

  const handleEditEntry = (entryId: string) => {
    router.push(`/time-entries/${entryId}/edit`)
  }

  const handleDeleteEntry = (entryId: string) => {
    Alert.alert('Zeiteintrag löschen?', 'Dieser Eintrag wird unwiderruflich gelöscht.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          softDeleteTimeEntry(OWNER_ID, entryId)
          load()
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.c} contentContainerStyle={styles.content}>
        <View style={[styles.header, { borderLeftColor: project.color }]}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleGroup}>
              {customerName && <Text style={styles.customerName}>{customerName}</Text>}
              <Text style={styles.title}>{project.title}</Text>
            </View>
            <Pressable
              onPress={() => router.push(`/projects/${id}/edit`)}
              style={styles.editBtn}
              accessibilityRole="button"
              accessibilityLabel="Projekt bearbeiten"
              hitSlop={8}
            >
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </Pressable>
          </View>
          <Text style={styles.meta}>
            {project.pricingMode === 'hourly'
              ? `${((project.hourlyRateCents ?? 0) / 100).toFixed(2)} €/h`
              : `Festpreis ${((project.fixedPriceCents ?? 0) / 100).toFixed(2)} €`}
          </Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{formatDuration(totalSeconds)}</Text>
            <Text style={styles.statLabel}>Gesamtzeit</Text>
          </View>
          {totalCents !== null && (
            <View style={styles.stat}>
              <Text style={styles.statVal}>{(totalCents / 100).toFixed(2)} €</Text>
              <Text style={styles.statLabel}>Gesamtbetrag</Text>
            </View>
          )}
          {relativeRate !== null && (
            <View style={styles.stat}>
              <Text style={styles.statVal}>{(relativeRate / 100).toFixed(2)} €/h</Text>
              <Text style={styles.statLabel}>Relativer Stundensatz</Text>
            </View>
          )}
          {project.pricingMode === 'fixed' && totalSeconds === 0 && (
            <View style={styles.stat}>
              <Text style={styles.statVal}>—</Text>
              <Text style={styles.statLabel}>Relativer Stundensatz</Text>
            </View>
          )}
        </View>

        {taskGroups.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Noch keine Zeiteinträge</Text>
          </View>
        ) : (
          taskGroups.map(({ task, entries: taskEntries }) => (
            <TaskAccordionCard
              key={task.id}
              task={task}
              entries={taskEntries}
              projectTotalSeconds={totalSeconds}
              pricingMode={project.pricingMode as 'hourly' | 'fixed'}
              accentColor={project.color}
              onEditEntry={handleEditEntry}
              onDeleteEntry={handleDeleteEntry}
            />
          ))
        )}

        <Pressable style={styles.archiveBtn} onPress={handleArchive}>
          <Text style={styles.archiveBtnText}>Archivieren</Text>
        </Pressable>
      </ScrollView>
      <Pressable
        style={styles.fab}
        onPress={() => router.push(`/time-entries/new?projectId=${id}` as never)}
        accessibilityRole="button"
        accessibilityLabel="Zeiteintrag manuell hinzufügen"
        hitSlop={8}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  c: { flex: 1 },
  content: { paddingBottom: 96 },
  header: {
    padding: 16,
    borderLeftWidth: 5,
    margin: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitleGroup: { flex: 1, marginRight: 8 },
  editBtn: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  customerName: { fontSize: fontSize.label, color: colors.textSecondary, marginBottom: 2 },
  title: { fontSize: fontSize.titleLarge, fontWeight: fontWeight.bold },
  meta: { color: colors.textSecondary, marginTop: 4 },
  stats: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 16 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statVal: { fontSize: fontSize.title, fontWeight: fontWeight.bold, color: colors.primary },
  statLabel: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: fontSize.bodySmall },
  archiveBtn: {
    margin: 16,
    marginTop: 24,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
  },
  archiveBtnText: { color: colors.danger, fontWeight: fontWeight.semibold },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: { color: colors.textOnPrimary, fontSize: fontSize.display, lineHeight: 32 },
})
