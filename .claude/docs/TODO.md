# TODO

Lebendige Aufgabenliste, gruppiert nach Phasen aus `ROADMAP.md`. Jeder Task ist klein genug, um in einem Workflow-Loop (1–2 h) abgeschlossen zu werden.

Format pro Task: `- [ ] (#tag) Beschreibung — Akzeptanzkriterium`

Tags: `#schema`, `#mobile`, `#backend`, `#sync`, `#auth`, `#export`, `#ux`, `#deploy`, `#docs`, `#ci`

---

## Phase 0 — Repo-Setup & Konzept

- [x] (#docs) Konzept-Docs in `.claude/docs/` anlegen
- [x] (#docs) Subagent-Definitionen in `.claude/agents/`
- [x] (#docs) CLAUDE.md erweitern um Verweise auf WORKFLOW.md
- [x] (#schema) Workspace-Struktur einrichten: `pnpm-workspace.yaml` oder `npm`-Workspaces, `packages/schema`, `packages/server`, Mobile bleibt in `project-tracker/`
- [ ] (#schema) Drizzle + drizzle-kit installieren in `packages/schema`
- [ ] (#ci) Root-Skripte: `lint`, `typecheck`, `test`
- [ ] (#docs) `.gitignore`-Eintrag für `com.facebook.react.devsupport.BundleDownloader`
- [x] (#schema) Open Questions 1–7 aus CONCEPT.md mit User geklärt → ADR-008 bis ADR-014 in DECISIONS.md (2026-05-10)

## Phase 1 — Lokal-only MVP (Mobile)

### Schema
- [ ] (#schema) SQLite-Schema laut DATA_MODEL.md in `packages/schema/sqlite.ts` definieren
- [x] (#schema) Initial-Migration generieren + im App-Boot ausführen — DB client + migration runner fertig (T6 ✓); App-Boot-Verdrahtung abgeschlossen (T7 ✓)
- [ ] (#schema) Test: Schema-Roundtrip (insert/select/update) für jede Tabelle
- [ ] (#schema) Tarif-Snapshot-Logik: Helper, der beim Time-Entry-Insert den aktuellen Projekt-Stundensatz übernimmt

### Repository-Layer (Phase 1B-T2) ✓
- [x] (#mobile) Repository-Layer: `orderTypes.ts` (list, create, softDelete)
- [x] (#mobile) Repository-Layer: `customers.ts` (list, create, update) mit Kundennummer-Generierung
- [x] (#mobile) Repository-Layer: `projects.ts` (listActive, get, create, update, archive, getTotalSeconds)
- [x] (#mobile) Repository-Layer: `tasks.ts` (list, listForProject, create, listTags, upsertTag, setTaskTags, getTagsForTask)
- [x] (#mobile) Repository-Layer: `timers.ts` (getActive, start, stop mit Tariff-Snapshot)
- [x] (#mobile) Repository-Layer: `timeEntries.ts` (listForProject, update, softDelete)

### Shared UI Components (Phase 1B-T4) ✓
- [x] (#ux) `ColorPicker.tsx`: 6 Presets, Tap-to-Select, a11y, Touch-Target 44pt
- [x] (#ux) `TimerBanner.tsx`: Live-Counter HH:MM:SS, reads from timerStore, Pressable mit a11y
- [x] (#ux) `ProjectTile.tsx`: farbige Kachel, expo-haptics auf Press, LongPress, ▶/⏸ Icon, a11y-State

### Kunden + Auftragsarten
- [x] (#mobile) Auftragsart-Liste verwalten (CRUD-Screen) — `app/order-types/index.tsx` (1B-T7)
- [x] (#mobile) Kunden anlegen/listen (Screen) — `app/customers/index.tsx` + `app/customers/new.tsx` (1B-T8)
- [x] (#ux) Leerer Zustand Kunden-neu-Formular: wenn keine Auftragsart vorhanden, direkten Link/Button zu "Auftragsart anlegen" anzeigen statt nur Text
- [x] (#ux) Leerer Zustand Projekt-neu-Formular: wenn kein Kunde vorhanden, direkten Link/Button zu "Kunde anlegen" anzeigen statt nur Text

### Aufgaben + Stichworte
- [x] (#mobile) Aufgaben CRUD inkl. m:n Stichwort-Verknüpfung (Screen)
- [x] (#mobile) Stichwort-Picker (anlegen oder auswählen)

### Projekte
- [x] (#mobile) Projekt-Anlegen-Form: Titel, Kunde-Picker, Beschreibung, Farbe, Pricing-XOR, Aufgabenwahl — `app/projects/new.tsx` (1B-T10)
- [x] (#mobile) Validierung: Pricing-XOR; Aufgabe NICHT pflicht beim Anlegen (ADR-012) — Pflicht erst im Stop-Modal
- [x] (#mobile) Projekt-Liste auf Startseite (FlashList, farbige Kacheln)
- [x] (#mobile) Projekt-Detail: Gesamtzeit, Gesamtkosten, relativer Stundensatz bei Festpreis — `app/projects/[id].tsx` (1B-T11)
- [x] (#mobile) Projekt archivieren — Alert-Confirm in `app/projects/[id].tsx` (1B-T11)

### Timer
- [x] (#mobile) Tap-to-Start-Geste auf Kachel (mit visueller Bestätigung)
- [x] (#mobile) Swipe-to-Stop (Reanimated v4)
- [x] (#mobile) Stop-Modal: Aufgabe wählen
- [x] (#mobile) Banner für aktiven Timer auf Startseite (mit Live-Counter)
- [x] (#mobile) Manuelle Zeit-Korrektur: Edit-Form + Soft-Delete für `time_entries` (ADR-014). Hinweis: Edit ändert NICHT `rate_snapshot_cents` — `app/time-entries/[id]/edit.tsx` (1B-T12 ✓)

## Phase 2 — Backend + Sync

### Backend-Skelett
- [x] (#backend) `packages/server` mit Hono, Zod, pino aufsetzen — Scaffold inkl. env.ts + logger.ts (2026-05-15)
- [x] (#backend) DB connection + Drizzle config: `packages/server/src/db.ts` + `drizzle.config.ts` (2026-05-15)
- [x] (#backend) Drizzle-PG-Schema in `packages/schema/pg.ts` — alle 11 Tabellen, PG-Typen, generated column (2026-05-15)
- [x] (#backend) Migrations-Pipeline (drizzle-kit migrate beim Container-Start) — `runMigrations()` in db.ts + 0000_*.sql generiert (2026-05-15)
- [x] (#backend) Health-Check `/v1/healthz` — Hono app factory + healthRoute + unit test (2026-05-15)
- [x] (#auth) JWT-Auth-Middleware (`ctx.userId`) — `createAuthMiddleware(secret)` Factory, 6 Tests grün (2026-05-15)
- [x] (#auth) Device-Bootstrap-Endpoint: erstes Mobile-Pairing — POST /v1/auth/bootstrap, users-Repository, Integration-Test (2026-05-15)
- [x] (#backend) Repository-Layer mit Pflicht-`userId`-Argument — `createUser(db, displayName)` als Muster etabliert (2026-05-15)

### Endpoints
- [x] (#backend) Zod-Schemas + Stub-Repository für Sync-Endpoints — `pushBodySchema`, `PushBody`, `createSyncRoute`, Stub `pullSince`/`pushChanges` (2026-05-15)
- [x] (#backend) `/v1/sync/push` — `pushChanges` Implementierung (Batch-Upserts mit LWW `updated_at >`) (2026-05-15)
- [x] (#backend) `/v1/sync/pull?since=<ts>` — `pullSince` Implementierung (Inkrementelles Pull) (2026-05-15)
- [x] (#backend) `createSyncRoute` in `app.ts` unter `/v1/sync` gemountet (2026-05-15)
- [ ] (#backend) CRUD-Endpoints (im MVP via Sync abgedeckt — separate CRUD nur, wenn nötig)

### Sync-Worker (Mobile)
- [ ] (#sync) Push-Pull-Loop mit Exponential Backoff
- [ ] (#sync) Sync-Trigger (App-Resume, Pull-to-Refresh, periodisch)
- [ ] (#sync) Konfliktbehandlung (Server-Wins bei `server.updated_at > local.updated_at`)
- [ ] (#sync) Soft-Delete-Sync
- [ ] (#sync) Sync-Indicator in UI

### Tests
- [ ] (#sync) Integrationstest: 2-Geräte-Szenario (kann via 2 SQLite-Instanzen simuliert werden)
- [ ] (#sync) Lasttest: 100 Einträge offline angesammelt → vollständig synchronisiert

## Phase 3 — Excel-Export

- [ ] (#export) Server-Endpoint `/v1/exports/excel` mit Zeitraum-Filter
- [ ] (#export) ExcelJS-Renderer (Spalten laut CONCEPT.md)
- [ ] (#export) Festpreis-Export: Festpreis-Position + Zeit-Info-Spalte ohne Geld (ADR-013)
- [ ] (#mobile) Export-Modal (Zeitraum-Picker, Kunden-Filter optional)
- [ ] (#mobile) Download via System-Sharesheet (`expo-sharing` oder `expo-file-system`)
- [ ] (#export) Test mit synthetischem Datensatz: Datei öffnet in Excel + Numbers + LibreOffice

## Phase 4 — App-PIN & Biometrie

- [ ] (#auth) `expo-local-authentication` integrieren
- [ ] (#auth) PIN-Setup-Flow (4–6 Stellen, Bestätigung)
- [ ] (#auth) Lock-Screen bei App-Start
- [ ] (#auth) Auto-Lock nach Hintergrund-Zeit > 1 min
- [ ] (#auth) Settings: PIN ändern, Biometrie an/aus, PIN deaktivieren
- [ ] (#auth) Tests: kein Klartext-PIN persistiert; 5 Fehlversuche → Wartezeit

## Phase 5 — Coolify-Deploy

- [ ] (#deploy) Multi-stage Dockerfile für Backend
- [ ] (#deploy) Coolify-Resource-Setup (Backend-App + Postgres-Service)
- [ ] (#deploy) Env-Variablen mapped (siehe DEPLOYMENT.md)
- [ ] (#deploy) Domain + Auto-HTTPS via Coolify
- [ ] (#deploy) Tägliches PG-Backup aktivieren + manuelles Restore testen
- [ ] (#deploy) Mobile-App-Build mit Production-API-URL (EAS Build)
- [ ] (#deploy) Health-Check-Monitoring

## Backlog (post-MVP, später aus Phasen 6–8 ziehen)

- [ ] (#auth) Email-/Passwort-Auth + Reset-Flow
- [ ] (#auth) Apple Sign-In
- [ ] (#auth) In-App Account-Löschung
- [ ] (#export) DSGVO-Export (komplette User-Daten als JSON)
- [ ] (#ux) Datenschutzerklärung, AGB, Impressum in Settings
- [ ] (#backend) Subscription-Tier-Field aktivieren + Receipt-Validation
- [ ] (#mobile) StoreKit / Play Billing
- [ ] (#backend) Rate-Limiting per User

---

> **Tipp**: Items, die fertig sind, werden hier abgehakt **und** in `PROGRESS.md` mit Datum + kurzer Notiz festgehalten.
