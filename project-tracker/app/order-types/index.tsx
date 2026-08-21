import React from 'react'

import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { KeyboardAwareView } from '../../src/components/KeyboardAwareView'
import {
  createOrderType,
  deleteOrderType,
  listOrderTypes,
  updateOrderType,
} from '../../src/repositories/orderTypes'
import { colors, fontSize, fontWeight, radius, space } from '../../src/theme'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'
type OrderType = { id: string; name: string; digit: number }

export default function OrderTypesScreen() {
  const [items, setItems] = React.useState<OrderType[]>([])
  const [showAdd, setShowAdd] = React.useState(false)
  const [editItem, setEditItem] = React.useState<OrderType | null>(null)
  const [name, setName] = React.useState('')
  const [digit, setDigit] = React.useState('')

  const load = () => setItems(listOrderTypes(OWNER_ID))
  useFocusEffect(
    React.useCallback(() => {
      load()
    }, []),
  )

  const openAdd = () => {
    setName('')
    setDigit('')
    setShowAdd(true)
  }

  const openEdit = (item: OrderType) => {
    setEditItem(item)
    setName(item.name)
    setDigit(String(item.digit))
  }

  const closeModal = () => {
    setShowAdd(false)
    setEditItem(null)
    setName('')
    setDigit('')
  }

  const handleAdd = () => {
    const d = parseInt(digit, 10)
    if (!name.trim() || isNaN(d) || d < 1 || d > 9) {
      Alert.alert('Ungültige Eingabe', 'Name und Ziffer (1–9) sind Pflicht.')
      return
    }
    try {
      createOrderType(OWNER_ID, { name: name.trim(), digit: d })
      closeModal()
      load()
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
      closeModal()
      load()
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
            onLongPress={() =>
              Alert.alert('Löschen?', item.name, [
                { text: 'Abbrechen', style: 'cancel' },
                {
                  text: 'Löschen',
                  style: 'destructive',
                  onPress: () => {
                    deleteOrderType(OWNER_ID, item.id)
                    load()
                  },
                },
              ])
            }
          >
            <Text style={styles.digit}>{item.digit}</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </Pressable>
        )}
      />

      <Modal
        visible={showAdd || editItem !== null}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <KeyboardAwareView insideModal>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editItem ? 'Auftragsart bearbeiten' : 'Neue Auftragsart'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Name (z.B. Hochzeitsfotografie)"
              placeholderTextColor={colors.textPlaceholder}
              value={name}
              onChangeText={setName}
              accessibilityLabel="Name der Auftragsart"
            />
            <TextInput
              style={styles.input}
              placeholder="Ziffer 1–9"
              placeholderTextColor={colors.textPlaceholder}
              value={digit}
              onChangeText={setDigit}
              keyboardType="numeric"
              accessibilityLabel="Ziffer der Auftragsart"
            />
            <Pressable style={styles.saveBtn} onPress={editItem ? handleEdit : handleAdd}>
              <Text style={{ color: colors.textOnPrimary, fontWeight: fontWeight.semibold }}>
                Speichern
              </Text>
            </Pressable>
            <Pressable
              onPress={closeModal}
              style={{
                marginTop: space.md,
                alignItems: 'center',
                minHeight: 44,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.textSecondary }}>Abbrechen</Text>
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
  addBtnText: { color: colors.textOnPrimary, fontWeight: fontWeight.semibold },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.s14,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: space.sm,
  },
  digit: {
    width: 32,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.bodyLarge,
    color: colors.primary,
  },
  name: { flex: 1, fontSize: fontSize.body },
  modal: { flex: 1, padding: space.xl, backgroundColor: colors.surface },
  modalTitle: {
    fontSize: fontSize.titleLarge,
    fontWeight: fontWeight.bold,
    marginBottom: space.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: space.s14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
})
