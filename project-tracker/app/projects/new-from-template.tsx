import React from 'react'

import { router, useFocusEffect } from 'expo-router'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import { listTemplates } from '../../src/repositories/projectTemplates'
import { colors, fontSize, fontWeight, radius, space } from '../../src/theme'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

type Template = ReturnType<typeof listTemplates>[number]

function pricingSummary(t: Template) {
  return t.pricingMode === 'hourly'
    ? `${((t.hourlyRateCents ?? 0) / 100).toFixed(2).replace('.', ',')} €/h`
    : `Festpreis ${((t.fixedPriceCents ?? 0) / 100).toFixed(2).replace('.', ',')} €`
}

export default function NewFromTemplateScreen() {
  const [templates, setTemplates] = React.useState<Template[]>([])

  useFocusEffect(
    React.useCallback(() => {
      setTemplates(listTemplates(OWNER_ID))
    }, []),
  )

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.blankBtn}
        onPress={() => router.replace('/projects/new')}
        accessibilityRole="button"
        accessibilityLabel="Leeres Projekt anlegen"
      >
        <Text style={styles.blankBtnText}>+ Leeres Projekt</Text>
      </Pressable>

      {templates.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Aus Vorlage</Text>
          <FlatList
            data={templates}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => router.replace(`/projects/new?templateId=${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Projekt aus Vorlage ${item.name} anlegen`}
              >
                <View style={styles.rowText}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.pricing}>{pricingSummary(item)}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            )}
          />
        </>
      )}

      <Pressable
        style={styles.manageLink}
        onPress={() => router.push('/project-templates')}
        accessibilityRole="button"
        accessibilityLabel="Vorlagen verwalten"
      >
        <Text style={styles.manageLinkText}>Vorlagen verwalten →</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.lg },
  blankBtn: {
    backgroundColor: colors.primary,
    padding: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: space.lg,
  },
  blankBtnText: { color: colors.textInverse, fontWeight: fontWeight.semibold },
  sectionHeader: {
    fontSize: fontSize.label,
    color: colors.textSecondary,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: space.sm,
    minHeight: 44,
  },
  rowText: { flex: 1 },
  name: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  pricing: { fontSize: fontSize.captionLarge, color: colors.textSecondary },
  chevron: { fontSize: fontSize.bodyLarge, color: colors.textSecondary },
  manageLink: {
    alignItems: 'center',
    marginTop: space.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  manageLinkText: { color: colors.textSecondary, fontSize: fontSize.body },
})
