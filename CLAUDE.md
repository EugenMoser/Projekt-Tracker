# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Arbeitsweise

Ziel: kleine, in sich geschlossene Änderungen, die grün durchlaufen und nachvollziehbar dokumentiert sind.

- Anforderungen kommen aus [.claude/docs/TODO.md](.claude/docs/TODO.md).
- Den Ablauf selbst (Brainstorming → TDD → Review → Verifikation) tragen die Superpowers-Skills. [.claude/docs/WORKFLOW.md](.claude/docs/WORKFLOW.md) enthält nur, was projektspezifisch ist: Commit-Format, Branch-Strategie, projekteigene DoD-Punkte.
- Commits macht der User selbst — Claude bereitet sie vor (staging + Message-Vorschlag).

## Doku-Landkarte

Alle Konzept-/Architektur-/Workflow-Markdowns liegen unter [.claude/docs/](.claude/docs/):

| Datei                                               | Zweck                                                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [WORKFLOW.md](.claude/docs/WORKFLOW.md)             | Commit-Format, Branch-Strategie, projektspezifische DoD-Punkte                                             |
| [CONCEPT.md](.claude/docs/CONCEPT.md)               | Fachliches Konzept, Domain-Glossar, User Stories, UI-Wireframes, Kundennummern-Algorithmus, Open Questions |
| [ARCHITECTURE.md](.claude/docs/ARCHITECTURE.md)     | Schichten-Diagramm, Sync-Strategie (LWW), Multi-Tenant-Pattern, API-Versionierung                          |
| [DATA_MODEL.md](.claude/docs/DATA_MODEL.md)         | Tabellen, Constraints, Indizes (PG + SQLite via Drizzle)                                                   |
| [ROADMAP.md](.claude/docs/ROADMAP.md)               | Phasen 0–8 mit Akzeptanzkriterien                                                                          |
| [TODO.md](.claude/docs/TODO.md)                     | Lebendiger Backlog gruppiert nach Phasen                                                                   |
| [PROGRESS.md](.claude/docs/PROGRESS.md)             | Cross-Session-Fortschrittslog (bei jedem Commit ergänzen!)                                                 |
| [DECISIONS.md](.claude/docs/DECISIONS.md)           | ADR-light: alle Architekturentscheidungen mit Begründung                                                   |
| [SECURITY.md](.claude/docs/SECURITY.md)             | Threat-Model, PIN/Biometrie, Tenant-Isolation, Secrets                                                     |
| [DEPLOYMENT.md](.claude/docs/DEPLOYMENT.md)         | Coolify-Setup auf Hostinger-VPS                                                                            |
| [SAAS_READINESS.md](.claude/docs/SAAS_READINESS.md) | Checkliste für späteren App-Store-Launch                                                                   |

`.claude/mvp-brainstorming.md` ist die historische Anforderungsquelle und **nicht mehr aktuell** — ihr Inhalt ist vollständig in [CONCEPT.md](.claude/docs/CONCEPT.md) kuratiert. CONCEPT.md ist die einzige gültige Quelle.

## Subagents

Spezialisierte Subagents leben unter [.claude/agents/](.claude/agents/):

| Agent       | Wann nutzen                                               |
| ----------- | --------------------------------------------------------- |
| `architect` | Architektur-Entscheidungen, Design-Reviews, ADR-Entwürfe  |
| `coder`     | Backend-Routes, Business-Logik, Mobile-Logik (Test-first) |
| `db`        | Schema, Migrationen, Indizes, Sync-Felder                 |
| `mobile-ux` | UI/UX, Gesten (Swipe-to-Track), Listen-Performance        |
| `security`  | Auth, PIN, JWT, Tenant-Isolation, Secrets, Dependencies   |
| `reviewer`  | End-to-End-Review vor Commit (DoD-Check)                  |

## Projekt-Struktur

Alle KI-relevanten Daten liegen unter `.claude/` im Root.

```
projekt-tracker/
├── project-tracker/        # Expo Mobile App
├── packages/
│   ├── schema/             # geteiltes Drizzle-Schema (pg + sqlite)
│   └── server/             # Hono Backend
├── .claude/
│   ├── docs/               # Doku (siehe oben)
│   ├── agents/             # Subagent-Definitionen
│   ├── plans/              # Phasenpläne (Phase 1–6)
│   ├── .superpowers/       # Feature-Pläne + Specs aus Superpowers-Sessions
│   └── settings.json       # Projekt-Hooks
└── CLAUDE.md
```

## Tech-Stack auf einen Blick

- **Mobile**: Expo SDK 54, expo-router, RN 0.81, TS strict, New Architecture, React Compiler
- **Lokale DB**: expo-sqlite + Drizzle (Client-Dialect)
- **Backend**: Node 22 + Hono + Drizzle (PG-Dialect)
- **Datenbank**: PostgreSQL 16
- **Auth**: Long-Lived Device-JWT + App-PIN + Biometrie (`expo-local-authentication`)
- **Sync**: Last-Write-Wins (Single-User → kein CRDT nötig)
- **Export**: ExcelJS serverseitig
- **Deployment**: Coolify auf Hostinger VPS (Reverse-Proxy, Auto-HTTPS, PG-Backups)

## Wichtige Disziplin

- **Multi-Tenant-fähiges Schema von Tag 1**: jede mandantenbezogene Tabelle hat `user_id` + Index, jede Query filtert darauf (siehe ARCHITECTURE.md Multi-Tenant-Pattern)
- **API-Versioniert**: alle Endpoints unter `/v1/...`
- **Geld als Integer-Cent**: nie Float (siehe ADR-007 in DECISIONS.md)
- **Tarif-Snapshot pro Zeiteintrag**: Stundensatz wird beim Erstellen eingefroren (ADR-008)
- **Repository-Layer**: kein direktes `db.select()` außerhalb von `packages/server/src/repositories/`
- **Test-first**, kleine Diffs, ein Feature pro Commit

## Development Commands (aktueller Stand)

Aus [project-tracker/](project-tracker/):

```bash
npx expo start          # Dev-Server (QR für Expo Go)
npx expo start --ios    # iOS-Simulator
npx expo start --android# Android-Emulator
npx expo start --web    # Browser
npm run lint            # ESLint via expo lint
```

Aus dem Repo-Root (Workspace-weit via pnpm):

```bash
pnpm lint                # Lint über alle Packages + Mobile-App
pnpm typecheck           # tsc --noEmit über schema, server und Mobile-App
pnpm test                # Tests über alle Packages (vitest/jest)
```

Der Typecheck läuft zusätzlich automatisch: `.claude/hooks/typecheck.sh` prüft nach jeder Änderung an einer `.ts`/`.tsx`-Datei im Hintergrund nur das betroffene Package und meldet sich nur, wenn etwas kaputt ist (konfiguriert in `.claude/settings.json`, abschaltbar über `/hooks`).
