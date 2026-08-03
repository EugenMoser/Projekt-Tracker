import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { View, Text, FlatList, Pressable, TextInput, Modal, StyleSheet, Alert } from 'react-native'
import { listOrderTypes, createOrderType, updateOrderType, deleteOrderType } from '../../src/repositories/orderTypes'
import { useFocusEffect } from 'expo-router'
import { KeyboardAwareView } from '../../src/components/KeyboardAwareView'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'
type OrderType = { id: string; name: string; digit: number }

export default function OrderTypesScreen() {
  const [items, setItems] = React.useState<OrderType[]>([])
  const [showAdd, setShowAdd] = React.useState(false)
  const [editItem, setEditItem] = React.useState<OrderType | null>(null)
  const [name, setName] = React.useState('')
  const [digit, setDigit] = React.useState('')

  const load = () => setItems(listOrderTypes(OWNER_ID))
  useFocusEffect(React.useCallback(() => { load() }, []))

  const openAdd = () => {
    setName(''); setDigit(''); setShowAdd(true)
  }

  const openEdit = (item: OrderType) => {
    setEditItem(item); setName(item.name); setDigit(String(item.digit))
  }

  const closeModal = () => {
    setShowAdd(false); setEditItem(null); setName(''); setDigit('')
  }

  const handleAdd = () => {
    const d = parseInt(digit, 10)
    if (!name.trim() || isNaN(d) || d < 1 || d > 9) {
      Alert.alert('Ungültige Eingabe', 'Name und Ziffer (1–9) sind Pflicht.')
      return
    }
    try {
      createOrderType(OWNER_ID, { name: name.trim(), digit: d })
      closeModal(); load()
    } catch {
      Alert.alert('Fehler', 'Ziffer oder Name bereits vergeben.')
    }
  }

  const handleEdit = () => {
    if (!editItem) return
    const d = parseInt(digit, 10)
    if (!name.trim() || isNaN(d) || d < 1 || d > 9) {
      Alert.alert('Ungültige Eingabe', 'Name und Ziffer (1–9) sind Pflicht.')
      return
    }
    try {
      updateOrderType(OWNER_ID, editItem.id, { name: name.trim(), digit: d })
      closeModal(); load()
    } catch {
      Alert.alert('Fehler', 'Ziffer oder Name bereits vergeben.')
    }
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Auftragsart</Text>
      </Pressable>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => openEdit(item)}
            accessibilityRole="button"
            accessibilityLabel={`Auftragsart ${item.digit} ${item.name} bearbeiten`}
            onLongPress={() => Alert.alert('Löschen?', item.name, [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Löschen', style: 'destructive', onPress: () => { deleteOrderType(OWNER_ID, item.id); load() } },
            ])}
          >
            <Text style={styles.digit}>{item.digit}</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Ionicons name="create-outline" size={20} color="#4A90D9" />
          </Pressable>
        )}
      />

      <Modal visible={showAdd || editItem !== null} animationType="slide" presentationStyle="formSheet">
        <KeyboardAwareView insideModal>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editItem ? 'Auftragsart bearbeiten' : 'Neue Auftragsart'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Name (z.B. Hochzeitsfotografie)"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              accessibilityLabel="Name der Auftragsart"
            />
            <TextInput
              style={styles.input}
              placeholder="Ziffer 1–9"
              placeholderTextColor="#999"
              value={digit}
              onChangeText={setDigit}
              keyboardType="numeric"
              accessibilityLabel="Ziffer der Auftragsart"
            />
            <Pressable style={styles.saveBtn} onPress={editItem ? handleEdit : handleAdd}>
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Speichern</Text>
            </Pressable>
            <Pressable onPress={closeModal} style={{ marginTop: 12, alignItems: 'center', minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: '#666' }}>Abbrechen</Text>
            </Pressable>
          </View>
        </KeyboardAwareView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  addBtn: { backgroundColor: '#4A90D9', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: '#FFF', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 8 },
  digit: { width: 32, fontWeight: '700', fontSize: 16, color: '#4A90D9' },
  name: { flex: 1, fontSize: 15 },
  modal: { flex: 1, padding: 24, backgroundColor: '#FFF' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#FFF', color: '#000' },
  saveBtn: { backgroundColor: '#4A90D9', padding: 14, borderRadius: 8, alignItems: 'center' },
})
