import React from 'react'
import {
  View, Text, TextInput, FlatList, Pressable,
  StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { listOrderTypes } from '../../src/repositories/orderTypes'
import { createCustomer } from '../../src/repositories/customers'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

type OrderType = { id: string; name: string; digit: number }

export default function NewCustomerScreen() {
  const [name, setName] = React.useState('')
  const [street, setStreet] = React.useState('')
  const [zip, setZip] = React.useState('')
  const [city, setCity] = React.useState('')
  const [orderTypes, setOrderTypes] = React.useState<OrderType[]>([])
  const [selectedOrderTypeId, setSelectedOrderTypeId] = React.useState<string | null>(null)

  useFocusEffect(React.useCallback(() => {
    const types = listOrderTypes(OWNER_ID)
    setOrderTypes(types)
  }, []))

  const selectedOrderType = orderTypes.find((ot) => ot.id === selectedOrderTypeId) ?? null

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Pflichtfeld', 'Bitte einen Namen eingeben.')
      return
    }
    if (!selectedOrderType) {
      Alert.alert('Pflichtfeld', 'Bitte eine Auftragsart auswählen.')
      return
    }
    try {
      createCustomer(OWNER_ID, {
        name: name.trim(),
        orderTypeId: selectedOrderType.id,
        orderTypeDigit: selectedOrderType.digit,
        street: street.trim() || undefined,
        zip: zip.trim() || undefined,
        city: city.trim() || undefined,
      })
      router.back()
    } catch {
      Alert.alert('Fehler', 'Kunde konnte nicht angelegt werden.')
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <Text style={styles.label}>Name <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="z.B. Müller GmbH"
          value={name}
          onChangeText={setName}
          accessibilityLabel="Kundenname"
          returnKeyType="next"
        />

        <Text style={styles.label}>Auftragsart <Text style={styles.required}>*</Text></Text>
        {orderTypes.length === 0 ? (
          <View style={styles.emptyHint}>
            <Text style={styles.emptyHintText}>
              Erst eine Auftragsart anlegen (Einstellungen → Auftragsarten).
            </Text>
          </View>
        ) : (
          <FlatList
            data={orderTypes}
            keyExtractor={(ot) => ot.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const isSelected = item.id === selectedOrderTypeId
              return (
                <Pressable
                  style={[styles.orderTypeRow, isSelected && styles.orderTypeRowSelected]}
                  onPress={() => setSelectedOrderTypeId(item.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`Auftragsart ${item.name}`}
                >
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.orderTypeName, isSelected && styles.orderTypeNameSelected]}>
                    {item.digit} — {item.name}
                  </Text>
                </Pressable>
              )
            }}
          />
        )}

        <Text style={[styles.label, styles.sectionGap]}>Adresse (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Straße und Hausnummer"
          value={street}
          onChangeText={setStreet}
          accessibilityLabel="Straße"
          returnKeyType="next"
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.zipInput]}
            placeholder="PLZ"
            value={zip}
            onChangeText={setZip}
            accessibilityLabel="Postleitzahl"
            keyboardType="number-pad"
            returnKeyType="next"
          />
          <TextInput
            style={[styles.input, styles.cityInput]}
            placeholder="Stadt"
            value={city}
            onChangeText={setCity}
            accessibilityLabel="Stadt"
            returnKeyType="done"
          />
        </View>

        <Pressable
          style={[styles.saveBtn, (!name.trim() || !selectedOrderTypeId) && styles.saveBtnDisabled]}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Kunden anlegen"
          accessibilityState={{ disabled: !name.trim() || !selectedOrderTypeId }}
        >
          <Text style={styles.saveBtnText}>Anlegen</Text>
        </Pressable>

        <Pressable
          style={styles.cancelBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Abbrechen"
        >
          <Text style={styles.cancelBtnText}>Abbrechen</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 16 },
  required: { color: '#D0021B' },
  sectionGap: { marginTop: 24 },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 8,
    padding: 12, fontSize: 15, backgroundColor: '#FFF',
    marginBottom: 4,
  },
  row: { flexDirection: 'row', gap: 8 },
  zipInput: { width: 100 },
  cityInput: { flex: 1 },
  emptyHint: {
    backgroundColor: '#FFF8E7', borderRadius: 8, padding: 14,
    borderWidth: 1, borderColor: '#F0D070',
  },
  emptyHintText: { fontSize: 14, color: '#7A6000', lineHeight: 20 },
  orderTypeRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, backgroundColor: '#FFF',
    borderRadius: 8, marginBottom: 6,
    borderWidth: 1, borderColor: '#E0E0E0',
    minHeight: 44,
  },
  orderTypeRowSelected: {
    borderColor: '#4A90D9', backgroundColor: '#EDF4FD',
  },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#BDBDBD',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleSelected: { borderColor: '#4A90D9' },
  radioDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#4A90D9',
  },
  orderTypeName: { fontSize: 15, color: '#333' },
  orderTypeNameSelected: { color: '#1A5FAD', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#4A90D9', padding: 16,
    borderRadius: 8, alignItems: 'center', marginTop: 32,
    minHeight: 52,
  },
  saveBtnDisabled: { backgroundColor: '#A8C8EE' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', marginTop: 12, minHeight: 44, justifyContent: 'center' },
  cancelBtnText: { color: '#666', fontSize: 15 },
})
