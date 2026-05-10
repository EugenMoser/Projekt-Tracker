# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Wichtigste Regel: Workflow folgen

Jede Änderung läuft durch den verbindlichen Feature-Loop in [.claude/docs/WORKFLOW.md](.claude/docs/WORKFLOW.md). Vor JEDEM Implementierungs-Schritt:

1. **WORKFLOW.md lesen** und Definition-of-Done-Checkliste verinnerlichen
2. Anforderung aus [.claude/docs/TODO.md](.claude/docs/TODO.md) konkretisieren
3. Bei Unklarheit erst rückfragen, dann coden
4. Nach Fertigstellung: PROGRESS.md + TODO.md aktualisieren, Commit vorbereiten (User commitet selbst)

## Doku-Landkarte

Alle Konzept-/Architektur-/Workflow-Markdowns liegen unter [.claude/docs/](.claude/docs/):

| Datei | Zweck |
|---|---|
| [WORKFLOW.md](.claude/docs/WORKFLOW.md) | **Verbindlicher Feature-Loop** + DoD-Checkliste + Commit-Format |
| [CONCEPT.md](.claude/docs/CONCEPT.md) | Fachliches Konzept, Domain-Glossar, User Stories, UI-Wireframes, Kundennummern-Algorithmus, Open Questions |
| [ARCHITECTURE.md](.claude/docs/ARCHITECTURE.md) | Schichten-Diagramm, Sync-Strategie (LWW), Multi-Tenant-Pattern, API-Versionierung |
| [DATA_MODEL.md](.claude/docs/DATA_MODEL.md) | Tabellen, Constraints, Indizes (PG + SQLite via Drizzle) |
| [ROADMAP.md](.claude/docs/ROADMAP.md) | Phasen 0–8 mit Akzeptanzkriterien |
| [TODO.md](.claude/docs/TODO.md) | Lebendiger Backlog gruppiert nach Phasen |
| [PROGRESS.md](.claude/docs/PROGRESS.md) | Cross-Session-Fortschrittslog (bei jedem Commit ergänzen!) |
| [DECISIONS.md](.claude/docs/DECISIONS.md) | ADR-light: alle Architekturentscheidungen mit Begründung |
| [SECURITY.md](.claude/docs/SECURITY.md) | Threat-Model, PIN/Biometrie, Tenant-Isolation, Secrets |
| [DEPLOYMENT.md](.claude/docs/DEPLOYMENT.md) | Coolify-Setup auf Hostinger-VPS |
| [SAAS_READINESS.md](.claude/docs/SAAS_READINESS.md) | Checkliste für späteren App-Store-Launch |

`mvp-brainstorming.md` (im Repo-Root) ist die historische Quelle der Anforderungen vom User. Kuratierte, aktuelle Version ist [CONCEPT.md](.claude/docs/CONCEPT.md).

## Subagents

Spezialisierte Subagents leben unter [.claude/agents/](.claude/agents/):

| Agent | Wann nutzen |
|---|---|
| `architect` | Architektur-Entscheidungen, Design-Reviews, ADR-Entwürfe |
| `coder` | Backend-Routes, Business-Logik, Mobile-Logik (Test-first) |
| `db` | Schema, Migrationen, Indizes, Sync-Felder |
| `mobile-ux` | UI/UX, Gesten (Swipe-to-Track), Listen-Performance |
| `security` | Auth, PIN, JWT, Tenant-Isolation, Secrets, Dependencies |
| `reviewer` | End-to-End-Review vor Commit (DoD-Check) |

Subagent-Mapping zu Workflow-Schritten siehe [WORKFLOW.md](.claude/docs/WORKFLOW.md#subagent-mapping).

## Projekt-Struktur

Mobile-App liegt in [project-tracker/](project-tracker/). Geplante Workspace-Struktur (entsteht in Phase 1+):

```
projekt-tracker/
├── project-tracker/        # Expo Mobile App
├── packages/
│   ├── schema/             # geteiltes Drizzle-Schema (pg + sqlite)
│   └── server/             # Hono Backend
├── .claude/
│   ├── docs/               # Doku (siehe oben)
│   └── agents/             # Subagent-Definitionen
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

Backend- und Workspace-Skripte werden in Phase 0/1 ergänzt.
