import { View, Pressable, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SyncIndicator } from '../../src/components/SyncIndicator'

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.syncSection}>
        <SyncIndicator />
      </View>
      <Pressable style={styles.row} onPress={() => router.push('/order-types')}>
        <Text style={styles.label}>Auftragsarten</Text>
        <Text>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => router.push('/customers')}>
        <Text style={styles.label}>Kunden</Text>
        <Text>›</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  syncSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 8 },
  label: { fontSize: 16 },
})
