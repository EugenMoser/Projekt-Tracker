import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { EntryActionModal } from './EntryActionModal'
import { formatDuration } from '../utils/time'

type Entry = {
  id: string
  taskId: string
  durationSeconds: number
  startedAt: Date
  notes: string | null
  rateSnapshotCents: number | null
}

interface Props {
  task: { id: string; description: string }
  entries: Entry[]
  projectTotalSeconds: number
  pricingMode: 'hourly' | 'fixed'
  onEditEntry: (entryId: string) => void
  onDeleteEntry: (entryId: string) => void
}

export function TaskAccordionCard({
  task,
  entries,
  projectTotalSeconds,
  pricingMode,
  onEditEntry,
  onDeleteEntry,
}: Props) {
  const [expanded, setExpanded] = React.useState(false)
  const [activeEntry, setActiveEntry] = React.useState<Entry | null>(null)

  const totalSeconds = entries.reduce((sum, e) => sum + e.durationSeconds, 0)
  const totalCents =
    pricingMode === 'hourly'
      ? entries.reduce(
          (sum, e) => sum + Math.round((e.durationSeconds / 3600) * (e.rateSnapshotCents ?? 0)),
          0,
        )
      : null
  const pct = projectTotalSeconds > 0 ? (totalSeconds / projectTotalSeconds) * 100 : 0

  const handleEdit = () => {
    if (!activeEntry) return
    const id = activeEntry.id
    setActiveEntry(null)
    onEditEntry(id)
  }

  const handleDelete = () => {
    if (!activeEntry) return
    const id = activeEntry.id
    setActiveEntry(null)
    onDeleteEntry(id)
  }

  return (
    <View style={[styles.card, expanded && styles.cardExpanded]}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={`Aufgabe ${task.description}, ${formatDuration(totalSeconds)}`}
        accessibilityState={{ expanded }}
      >
        <View style={styles.header}>
          <Text style={styles.taskName}>{task.description}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.taskTime}>{formatDuration(totalSeconds)}</Text>
            {totalCents !== null && (
              <Text style={styles.taskCost}>{(totalCents / 100).toFixed(2)} €</Text>
            )}
          </View>
          <Text style={styles.chevron}>{expanded ? '⌄' : '›'}</Text>
        </View>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.entriesList}>
          {entries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.entryInfo}>
                <Text style={styles.entryDur}>{formatDuration(entry.durationSeconds)}</Text>
                <Text style={styles.entryDate}>
                  {new Date(entry.startedAt).toLocaleDateString('de-DE')}
                  {entry.notes ? ` · ${entry.notes}` : ''}
                </Text>
              </View>
              <Pressable
                style={styles.kebab}
                onPress={() => setActiveEntry(entry)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Optionen für Eintrag vom ${new Date(entry.startedAt).toLocaleDateString('de-DE')}`}
              >
                <Text style={styles.kebabText}>•••</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <EntryActionModal
        visible={activeEntry !== null}
        taskName={task.description}
        entry={activeEntry}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onClose={() => setActiveEntry(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
  },
  cardExpanded: {
    borderWidth: 1.5,
    borderColor: '#4A90D9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskName: {
    flex: 1,
    fontWeight: '700',
    fontSize: 14,
    color: '#333',
  },
  headerRight: {
    alignItems: 'flex-end',
    marginRight: 6,
  },
  taskTime: {
    fontWeight: '700',
    fontSize: 14,
    color: '#4A90D9',
  },
  taskCost: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  chevron: {
    fontSize: 14,
    color: '#AAA',
    width: 14,
    textAlign: 'center',
  },
  barBg: {
    marginTop: 8,
    height: 5,
    backgroundColor: '#E9EEF4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 5,
    backgroundColor: '#4A90D9',
    borderRadius: 4,
  },
  entriesList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
    paddingTop: 8,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  entryInfo: {
    flex: 1,
  },
  entryDur: {
    fontWeight: '600',
    fontSize: 13,
    color: '#333',
  },
  entryDate: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  kebab: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    minHeight: 44,
    justifyContent: 'center',
  },
  kebabText: {
    fontSize: 14,
    color: '#BBB',
    letterSpacing: 1,
  },
})
