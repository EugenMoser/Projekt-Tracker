import React from 'react'

import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import { listCustomers } from '../../src/repositories/customers'
import {
  getProjectTimeEntrySummary,
  hardDeleteProject,
  listArchivedProjects,
  restoreProject,
} from '../../src/repositories/projects'
import { colors, fontSize, fontWeight, radius, space } from '../../src/theme'
import { formatDuration } from '../../src/utils/time'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

type ArchivedProject = ReturnType<typeof listArchivedProjects>[number] & { customerName: string }

export default function ArchivedProjectsScreen() {
  const [projects, setProjects] = React.useState<ArchivedProject[]>([])

  const load = React.useCallback(() => {
    const rows = listArchivedProjects(OWNER_ID)
    const customerNames = new Map(listCustomers(OWNER_ID).map((c) => [c.id, c.name]))
    setProjects(rows.map((p) => ({ ...p, customerName: customerNames.get(p.customerId) ?? '' })))
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      load()
    }, [load]),
  )

  const handleRestore = (id: string) => {
    restoreProject(OWNER_ID, id)
    load()
  }

  const handleHardDelete = (item: ArchivedProject) => {
    const { count, totalSeconds } = getProjectTimeEntrySummary(OWNER_ID, item.id)
    const message =
      count > 0
        ? `„${item.title}" wird zusammen mit ${count === 1 ? '1 Zeiteintrag' : `${count} Zeiteinträgen`} (${formatDuration(totalSeconds)}) unwiderruflich gelöscht. Das kann nicht rückgängig gemacht werden.`
        : `„${item.title}" wird unwiderruflich gelöscht. Das kann nicht rückgängig gemacht werden.`
    Alert.alert('Endgültig löschen?', message, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Endgültig löschen',
        style: 'destructive',
        onPress: () => {
          hardDeleteProject(OWNER_ID, item.id)
          load()
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={projects.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<Text style={styles.emptyText}>Keine archivierten Projekte</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              {item.customerName ? (
                <Text style={styles.customerName} numberOfLines={1}>
                  {item.customerName}
                </Text>
              ) : null}
            </View>
            <View style={styles.actions}>
              <Pressable
                style={styles.restoreBtn}
                onPress={() => handleRestore(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title} wiederherstellen`}
              >
                <Ionicons name="arrow-undo-outline" size={20} color={colors.primary} />
                <Text style={styles.restoreBtnText}>Wiederherstellen</Text>
              </Pressable>
              <Pressable
                style={styles.hardDeleteBtn}
                onPress={() => handleHardDelete(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title} endgültig löschen`}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <Text style={styles.hardDeleteBtnText}>Endgültig löschen</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.lg },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: fontSize.body },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: space.sm,
  },
  info: { flex: 1, marginRight: space.md, justifyContent: 'center', minHeight: 44 },
  title: { fontSize: fontSize.bodyLarge, fontWeight: fontWeight.semibold },
  customerName: { fontSize: fontSize.label, color: colors.textSecondary, marginTop: space.xxs },
  actions: { alignItems: 'flex-end', gap: space.sm },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: space.sm },
  restoreBtnText: { color: colors.primary, fontWeight: fontWeight.semibold },
  hardDeleteBtn: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: space.sm },
  hardDeleteBtnText: { color: colors.danger, fontWeight: fontWeight.semibold },
})
