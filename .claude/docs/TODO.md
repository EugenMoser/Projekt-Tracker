# TODO

Lebendige Aufgabenliste, gruppiert nach Phasen aus `ROADMAP.md`. Jeder Task ist klein genug, um in einem Workflow-Loop (1–2 h) abgeschlossen zu werden.

Format pro Task: `- [ ] (#tag) Beschreibung — Akzeptanzkriterium`

Tags: `#schema`, `#mobile`, `#backend`, `#sync`, `#auth`, `#export`, `#ux`, `#deploy`, `#docs`, `#ci`

---

## Phase 0 — Repo-Setup & Konzept

- [x] (#docs) Konzept-Docs in `.claude/docs/` anlegen
- [x] (#docs) Subagent-Definitionen in `.claude/agents/`
- [x] (#docs) CLAUDE.md erweitern um Verweise auf WORKFLOW.md
- [ ] (#schema) Workspace-Struktur einrichten: `pnpm-workspace.yaml` oder `npm`-Workspaces, `packages/schema`, `packages/server`, Mobile bleibt in `project-tracker/`
- [ ] (#schema) Drizzle + drizzle-kit installieren in `packages/schema`
- [ ] (#ci) Root-Skripte: `lint`, `typecheck`, `test`
- [ ] (#docs) `.gitignore`-Eintrag für `com.facebook.react.devsupport.BundleDownloader`
- [x] (#schema) Open Questions 1–7 aus CONCEPT.md mit User geklärt → ADR-008 bis ADR-014 in DECISIONS.md (2026-05-10)

## Phase 1 — Lokal-only MVP (Mobile)

### Schema
- [ ] (#schema) SQLite-Schema laut DATA_MODEL.md in `packages/schema/sqlite.ts` definieren
- [ ] (#schema) Initial-Migration generieren + im App-Boot ausführen
- [ ] (#schema) Test: Schema-Roundtrip (insert/select/update) für jede Tabelle
- [ ] (#schema) Tarif-Snapshot-Logik: Helper, der beim Time-Entry-Insert den aktuellen Projekt-Stundensatz übernimmt

### Kunden + Auftragsarten
- [ ] (#mobile) Auftragsart-Liste verwalten (CRUD)
- [ ] (#mobile) Kundennummern-Generator (siehe Algorithmus in CONCEPT.md), getestet
- [ ] (#mobile) Kunden anlegen/editieren/listen

### Aufgaben + Stichworte
- [ ] (#mobile) Aufgaben CRUD inkl. m:n Stichwort-Verknüpfung
- [ ] (#mobile) Stichwort-Picker (anlegen oder auswählen)

### Projekte
- [ ] (#mobile) Projekt-Anlegen-Form: Titel, Kunde-Picker, Beschreibung, Farbe, Pricing-XOR, Aufgabenwahl
- [ ] (#mobile) Validierung: Pricing-XOR; Aufgabe NICHT pflicht beim Anlegen (ADR-012) — Pflicht erst im Stop-Modal
- [ ] (#mobile) Projekt-Liste auf Startseite (FlashList, farbige Kacheln)
- [ ] (#mobile) Projekt-Detail: Gesamtzeit, Gesamtkosten, relativer Stundensatz bei Festpreis
- [ ] (#mobile) Projekt archivieren

### Timer
- [ ] (#mobile) Tap-to-Start-Geste auf Kachel (mit visueller Bestätigung)
- [ ] (#mobile) Swipe-to-Stop (Reanimated v4)
- [ ] (#mobile) Stop-Modal: Aufgabe wählen
- [ ] (#mobile) Banner für aktiven Timer auf Startseite (mit Live-Counter)
- [ ] (#mobile) Manuelle Zeit-Korrektur: Edit-Form + Soft-Delete für `time_entries` (ADR-014). Hinweis: Edit ändert NICHT `rate_snapshot_cents`

## Phase 2 — Backend + Sync

### Backend-Skelett
- [ ] (#backend) `packages/server` mit Hono, Zod, pino aufsetzen
- [ ] (#backend) Drizzle-PG-Schema in `packages/schema/pg.ts`
- [ ] (#backend) Migrations-Pipeline (drizzle-kit migrate beim Container-Start)
- [ ] (#backend) Health-Check `/v1/healthz`
- [ ] (#auth) JWT-Auth-Middleware (`ctx.userId`)
- [ ] (#auth) Device-Bootstrap-Endpoint: erstes Mobile-Pairing
- [ ] (#backend) Repository-Layer mit Pflicht-`userId`-Argument (verhindert ungescopte Queries)

### Endpoints
- [ ] (#backend) `/v1/sync/push` (Batch-Upserts mit `updated_at`)
- [ ] (#backend) `/v1/sync/pull?since=<ts>` (Inkrementelles Pull)
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
