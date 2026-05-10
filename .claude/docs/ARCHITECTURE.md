# ARCHITECTURE

Technische Gesamtarchitektur des Projekt-Trackers. Quelle: User-Antworten in der Plan-Phase.

## Komponenten-Übersicht

```
┌────────────────────────────────────────────────────────────────┐
│                       MOBILE-APP (Expo)                        │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Screens     │  │  TanStack    │  │  Sync-Worker         │  │
│  │  (RN/Router) │──│  Query       │──│  (Push/Pull, Retry)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│           │              │                       │             │
│           ▼              ▼                       │             │
│  ┌──────────────────────────────────┐            │             │
│  │  Drizzle ORM (Client-Dialect)    │            │             │
│  └──────────────────────────────────┘            │             │
│           │                                      │             │
│           ▼                                      │             │
│  ┌──────────────────────────────────┐            │             │
│  │  expo-sqlite  (lokale DB)        │            │             │
│  └──────────────────────────────────┘            │             │
│           │                                      │             │
│  ┌──────────────────────────────────┐            │             │
│  │  expo-secure-store (JWT, PIN)    │            │             │
│  │  expo-local-authentication       │            │             │
│  └──────────────────────────────────┘            │             │
│                                                  │             │
└──────────────────────────────────────────────────┼─────────────┘
                                                   │ HTTPS / JSON
                                                   ▼
┌────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node + Hono)                       │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Auth-Middleware  →  ctx.userId / ctx.tier              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                 │
│  ┌──────────────┐  ┌─────────┴────────┐  ┌──────────────────┐  │
│  │  /v1/sync    │  │  /v1/projects    │  │  /v1/exports     │  │
│  │  Push/Pull   │  │  CRUD            │  │  Excel-Render    │  │
│  └──────────────┘  └──────────────────┘  └──────────────────┘  │
│                              │                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Drizzle ORM (PG-Dialect) — alle Queries WHERE user_id   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                 │
└──────────────────────────────┼─────────────────────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │   PostgreSQL 16     │
                    └─────────────────────┘

   Alles in Docker auf Hostinger-VPS, orchestriert von Coolify
   (Reverse-Proxy, Auto-HTTPS, PG-Backups, Build-Pipeline)
```

## Schichten

### 1. Mobile (Expo SDK 54)
- **Routing**: expo-router (file-based)
- **State**: TanStack Query — Cache + Mutations + Optimistic Updates
- **Lokale DB**: expo-sqlite + Drizzle (Client-Dialect)
- **Auth**: JWT in `expo-secure-store`; App-PIN/Biometrie via `expo-local-authentication`
- **UI-Performance**: FlashList für Listen, Reanimated v4 für Gesten (Swipe-to-Track)

### 2. Sync-Worker (im Mobile-Client)
- **Strategie**: Last-Write-Wins (LWW) mit `updated_at`-Timestamp
- **Begründung**: Single-User → keine konkurrierenden Edits zu erwarten; CRDT wäre Overkill
- **Push-Pull-Loop**:
  1. Push: Lokale Änderungen seit letztem Sync (`updated_at > last_pushed_at`) → POST `/v1/sync/push`
  2. Pull: Server-Änderungen seit letztem Pull (`?since=<ts>`) → GET `/v1/sync/pull`
  3. Konflikte: Server-Version gewinnt, falls `server.updated_at > local.updated_at`
- **Retry**: Exponential Backoff bei Netzwerkfehlern; Sync-Status in der UI sichtbar
- **Trigger**: App-Resume, manuelles Pull-to-Refresh, periodisch (z.B. alle 60 s im Vordergrund)
- **Soft Delete**: Löschungen bekommen `deleted_at`-Flag, werden bei Sync mit übertragen

### 3. Backend (Node 22 + Hono)
- **API**: REST/JSON, alle Endpunkte unter `/v1/...`
- **Auth-Middleware**: validiert JWT, setzt `ctx.userId` + `ctx.tier`. Kein Endpoint ohne Auth (außer `/v1/auth/*`).
- **ORM**: Drizzle (PG-Dialect)
- **Validation**: Zod-Schemas für alle Request-/Response-Bodies
- **Logging**: pino, strukturiert
- **Error-Handling**: Single-Funnel-Middleware → konsistentes JSON-Format

### 4. Datenbank (PostgreSQL 16)
- Schema in `packages/schema/` (siehe `DATA_MODEL.md`)
- Migrationen via `drizzle-kit`
- Coolify übernimmt Daily Backups

### 5. Schema-Sharing-Package
```
packages/schema/
├── pg.ts        # Postgres-Schema (Server)
├── sqlite.ts    # SQLite-Schema (Client)
├── shared.ts    # gemeinsame Typen, Zod-Validierungen
└── index.ts
```
- Beide Dialekte halten identische Spaltennamen/Constraints
- Drizzle generiert Types einmal — konsumiert von Server und Client

## Multi-Tenant-Pattern (SaaS-Ready)

Auch wenn der MVP Single-User ist: jede Tabelle, die **Nutzdaten** enthält, hat eine `user_id`-FK + Index.

### Backend-Disziplin

```ts
// JEDE Query MUSS user_id-Filter haben
const projects = await db
  .select()
  .from(projectsTable)
  .where(eq(projectsTable.userId, ctx.userId));
```

**Hilfsmittel**:
- Repository-Schicht (`packages/server/repositories/`) wickelt Drizzle-Queries — alle haben `userId`-Parameter als Pflichtargument
- Lint-Regel oder Test, der ungescopte Queries verbietet (siehe `SECURITY.md`)

### Sync-Channel-Isolation
- Sync-Endpoints filtern serverseitig anhand `ctx.userId`
- Client kennt nur eigene Daten — kein cross-tenant Leak möglich

## Datenfluss-Beispiel: „Timer stoppen"

```
1. User tippt Stop  →  Modal öffnet sich
2. User wählt Aufgabe  →  Submit
3. Mobile schreibt:
     - INSERT INTO time_entries (project_id, task_id, user_id, started_at, ended_at, rate_snapshot, updated_at=now())
     - UPDATE timers SET active = false (lokal)
4. TanStack Query optimistisch invalidiert
5. Sync-Worker (im Hintergrund) pusht den neuen Eintrag → Server
6. Server validiert, persistiert in PG, gibt server-updated_at zurück
7. Client mergt zurück, markiert Eintrag als "synced"
```

**Failure-Modi**:
- Offline: Sync-Worker retried; UI zeigt Sync-Indicator („3 Einträge ausstehend")
- 401: JWT abgelaufen → Refresh-Flow (im MVP: Re-Login mit PIN/Biometrie)
- Konflikt: Server-Version übernommen, lokale Änderung verworfen → Logging für Debug

## API-Versionierung

- Alle Endpunkte unter `/v1/...`
- Breaking Changes in Zukunft via `/v2/...`; alter Endpoint bleibt mind. 1 App-Release lang lebendig
- App schickt `X-App-Version`-Header → Backend kann gezielt deprecation-Warnings senden

## Fehler-/Retry-Verhalten

| Szenario | Verhalten |
|---|---|
| Netzwerkfehler beim Sync-Push | Exponential Backoff: 1 s, 2 s, 4 s, 8 s, max 30 s; pausiert bei `offline` |
| 401 Unauthorized | Re-Auth-Flow (PIN), neue JWT, Sync wieder aufnehmen |
| 409 Conflict (Server-Version neuer) | Server-Version übernehmen, lokal überschreiben, Toast „lokale Änderung verworfen" |
| 500 Server-Error | Backoff wie Netzwerkfehler; nach 5 Fehlversuchen User informieren |
| Excel-Export-Timeout | Server streamt Datei direkt (kein Polling), Mobile zeigt Spinner mit Cancel |

## Performance-Leitplanken

- Mobile-Listen IMMER mit `FlashList`, nicht `FlatList`
- Reanimated-Worklets für Gesten (60 fps)
- Backend-Endpunkte unter 200 ms p95 für Sync-Calls
- DB-Indizes auf allen FK + `(user_id, updated_at)` für Sync-Queries
- Excel-Export läuft synchron im MVP (max. 1 User → kein Queue-System nötig)

## Was hier explizit nicht behandelt wird
- Konkrete Schema-Definitionen → `DATA_MODEL.md`
- Security-Details (PIN, Secrets, Hardening) → `SECURITY.md`
- Deployment-Topologie auf VPS → `DEPLOYMENT.md`
- Roadmap der Phasen → `ROADMAP.md`
