# WORKFLOW

**Verbindlicher Feature-Workflow** für jede Änderung am Projekt. Vom User definiert, von allen Subagents zu befolgen.

## Der Loop

```
┌─────────────────────────────────────────────────────────────────┐
│  1. ANFORDERUNG konkretisieren                                  │
│     • Feature aus TODO.md picken (oder neu definieren)          │
│     • Akzeptanzkriterien / Definition of Done formulieren       │
│     • Scope klar abgrenzen — keine Goldplating                  │
│                                                                 │
│  2. RÜCKFRAGEN (wenn nötig)                                     │
│     • Unklare Punkte vor Implementierung klären                 │
│     • Architekturentscheidung? → DECISIONS.md ADR anlegen       │
│                                                                 │
│  3. UMSETZUNG                                                   │
│     • Subagent dispatchen je nach Scope (siehe Mapping unten)   │
│     • Test-first, wo sinnvoll (TDD)                             │
│     • Kleine, in sich geschlossene Diffs                        │
│                                                                 │
│  4. TESTEN + PRÜFUNG                                            │
│     • Unit-/Integrationstests grün                              │
│     • Manueller Smoke-Test (Simulator/Web)                      │
│     • Type-Check + Lint sauber                                  │
│     • Optional: security/architect/reviewer-Subagent            │
│                                                                 │
│  5. ANPASSUNGEN (wenn Issues)                                   │
│     • Zurück zu Schritt 3 — kleiner Fix-Loop                    │
│                                                                 │
│  6. COMMIT                                                      │
│     • Konventionelles Commit-Message-Format (siehe unten)       │
│     • PROGRESS.md aktualisieren (Datum + was erledigt)          │
│     • TODO.md updaten (Item abhaken / neue Folgeaufgaben)       │
│                                                                 │
│  7. ➜ NÄCHSTES FEATURE                                          │
└─────────────────────────────────────────────────────────────────┘
```

## Definition of Done (Checkliste pro Feature)

- [ ] Akzeptanzkriterien aus Schritt 1 sind alle erfüllt
- [ ] Tests grün (Unit + ggf. Integration)
- [ ] Manuell verifiziert auf iOS / Android / Web (sofern UI relevant)
- [ ] Keine TS-/Lint-Fehler (`npm run lint`, `tsc --noEmit`)
- [ ] Keine offensichtliche Performance-Regression (FlashList-Listen, schwere Re-Renders)
- [ ] Keine Secrets / Konfiguration im Diff
- [ ] `PROGRESS.md` ergänzt (Datum, was wurde geliefert, was kommt als nächstes)
- [ ] `TODO.md` aktualisiert (Item erledigt / Folgeaufgaben angelegt)
- [ ] Commit mit aussagekräftiger Message gemacht

## Subagent-Mapping

| Schritt | Primärer Subagent | Wann zusätzlich Reviewer? |
|---|---|---|
| 1. Anforderung konkretisieren | `architect` (bei größeren Features) | — |
| 2. Architekturentscheidung | `architect` schreibt ADR-Entwurf | — |
| 3. Umsetzung Backend / Schema | `db` (Schema, Migrations), `coder` (Routes, Services) | — |
| 3. Umsetzung Mobile | `mobile-ux` (UI/UX/Performance), `coder` (Logik) | — |
| 4. Review | `reviewer` | `security` bei Auth/Sync/Secrets |
| 6. Commit | (User commitet selbst) | — |

> **Hoheit über Commits liegt beim User.** Subagents bereiten den Commit vor (staging, Message-Vorschlag), aber führen ihn nicht autonom aus, sofern nicht explizit beauftragt.

## Commit-Message-Format

Konventioneller Stil — kurz, prägnant, im Imperativ:

```
<type>(<scope>): <kurze Beschreibung>

[optional body — WHY, nicht WHAT]
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `db`, `ci`, `style`

**Scopes** (Beispiele): `mobile`, `backend`, `schema`, `sync`, `auth`, `export`, `deploy`, `docs`

**Beispiele**:
- `feat(mobile): add project tile with swipe-to-start gesture`
- `db(schema): add user_id scoping to projects table`
- `fix(sync): retry on network error with exponential backoff`
- `docs(architecture): document multi-tenant pattern`

## Branch-Strategie

- `main` — immer deploybar
- `feat/<scope>` für Features
- `fix/<scope>` für Bugfixes
- Klein halten, schnell mergen — wir arbeiten Single-User, keine PR-Bürokratie nötig

## Was dieser Workflow NICHT will

- Große, gemischte Diffs („refactor + feature + cleanup in einem")
- Commits ohne aktualisierte `PROGRESS.md`
- Architekturentscheidungen ohne ADR in `DECISIONS.md`
- Subagent-Implementierungen ohne anschließenden Review-Schritt
