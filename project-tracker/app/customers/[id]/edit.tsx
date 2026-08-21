import React from 'react'

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { KeyboardAwareScrollView } from '../../../src/components/KeyboardAwareView'
import { getCustomer, updateCustomer } from '../../../src/repositories/customers'
import { listOrderTypes } from '../../../src/repositories/orderTypes'
import { colors, fontSize, fontWeight, radius, space } from '../../../src/theme'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

type OrderType = { id: string; name: string; digit: number }

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const customer = getCustomer(OWNER_ID, id)

  const [name, setName] = React.useState(customer?.name ?? '')
  const [street, setStreet] = React.useState(customer?.street ?? '')
  const [zip, setZip] = React.useState(customer?.zip ?? '')
  const [city, setCity] = React.useState(customer?.city ?? '')
  const [orderTypes, setOrderTypes] = React.useState<OrderType[]>([])
  const [selectedOrderTypeId, setSelectedOrderTypeId] = React.useState<string | null>(
    customer?.orderTypeId ?? null,
  )

  useFocusEffect(
    React.useCallback(() => {
      setOrderTypes(listOrderTypes(OWNER_ID))
    }, []),
  )

  if (!customer)
    return (
      <View style={styles.container}>
        <Text>Nicht gefunden</Text>
      </View>
    )

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
      updateCustomer(OWNER_ID, id, {
        name: name.trim(),
        orderTypeId: selectedOrderType.id,
        street: street.trim() || undefined,
        zip: zip.trim() || undefined,
        city: city.trim() || undefined,
      })
      router.back()
    } catch {
      Alert.alert('Fehler', 'Kunde konnte nicht gespeichert werden.')
    }
  }

  return (
    <KeyboardAwareScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <Text style={styles.label}>
        Name <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={styles.input}
        placeholder="z.B. Müller GmbH"
        placeholderTextColor={colors.textPlaceholder}
        value={name}
        onChangeText={setName}
        accessibilityLabel="Kundenname"
        returnKeyType="next"
      />

      <Text style={styles.label}>
        Auftragsart <Text style={styles.required}>*</Text>
      </Text>
      {orderTypes.length === 0 ? (
        <View style={styles.emptyHint}>
          <Text style={styles.emptyHintText}>Noch keine Auftragsart vorhanden.</Text>
          <Pressable
            style={styles.emptyHintBtn}
            onPress={() => router.push('/order-types')}
            accessibilityRole="button"
            accessibilityLabel="Auftragsart anlegen"
          >
            <Text style={styles.emptyHintBtnText}>Auftragsart anlegen →</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orderTypes}
          keyExtractor={(ot) => ot.id}
          scrollEnabled={false}
          keyboardShouldPersistTaps="handled"
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
        placeholderTextColor={colors.textPlaceholder}
        value={street}
        onChangeText={setStreet}
        accessibilityLabel="Straße"
        returnKeyType="next"
      />
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.zipInput]}
          placeholder="PLZ"
          placeholderTextColor={colors.textPlaceholder}
          value={zip}
          onChangeText={setZip}
          accessibilityLabel="Postleitzahl"
          keyboardType="number-pad"
          returnKeyType="next"
        />
        <TextInput
          style={[styles.input, styles.cityInput]}
          placeholder="Stadt"
          placeholderTextColor={colors.textPlaceholder}
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
        accessibilityLabel="Kunden speichern"
        accessibilityState={{ disabled: !name.trim() || !selectedOrderTypeId }}
      >
        <Text style={styles.saveBtnText}>Speichern</Text>
      </Pressable>

      <Pressable
        style={styles.cancelBtn}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Abbrechen"
      >
        <Text style={styles.cancelBtnText}>Abbrechen</Text>
      </Pressable>
    </KeyboardAwareScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: space.lg, paddingBottom: space.xxxl },
  label: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: space.s6,
    marginTop: space.lg,
  },
  required: { color: colors.danger },
  sectionGap: { marginTop: space.xl },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: fontSize.body,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    marginBottom: space.xs,
  },
  row: { flexDirection: 'row', gap: space.sm },
  zipInput: { width: 100 },
  cityInput: { flex: 1 },
  emptyHint: {
    backgroundColor: colors.warningSurface,
    borderRadius: radius.md,
    padding: space.s14,
    borderWidth: 1,
    borderColor: colors.warningAccent,
  },
  emptyHintText: {
    fontSize: fontSize.bodySmall,
    color: colors.warningText,
    lineHeight: 20,
    marginBottom: space.s10,
  },
  emptyHintBtn: {
    backgroundColor: colors.warningAccent,
    borderRadius: radius.md,
    padding: space.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  emptyHintBtnText: {
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.semibold,
    color: colors.warningText,
  },
  orderTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.s14,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: space.s6,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  orderTypeRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: radius.r10,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  radioCircleSelected: { borderColor: colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radius.r5,
    backgroundColor: colors.primary,
  },
  orderTypeName: { fontSize: fontSize.body, color: colors.textPrimary },
  orderTypeNameSelected: { color: colors.primaryDark, fontWeight: fontWeight.semibold },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: space.xxl,
    minHeight: 52,
  },
  saveBtnDisabled: { backgroundColor: colors.primaryDisabled },
  saveBtnText: {
    color: colors.textInverse,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.bodyLarge,
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: space.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelBtnText: { color: colors.textSecondary, fontSize: fontSize.body },
})
