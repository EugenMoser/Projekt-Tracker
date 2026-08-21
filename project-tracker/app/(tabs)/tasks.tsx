import React from 'react'

import { useFocusEffect } from 'expo-router'
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { KeyboardAwareView } from '../../src/components/KeyboardAwareView'
import { DotsButton, RowActionMenu, type RowAction } from '../../src/components/RowActionMenu'
import {
  createTask,
  deleteTask,
  getTagsForTask,
  listTasks,
  setTaskTags,
  updateTask,
  upsertTag,
} from '../../src/repositories/tasks'
import { colors, fontSize, fontWeight, radius, space } from '../../src/theme'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

type Task = { id: string; description: string; tags: { id: string; title: string }[] }

export default function TasksScreen() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [showAdd, setShowAdd] = React.useState(false)
  const [newDesc, setNewDesc] = React.useState('')
  const [editingTask, setEditingTask] = React.useState<Task | null>(null)
  const [editDesc, setEditDesc] = React.useState('')
  const [editingTagsFor, setEditingTagsFor] = React.useState<string | null>(null)
  const [newTagText, setNewTagText] = React.useState('')
  const [menuTask, setMenuTask] = React.useState<Task | null>(null)

  const load = () => {
    const rawTasks = listTasks(OWNER_ID)
    setTasks(rawTasks.map((t) => ({ ...t, tags: getTagsForTask(OWNER_ID, t.id) })))
  }
  useFocusEffect(
    React.useCallback(() => {
      load()
    }, []),
  )

  const handleAddTask = () => {
    if (!newDesc.trim()) return
    try {
      createTask(OWNER_ID, newDesc.trim())
      setNewDesc('')
      setShowAdd(false)
      load()
    } catch {
      Alert.alert('Fehler', 'Aufgabe mit diesem Namen existiert bereits.')
    }
  }

  const handleDeleteTask = (task: Task) => {
    setMenuTask(null)
    Alert.alert('Aufgabe löschen?', `„${task.description}" wird unwiderruflich gelöscht.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          deleteTask(OWNER_ID, task.id)
          load()
        },
      },
    ])
  }

  const menuActions: RowAction[] = menuTask
    ? [
        {
          label: 'Bearbeiten',
          onPress: () => {
            const task = menuTask
            setMenuTask(null)
            setEditingTask(task)
            setEditDesc(task.description)
          },
        },
        {
          label: 'Löschen',
          destructive: true,
          onPress: () => handleDeleteTask(menuTask),
        },
      ]
    : []

  const handleSaveEdit = () => {
    if (!editDesc.trim() || !editingTask) return
    try {
      updateTask(OWNER_ID, editingTask.id, editDesc.trim())
      setEditingTask(null)
      setEditDesc('')
      load()
    } catch {
      Alert.alert('Fehler', 'Aufgabe konnte nicht gespeichert werden.')
    }
  }

  const taskBeingTagged = tasks.find((t) => t.id === editingTagsFor)

  const handleAddTag = (taskId: string, currentTagIds: string[]) => {
    if (!newTagText.trim()) return
    const tagId = upsertTag(OWNER_ID, newTagText.trim())
    setTaskTags(OWNER_ID, taskId, [...new Set([...currentTagIds, tagId])])
    setNewTagText('')
    load()
  }

  const handleRemoveTag = (taskId: string, tagId: string, currentTagIds: string[]) => {
    setTaskTags(
      OWNER_ID,
      taskId,
      currentTagIds.filter((id) => id !== tagId),
    )
    load()
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
        <Text style={styles.addBtnText}>+ Aufgabe</Text>
      </Pressable>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <View style={styles.taskRow}>
            <View style={styles.taskRowContent}>
              <Text style={styles.taskDesc}>{item.description}</Text>
              <View style={styles.tagRow}>
                {item.tags.map((tag) => (
                  <Pressable
                    key={tag.id}
                    style={styles.tag}
                    onLongPress={() => {
                      handleRemoveTag(
                        item.id,
                        tag.id,
                        item.tags.map((t) => t.id),
                      )
                    }}
                  >
                    <Text style={styles.tagText}>{tag.title}</Text>
                  </Pressable>
                ))}
                <Pressable
                  style={[styles.tag, styles.tagAdd]}
                  onPress={() => setEditingTagsFor(item.id)}
                >
                  <Text style={styles.tagText}>+ Tag</Text>
                </Pressable>
              </View>
            </View>
            <DotsButton
              onPress={() => setMenuTask(item)}
              accessibilityLabel={`Aktionen für ${item.description}`}
            />
          </View>
        )}
      />
      <RowActionMenu
        visible={menuTask !== null}
        title={menuTask?.description}
        actions={menuActions}
        onClose={() => setMenuTask(null)}
      />

      {/* Add task modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet">
        <KeyboardAwareView insideModal>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Neue Aufgabe</Text>
            <TextInput
              style={styles.input}
              placeholder="Bildbearbeitung"
              placeholderTextColor={colors.textPlaceholder}
              value={newDesc}
              onChangeText={setNewDesc}
              autoFocus
            />
            <Pressable style={styles.saveBtn} onPress={handleAddTask}>
              <Text style={{ color: colors.textInverse, fontWeight: fontWeight.semibold }}>
                Anlegen
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowAdd(false)}
              style={{ marginTop: space.md, alignItems: 'center' }}
            >
              <Text>Abbrechen</Text>
            </Pressable>
          </View>
        </KeyboardAwareView>
      </Modal>

      {/* Edit task modal */}
      <Modal visible={!!editingTask} animationType="slide" presentationStyle="formSheet">
        <KeyboardAwareView insideModal>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Aufgabe bearbeiten</Text>
            <TextInput
              style={styles.input}
              placeholder="Beschreibung"
              placeholderTextColor={colors.textPlaceholder}
              value={editDesc}
              onChangeText={setEditDesc}
              autoFocus
            />
            <Pressable style={styles.saveBtn} onPress={handleSaveEdit}>
              <Text style={{ color: colors.textInverse, fontWeight: fontWeight.semibold }}>
                Speichern
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setEditingTask(null)
                setEditDesc('')
              }}
              style={{ marginTop: space.md, alignItems: 'center' }}
            >
              <Text>Abbrechen</Text>
            </Pressable>
          </View>
        </KeyboardAwareView>
      </Modal>

      {/* Tag edit modal */}
      <Modal visible={!!editingTagsFor} animationType="slide" presentationStyle="formSheet">
        <KeyboardAwareView insideModal>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Stichworte für „{taskBeingTagged?.description}“</Text>
            <View style={styles.tagRow}>
              {taskBeingTagged?.tags.map((tag) => (
                <Pressable
                  key={tag.id}
                  style={styles.tag}
                  onPress={() => {
                    handleRemoveTag(
                      editingTagsFor!,
                      tag.id,
                      taskBeingTagged.tags.map((t) => t.id),
                    )
                  }}
                >
                  <Text style={styles.tagText}>{tag.title} ✕</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.input, { marginTop: space.md }]}
              placeholder="Neues Stichwort"
              placeholderTextColor={colors.textPlaceholder}
              value={newTagText}
              onChangeText={setNewTagText}
            />
            <Pressable
              style={[styles.saveBtn, { marginTop: space.sm }]}
              onPress={() =>
                handleAddTag(editingTagsFor!, taskBeingTagged?.tags.map((t) => t.id) ?? [])
              }
            >
              <Text style={{ color: colors.textInverse, fontWeight: fontWeight.semibold }}>
                Stichwort hinzufügen
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setEditingTagsFor(null)
                setNewTagText('')
              }}
              style={{ marginTop: space.md, alignItems: 'center' }}
            >
              <Text>Fertig</Text>
            </Pressable>
          </View>
        </KeyboardAwareView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.lg },
  addBtn: {
    backgroundColor: colors.primary,
    padding: space.s14,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: space.lg,
  },
  addBtnText: { color: colors.textInverse, fontWeight: fontWeight.semibold },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.s14,
    marginBottom: space.sm,
  },
  taskRowContent: { flex: 1, marginRight: space.sm },
  taskDesc: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, marginBottom: space.s6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  tag: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: space.s10,
    paddingVertical: space.xs,
    borderRadius: radius.lg,
  },
  tagAdd: { backgroundColor: colors.surfaceMuted },
  tagText: { fontSize: fontSize.captionLarge, color: colors.primary },
  modal: { flex: 1, padding: space.xl, backgroundColor: colors.surface },
  modalTitle: { fontSize: fontSize.title, fontWeight: fontWeight.bold, marginBottom: space.lg },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: space.s14,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: space.sm,
  },
})
