import React from 'react'

import { router, useFocusEffect } from 'expo-router'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import { DotsButton, RowActionMenu, type RowAction } from '../../src/components/RowActionMenu'
import { deleteTemplate, listTemplates } from '../../src/repositories/projectTemplates'
import { colors, fontSize, fontWeight, radius, space } from '../../src/theme'

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

type Template = ReturnType<typeof listTemplates>[number]

function pricingSummary(t: Template) {
  return t.pricingMode === 'hourly'
    ? `${((t.hourlyRateCents ?? 0) / 100).toFixed(2).replace('.', ',')} €/h`
    : `Festpreis ${((t.fixedPriceCents ?? 0) / 100).toFixed(2).replace('.', ',')} €`
}

export default function ProjectTemplatesScreen() {
  const [templates, setTemplates] = React.useState<Template[]>([])
  const [menuTemplate, setMenuTemplate] = React.useState<Template | null>(null)

  const load = () => setTemplates(listTemplates(OWNER_ID))
  useFocusEffect(
    React.useCallback(() => {
      load()
    }, []),
  )

  const handleDelete = (template: Template) => {
    setMenuTemplate(null)
    Alert.alert('Vorlage löschen?', `„${template.name}" wird unwiderruflich gelöscht.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          deleteTemplate(OWNER_ID, template.id)
          load()
        },
      },
    ])
  }

  const menuActions: RowAction[] = menuTemplate
    ? [
        {
          label: 'Bearbeiten',
          onPress: () => {
            const template = menuTemplate
            setMenuTemplate(null)
            router.push(`/project-templates/${template.id}/edit`)
          },
        },
        {
          label: 'Löschen',
          destructive: true,
          onPress: () => handleDelete(menuTemplate),
        },
      ]
    : []

  return (
    <View style={styles.container}>
      {templates.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Noch keine Vorlage vorhanden.</Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.pricing}>{pricingSummary(item)}</Text>
              </View>
              <DotsButton
                onPress={() => setMenuTemplate(item)}
                accessibilityLabel={`Aktionen für ${item.name}`}
              />
            </View>
          )}
        />
      )}
      <RowActionMenu
        visible={menuTemplate !== null}
        title={menuTemplate?.name}
        actions={menuActions}
        onClose={() => setMenuTemplate(null)}
      />
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/project-templates/new')}
        accessibilityLabel="Neue Vorlage anlegen"
        accessibilityRole="button"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  emptyText: { fontSize: fontSize.bodyLarge, color: colors.textSecondary, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: space.sm,
  },
  rowText: { flex: 1 },
  name: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  pricing: { fontSize: fontSize.captionLarge, color: colors.textSecondary },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: colors.textInverse, fontSize: fontSize.display, lineHeight: 32 },
})
