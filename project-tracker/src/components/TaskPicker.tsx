import React from 'react'

import { Pressable, SectionList, StyleSheet, Text, TextInput } from 'react-native'

import { listTasks, listTasksForProject } from '../repositories/tasks'
import { colors, fontSize, fontWeight, radius, space } from '../theme'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

type Task = { id: string; description: string }
type TaskSection = { key: string; title?: string; data: Task[] }

interface Props {
  projectId: string
  selectedId: string | null
  searchText: string
  onSelect: (id: string | null) => void
  onSearchChange: (text: string) => void
  /**
   * Gates (re)fetching tasks/projectTasks — set to false while the picker is
   * hidden (e.g. behind a closed Modal) so a parent that stays mounted across
   * open/close cycles still sees tasks created elsewhere in the meantime.
   * Defaults to true, which is right for a picker that mounts fresh per screen.
   */
  active?: boolean
}

/**
 * Single-select task picker: search field plus a sectioned list ("Aus diesem
 * Projekt" / "Alle Aufgaben"). Typing text that matches no task lets the
 * caller create it on save — this component only surfaces the search text
 * and selection, callers decide what "save" means (stop a timer, add a time
 * entry, ...).
 */
export function TaskPicker({
  projectId,
  selectedId,
  searchText,
  onSelect,
  onSearchChange,
  active = true,
}: Props) {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [projectTasks, setProjectTasks] = React.useState<Task[]>([])

  React.useEffect(() => {
    if (active) {
      setTasks(listTasks(OWNER_ID))
      setProjectTasks(listTasksForProject(OWNER_ID, projectId))
    }
  }, [active, projectId])

  const filterQuery = searchText.trim().toLowerCase()
  const filteredTasks = filterQuery
    ? tasks.filter((t) => t.description.toLowerCase().includes(filterQuery))
    : tasks

  let sections: TaskSection[]
  if (filterQuery) {
    // Suche geht immer über ALLE Aufgaben, unabhängig von der Projekt-Gruppierung.
    sections = [{ key: 'filtered', data: filteredTasks }]
  } else if (projectTasks.length > 0) {
    const projectTaskIds = new Set(projectTasks.map((t) => t.id))
    const otherTasks = tasks.filter((t) => !projectTaskIds.has(t.id))
    sections = [
      { key: 'project', title: 'Aus diesem Projekt', data: projectTasks },
      { key: 'all', title: 'Alle Aufgaben', data: otherTasks },
    ]
  } else {
    sections = [{ key: 'all', data: tasks }]
  }

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text style={styles.sectionHeader} accessibilityRole="header">
              {section.title}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.taskRow, item.id === selectedId && styles.taskSelected]}
            onPress={() => {
              onSelect(item.id)
              onSearchChange('')
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: item.id === selectedId }}
            accessibilityLabel={item.description}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text>
              {item.id === selectedId ? '◉' : '○'} {item.description}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          filterQuery ? (
            <Text style={styles.emptyHint}>
              Keine Treffer für „{searchText.trim()}“ — Speichern legt sie als neue Aufgabe an.
            </Text>
          ) : null
        }
      />
      <TextInput
        style={styles.input}
        placeholder="Suchen oder neue Aufgabe eingeben"
        value={searchText}
        onChangeText={(t) => {
          onSearchChange(t)
          onSelect(null)
        }}
        accessibilityLabel="Aufgabe suchen oder neue Aufgabe eingeben"
      />
    </>
  )
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: fontSize.captionLarge,
    fontWeight: fontWeight.semibold,
    color: colors.textPlaceholder,
    textTransform: 'uppercase',
    marginTop: space.md,
    marginBottom: space.xs,
  },
  taskRow: {
    padding: space.lg,
    borderRadius: radius.md,
    marginBottom: space.sm,
    backgroundColor: colors.background,
    minHeight: 44,
    justifyContent: 'center',
  },
  taskSelected: { backgroundColor: colors.primarySelected },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.sm,
    minHeight: 44,
  },
  emptyHint: { padding: space.lg, color: colors.textSecondary, fontStyle: 'italic' },
})
