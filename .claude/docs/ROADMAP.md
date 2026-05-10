# ROADMAP

Phasen vom MVP bis zum kostenpflichtigen App-Store-Produkt. Jede Phase hat klare Akzeptanzkriterien — eine Phase ist erst fertig, wenn alle erfüllt sind.

## Phase 0 — Repo-Setup & Konzept (HIER WIR JETZT)

**Ziel**: Saubere Basis, dokumentiertes Konzept, Subagent-Setup.

**Akzeptanzkriterien**:
- [x] Konzept-Docs in `.claude/docs/` vorhanden und konsistent
- [x] Subagent-Definitionen in `.claude/agents/`
- [x] CLAUDE.md verweist auf WORKFLOW.md
- [ ] Workspace-Struktur etabliert (`packages/schema`, `packages/server`, `project-tracker/` als Mobile-App)
- [ ] CI-Skelett (Type-Check + Lint), läuft lokal

## Phase 1 — Lokal-only MVP (Mobile)

**Ziel**: App funktioniert vollständig **ohne Backend** — auf einem Device, lokale SQLite, alle Kern-Flows.

**Features**:
- Drizzle-Schema (SQLite-Variante) angelegt + Migration
- Startseite mit Projekt-Kacheln
- Projekt anlegen/editieren/archivieren
- Kunde anlegen mit auto-generierter Nummer
- Auftragsart pflegen
- Aufgabe + Stichworte pflegen
- Timer-Start/Stop mit Aufgabenauswahl-Modal
- Projekt-Detail (Gesamtzeit, Gesamtkosten, relativer Stundensatz)
- Manuelle Zeit-Korrektur (Open Question 6 in CONCEPT.md klären)

**Akzeptanzkriterien**:
- App läuft auf iOS-Simulator und Android-Emulator
- Alle CRUD-Flows ohne Crash
- Kein Backend nötig — DB liegt im Device
- Tests für Kundennummern-Algorithmus + Tarif-Snapshot-Logik grün

## Phase 2 — Backend + Sync

**Ziel**: Daten werden mit dem eigenen Backend synchronisiert. Mehrere Devices möglich.

**Features**:
- Hono-Server mit `/v1/auth/*`, `/v1/sync/push|pull`, CRUD-Endpoints
- Drizzle-PG-Schema (parallel zur SQLite-Variante)
- JWT-Auth (Long-Lived Device-Token)
- Sync-Worker im Mobile (Last-Write-Wins, Retry, Soft-Delete-Sync)
- Konflikt-Logging

**Akzeptanzkriterien**:
- 2 Geräte können dieselben Daten sehen (nach Sync)
- Offline-Änderungen werden beim Reconnect korrekt gepusht
- Soft-Delete propagiert
- Sync-Indicator in UI sichtbar
- Integrationstest: 100 Einträge auf Device A → Device B sieht alle nach Sync

## Phase 3 — Excel-Export

**Ziel**: User kann Reports im `.xlsx` für einen Zeitraum erzeugen.

**Features**:
- Server-Endpoint `/v1/exports/excel?from=YYYY-MM&to=YYYY-MM&customerId=...`
- ExcelJS-Renderer mit Spalten laut CONCEPT.md
- Mobile-Export-Modal (Zeitraum-Picker, Default aktueller Monat)
- Download via System-Sharesheet

**Akzeptanzkriterien**:
- Export für leeren Zeitraum gibt leere Tabelle (kein Crash)
- Export für 1 Jahr mit 1000+ Zeiteinträgen unter 5 s
- Excel öffnet sauber in Numbers + Excel + LibreOffice
- Filter „nur 1 Kunde" funktioniert

## Phase 4 — App-PIN & Biometrie

**Ziel**: App-Lock auf dem Device.

**Features**:
- `expo-local-authentication` für FaceID/TouchID/Fingerabdruck
- App-PIN-Setup-Flow (4–6 Stellen)
- Lock-Screen bei App-Start + Resume nach Hintergrund-Zeit > X
- Settings: PIN ändern / deaktivieren

**Akzeptanzkriterien**:
- Ohne korrekte Biometrie/PIN keine Daten sichtbar
- 5 Fehlversuche → Wartezeit
- Tests für PIN-Hashing (kein Klartext-PIN persistiert)

## Phase 5 — Coolify-Deploy auf Hostinger

**Ziel**: Backend + DB laufen produktiv auf eigenem VPS.

**Features**:
- Coolify-Resource für Backend + Postgres
- Dockerfile für Backend (Node 22, Hono, multi-stage build)
- Env-Variablen-Mapping
- Domain + Auto-HTTPS
- Daily PG-Backup über Coolify
- Mobile-App-Build mit Production-API-URL

**Akzeptanzkriterien**:
- Production-Endpoint per HTTPS erreichbar
- Mobile App connectet, Sync läuft
- Backup-Restore manuell verifiziert
- Health-Check-Endpoint vorhanden

## ─── MVP fertig ab hier ───

## Phase 6 — App-Store-Vorbereitung

**Ziel**: App-Store-Compliance für späteres Listing.

**Features**:
- Email-/Passwort-Auth zusätzlich zum Device-Token
- Apple Sign-In (Pflicht bei iOS-Apps mit Drittanbieter-Logins)
- In-App Account-Löschung (Apple-Pflicht seit iOS 17)
- DSGVO-Export („alle meine Daten als JSON")
- Datenschutzerklärung, AGB, Impressum (URLs in Settings)
- App-Icons + Splash-Screens für Stores
- App-Privacy-Manifest (iOS)

**Akzeptanzkriterien**:
- TestFlight-Build durchläuft ohne Reject-Risiko
- Account-Löschung entfernt alle User-Daten serverseitig
- Datenschutz-Seiten verlinkt und erreichbar

## Phase 7 — Monetarisierung

**Ziel**: Kostenpflichtige Nutzung über Apple/Google IAP.

**Features**:
- Subscription-Tiers (`free` / `pro`)
- Apple StoreKit 2 + Google Play Billing
- Server-Validierung der Receipts
- Feature-Limits im Free-Tier (z.B. max. 3 aktive Projekte)
- Optional: Stripe für Web-Subscriptions

**Akzeptanzkriterien**:
- Subscription-Kauf funktioniert in Sandbox + Production
- Cancel/Refund behandelt
- Tier-Downgrade respektiert Limits ohne Datenverlust

## Phase 8 — Skalierung & Multi-Tenant-Polish

**Ziel**: App ist bereit für viele User.

**Features**:
- Rate-Limiting pro User
- Tenant-Backups (logischer Export pro User)
- Branding-Felder in `users` (Logo, Firmenadresse für Excel)
- Performance-Tuning (Queries, Indizes, ggf. Caching)
- Monitoring (Logs, Metriken, Error-Tracking)

**Akzeptanzkriterien**:
- Lasttests: 100 parallele User → p95 < 300 ms
- Excel-Export pro User mit eigenem Logo + Adresse
- Monitoring-Dashboard erreichbar

## Reihenfolge ist NICHT in Stein gemeißelt

- Phasen 1+2 können sequentiell laufen
- Phase 3 (Export) kann parallel zu Phase 2 starten, sobald Schema steht
- Phase 4 (PIN) ist orthogonal und kann jederzeit zwischengeschoben werden
- Phasen 6–8 hängen wirtschaftlich zusammen — erst angehen, wenn MVP-Erfahrung da ist
