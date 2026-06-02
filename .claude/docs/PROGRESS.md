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

## Phase 5 — Coolify Deploy (2026-05-21)

**Erledigt**:
- Multi-stage Dockerfile (build: schema → server → `pnpm deploy`; runtime: node:22-alpine, `packageManager: pnpm@10.28.0`, `ENV NODE_ENV=production`)
- Schema package compiled to `dist/` with NodeNext module; exports updated; vitest alias in server; test files excluded from build output
- CORS (`hono/cors`) + `secureHeaders` (prod-only) middleware; `ALLOWED_ORIGINS` env var; middleware integration test added
- `sync/config.ts` uses `EXPO_PUBLIC_API_URL` (EAS-injected at build time)
- `eas.json` with development / preview / production profiles
- Coolify runbook documented in DEPLOYMENT.md (manual steps: Postgres service, env vars, domain, TLS, backup, EAS build)

**Nächste Schritte**:
- Phase 6: Apple Sign-In + App-Store-Listing

**Offene Punkte**: keine Blocker. Phase 5 fertig.

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

---

## 2026-05-11 — Phase 1B-T10: Projekt-Anlegen-Form

**Erledigt**:
- `project-tracker/app/projects/new.tsx`: Vollstaendige Projekt-Anlegen-Form
  - Titel (Pflicht, TextInput)
  - Kunde (Pflicht, tappable Radio-Rows mit Kundennummer + Name, highlighted bei Selektion; `accessibilityRole="radio"`)
  - Beschreibung (optional, multiline TextInput)
  - Farbe (ColorPicker-Komponente)
  - Pricing-Toggle (XOR: Stundensatz / Festpreis als Pressable-Buttons mit `accessibilityRole="radio"`)
  - Stundensatz / Festpreis (decimal TextInput, parseEurosToCents: "80,00" -> 8000)
  - Aufgaben (multi-select Checkboxen, nur wenn Aufgaben vorhanden; `accessibilityRole="checkbox"`)
  - Keine Aufgaben-Pflicht beim Anlegen (ADR-012)
  - Fallback wenn keine Kunden vorhanden: "Erst einen Kunden anlegen (Einstellungen → Kunden)."
  - Alle Touch-Targets >= 44pt (minHeight: 44 auf selectRow und pricingBtn, 52 auf Anlegen-Button)
  - Alle a11y-Labels gesetzt (accessibilityLabel, accessibilityRole, accessibilityState)
  - `tsc --noEmit`: keine Fehler in projects/new.tsx
  - Gestaged: `git add project-tracker/app/projects/new.tsx`

**Nächste Schritte**:
- Phase 1B: Projekt-Liste-Screen auf Startseite (FlashList, farbige Kacheln, TimerBanner)
- Phase 1B: Stop-Modal (Aufgabenpflicht beim Stop)

**Offene Punkte**: keine Blocker.

---

## 2026-05-11 — Phase 1B-T11: Projekt-Detail-Screen

**Erledigt**:
- `project-tracker/app/projects/[id].tsx`: Vollstaendiger Projekt-Detail-Screen
  - Header-Kachel mit project.color als linker Akzentrand, Titel + Pricing-Meta
  - Stats-Leiste: Gesamtzeit (formatDuration), Gesamtbetrag (nur bei hourly-Projekten), Relativer Stundensatz (nur bei fixed + Zeit > 0), Platzhalter "—" bei fixed + Zeit = 0
  - FlatList aller Zeiteintraege (absteigend nach startedAt), LongPress-Alert mit "Bearbeiten" (navigiert zu `/time-entries/${id}/edit`) und "Loeschen" (softDeleteTimeEntry + reload)
  - Archivieren-Button (destructive, Alert-Bestaetigung, router.back() nach Archivierung)
  - useFocusEffect reload bei Screen-Focus (auch nach Rueckkehr vom Edit-Screen)
  - `tsc --noEmit`: keine Fehler in `projects/[id].tsx`
  - Gestaged: `git add project-tracker/app/projects/[id].tsx`

**Nächste Schritte**:
- Phase 1B: Projekt-Liste-Screen auf Startseite (FlashList, farbige Kacheln, TimerBanner)
- Phase 1B: Stop-Modal + Timer-Gesten (Tap-to-Start, Swipe-to-Stop)

**Offene Punkte**: keine Blocker.

---

## 2026-05-11 — Phase 1B-T8: Kunden-Liste + Kunden-Anlegen-Form

**Erledigt**:
- `project-tracker/app/customers/index.tsx`: Echter Kunden-Listen-Screen ersetzt Placeholder — FlatList mit Name + Kundennummer pro Zeile, useFocusEffect fuer automatisches Nachladen, FAB (+) navigiert zu `/customers/new`, a11y-Label auf FAB
- `project-tracker/app/customers/new.tsx`: Kunden-Anlegen-Form mit Name (Pflicht), Auftragsart-Auswahl via tappable FlatList-Rows (highlighted bei Selektion, Radio-Circle), optionale Adressfelder (Strasse, PLZ, Stadt), Validierung Name + orderTypeId, `createCustomer`-Aufruf mit Tariff-Snapshot-Daten, `router.back()` nach Erfolg, Hinweismeldung wenn keine Auftragsarten vorhanden ("Einstellungen → Auftragsarten"), KeyboardAvoidingView + ScrollView, Dark-Mode-ready
- Kein `@react-native-picker/picker` verwendet — eigene Radio-Row-Liste
- `tsc --noEmit`: keine Fehler in `app/customers/` (nur pre-existing Test-Datei-Fehler ohne Bezug zu diesen Screens)
- `git add project-tracker/app/customers/` gestaged

**Nächste Schritte**:
- Phase 1B-T5: Projekt-Anlegen-Form (Titel, Kunde-Picker, Farbe, Pricing-XOR, Aufgabenwahl)
- Phase 1B-T6: Projekt-Liste-Screen auf Startseite mit FlashList + TimerBanner

**Offene Punkte**: keine Blocker.

---

## 2026-05-11 — Phase 1B-T12: Zeiteintrag-Edit-Screen (Phase 1B abgeschlossen)

**Erledigt**:
- `project-tracker/app/time-entries/[id]/edit.tsx`: Vollstaendiger Edit-Screen fuer Zeiteintraege
  - Laedt Eintrag via direktem Drizzle-Select (`db.select().from(schema.timeEntries).where(eq(...)).get()`)
  - Felder: Datum (YYYY-MM-DD), Startzeit (HH:MM), Endzeit (HH:MM), Aufgabe (tappable Radio-Rows aus `listTasksForProject`), Notiz (multiline)
  - Validierung: ungueltige Datum/Zeit, endedAt <= startedAt, fehlende Aufgabe
  - `updateTimeEntry` aendert NICHT `rateSnapshotCents` (ADR-008: Snapshot immutable)
  - Loeschen via `softDeleteTimeEntry` mit Alert-Bestaetigung (destructive style)
  - a11y-Labels auf taskRow (accessibilityRole="radio", accessibilityState.selected, accessibilityLabel), Save-Button, Delete-Button
  - Touch-Targets: taskRow + Buttons minHeight 44
  - `tsc --noEmit`: keine Fehler in `app/time-entries/`
  - `npm test`: 10/10 Tests bestanden
  - `git add project-tracker/app/time-entries/` gestaged

**Phase 1B vollstaendig abgeschlossen** — alle 12 Tasks erledigt.

**Nächste Schritte**:
- Phase 1B abschliessen: Commit vorbereiten (User commitet selbst)
- Phase 2: Backend + Sync (Hono, Drizzle-PG, Sync-Worker)

**Offene Punkte**: keine Blocker. Phase 1B fertig.

---

## 2026-05-11 — Phase 1B UX-Finish: leere Zustände mit direkten Links

**Erledigt**:
- `project-tracker/app/customers/new.tsx`: leerer Zustand "Auftragsart" zeigt jetzt Button "Auftragsart anlegen →" (navigiert zu `/order-types`) statt nur Text
- `project-tracker/app/projects/new.tsx`: leerer Zustand "kein Kunde" zeigt jetzt Button "Kunden anlegen →" (navigiert zu `/customers/new`) statt nur Text
- TODO.md: alle erledigten Phase-1B-Items abgehakt (Aufgaben, Timer, Swipe, Stop-Modal, Projekt-Liste)
- Phase 1B damit vollständig abgeschlossen ✅

**Nächste Schritte**:
- Commit: alle Phase-1B-Files (User commitet selbst)
- Phase 2 starten: Backend-Skelett (`packages/server`, Hono, Drizzle-PG, Health-Check, JWT-Middleware)

**Offene Punkte**: keine Blocker. Bereit für Phase 2.

---

## 2026-05-15 — Phase 2 Task 2: packages/server scaffold

**Erledigt**:
- `packages/server/package.json`: `@projekt-tracker/server@0.0.1`, Hono + Zod + pino + drizzle-orm + postgres Dependencies, vitest/tsx/drizzle-kit/pino-pretty DevDeps
- `packages/server/tsconfig.json`: NodeNext module resolution, ES2022 target, strict mode
- `packages/server/vitest.config.ts`: node environment
- `packages/server/src/env.ts`: Zod-Schema für DATABASE_URL, JWT_SECRET (min 32 chars), PORT, NODE_ENV — fail-fast on startup
- `packages/server/src/logger.ts`: pino mit pino-pretty in non-production, LOG_LEVEL via env
- `pnpm install` erfolgreich — `@projekt-tracker/server` korrekt als Workspace-Package registriert (+41 neue Packages)
- `tsc --noEmit` auf `env.ts` + `logger.ts`: keine Fehler

**Nächste Schritte**:
- Phase 2 Task 3: `packages/schema/src/pg.ts` — Drizzle-PG-Schema für alle Tabellen laut DATA_MODEL.md
- Phase 2 Task 4: Migrations-Pipeline (drizzle-kit migrate beim Container-Start)
- Phase 2 Task 5: Hono-App + Health-Check `/v1/healthz`

**Offene Punkte**: keine Blocker.

---

## 2026-05-15 — Phase 2 Task 3: DB connection + Drizzle config for packages/server

**Erledigt**:
- `packages/server/src/db.ts`: postgres query client + drizzle instance mit vollem pg-Schema, `Db` Typ-Export, `runMigrations()` mit eigenem Single-Connection-Client (max: 1) + always-closing finally block
- `packages/server/drizzle.config.ts`: drizzle-kit Config zeigt auf `../schema/src/pg.ts`, Output nach `./migrations`, dialect postgresql
- `pnpm typecheck` in `packages/server`: null Fehler — NodeNext module resolution loest `@projekt-tracker/schema/pg` via exports-Feld in schema/package.json korrekt auf

**Nächste Schritte**:
- Phase 2: Hono-App-Einstiegspunkt + Health-Check `/v1/healthz`
- Phase 2: JWT-Auth-Middleware (`ctx.userId`)
- Phase 2: Erste Migration via `drizzle-kit generate` + `runMigrations()` beim Server-Start verdrahten

**Offene Punkte**: `migrations/` Verzeichnis noch leer — `drizzle-kit generate` benoetigt laufende PG-Instanz (kein Blocker fuer weitere Backend-Tasks).

---

## 2026-05-15 — Phase 2 Task 6: JWT-Auth-Middleware

**Erledigt**:
- `packages/server/src/__tests__/auth-middleware.test.ts`: 6 TDD-Tests fuer `createAuthMiddleware` (fehlender Header, falsches Format, ungültiger Token, falsches Secret, gültiger Token → userId gesetzt, fehlendes sub-Claim) — zuerst rot, dann grün
- `packages/server/src/middleware/auth.ts`: `createAuthMiddleware(secret: string)` Factory via `hono/factory` `createMiddleware`, verifiziert Bearer-Token mit `verify(token, secret, 'HS256')` (expliziter Algorithmus required in Hono 4.7), setzt `c.set('userId', payload.sub)`, gibt `{ error: 'Unauthorized' }` 401 bei jedem Fehlerfall zurück
- Anmerkung: `verify()` in Hono 4.7 erfordert expliziten `alg`-Parameter ('HS256') — ohne ihn schlägt Verifikation mit "JWT verification requires 'alg' option" fehl
- 7/7 Tests grün (1 health + 6 auth-middleware), `pnpm typecheck` 0 Fehler

**Nächste Schritte**:
- Phase 2 Task 7: Device-Bootstrap-Endpoint (erstes Mobile-Pairing)
- Phase 2: `createAuthMiddleware` in `app.ts` auf geschützte Routen mounten

**Offene Punkte**: keine Blocker.

---

## 2026-05-15 — Phase 2 Task 5: Hono app factory, health-check route, unit test

**Erledigt**:
- `packages/server/src/__tests__/health.test.ts`: TDD-Test fuer GET /v1/healthz (Vitest, importiert healthRoute direkt — kein env.ts/db.ts-Seiteneffekt im Test)
- `packages/server/src/middleware/auth.ts`: `AppVariables`-Typ-Stub fuer spatere JWT-Auth-Middleware (T6)
- `packages/server/src/routes/health.ts`: `healthRoute = new Hono()`, GET /healthz gibt `{ status: "ok" }` zurueck
- `packages/server/src/app.ts`: `createApp()` Factory — montiert `healthRoute` unter `/v1`, kein db.ts/env.ts-Import auf Modul-Ebene (bleibt testbar ohne DATABASE_URL)
- `packages/server/src/index.ts`: Einstiegspunkt — `runMigrations()`, `createApp()`, `@hono/node-server` serve auf env.PORT
- TDD bestaetigt: Test zuerst geschrieben (Fehler: module-not-found), dann Implementierung, Test gruen (1/1 bestanden)
- `pnpm typecheck`: 0 Fehler

**Nächste Schritte**:
- Phase 2 Task 6: JWT-Auth-Middleware (ersetzt auth.ts-Stub, liest Bearer-Token, setzt `ctx.userId`)
- Phase 2 Task 7: Device-Bootstrap-Endpoint (erstes Mobile-Pairing)
- Phase 2: Drizzle-PG-Schema in `packages/schema/pg.ts`

**Offene Punkte**: keine Blocker.

---

## 2026-05-15 — Phase 2A vollständig: PG-Schema, Migration, Bootstrap-Endpoint

**Erledigt**:
- `packages/schema/src/pg.ts`: Drizzle PG-Dialect-Schema, alle 11 Tabellen, PG-native Typen (uuid, timestamptz, smallint, boolean, varchar), `duration_seconds` als `GENERATED ALWAYS AS (...) STORED`, alle Check-Constraints und Indizes laut DATA_MODEL.md, Multi-Tenant-ready (`user_id` auf jeder mandantenbezogenen Tabelle)
- `packages/schema/package.json`: `exports`-Feld mit `./pg` Sub-Path, `drizzle-kit` devDep, `type: module`
- `packages/server/migrations/0000_simple_ted_forrester.sql`: erste PG-Migration generiert via `drizzle-kit generate`, alle 11 Tabellen + Constraints + Indizes
- `packages/server/src/repositories/users.ts`: `createUser(db, displayName)` — Repository-Muster mit Pflicht-`db`-Argument
- `packages/server/src/routes/auth.ts`: `createBootstrapRoute(db, jwtSecret)` — POST /v1/auth/bootstrap, Zod-Validierung, `sign({ sub, tier }, secret, 'HS256')`, 201-Response mit `{ token, userId }`
- `packages/server/src/app.ts`: Bootstrap-Route unter `/v1/auth` gemountet
- `packages/server/src/__tests__/bootstrap.test.ts`: 2 Integration-Tests (skipIf !DATABASE_URL), testet JWT-Payload und 400-Validation
- Alle Tests: 7/7 Unit-Tests grün, 2 Integration-Tests korrekt gegated
- Phase 2A **vollständig abgeschlossen** ✅

**Nächste Schritte**:
- Phase 2B: Sync-Endpoints (POST /v1/sync/push, GET /v1/sync/pull)
- Phase 2C: Mobile Sync-Worker

**Offene Punkte**: Integration-Tests (bootstrap.test.ts) benötigen laufende PostgreSQL-Instanz mit `DATABASE_URL` — kein Blocker für Phase 2B.

---

## 2026-05-15 — Phase 2B vollständig: Sync-Endpoints push + pull

**Erledigt**:
- `packages/server/src/routes/sync.ts`: Zod-Schemas für alle 10 Entitätstypen, `pushBodySchema` + `PushBody`-Typ-Export, `createSyncRoute(db, jwtSecret)` — POST /v1/sync/push (LWW-Upserts) + GET /v1/sync/pull?since=&lt;ts&gt; (inkrementelles Pull); JWT-Auth auf allen Routen via `createAuthMiddleware`
- `packages/server/src/repositories/sync.ts`: `pullSince(db, userId, since)` — parallele `Promise.all`-Abfragen aller 10 Tabellen, `since`-Filter auf Tabellen mit `updated_at`; `pushChanges(db, userId, body)` — transaktionale LWW-Upserts (`setWhere: excluded.updated_at > table.updated_at`), korrekte FK-Reihenfolge, `durationSeconds` aus `timeEntries`-INSERT ausgeschlossen (PG Generated Column), Full-Replace für `timers`/`taskTags`/`projectTasks` (keine `updated_at`-Spalte)
- `packages/server/src/app.ts`: `createSyncRoute` unter `/v1/sync` gemountet
- `packages/server/src/__tests__/sync.test.ts`: 8 Unit-Tests (Zod-Schema-Validierung) + 8 Integration-Tests (skipIf !DATABASE_URL): 401-Auth, leerer Pull, Push→Pull-Roundtrip, LWW-Korrektheit, Timer-Clear, `since`-Filter
- Alle Tests: 15/15 Unit-Tests grün, 10 Integration-Tests korrekt gegated (skipIf !DATABASE_URL)
- Phase 2B **vollständig abgeschlossen** ✅

**Nächste Schritte**:
- Phase 2C: Mobile Sync-Worker (Push-Pull-Loop mit Exponential Backoff, Sync-Trigger, Konfliktbehandlung)

**Offene Punkte**: Integration-Tests benötigen laufende PostgreSQL-Instanz mit `DATABASE_URL` — kein Blocker für Phase 2C.

---

## 2026-05-19 — Phase 2C vollständig: Mobile Sync-Worker

**Erledigt**:
- `project-tracker/src/store/syncStore.ts`: Zustand-Store (`SyncStatus`, `status`, `token`, `lastSyncedAt`, `consecutiveErrors`) — installiert `expo-secure-store@~15.0.8`
- `project-tracker/src/sync/types.ts`: `PushPayload`, `PullResponse`, 8 per-Entitäts-Interfaces (alle Timestamps als ISO-Strings)
- `project-tracker/src/sync/config.ts`: `API_BASE_URL` (dev/prod), `LOCAL_USER_ID`, `SYNC_INTERVAL_MS = 60_000`, `SECURE_KEYS`
- `project-tracker/src/sync/api.ts`: `ApiError`, `apiBootstrap`, `apiPush`, `apiPull` — pure fetch-Wrapper
- `project-tracker/src/sync/syncRepository.ts`: `collectPushPayload(db, userId, since)` — sammelt alle lokalen Entitäten, seit-Filter auf JS-Ebene, Join-Tables immer voll; `applyPull(db, data)` — LWW via `onConflictDoUpdate` mit `setWhere: excluded.updated_at > table.updated_at`, Full-Replace für `timers`/`taskTags`/`projectTasks`
- `project-tracker/src/sync/service.ts`: `runSync` (Guard auf `isSyncing` + Token, push→pull→persist, backoff bei Fehler), `startSyncLoop` (sofortiger erster Sync + AppState-Listener), `stopSyncLoop` (Cleanup)
- `project-tracker/app/_layout.tsx`: `initSync()` — lädt/erstellt JWT via `apiBootstrap`, persistiert in SecureStore, restauriert `lastSyncedAt`, startet `startSyncLoop()` nach Migrations-Abschluss
- `project-tracker/src/components/SyncIndicator.tsx`: idle/syncing/error-Zustände mit farbigem Dot (grün/grau/rot), de-DE Uhrzeit
- `project-tracker/app/(tabs)/settings.tsx`: `SyncIndicator` in `syncSection` am oberen Rand eingebaut
- `project-tracker/src/__tests__/syncRepository.test.ts`: 12 TDD-Tests — 6 `collectPushPayload` (full-sync, inkrementell, nothing-to-push, join-tables-immer, soft-delete, ISO-Timestamps) + 6 `applyPull` (insert-neu, LWW-update, LWW-preserve, deletedAt-propagation, timers-full-replace, taskTags-full-replace) — alle 12 grün
- Alle 22 Tests gesamt grün (3 Suites)
- Phase 2C **vollständig abgeschlossen** ✅

**Nächste Schritte**:
- Phase 3: Excel-Export (`/v1/exports/excel`, ExcelJS, Export-Modal in der App)
- Optionale Follow-ups Phase 2: Integrationstest 2-Geräte-Szenario, Pull-to-Refresh in Screens

**Offene Punkte**:
- `config.ts` enthält Platzhalter-Produktions-URL — vor Phase-5-Deploy auf echte URL aktualisieren
- Integration-Tests (2-Geräte) benötigen laufende PG-Instanz — kein Blocker für Phase 3

---

## 2026-05-21 — Phase 4 vollständig: App-PIN & Biometrie

**Erledigt**:
- `project-tracker/app.json`: `expo-local-authentication`-Plugin + Face-ID-Permission-String
- `project-tracker/src/auth/pinStorage.ts`: SHA-256(salt+pin) via `expo-crypto`, Keys in `expo-secure-store` (`pt_pin_hash`, `pt_pin_salt`, `pt_biometry_enabled`) — nie Klartext. Anmerkung: `expo-crypto` exponiert kein PBKDF2/Argon2 (SDK-Constraint, kommentiert im Code)
- `project-tracker/src/auth/__tests__/pinStorage.test.ts`: 9 TDD-Tests (SHA-256-Mock, Salt-Übergabe verifiziert, kein Klartext im Store)
- `project-tracker/src/store/lockStore.ts`: Zustand-Store — `isLocked`, `failedAttempts`, `lockoutUntil`, eskalierendes Lockout ab 5. Fehlversuch: 30 s → 60 s → 300 s → 900 s (Cap)
- `project-tracker/src/store/__tests__/lockStore.test.ts`: 9 TDD-Tests (alle Eskalationsstufen + Cap-Verhalten)
- `project-tracker/src/components/LockScreen.tsx`: Numerisches Keypad (3×4), PIN-Dots (●/○), Biometrie-Button, Lockout-Countdown, vollständige a11y-Labels
- `project-tracker/app/pin-setup/index.tsx`: Setup-Flow (enter→confirm) und Change-Flow (?mode=change: verify-current→enter→confirm)
- `project-tracker/app/_layout.tsx`: PIN-Check VOR `setIsDbReady(true)` (kein Flash), AppState-Listener > 60 s → Auto-Lock, bedingte Render LockScreen vs. Stack, `pin-setup/index`-Route als Modal
- `project-tracker/app/(tabs)/settings.tsx`: "Sicherheit"-Sektion — PIN einrichten/ändern, PIN deaktivieren (Bestätigungs-Alert), Biometrie-Toggle (nur wenn pinEnabled + Hardware vorhanden), `useFocusEffect` für State-Refresh
- Gesamt: 40/40 Tests grün, TypeScript sauber in Produktionscode

**Nächste Schritte**:
- Phase 5: Coolify-Deploy (Multi-stage Dockerfile, Coolify-Resource-Setup, Domain + Auto-HTTPS, EAS Build)
- Manueller Smoke-Test ausstehend: PIN einrichten → App-Kill → LockScreen, Auto-Lock nach 60 s, Biometrie-Toggle, PIN deaktivieren

**Offene Punkte**:
- `@jest/globals` fehlt als direktes devDependency in `project-tracker/package.json` → 3 TS-Fehler in Testdateien (kein Produktionsrisiko, Tests laufen korrekt)
- SHA-256 statt argon2id (SECURITY.md aktualisiert) — Restrisiko akzeptiert (expo-crypto-Constraint)
- config.ts enthält Platzhalter-Produktions-URL — vor Phase-5-Deploy auf echte URL aktualisieren

---

## 2026-05-19 — Phase 3 vollständig: Excel-Export

**Erledigt**:
- `packages/server/src/repositories/export.ts`: `queryExportData(db, userId, from, to, customerId?)` — Drizzle JOIN über time_entries+projects+customers+tasks, GROUP BY (customer.id, project.id, task.id), aggregiert totalSeconds + totalAmountCents (rate_snapshot × duration / 3600), separater Tag-Query via inArray
- `packages/server/src/services/excelRenderer.ts`: `renderExcel(rows, tagMap)` — ExcelJS Workbook, 11 Spalten (Kundennr., Name, Adresse, Projekt, Aufgabe, Stichworte, Zeit, Stundensatz, Betrag), Festpreis einmalig pro Projekt (fixedPriceShown-Set), Stundensatz leer bei Festpreis (ADR-013)
- `packages/server/src/routes/export.ts`: `createExportRoute(db, jwtSecret)` — GET /v1/exports/excel?from=YYYY-MM&to=YYYY-MM&customerId=, JWT-Auth, Zod-Validation, try/catch Error-Handling
- `packages/server/src/app.ts`: Export-Route unter /v1/exports gemountet
- `project-tracker/src/sync/api.ts`: `apiExportExcel` — fetch → ArrayBuffer (binary)
- `project-tracker/app/export/index.tsx`: Export-Screen — Von/Bis TextInputs (YYYY-MM), Kunden-Picker (optional), ArrayBuffer→Base64→FileSystem→expo-sharing, useFocusEffect für Kundenliste
- `project-tracker/app/(tabs)/settings.tsx`: "Export erstellen" Row ganz oben
- `project-tracker/app/_layout.tsx`: export/index Stack-Screen als Modal
- Tests: 6 Renderer-Unit-Tests (excelRenderer.test.ts), 6 Repo-Integration-Tests (export.test.ts, skip ohne DATABASE_URL), 5 Zod-Unit-Tests
- Alle 27 Tests grün, 16 korrekt geskippt, Typecheck sauber

**Nächste Schritte**:
- Phase 4: App-PIN & Biometrie (expo-local-authentication, Lock-Screen, Auto-Lock)
- Optionale Phase-3-Ergänzungen: Pull-to-Refresh in Screens nach Sync, Integrations-Zwei-Geräte-Test

**Offene Punkte**:
- config.ts enthält Platzhalter-Produktions-URL — vor Phase-5-Deploy auf echte URL aktualisieren
- Integration-Tests (export.test.ts) benötigen laufende PG-Instanz mit DATABASE_URL

---

## 2026-05-15 — Phase 2B Task 1: Zod-Schemas + Stub-Repository für Sync-Endpoints

**Erledigt**:
- `packages/server/src/__tests__/sync.test.ts`: 8 TDD-Unit-Tests für `pushBodySchema` (leeres Body, gültiger orderType, digit=0 rejected, digit=10 rejected, ungültiger pricingMode, ungültiger pricingModeSnapshot, taskTags undefined vs [], appSettings vollständig) — alle 8 grün
- `packages/server/src/repositories/sync.ts`: Stub-Repository mit `pullSince` und `pushChanges` — werfen `new Error('not implemented')`, Typen korrekt importiert aus `routes/sync.js`
- `packages/server/src/routes/sync.ts`: Vollständige Zod-Schemas für alle 10 Entity-Typen (orderType, customer, project, task, tag, taskTag, projectTask, timeEntry, timer, appSettings), `pushBodySchema` mit `.default([])` für Pflicht-Arrays und `.optional()` für optionale Arrays, `createSyncRoute(db, jwtSecret)` Factory mit POST /push + GET /pull (beide JWT-geschützt), `PushBody`-Typ-Export
- TDD-Zyklus korrekt durchgeführt: Test FAIL → Stub → Implementation → Test PASS
- `pnpm typecheck`: 0 Fehler (Spread-Problem mit `never`-Return gelöst via `as Record<string, unknown>` Cast)

**Nächste Schritte**:
- Phase 2B Task 2: `pushChanges`-Implementierung in `repositories/sync.ts` (Batch-Upserts per entity-Typ)
- Phase 2B Task 3: `pullSince`-Implementierung (Inkrementelles Pull via `updated_at >= since`)
- Phase 2B Task 4: `createSyncRoute` in `app.ts` mounten

**Offene Punkte**: keine Blocker.
