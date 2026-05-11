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
