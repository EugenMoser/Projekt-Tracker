import React from 'react'

import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, fontSize, fontWeight } from '../theme'
import { lighten } from '../utils/color'
import { taskAmountCents } from '../utils/money'
import { formatDuration } from '../utils/time'
import { EntryActionModal } from './EntryActionModal'
import { DotsButton } from './RowActionMenu'

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
  /** Project color the progress bar is drawn in; its track is a pale tint of it. */
  accentColor: string
  onEditEntry: (entryId: string) => void
  onDeleteEntry: (entryId: string) => void
}

export function TaskAccordionCard({
  task,
  entries,
  projectTotalSeconds,
  pricingMode,
  accentColor,
  onEditEntry,
  onDeleteEntry,
}: Props) {
  const [expanded, setExpanded] = React.useState(false)
  const [activeEntry, setActiveEntry] = React.useState<Entry | null>(null)

  const totalSeconds = entries.reduce((sum, e) => sum + e.durationSeconds, 0)
  const totalCents = pricingMode === 'hourly' ? taskAmountCents(entries) : null
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
        <View style={[styles.barBg, { backgroundColor: lighten(accentColor, 0.88) }]}>
          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: accentColor }]} />
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
              <DotsButton
                onPress={() => setActiveEntry(entry)}
                accessibilityLabel={`Optionen für Eintrag vom ${new Date(entry.startedAt).toLocaleDateString('de-DE')}`}
              />
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
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
  },
  cardExpanded: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskName: {
    flex: 1,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.bodySmall,
    color: colors.textPrimary,
  },
  headerRight: {
    alignItems: 'flex-end',
    marginRight: 6,
  },
  taskTime: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.bodySmall,
    color: colors.primary,
  },
  taskCost: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  chevron: {
    fontSize: fontSize.bodySmall,
    color: colors.textDisabled,
    width: 14,
    textAlign: 'center',
  },
  barBg: {
    marginTop: 8,
    height: 5,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 5,
    borderRadius: 4,
  },
  entriesList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 8,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  entryInfo: {
    flex: 1,
  },
  entryDur: {
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.label,
    color: colors.textPrimary,
  },
  entryDate: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
})
