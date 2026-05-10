# DATA MODEL

Datenmodell für PostgreSQL (Server) und SQLite (Client). Beide sind Drizzle-basiert und teilen sich Spaltennamen/Constraints — Dialekt-Unterschiede nur dort, wo nötig (Typen, Default-Funktionen).

## Konventionen

- **Spaltennamen**: `snake_case`
- **Tabellennamen**: Plural (`projects`, `customers`, `time_entries`)
- **PKs**: `id` als `uuid` (PG: `gen_random_uuid()`, SQLite: client-generierte UUIDv7)
- **Mandanten-Spalte**: `user_id` (FK auf `users.id`) auf jeder mandantenbezogenen Tabelle — NIE NULL
- **Audit**: `created_at`, `updated_at` (`timestamp`/`integer`-ms), `deleted_at` (nullable, für Soft-Delete + Sync)
- **Sync-Spalte**: `updated_at` ist der Last-Write-Wins-Marker

## ER-Skizze

```
┌──────────┐       ┌─────────────────┐       ┌──────────┐
│  users   │──┬───<│  customers      │>──┬──<│ projects │
└──────────┘  │    └─────────────────┘   │   └──────────┘
              │            │             │         │
              │            │             │         │
              │       ┌────┴───────┐     │    ┌────┴──────────┐
              │       │ order_types │     │    │ time_entries │
              │       └─────────────┘     │    └───────────────┘
              │                           │            │
              │                           │            │
              │       ┌────────┐          │    ┌───────┴──┐
              ├──────<│ tasks  │>─────m:n─┴────│ projects │
              │       └────────┘          (project_tasks)
              │            │
              │            │ m:n
              │       ┌────┴────────┐
              └──────<│  tags       │
                      └─────────────┘
                       (task_tags)
```

## Tabellen

### `users`

| Spalte | Typ (PG) | Constraints | Notiz |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `display_name` | `text` | not null | im MVP fest „Owner" |
| `tier` | `text` | not null, default `'pro'` | MVP-User ist `'pro'`. Später: `'free'` / `'pro'` / `'expired'`. Schon im Schema, damit später kein Migrationsbruch. |
| `created_at` | `timestamptz` | not null, default `now()` | |
| `updated_at` | `timestamptz` | not null, default `now()` | |

> Im MVP: genau 1 Eintrag. Trotzdem ist die Tabelle da, damit alle FKs korrekt sind.

### `order_types` (Auftragsarten)

| Spalte | Typ | Constraints | Notiz |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → users.id, not null, indexed | **Mandanten-Spalte** |
| `name` | `text` | not null | „Hochzeitsfotografie" |
| `digit` | `smallint` | not null, 1–9 | Ziffer für Kundennummer-Bildung |
| `created_at` / `updated_at` / `deleted_at` | wie oben | | |

**Unique**: `(user_id, digit)` — pro User pro Ziffer max. eine Auftragsart.
**Unique**: `(user_id, name)` — kein Duplikat-Name pro User.

### `customers`

| Spalte | Typ | Constraints | Notiz |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK → users.id, not null, indexed | **Mandanten-Spalte** |
| `customer_number` | `varchar(8)` | not null | `YYALL` (5-stellig MVP) — Schema lässt 8 zu, falls lfd. Nr. künftig 3-stellig |
| `order_type_id` | `uuid` | FK → order_types.id, not null | |
| `name` | `text` | not null | |
| `street` | `text` | nullable | |
| `zip` | `varchar(10)` | nullable | |
| `city` | `text` | nullable | |
| `created_at` / `updated_at` / `deleted_at` | | | |

**Unique**: `(user_id, customer_number)`
**Index**: `(user_id, order_type_id, created_at)` — für Numerierungs-Algorithmus

### `projects`

| Spalte | Typ | Constraints | Notiz |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK, not null, indexed | **Mandanten-Spalte** |
| `customer_id` | `uuid` | FK → customers.id, not null | |
| `title` | `text` | not null | |
| `description` | `text` | nullable | |
| `color` | `varchar(7)` | not null | Hex `#RRGGBB` |
| `pricing_mode` | `text` | not null, check `IN ('hourly','fixed')` | |
| `hourly_rate_cents` | `integer` | nullable | Pflicht bei `hourly`, sonst null |
| `fixed_price_cents` | `integer` | nullable | Pflicht bei `fixed`, sonst null |
| `status` | `text` | not null, default `'active'`, check `IN ('active','archived')` | |
| `created_at` / `updated_at` / `deleted_at` | | | |

**Check-Constraint** (XOR): `(pricing_mode='hourly' AND hourly_rate_cents IS NOT NULL AND fixed_price_cents IS NULL) OR (pricing_mode='fixed' AND fixed_price_cents IS NOT NULL AND hourly_rate_cents IS NULL)`

**Index**: `(user_id, status, updated_at)` — für Sync und Startseite

> Geld in **Cent als Integer** speichern, nie als Float. Vermeidet Rundungsfehler.

### `tasks` (globale Aufgabenliste pro User)

| Spalte | Typ | Constraints | Notiz |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK, not null, indexed | **Mandanten-Spalte** |
| `description` | `text` | not null | |
| `created_at` / `updated_at` / `deleted_at` | | | |

**Unique**: `(user_id, description)` — pro User keine Duplikate.

### `tags` (Stichworte)

| Spalte | Typ | Constraints | Notiz |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK, not null, indexed | **Mandanten-Spalte** |
| `title` | `text` | not null | |
| `created_at` / `updated_at` / `deleted_at` | | | |

**Unique**: `(user_id, title)`

### `task_tags` (m:n Aufgabe ↔ Tag)

| Spalte | Typ | Constraints |
|---|---|---|
| `task_id` | `uuid` | FK → tasks.id, on delete cascade |
| `tag_id` | `uuid` | FK → tags.id, on delete cascade |
| `user_id` | `uuid` | FK → users.id, not null, indexed (denormalisiert für sauberen Query-Filter) |

**PK**: `(task_id, tag_id)`

### `project_tasks` (m:n Projekt ↔ Aufgabe)

| Spalte | Typ | Constraints |
|---|---|---|
| `project_id` | `uuid` | FK → projects.id, on delete cascade |
| `task_id` | `uuid` | FK → tasks.id, on delete cascade |
| `user_id` | `uuid` | FK → users.id, not null, indexed |

**PK**: `(project_id, task_id)`

### `time_entries`

| Spalte | Typ | Constraints | Notiz |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK, not null, indexed | **Mandanten-Spalte** |
| `project_id` | `uuid` | FK → projects.id, not null | |
| `task_id` | `uuid` | FK → tasks.id, not null | |
| `started_at` | `timestamptz` | not null | |
| `ended_at` | `timestamptz` | not null | bei laufendem Timer ist Eintrag noch nicht angelegt |
| `duration_seconds` | `integer` | not null, generated | `EXTRACT(EPOCH FROM ended_at - started_at)::int` (PG generated column) |
| `rate_snapshot_cents` | `integer` | nullable | bei `hourly` der eingefrorene Stundensatz; bei `fixed` null |
| `pricing_mode_snapshot` | `text` | not null | snapshot des Projekt-Modus (für historische Korrektheit) |
| `notes` | `text` | nullable | optional, für manuelle Notizen |
| `created_at` / `updated_at` / `deleted_at` | | | |

**Index**: `(user_id, started_at desc)` — für Listen
**Index**: `(user_id, project_id, started_at desc)` — für Projekt-Detail
**Index**: `(user_id, updated_at)` — für Sync

> **Tarif-Historie**: Beim Erstellen eines Eintrags wird der aktuelle Stundensatz/`pricing_mode` des Projekts in den Eintrag kopiert. Spätere Tarif-Änderungen am Projekt wirken nur auf neue Einträge.

### `timers` (laufender Timer-State)

| Spalte | Typ | Constraints | Notiz |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | FK, not null | **Mandanten-Spalte** |
| `project_id` | `uuid` | FK → projects.id, not null | |
| `started_at` | `timestamptz` | not null | |
| `created_at` / `updated_at` | | | |

**Unique**: `(user_id)` — nur EIN aktiver Timer pro User (siehe Open Question 1 in CONCEPT.md). Wird im MVP so umgesetzt; falls anders gewünscht: Unique entfernen.

### `app_settings` (Single-Row pro User)

| Spalte | Typ | Constraints | Notiz |
|---|---|---|---|
| `user_id` | `uuid` | PK + FK | |
| `pin_hash` | `text` | nullable | bcrypt/argon2 Hash, falls PIN gesetzt |
| `biometric_enabled` | `boolean` | not null, default false | |
| `last_export_period` | `text` | nullable | merkt sich Default für Export-Modal |
| `updated_at` | | | |

> PIN wird **clientseitig** gehasht und in `expo-secure-store` gehalten — der Server bekommt nur den Hash zur Synchronisation, falls Multi-Device-Support später gewünscht. Im MVP reicht reine Client-Speicherung; Server-Spalte trotzdem schon vorhanden.

## Migrations-Strategie

- Tool: `drizzle-kit`
- Verzeichnis: `packages/schema/migrations/`
- Migrationen sind **forward-only** (kein Rollback). Bei Fehlern: neue Forward-Migration schreiben, die korrigiert.
- Server: Migrationen laufen automatisch beim Container-Start (`drizzle-kit migrate`).
- Client: Drizzle-SQLite-Migrationen werden beim App-Start ausgeführt; Schema-Versionsnummer in lokaler `meta`-Tabelle.

## Soft-Delete + Sync

- `deleted_at IS NOT NULL` → Eintrag gilt als gelöscht, wird bei UI-Queries gefiltert
- Sync überträgt auch gelöschte Einträge, damit Client lokal aufräumen kann
- Hard-Delete erst nach 30 Tagen via Server-Cron (Phase 2+)

## Dialekt-Unterschiede

| Feature | PG | SQLite |
|---|---|---|
| UUID | `uuid` Typ + `gen_random_uuid()` | `text` + UUIDv7 client-generiert |
| Zeitstempel | `timestamptz` | `integer` (Unix-ms) — Drizzle konvertiert Date↔Number |
| Generated Columns | nativ | berechnet im Application-Code |
| Check Constraints | nativ | unterstützt ab SQLite 3.x |

## Open Punkte (siehe CONCEPT.md)

- Kundennummern-Edge-Case → Spalte ist mit `varchar(8)` schon vorbereitet
- Festpreis-Export-Felder → ggf. zusätzliche View / Aggregation auf Server
- Multi-Timer-Support → einfaches Entfernen des Unique-Constraints auf `timers.user_id`
