import React from 'react'

import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import { listCustomers } from '../../src/repositories/customers'
import { listArchivedProjects, restoreProject } from '../../src/repositories/projects'

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
            <Pressable
              style={styles.restoreBtn}
              onPress={() => handleRestore(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title} wiederherstellen`}
            >
              <Ionicons name="arrow-undo-outline" size={20} color="#4A90D9" />
              <Text style={styles.restoreBtnText}>Wiederherstellen</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#8E8E93', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  info: { flex: 1, marginRight: 12 },
  title: { fontSize: 16, fontWeight: '600' },
  customerName: { fontSize: 13, color: '#666', marginTop: 2 },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 6 },
  restoreBtnText: { color: '#4A90D9', fontWeight: '600' },
})
