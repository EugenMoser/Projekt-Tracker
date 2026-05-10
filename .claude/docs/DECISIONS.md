# DECISIONS — Architecture Decision Records (ADR-light)

Alle Architekturentscheidungen mit Datum, Kontext und Begründung. Jeder neue Eintrag bekommt eine fortlaufende Nummer (ADR-001, ADR-002, …). Status: `proposed` / `accepted` / `superseded by ADR-XXX`.

---

## ADR-001 — Single-User MVP, Multi-Tenant-fähiges Schema

**Datum**: 2026-05-10
**Status**: accepted

**Kontext**: Der App-User ist im MVP einzig — eine Authentifizierung mit Login wäre Overkill. Gleichzeitig wurde geäußert, dass die App perspektivisch in den App Store soll und kostenpflichtig nutzbar sein wird (Multi-User).

**Optionen**:
1. Hartes Single-User-Schema; bei SaaS-Wechsel komplette Datenmigration
2. Multi-Tenant-fähiges Schema von Tag 1, im MVP fix mit 1 User-Eintrag befüllt
3. Erst SaaS-Vollausbau, dann MVP — zu groß

**Wahl**: Option 2.

**Begründung**: `user_id` auf jeder mandantenbezogenen Tabelle ist günstig anzulegen, schließt aber Migrations-Hölle später aus. Backend-Disziplin (alle Queries `WHERE user_id = ?`) wird via Repository-Schicht erzwungen.

**Konsequenzen**: Siehe `ARCHITECTURE.md` (Multi-Tenant-Pattern), `DATA_MODEL.md` (user_id-Scoping), `SAAS_READINESS.md`.

---

## ADR-002 — Drizzle als ORM für Server UND Client

**Datum**: 2026-05-10
**Status**: accepted

**Kontext**: Backend ist Node/TS + Postgres. Mobile braucht eine lokale DB (SQLite) für Offline-Support.

**Optionen**:
1. Prisma im Backend, eigene SQLite-Queries im Client
2. Prisma im Backend, `@prisma/client/react-native` im Client
3. Drizzle in beiden Schichten

**Wahl**: Option 3 (Drizzle).

**Begründung**:
- Einheitliches Schema-Definitions-Format → wiederverwendbare Typen
- Drizzle hat sauberen RN-Support via `expo-sqlite`-Driver
- Keine zwei Codegen-Pipelines
- Migrations via `drizzle-kit` für beide Targets

**Konsequenzen**:
- Geteiltes Package `packages/schema/` mit `pg.ts`, `sqlite.ts`, `shared.ts`
- Drizzle-Lernkurve für Team — User hat bestätigt

---

## ADR-003 — Hono als Backend-Framework

**Datum**: 2026-05-10
**Status**: accepted

**Kontext**: Backend ist klein (CRUD + Sync + Excel-Export), läuft in Docker auf VPS.

**Optionen**:
1. Express — verbreitet, aber alt
2. Fastify — performant, größer
3. NestJS — überdimensioniert für diesen Scope
4. Hono — leicht, modern, edge-/runtime-agnostisch

**Wahl**: Hono.

**Begründung**:
- Sehr kleines Container-Image
- Native TypeScript-Typen für Routen
- Trivialer Auth-Middleware-Workflow (`ctx.set('userId', ...)`)
- Falls später Edge-Deploy gewünscht (Cloudflare Workers etc.) → kompatibel

---

## ADR-004 — Last-Write-Wins (LWW) Sync, kein CRDT

**Datum**: 2026-05-10
**Status**: accepted

**Kontext**: Sync zwischen Mobile-Client und Server.

**Optionen**:
1. CRDT (Yjs, Automerge) — aufwändig, robust gegen konkurrierende Edits
2. Last-Write-Wins per `updated_at`-Timestamp
3. Operational Transform — komplex, für Text-Editing optimiert

**Wahl**: LWW.

**Begründung**: Single-User → keine echten konkurrierenden Edits zu erwarten. Selbst bei Multi-Device wird derselbe User selten gleichzeitig zwei Geräte editieren. CRDT-Setup ist Wochen-Aufwand für 0 Mehrwert.

**Konsequenzen**:
- Im (seltenen) Konfliktfall gewinnt Server-Version
- Logging der Konflikte für Debugging
- Falls Multi-User-SaaS später → Re-Evaluation (ADR-Update oder Superseded-by-Folge-ADR)

---

## ADR-005 — Coolify auf Hostinger statt manuellem Compose

**Datum**: 2026-05-10
**Status**: accepted

**Kontext**: VPS bei Hostinger ist vorhanden, Coolify ist bereits installiert.

**Optionen**:
1. Manuelles `docker-compose.yml` + Caddy/Traefik
2. Coolify (orchestriert Docker, Reverse-Proxy, Auto-HTTPS, PG-Backups)
3. Kubernetes — Overkill

**Wahl**: Coolify.

**Begründung**: Bereits eingerichtet, nimmt uns Reverse-Proxy / TLS / Backup-Bürokratie ab. Eigene Compose-Files sind erlaubt, falls Coolify-Limits gefunden werden.

---

## ADR-006 — App-PIN + Biometrie (geräte-lokal)

**Datum**: 2026-05-10
**Status**: accepted

**Kontext**: Single-User MVP — voller Auth-Flow nicht nötig, aber Daten sollten bei Geräte-Diebstahl geschützt sein.

**Optionen**:
1. Keine App-Lock — nur OS-Bildschirmsperre
2. App-PIN (4–6 Stellen) im `expo-secure-store`
3. PIN + Biometrie (FaceID/TouchID/Fingerprint)

**Wahl**: PIN + Biometrie (Phase 4).

**Begründung**: Geringer Aufwand, hoher Sicherheitsgewinn. Biometrie als bequemer Default, PIN als Fallback.

**Konsequenzen**: Siehe `SECURITY.md` Abschnitt App-Lock.

---

## ADR-007 — Geld als Integer in Cent

**Datum**: 2026-05-10
**Status**: accepted

**Kontext**: Stundensätze + Festpreise im Schema.

**Optionen**:
1. `numeric(10,2)` in PG, Float-Konvertierung in JS
2. Integer-Cent (`hourly_rate_cents`, `fixed_price_cents`)
3. Decimal-Library (decimal.js)

**Wahl**: Integer-Cent.

**Begründung**: JS-Floats verursachen Rundungsfehler in Geld-Operationen. Integer ist exakt, einfach zu testen, weltweit Best Practice für Geld in Datenbanken.

**Konsequenzen**: UI-Schicht macht `cents → display`-Konvertierung; Validierungen prüfen Integer-Eingang.

---

## ADR-008 — Tarif-Snapshot pro Zeiteintrag

**Datum**: 2026-05-10
**Status**: accepted

**Kontext**: Stundensatz eines Projekts kann sich ändern. Wie wirken Änderungen auf bestehende Zeiteinträge?

**Optionen**:
1. Stundensatz lebt nur am Projekt → Änderung wirkt rückwirkend auf alle Einträge
2. Snapshot beim Erstellen jedes Zeiteintrags (`rate_snapshot_cents`)
3. Tarif-Historie als eigene Tabelle mit Gültigkeitszeitraum

**Wahl (vorgeschlagen)**: Option 2.

**Begründung**: Rechnungstreue („was war der Satz, als ich gearbeitet habe?") + viel einfacher als Tarif-Historie. Bei MVP völlig ausreichend.

**Konsequenzen**: Spalte `rate_snapshot_cents` + `pricing_mode_snapshot` in `time_entries` (siehe DATA_MODEL.md).

---

## ADR-009 — Nur ein Timer global gleichzeitig aktiv

**Datum**: 2026-05-10
**Status**: accepted

**Kontext**: Beim Tracken kann es passieren, dass der User ein neues Projekt startet, während ein Timer noch läuft.

**Optionen**:
1. Mehrere parallele Timer erlaubt
2. Nur ein Timer global; beim Start eines neuen Projekts wird der laufende automatisch gestoppt

**Wahl**: Option 2.

**Begründung**: Vermeidet Doppel-Buchungen, einfachere UI, klare Semantik. Beim erzwungenen Stop des alten Timers fragt das Modal sofort nach der Aufgabe → keine Daten verloren.

**Konsequenzen**:
- `timers`-Tabelle hat Unique-Constraint auf `(user_id)` (siehe DATA_MODEL.md)
- UI: beim Tap auf ein anderes Projekt während laufendem Timer → Stop-Modal des alten Projekts → nach Speichern startet das neue

---

## ADR-010 — Kundennummer 5-stellig im MVP, Schema bruchfrei auf 6-stellig erweiterbar

**Datum**: 2026-05-10
**Status**: accepted

**Kontext**: Brainstorming gibt 5-stelliges Schema vor (`YY` + `A` + `LL`). Bei vielen Kunden pro Jahr und Auftragsart läuft die 2-stellige laufende Nummer (`LL`) bei 99 voll. Nach Multi-User-Rollout wird das wahrscheinlicher.

**Optionen**:
1. Hartes Limit bei 99 — App weigert sich
2. JETZT 5-stellig (lfd. 2-stellig); Schema lässt 6-stellig zu, beim Multi-User-Rollout aktivieren
3. JETZT direkt 6-stellig (lfd. 3-stellig)

**Wahl**: Option 2.

**Begründung**: User möchte am Brainstorming festhalten (5-stellig). Schema-Spalte `customer_number` als `varchar(8)` definiert → künftiger Wechsel zu `261042`-Stil ist ein UI-/Logik-Update, keine Schema-Migration.

**Konsequenzen**:
- `customers.customer_number` ist `varchar(8)` (nicht fix 5)
- Numerierungs-Algorithmus liefert im MVP 5-stellig; Erweiterung über Feature-Flag oder app-version-bedingt
- Tests prüfen 99 → 100 Edge-Case (im MVP wirft Fehler bzw. zeigt klare Meldung)

---

## ADR-011 — Globale Aufgabenliste pro User, m:n zu Projekten

**Datum**: 2026-05-10
**Status**: accepted

**Kontext**: Brainstorming spricht von „Aufgaben anlegen" und „aus Aufgabenliste auswählen". Ist die Liste global (pro User) oder pro Projekt?

**Optionen**:
1. Aufgaben pro Projekt
2. Aufgaben global pro User, m:n zu Projekten

**Wahl**: Option 2.

**Begründung**: Wiederverwendung über Projekte hinweg (z.B. „Bildbearbeitung" passt zu vielen Projekten). Stichworte (Tags) hängen an Aufgaben — würde sich bei Projekt-Scope mehrfach pflegen müssen.

**Konsequenzen**: Schema hat `tasks`-Tabelle mit `user_id` (nicht `project_id`) und Junction-Tabelle `project_tasks`. Siehe DATA_MODEL.md.

---

## ADR-012 — Aufgabe optional beim Projekt-Anlegen, Pflicht beim ersten Stop

**Datum**: 2026-05-10
**Status**: accepted

**Kontext**: Brainstorming: „Aufgabe auswählen (required)" beim Projekt-Anlegen. Frage: zwingt das nicht zur unnötigen Vor-Auswahl?

**Optionen**:
1. Pflicht beim Anlegen (laut Brainstorming-Wortlaut)
2. Optional beim Anlegen; Pflicht erst, wenn der erste Timer gestoppt wird (Stop-Modal fragt eh nach Aufgabe)

**Wahl**: Option 2.

**Begründung**: Niedrigere Friction beim schnellen Anlegen. Beim ersten Stop muss eh eine Aufgabe gewählt werden — wird dann automatisch dem Projekt zugeordnet.

**Konsequenzen**:
- `project_tasks`-Junction kann beim Anlegen leer sein
- Stop-Modal speichert die gewählte Aufgabe sowohl im `time_entries`-Eintrag als auch (falls noch nicht vorhanden) als neue `project_tasks`-Verknüpfung

---

## ADR-013 — Festpreis-Export: Festpreis-Position + Zeit-Info-Spalte (ohne Geld)

**Datum**: 2026-05-10
**Status**: accepted

**Kontext**: Bei Festpreis-Projekten ist im Brainstorming nur „Zeit kumuliert pro Aufgabe nur bei Stundensatz" erwähnt. Was passiert mit der Zeit bei Festpreis?

**Optionen**:
1. Nur Festpreis-Position, keine Zeit
2. Festpreis-Position + Zeit-Info-Spalte (ohne Geldbetrag)
3. Beides wählbar im Export-Modal

**Wahl**: Option 2.

**Begründung**: Festpreis ist die rechnungsrelevante Zahl. Die kumulierte Zeit ist trotzdem hilfreich für die eigene Kalkulations-Kontrolle (z.B. für das nächste Pauschalangebot). Keine zusätzliche Modal-UI nötig.

**Konsequenzen**:
- Excel-Renderer fügt bei Festpreis-Projekten eine Spalte „Zeit (Info)" hinzu, ohne Betragsspalte
- Aufgaben-Aufschlüsselung wie bei Stundensatz, aber kein Stundensatz-Wert

---

## ADR-014 — Manuelle Zeit-Korrektur im MVP

**Datum**: 2026-05-10
**Status**: accepted

**Kontext**: „Timer vergessen zu stoppen" ist ein klassischer Mobile-Tracker-Use-Case. Soll Korrektur-UI sofort oder erst später kommen?

**Optionen**:
1. Editieren + Löschen einzelner Zeiteinträge im MVP
2. Nur Löschen, Edit erst Phase 2+
3. Keine Korrektur im MVP — nur durchs Anlegen ersetzen

**Wahl**: Option 1.

**Begründung**: Mobile-Tracker ohne Korrektur-Funktion frustriert schnell. Zusätzlicher Aufwand ist überschaubar (Edit-Form für `time_entries` + Delete-Action).

**Konsequenzen**:
- Mobile bekommt einen Zeiteintrags-Editor (Start, Ende, Aufgabe, Notiz)
- Edit ändert auch `rate_snapshot_cents` NICHT (Tarif bleibt eingefroren); explizit dokumentieren
- Delete = Soft-Delete via `deleted_at`

---

## Template für neue ADRs

```
## ADR-XXX — Titel

**Datum**: YYYY-MM-DD
**Status**: proposed | accepted | superseded by ADR-YYY

**Kontext**: <Was ist die Situation, wer ist betroffen>

**Optionen**:
1. ...
2. ...
3. ...

**Wahl**: <Option N>

**Begründung**: <Warum genau diese>

**Konsequenzen**: <Was ändert sich, wo dokumentiert>
```
