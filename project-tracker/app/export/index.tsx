import React, { useState } from 'react'
import {
  View, Text, TextInput, Pressable,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { useFocusEffect } from 'expo-router'
import { listCustomers } from '../../src/repositories/customers'
import { useSyncStore } from '../../src/store/syncStore'
import { apiExportExcel } from '../../src/sync/api'
import { API_BASE_URL, LOCAL_USER_ID } from '../../src/sync/config'

type Customer = { id: string; name: string; customerNumber: string }

function currentYYYYMM(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const YYYYMM = /^\d{4}-\d{2}$/

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export default function ExportScreen() {
  const [from, setFrom] = useState(currentYYYYMM())
  const [to, setTo]     = useState(currentYYYYMM())
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const token = useSyncStore(s => s.token)

  useFocusEffect(
    React.useCallback(() => {
      const all = listCustomers(LOCAL_USER_ID)
      setCustomers(all.map(c => ({ id: c.id, name: c.name, customerNumber: c.customerNumber })))
    }, [])
  )

  async function handleExport() {
    if (!YYYYMM.test(from) || !YYYYMM.test(to)) {
      Alert.alert('Ungültiges Format', 'Format muss YYYY-MM sein (z. B. 2026-05)')
      return
    }
    if (from > to) {
      Alert.alert('Ungültiger Zeitraum', '"Von" darf nicht nach "Bis" liegen')
      return
    }
    if (!token) {
      Alert.alert('Nicht verbunden', 'Bitte warte auf die erste Synchronisierung')
      return
    }

    setLoading(true)
    try {
      const buffer = await apiExportExcel(
        API_BASE_URL,
        token,
        from,
        to,
        selectedCustomerId ?? undefined,
      )

      const filename = `export-${from}-${to}.xlsx`
      const uri = `${FileSystem.cacheDirectory}${filename}`
      await FileSystem.writeAsStringAsync(uri, arrayBufferToBase64(buffer), {
        encoding: FileSystem.EncodingType.Base64,
      })

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Excel-Export teilen',
        })
      } else {
        Alert.alert('Datei bereit', `Gespeichert unter: ${uri}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler'
      Alert.alert('Fehler beim Export', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Von (YYYY-MM)</Text>
      <TextInput
        style={styles.input}
        value={from}
        onChangeText={setFrom}
        placeholder="2026-05"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Von Monat"
      />

      <Text style={styles.label}>Bis (YYYY-MM)</Text>
      <TextInput
        style={styles.input}
        value={to}
        onChangeText={setTo}
        placeholder="2026-05"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Bis Monat"
      />

      <Text style={styles.label}>Kunde (optional)</Text>
      <Pressable
        style={[styles.row, selectedCustomerId === null && styles.rowSelected]}
        onPress={() => setSelectedCustomerId(null)}
        accessibilityRole="radio"
        accessibilityState={{ selected: selectedCustomerId === null }}
        accessibilityLabel="Alle Kunden"
      >
        <Text style={styles.rowText}>Alle Kunden</Text>
        {selectedCustomerId === null && <Text style={styles.check}>✓</Text>}
      </Pressable>

      {customers.map(c => (
        <Pressable
          key={c.id}
          style={[styles.row, selectedCustomerId === c.id && styles.rowSelected]}
          onPress={() => setSelectedCustomerId(c.id)}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedCustomerId === c.id }}
          accessibilityLabel={`${c.customerNumber} ${c.name}`}
        >
          <Text style={styles.rowText}>{c.customerNumber} – {c.name}</Text>
          {selectedCustomerId === c.id && <Text style={styles.check}>✓</Text>}
        </Pressable>
      ))}

      <Pressable
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleExport}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Export erstellen"
      >
        {loading
          ? <ActivityIndicator color="#FFF" />
          : <Text style={styles.btnText}>Export erstellen</Text>}
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F5F5F5' },
  content:     { padding: 16, paddingBottom: 40 },
  label:       { fontSize: 14, fontWeight: '600', color: '#555', marginTop: 16, marginBottom: 4 },
  input:       { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, backgroundColor: '#FFF', fontSize: 16 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 6, minHeight: 44 },
  rowSelected: { borderWidth: 2, borderColor: '#4A90D9' },
  rowText:     { fontSize: 15 },
  check:       { color: '#4A90D9', fontWeight: '700' },
  btn:         { backgroundColor: '#4A90D9', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24, minHeight: 52 },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#FFF', fontSize: 16, fontWeight: '600' },
})
