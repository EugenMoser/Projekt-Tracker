import React from 'react'

import { router, useFocusEffect } from 'expo-router'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import { DotsButton, RowActionMenu, type RowAction } from '../../src/components/RowActionMenu'
import { deleteCustomer, listCustomers } from '../../src/repositories/customers'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

type Customer = ReturnType<typeof listCustomers>[number]

export default function CustomersScreen() {
  const [customers, setCustomers] = React.useState(listCustomers(OWNER_ID))
  const [menuCustomer, setMenuCustomer] = React.useState<Customer | null>(null)

  const load = () => setCustomers(listCustomers(OWNER_ID))
  useFocusEffect(
    React.useCallback(() => {
      load()
    }, []),
  )

  const handleDelete = (customer: Customer) => {
    setMenuCustomer(null)
    Alert.alert('Kunde löschen?', `„${customer.name}" wird unwiderruflich gelöscht.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          deleteCustomer(OWNER_ID, customer.id)
          load()
        },
      },
    ])
  }

  const menuActions: RowAction[] = menuCustomer
    ? [
        {
          label: 'Bearbeiten',
          onPress: () => {
            const customer = menuCustomer
            setMenuCustomer(null)
            router.push(`/customers/${customer.id}/edit`)
          },
        },
        {
          label: 'Löschen',
          destructive: true,
          onPress: () => handleDelete(menuCustomer),
        },
      ]
    : []

  return (
    <View style={styles.container}>
      <FlatList
        data={customers}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.number}>{item.customerNumber}</Text>
            </View>
            <DotsButton
              onPress={() => setMenuCustomer(item)}
              accessibilityLabel={`Aktionen für ${item.name}`}
            />
          </View>
        )}
      />
      <RowActionMenu
        visible={menuCustomer !== null}
        title={menuCustomer?.name}
        actions={menuActions}
        onClose={() => setMenuCustomer(null)}
      />
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/customers/new')}
        accessibilityLabel="Neuen Kunden anlegen"
        accessibilityRole="button"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  rowText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  number: { fontSize: 12, color: '#666' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: '#FFF', fontSize: 28, lineHeight: 32 },
})
