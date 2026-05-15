import React from 'react'
import { View, Text, FlatList, Pressable, TextInput, Modal, StyleSheet, Alert } from 'react-native'
import { listOrderTypes, createOrderType, deleteOrderType } from '../../src/repositories/orderTypes'
import { useFocusEffect } from 'expo-router'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'
type OrderType = { id: string; name: string; digit: number }

export default function OrderTypesScreen() {
  const [items, setItems] = React.useState<OrderType[]>([])
  const [showAdd, setShowAdd] = React.useState(false)
  const [name, setName] = React.useState('')
  const [digit, setDigit] = React.useState('')

  const load = () => setItems(listOrderTypes(OWNER_ID))
  useFocusEffect(React.useCallback(() => { load() }, []))

  const handleAdd = () => {
    const d = parseInt(digit, 10)
    if (!name.trim() || isNaN(d) || d < 1 || d > 9) {
      Alert.alert('Ungültige Eingabe', 'Name und Ziffer (1–9) sind Pflicht.')
      return
    }
    try {
      createOrderType(OWNER_ID, { name: name.trim(), digit: d })
      setName(''); setDigit(''); setShowAdd(false); load()
    } catch {
      Alert.alert('Fehler', 'Ziffer oder Name bereits vergeben.')
    }
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
        <Text style={styles.addBtnText}>+ Auftragsart</Text>
      </Pressable>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onLongPress={() => Alert.alert('Löschen?', item.name, [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Löschen', style: 'destructive', onPress: () => { deleteOrderType(OWNER_ID, item.id); load() } },
            ])}
          >
            <Text style={styles.digit}>{item.digit}</Text>
            <Text style={styles.name}>{item.name}</Text>
          </Pressable>
        )}
      />
      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Neue Auftragsart</Text>
          <TextInput style={styles.input} placeholder="Name (z.B. Hochzeitsfotografie)" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Ziffer 1–9" value={digit} onChangeText={setDigit} keyboardType="numeric" />
          <Pressable style={styles.saveBtn} onPress={handleAdd}>
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Speichern</Text>
          </Pressable>
          <Pressable onPress={() => setShowAdd(false)} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text>Abbrechen</Text>
          </Pressable>
        </View>
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
  modal: { flex: 1, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 12 },
  saveBtn: { backgroundColor: '#4A90D9', padding: 14, borderRadius: 8, alignItems: 'center' },
})
