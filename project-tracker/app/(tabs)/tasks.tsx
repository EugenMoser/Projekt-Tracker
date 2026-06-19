import React from 'react'
import { View, Text, FlatList, Pressable, TextInput, Modal, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useFocusEffect } from 'expo-router'
import {
  listTasks, createTask, updateTask, deleteTask, upsertTag, setTaskTags, getTagsForTask,
} from '../../src/repositories/tasks'

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

  const load = () => {
    const rawTasks = listTasks(OWNER_ID)
    setTasks(rawTasks.map((t) => ({ ...t, tags: getTagsForTask(OWNER_ID, t.id) })))
  }
  useFocusEffect(React.useCallback(() => { load() }, []))

  const handleAddTask = () => {
    if (!newDesc.trim()) return
    try {
      createTask(OWNER_ID, newDesc.trim())
      setNewDesc(''); setShowAdd(false); load()
    } catch {
      Alert.alert('Fehler', 'Aufgabe mit diesem Namen existiert bereits.')
    }
  }

  const handleLongPressTask = (task: Task) => {
    Alert.alert(task.description, undefined, [
      { text: 'Bearbeiten', onPress: () => { setEditingTask(task); setEditDesc(task.description) } },
      {
        text: 'Löschen', style: 'destructive', onPress: () => {
          deleteTask(OWNER_ID, task.id); load()
        }
      },
      { text: 'Abbrechen', style: 'cancel' },
    ])
  }

  const handleSaveEdit = () => {
    if (!editDesc.trim() || !editingTask) return
    try {
      updateTask(OWNER_ID, editingTask.id, editDesc.trim())
      setEditingTask(null); setEditDesc(''); load()
    } catch {
      Alert.alert('Fehler', 'Aufgabe konnte nicht gespeichert werden.')
    }
  }

  const taskBeingTagged = tasks.find((t) => t.id === editingTagsFor)

  const handleAddTag = (taskId: string, currentTagIds: string[]) => {
    if (!newTagText.trim()) return
    const tagId = upsertTag(OWNER_ID, newTagText.trim())
    setTaskTags(OWNER_ID, taskId, [...new Set([...currentTagIds, tagId])])
    setNewTagText(''); load()
  }

  const handleRemoveTag = (taskId: string, tagId: string, currentTagIds: string[]) => {
    setTaskTags(OWNER_ID, taskId, currentTagIds.filter((id) => id !== tagId))
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
          <Pressable style={styles.taskRow} onLongPress={() => handleLongPressTask(item)}>
            <Text style={styles.taskDesc}>{item.description}</Text>
            <View style={styles.tagRow}>
              {item.tags.map((tag) => (
                <Pressable key={tag.id} style={styles.tag}
                  onLongPress={() => { handleRemoveTag(item.id, tag.id, item.tags.map((t) => t.id)) }}>
                  <Text style={styles.tagText}>{tag.title}</Text>
                </Pressable>
              ))}
              <Pressable style={[styles.tag, styles.tagAdd]} onPress={() => setEditingTagsFor(item.id)}>
                <Text style={styles.tagText}>+ Tag</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      />

      {/* Add task modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Neue Aufgabe</Text>
            <TextInput
              style={styles.input}
              placeholder="Bildbearbeitung"
              placeholderTextColor="#999"
              value={newDesc}
              onChangeText={setNewDesc}
              autoFocus
            />
            <Pressable style={styles.saveBtn} onPress={handleAddTask}>
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Anlegen</Text>
            </Pressable>
            <Pressable onPress={() => setShowAdd(false)} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text>Abbrechen</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit task modal */}
      <Modal visible={!!editingTask} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Aufgabe bearbeiten</Text>
            <TextInput
              style={styles.input}
              placeholder="Beschreibung"
              placeholderTextColor="#999"
              value={editDesc}
              onChangeText={setEditDesc}
              autoFocus
            />
            <Pressable style={styles.saveBtn} onPress={handleSaveEdit}>
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Speichern</Text>
            </Pressable>
            <Pressable onPress={() => { setEditingTask(null); setEditDesc('') }} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text>Abbrechen</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Tag edit modal */}
      <Modal visible={!!editingTagsFor} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Stichworte für „{taskBeingTagged?.description}"</Text>
            <View style={styles.tagRow}>
              {taskBeingTagged?.tags.map((tag) => (
                <Pressable key={tag.id} style={styles.tag}
                  onPress={() => { handleRemoveTag(editingTagsFor!, tag.id, taskBeingTagged.tags.map((t) => t.id)) }}>
                  <Text style={styles.tagText}>{tag.title} ✕</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              placeholder="Neues Stichwort"
              placeholderTextColor="#999"
              value={newTagText}
              onChangeText={setNewTagText}
            />
            <Pressable style={[styles.saveBtn, { marginTop: 8 }]}
              onPress={() => handleAddTag(editingTagsFor!, taskBeingTagged?.tags.map((t) => t.id) ?? [])}>
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Stichwort hinzufügen</Text>
            </Pressable>
            <Pressable onPress={() => { setEditingTagsFor(null); setNewTagText('') }} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text>Fertig</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  addBtn: { backgroundColor: '#4A90D9', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: '#FFF', fontWeight: '600' },
  taskRow: { backgroundColor: '#FFF', borderRadius: 8, padding: 14, marginBottom: 8 },
  taskDesc: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#E8F4FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagAdd: { backgroundColor: '#EEE' },
  tagText: { fontSize: 12, color: '#4A90D9' },
  modal: { flex: 1, padding: 24, backgroundColor: '#FFF' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, backgroundColor: '#FFF', color: '#000' },
  saveBtn: { backgroundColor: '#4A90D9', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
})
