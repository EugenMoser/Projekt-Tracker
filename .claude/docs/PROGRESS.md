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

**Offene Punkte**: keine.
