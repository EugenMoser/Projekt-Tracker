import React from 'react'
import { View, FlatList, Text, Pressable, StyleSheet } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { listCustomers } from '../../src/repositories/customers'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

export default function CustomersScreen() {
  const [customers, setCustomers] = React.useState(listCustomers(OWNER_ID))
  useFocusEffect(React.useCallback(() => { setCustomers(listCustomers(OWNER_ID)) }, []))

  return (
    <View style={styles.container}>
      <FlatList
        data={customers}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.number}>{item.customerNumber}</Text>
            </View>
          </View>
        )}
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
  row: { padding: 14, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '600' },
  number: { fontSize: 12, color: '#666' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4A90D9',
    alignItems: 'center', justifyContent: 'center',
  },
  fabText: { color: '#FFF', fontSize: 28, lineHeight: 32 },
})
