import React from "react";

import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  archiveProject,
  getProject,
  getProjectTotalSeconds,
} from "../../src/repositories/projects";
import {
  listTimeEntriesForProject,
  softDeleteTimeEntry,
} from "../../src/repositories/timeEntries";
import { formatDuration } from "../../src/utils/time";

const OWNER_ID = "00000000-0000-0000-0000-000000000001";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = React.useState(getProject(OWNER_ID, id));
  const [entries, setEntries] = React.useState(
    listTimeEntriesForProject(OWNER_ID, id),
  );
  const [totalSeconds, setTotalSeconds] = React.useState(
    getProjectTotalSeconds(OWNER_ID, id),
  );

  const load = () => {
    setProject(getProject(OWNER_ID, id));
    setEntries(listTimeEntriesForProject(OWNER_ID, id));
    setTotalSeconds(getProjectTotalSeconds(OWNER_ID, id));
  };
  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [id]),
  );

  if (!project)
    return (
      <View style={styles.c}>
        <Text>Nicht gefunden</Text>
      </View>
    );

  const totalCents =
    project.pricingMode === "hourly"
      ? Math.round((totalSeconds / 3600) * (project.hourlyRateCents ?? 0))
      : null;

  const relativeRate =
    project.pricingMode === "fixed" && totalSeconds > 0
      ? Math.round((project.fixedPriceCents ?? 0) / (totalSeconds / 3600))
      : null;

  const handleArchive = () => {
    Alert.alert(
      "Archivieren?",
      "Das Projekt verschwindet aus der Kachelansicht.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Archivieren",
          onPress: () => {
            archiveProject(OWNER_ID, id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.c}>
      <View style={[styles.header, { borderLeftColor: project.color }]}>
        <Text style={styles.title}>{project.title}</Text>
        <Text style={styles.meta}>
          {project.pricingMode === "hourly"
            ? `${((project.hourlyRateCents ?? 0) / 100).toFixed(2)} €/h`
            : `Festpreis ${((project.fixedPriceCents ?? 0) / 100).toFixed(2)} €`}
        </Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>
            {formatDuration(totalSeconds)}
          </Text>
          <Text style={styles.statLabel}>Gesamtzeit</Text>
        </View>
        {totalCents !== null && (
          <View style={styles.stat}>
            <Text style={styles.statVal}>
              {(totalCents / 100).toFixed(2)} €
            </Text>
            <Text style={styles.statLabel}>Gesamtbetrag</Text>
          </View>
        )}
        {relativeRate !== null && (
          <View style={styles.stat}>
            <Text style={styles.statVal}>
              {(relativeRate / 100).toFixed(2)} €/h
            </Text>
            <Text style={styles.statLabel}>Relativer Stundensatz</Text>
          </View>
        )}
        {project.pricingMode === "fixed" && totalSeconds === 0 && (
          <View style={styles.stat}>
            <Text style={styles.statVal}>—</Text>
            <Text style={styles.statLabel}>Relativer Stundensatz</Text>
          </View>
        )}
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.entry}
            onLongPress={() =>
              Alert.alert("Zeiteintrag", "", [
                {
                  text: "Bearbeiten",
                  onPress: () =>
                    router.push(`/time-entries/${item.id}/edit`),
                },
                {
                  text: "Löschen",
                  style: "destructive",
                  onPress: () => {
                    softDeleteTimeEntry(OWNER_ID, item.id);
                    load();
                  },
                },
                { text: "Abbrechen", style: "cancel" },
              ])
            }
          >
            <Text style={styles.entryDuration}>
              {formatDuration(item.durationSeconds)}
            </Text>
            <Text style={styles.entryDate}>
              {new Date(item.startedAt).toLocaleDateString("de-DE")}
            </Text>
          </Pressable>
        )}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
      />

      <Pressable
        style={styles.archiveBtn}
        onPress={handleArchive}
      >
        <Text style={styles.archiveBtnText}>Archivieren</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  header: {
    padding: 16,
    borderLeftWidth: 5,
    margin: 16,
    backgroundColor: "#FFF",
    borderRadius: 8,
  },
  title: { fontSize: 20, fontWeight: "700" },
  meta: { color: "#666", marginTop: 4 },
  stats: { flexDirection: "row", padding: 16, gap: 16 },
  stat: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  statVal: { fontSize: 18, fontWeight: "700", color: "#4A90D9" },
  statLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  entry: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#FFF",
    borderRadius: 8,
    marginBottom: 6,
  },
  entryDuration: { fontWeight: "600" },
  entryDate: { color: "#666" },
  archiveBtn: {
    margin: 16,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E74C3C",
    alignItems: "center",
  },
  archiveBtnText: { color: "#E74C3C", fontWeight: "600" },
});
