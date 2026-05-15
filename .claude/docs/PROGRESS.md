# PROGRESS

Cross-Session-Fortschrittslog. Bei jedem Commit ergänzen — eine zukünftige Claude-Session muss hier alles finden, was sie zum Anknüpfen braucht.

Format pro Eintrag:
```
## YYYY-MM-DD — Kurztitel
**Erledigt**: was wurde geliefert
**Nächste Schritte**: was kommt als nächstes (Verweis auf TODO.md-Items)
**Offene Punkte**: Blocker / Klärungsbedarf
```

---

## 2026-05-10 — Konzept- & Doc-Setup (Phase 0 angefangen)

**Erledigt**:
- `mvp-brainstorming.md` mit fachlichen Anforderungen befüllt (User)
- Konzept-Doku komplett angelegt unter `.claude/docs/`:
  - `WORKFLOW.md` (verbindlicher Feature-Loop, DoD-Template, Commit-Format)
  - `CONCEPT.md` (Domain-Glossar, User Stories, UI-Wireframes, Kundennummern-Algorithmus, 7 Open Questions)
  - `ARCHITECTURE.md` (Schichten, Sync-Strategie LWW, Multi-Tenant-Pattern, API-Versionierung)
  - `DATA_MODEL.md` (alle Tabellen mit `user_id`-Scoping, Constraints, Indizes)
  - `ROADMAP.md` (Phasen 0–8 mit Akzeptanzkriterien)
  - `TODO.md` (Backlog gruppiert nach Phasen)
  - `DECISIONS.md` (initiale ADRs: Drizzle, Hono, Coolify, Multi-Tenant-ready, LWW)
  - `SECURITY.md` (Threat-Model, PIN/Biometrie, Tenant-Isolation, Secrets-Handling)
  - `DEPLOYMENT.md` (Coolify-Setup-Skizze, Env-Variablen, Backup-Strategie)
  - `SAAS_READINESS.md` (Checkliste für späteren App-Store-Launch)
- Subagent-Definitionen unter `.claude/agents/`: architect, coder, security, db, mobile-ux, reviewer
- Wurzel-`CLAUDE.md` erweitert um Verweise auf `.claude/docs/` und WORKFLOW.md
- `.gitignore` im Mobile-Projekt um `com.facebook.react.devsupport.BundleDownloader` ergänzt

**Nächste Schritte**:
1. Open Questions 1–7 aus `CONCEPT.md` mit User durchgehen → Antworten in `DECISIONS.md` fixieren
2. Workspace-Struktur einrichten (`packages/schema`, `packages/server`)
3. Drizzle in `packages/schema` mit SQLite-Variante initialisieren (Phase-1-Start)

**Offene Punkte**:
- Hostinger/Coolify-Zugriff: muss vor Phase 5 verifiziert werden
- Apple Developer + Google Play Account für Phase 6+ — kein MVP-Blocker

---

## 2026-05-10 — Open Questions geklärt, Phase 0 abgeschlossen

**Erledigt**:
- Alle 7 Open Questions mit User durchgegangen → ADR-008 bis ADR-014 in `DECISIONS.md` festgehalten:
  - ADR-008 Tarif-Snapshot pro Zeiteintrag (accepted)
  - ADR-009 Nur ein Timer global aktiv
  - ADR-010 Kundennummer 5-stellig MVP, Schema bruchfrei auf 6-stellig erweiterbar
  - ADR-011 Globale Aufgabenliste pro User, m:n zu Projekten
  - ADR-012 Aufgabe optional beim Anlegen, Pflicht beim ersten Stop
  - ADR-013 Festpreis-Export: Festpreis + Zeit-Info-Spalte (ohne Geld)
  - ADR-014 Manuelle Zeit-Korrektur im MVP (Edit + Soft-Delete für time_entries)
- `CONCEPT.md` Sektion „Open Questions" → „Geklärte Entscheidungen" umgeschrieben
- `TODO.md` Phase-1-Tasks präzisiert (ADR-Verweise statt offener Fragen)

**Nächste Schritte (Phase 1 Start in neuer Session)**:
1. Workspace-Struktur einrichten (`packages/schema`, `packages/server`, npm/pnpm-Workspaces)
2. Drizzle + drizzle-kit in `packages/schema`
3. SQLite-Schema laut DATA_MODEL.md in `packages/schema/sqlite.ts`
4. Erste Migration generieren + im App-Boot ausführen

**Offene Punkte**: keine Blocker für Phase 1.

---

## 2026-05-10 — Phase 1A-T1: Root workspace setup abgeschlossen

**Erledigt**:
- `pnpm-workspace.yaml` mit `packages/*` und `project-tracker` konfiguriert
- Root `package.json` erstellt mit `lint` und `typecheck` Scripts
- `pnpm install` erfolgreich durchgeführt — Workspace wird korrekt erkannt
- Alle Workspace-Filter funktionieren (`pnpm --filter=project-tracker lint`)
- Commit erstellt: `chore(workspace): add pnpm monorepo workspace root`

**Nächste Schritte**:
1. Task 1A-T2: `packages/schema` und `packages/server` Verzeichnisse anlegen
2. Task 1A-T3: Drizzle + drizzle-kit in `packages/schema` initialisieren

**Offene Punkte**: keine.

---

## 2026-05-10 — Phase 1A-T2: `packages/schema` scaffold abgeschlossen

**Erledigt**:
- `packages/schema/package.json` mit Drizzle, TypeScript, Vitest als Dependencies erstellt
- `packages/schema/tsconfig.json` mit ES2020 target, strict mode, declaration=true
- `packages/schema/src/index.ts` mit Exports aus `./sqlite` und `./migrations` (Stub-Exporte, Dateien folgen in T3/T4)
- `pnpm install` erfolgreich — Package wird im Workspace erkannt (`@projekt-tracker/schema@0.0.1`)
- Workspace-Verzeichnis komplett verfügbar für Phase 1 Schema-Entwicklung

**Nächste Schritte**:
1. Task 1A-T3: Drizzle + drizzle-kit installieren, `sqlite.ts` mit SQLite-Schema laut DATA_MODEL.md
2. Task 1A-T4: Initial-Migration generieren

**Offene Punkte**: keine Blocker.

---

## 2026-05-10 — Phase 1 gestartet, Plans + T1+T2 abgeschlossen (Session-Break)

**Erledigt**:
- Phase 1A + 1B Implementierungspläne erstellt unter `.claude/docs/plans/`
- Branch `feat/phase1` angelegt
- 1A-T1 ✅ Root workspace setup (pnpm-workspace.yaml, root package.json, pnpm install)
- 1A-T2 ✅ `packages/schema` scaffold (package.json, tsconfig.json, src/index.ts, deps installiert)
- Beide Tasks spec-reviewed + code-quality-reviewed und approved

**Nächste Schritte (nächste Session)**:
- 1A-T3: SQLite-Schema in `packages/schema/src/sqlite.ts` (alle 11 Tabellen)
- 1A-T4: Migration SQL in `packages/schema/src/migrations.ts`
- 1A-T5: Schema Roundtrip-Tests (vitest + better-sqlite3)
- 1A-T6–T9: Expo DB Client, Migrations-Runner, Customer Number + Tariff Snapshot Helpers
- Danach: Phase 1B (Mobile UI, 12 Tasks)

**So weitermachen**:
Lies PROGRESS.md + `.claude/docs/plans/`. Branch: `feat/phase1`. Commits: bfa11da (T1) + 725bfce (T2) + 7ab12c2 (Plans). Weiter mit 1A-T3 per Subagent-Driven Development.

**Offene Punkte**: keine Blocker.

---

## 2026-05-11 — Phase 1A-T6: Expo DB client + migration runner

**Erledigt**:
- `project-tracker/package.json` erweitert um: `@projekt-tracker/schema` (workspace:*), `drizzle-orm`, `expo-sqlite`, `uuidv7`, `better-sqlite3`, `@types/better-sqlite3`, `jest-expo`
- `test` script + Jest-Konfiguration (preset: jest-expo, moduleNameMapper fuer Schema-Paket) hinzugefuegt
- `project-tracker/src/db/client.ts` erstellt: oeffnet SQLite via `expo-sqlite`, baut Drizzle-Client mit vollem Schema
- `project-tracker/src/db/migrate.ts` erstellt: versionsbasierter Migration-Runner via `_meta`-Tabelle
- `pnpm install` erfolgreich, `@projekt-tracker/schema` korrekt als Symlink vorhanden
- `tsc --noEmit` zeigt keine Fehler in `src/` (app-example-Boilerplate-Fehler sind vorher schon vorhanden)
- `npm test` besteht mit --passWithNoTests

**Nächste Schritte**:
- 1A-T7: App-Boot-Integration (runMigrations + PRAGMA foreign_keys beim App-Start verdrahten)
- 1A-T5/T8: Schema-Roundtrip-Tests (vitest + better-sqlite3 in packages/schema)
- 1A-T9: Customer-Number-Helper + Tariff-Snapshot-Helper

**Offene Punkte**: keine Blocker.

---

## 2026-05-11 — Phase 1A-T7: App-Boot-Integration (_layout.tsx)

**Erledigt**:
- `project-tracker/app/_layout.tsx` erweitert: ruft `sqlite.execSync('PRAGMA foreign_keys = ON')` auf, dann `runMigrations(sqlite)` vor dem ersten Render
- `isDbReady`-State blockiert Render bis DB bereit (verhindert Race Conditions bei DB-Zugriff aus Screen-Komponenten)
- PRAGMA foreign_keys ON wird per Connection gesetzt (nicht nur im Migration-SQL, da SQLite das connection-level braucht)
- `tsc --noEmit` ohne Fehler in `app/_layout.tsx` bestaetigt

**Nächste Schritte**:
- 1A-T5/T8: Schema-Roundtrip-Tests (vitest + better-sqlite3 in packages/schema)
- 1A-T9: Customer-Number-Helper + Tariff-Snapshot-Helper
- Phase 1B: Mobile UI-Screens (Projekt-Liste, Timer-Banner, Stop-Modal etc.)

**Offene Punkte**: keine Blocker.

---

## 2026-05-11 — Phase 1A-T8: Customer Number Generator

**Erledigt**:
- `project-tracker/src/repositories/customerNumber.ts`: `generateCustomerNumber(db, { userId, orderTypeDigit, year })` — zählt bestehende Kunden mit `LIKE YY+A%` Prefix (inkl. soft-deleted, damit Nummern nie recycelt werden), gibt `YY+A+LL` zurück (LL 2-stellig bis 99, dann 3-stellig; ADR-010)
- `project-tracker/src/__tests__/customerNumber.test.ts`: 6 TDD-Tests (first/second customer, anderer Digit, anderes Jahr, 99./100. Kunde) — alle 6 bestanden
- Testdatenbank: echter In-Memory-SQLite via better-sqlite3, kein Mocking

**Nächste Schritte**:
- 1A-T9: Tariff-Snapshot-Helper + Tests (`tariffSnapshot.ts` + `tariffSnapshot.test.ts`)
- Dann Phase 1B: Mobile UI-Screens

**Offene Punkte**: keine Blocker.

---

## 2026-05-11 — Phase 1A-T9: Tariff Snapshot Helper (letzter 1A-Task)

**Erledigt**:
- `project-tracker/src/repositories/tariffSnapshot.ts`: `buildTimeEntrySnapshot(db, { projectId, userId })` — liest `pricingMode` + `hourlyRateCents` vom Projekt (inkl. userId-Filter für Tenant-Isolation), gibt `TariffSnapshot` zurück (ADR-008); für `fixed`-Projekte ist `rateSnapshotCents: null`
- `project-tracker/src/__tests__/tariffSnapshot.test.ts`: 4 TDD-Tests (hourly-Snapshot, fixed-Snapshot mit null-Rate, Not-Found, Wrong-User) — alle 4 bestanden
- Alle Tests gesamt: 10 jest (project-tracker) + 7 vitest (packages/schema) — alle grün
- `tsc --noEmit`: keine neuen Fehler (nur pre-existing Boilerplate-Fehler)
- Phase 1A damit **vollständig abgeschlossen** ✅

**Nächste Schritte**:
- Phase 1B: Mobile UI-Screens (12 Tasks laut `.claude/docs/plans/2026-05-10-phase1b-mobile-ui.md`)

**Offene Punkte**: keine Blocker. Phase 1A fertig.

---

## 2026-05-11 — Phase 1B-T1: Navigation Shell (Tabs + Stack Routes)

**Erledigt**:
- `@shopify/flash-list@^2.0.2` (expo install, SDK-54-kompatibel) + `zustand@^5.0.3` in `project-tracker/package.json` hinzugefuegt; `pnpm install` + `expo install` erfolgreich
- `project-tracker/src/utils/uuid.ts`: `newId()` via uuidv7 exportiert
- `project-tracker/src/utils/time.ts`: `formatDuration(totalSeconds)` (HH:MM:SS) + `durationSeconds(startedAt, endedAt)` exportiert
- `project-tracker/app/_layout.tsx` neu geschrieben: `GestureHandlerRootView` als Root-Wrapper, alle Stack-Routes (tabs, projects, customers, order-types, time-entries) deklariert, PRAGMA foreign_keys entfernt (nur noch async runMigrations)
- `project-tracker/app/(tabs)/_layout.tsx`: Tab-Bar mit 3 Tabs (Projekte, Aufgaben, Einstellungen) + Ionicons
- `project-tracker/app/(tabs)/index.tsx`, `tasks.tsx`, `settings.tsx`: Platzhalter-Screens
- `project-tracker/app/index.tsx` (Root) entfernt — Konflikt mit `(tabs)/index.tsx`
- `tsc --noEmit`: keine neuen Fehler in den erstellten/geaenderten Dateien (nur pre-existing Boilerplate-Fehler)

**Nächste Schritte**:
- Phase 1B-T2: Auftragsarten-CRUD-Screen
- Phase 1B-T3: Kunden-Anlegen-Form + Kundennummer-Anzeige
- Phase 1B-T4: Kunden-Liste-Screen

**Offene Punkte**: keine Blocker.

---

## 2026-05-11 — Phase 1B-T4: Shared UI Components (ColorPicker, TimerBanner, ProjectTile)

**Erledigt**:
- `project-tracker/src/components/ColorPicker.tsx`: 6 Preset-Farben, Tap-to-Select, selected-State mit Border-Ring, a11y-Labels (accessibilityRole="radio", accessibilityState.selected), Touch-Targets 44x44 pt
- `project-tracker/src/components/TimerBanner.tsx`: zeigt projectTitle + Live-HH:MM:SS Counter (setInterval 1s), liest `startedAt` aus `useTimerStore`, Pressable mit a11y-Label inklusive formatierter Zeit, minHeight 44
- `project-tracker/src/components/ProjectTile.tsx`: farbige Kachel mit `backgroundColor: color`, Tap-to-Press mit `expo-haptics` (ImpactFeedbackStyle.Medium), LongPress-Handler, zeigt Titel + Kundenname + Aktiv-Icon (▶/⏸), a11y-State
- `tsc --noEmit`: keine Fehler in `src/components/` (nur pre-existing Boilerplate-Fehler in `app-example/`)
- Alle 3 Dateien gestaged (`git add project-tracker/src/components/`)

**Nächste Schritte**:
- Phase 1B-T5: Projekt-Anlegen-Form (nutzt ColorPicker + ProjectTile)
- Phase 1B-T6: Projekt-Liste-Screen mit FlashList + TimerBanner
- Phase 1B-T7: Stop-Modal (Aufgabe wählen, Pflicht-Validation)

**Offene Punkte**: keine Blocker.

---

## 2026-05-11 — Phase 1B-T2: Repository-Layer fuer alle Domain-Entitaeten

**Erledigt**:
- `project-tracker/src/repositories/orderTypes.ts`: `listOrderTypes`, `createOrderType`, `deleteOrderType` (Soft-Delete)
- `project-tracker/src/repositories/customers.ts`: `listCustomers`, `createCustomer` (mit Kundennummer-Generierung), `updateCustomer`
- `project-tracker/src/repositories/projects.ts`: `listActiveProjects`, `getProject`, `createProject` (inkl. projectTasks-Verknuepfung), `updateProject`, `archiveProject`, `getProjectTotalSeconds`
- `project-tracker/src/repositories/tasks.ts`: `listTasks`, `listTasksForProject` (via JOIN), `createTask`, `listTags`, `upsertTag`, `setTaskTags`, `getTagsForTask`
- `project-tracker/src/repositories/timers.ts`: `getActiveTimer`, `startTimer`, `stopTimer` (erstellt TimeEntry mit Tariff-Snapshot, loescht Timer)
- `project-tracker/src/repositories/timeEntries.ts`: `listTimeEntriesForProject`, `updateTimeEntry` (berechnet durationSeconds), `softDeleteTimeEntry`
- Alle 6 Dateien: userId-Filter auf jeder Query (Tenant-Isolation), Geld als Integer-Cent, kein direktes db.select() ausserhalb dieser Layer
- `tsc --noEmit`: keine Fehler in den neuen Dateien
- `npm test`: 10/10 Tests bestanden (bestehende Tests unveraendert)

**Nächste Schritte**:
- Phase 1B-T3: Auftragsarten-CRUD-Screen (nutzt `orderTypes`-Repository)
- Phase 1B-T4: Kunden-Anlegen-Form + Kundennummer-Anzeige (nutzt `customers`-Repository)
- Phase 1B-T5: Projekt-Anlegen-Form (nutzt `projects`-, `customers`-, `tasks`-Repository)

**Offene Punkte**: keine Blocker.

---

## 2026-05-11 — Phase 1B-T7: OrderTypes-Screen + Settings-Navigation

**Erledigt**:
- `project-tracker/app/order-types/index.tsx`: Auftragsart-Liste-Screen mit FlatList, digit+name pro Zeile, LongPress-to-delete (Alert-Confirm), inline-Modal zum Anlegen (Name + Ziffer 1–9, Validierung), useFocusEffect (expo-router) fuer automatisches Nachladen
- `project-tracker/app/(tabs)/settings.tsx`: Placeholder durch funktionale Settings-Liste ersetzt — zwei navigierbare Zeilen (Auftragsarten → /order-types, Kunden → /customers), chevron-Style
- `project-tracker/app/customers/index.tsx`: Placeholder-Screen angelegt damit `/customers`-Route TypeScript-valide ist (TS2345 behoben)
- `tsc --noEmit`: keine Fehler in settings.tsx, order-types/index.tsx, customers/index.tsx

**Nächste Schritte**:
- Phase 1B-T8: Kunden-Anlegen-Form + Kundennummer-Anzeige (ersetzt customers/index.tsx-Placeholder)
- Phase 1B-T5: Projekt-Anlegen-Form

**Offene Punkte**: keine Blocker.
