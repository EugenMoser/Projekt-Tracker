# SAAS_READINESS

Checkliste: Was ist bereits SaaS-fähig vorbereitet, was fehlt für einen kostenpflichtigen App-Store-Launch.

## Status-Legende

- ✅ Erledigt im MVP
- 🟡 Im MVP teilweise erledigt (Schema/Hooks da, Logik fehlt)
- ❌ Außerhalb MVP-Scope (Phase 6+)

---

## Architektur

| Anforderung | Status | Wo? |
|---|---|---|
| `user_id` auf jeder mandantenbezogenen Tabelle | 🟡 (geplant) | DATA_MODEL.md |
| Backend-Queries scopen auf `user_id` (Repository-Pattern) | 🟡 (geplant) | ARCHITECTURE.md, SECURITY.md |
| Auth-Middleware setzt `ctx.userId`, `ctx.tier` | 🟡 (geplant Phase 2) | ARCHITECTURE.md |
| API-Versionierung `/v1/...` | 🟡 (geplant) | ARCHITECTURE.md |
| Sync-Channel pro `user_id` | 🟡 (geplant Phase 2) | ARCHITECTURE.md |
| Kundennummer-Counter pro User+Auftragsart+Jahr | 🟡 (geplant) | CONCEPT.md, DATA_MODEL.md |
| Geld als Integer-Cent | 🟡 (geplant) | DATA_MODEL.md ADR-007 |

## Auth & User-Management

| Anforderung | Status | Phase |
|---|---|---|
| Long-Lived Device-JWT | 🟡 | Phase 2 |
| App-PIN + Biometrie (Geräte-Lock) | 🟡 | Phase 4 |
| Email-/Passwort-Auth | ❌ | Phase 6 |
| Email-Verifikation | ❌ | Phase 6 |
| Passwort-Reset-Flow | ❌ | Phase 6 |
| Apple Sign-In (iOS-Pflicht bei Drittanbieter-Logins) | ❌ | Phase 6 |
| Account-Löschung in der App (Apple iOS-17-Pflicht) | ❌ | Phase 6 |
| Cascading-Delete bei Account-Löschung | ❌ | Phase 6 |

## App-Store-Compliance

| Anforderung | Status | Phase |
|---|---|---|
| App-Icons (alle Auflösungen) | ❌ | Phase 6 |
| Splash-Screens | ❌ | Phase 6 |
| Datenschutzerklärung URL | ❌ | Phase 6 |
| AGB / Terms of Service URL | ❌ | Phase 6 |
| Impressum URL | ❌ | Phase 6 (DE-Pflicht) |
| Privacy-Manifest (iOS 17+) | ❌ | Phase 6 |
| App-Store-Screenshots | ❌ | Phase 6 |
| App-Store-Beschreibung (DE/EN) | ❌ | Phase 6 |
| TestFlight-Setup | ❌ | Phase 6 |
| Google Play Console Track-Setup | ❌ | Phase 6 |

## DSGVO / Datenschutz

| Anforderung | Status | Phase |
|---|---|---|
| Datenschutz-konformes Logging (kein PII) | 🟡 (geplant) | SECURITY.md |
| User kann eigene Daten exportieren (Recht auf Datenübertragbarkeit) | ❌ | Phase 6 |
| User kann Account+Daten löschen (Recht auf Löschung) | ❌ | Phase 6 |
| Cookie-Banner / Tracking-Consent (falls Web) | ❌ | Phase 6 (nur falls Tracking-Tools eingebaut werden) |
| Auftragsverarbeitungsvertrag-fähig (für B2B-Kunden) | ❌ | Phase 8 |

## Monetarisierung

| Anforderung | Status | Phase |
|---|---|---|
| `tier`-Spalte in `users` (`free`/`pro`/`expired`) | 🟡 (Schema bereit) | DATA_MODEL.md |
| JWT enthält `tier`-Claim | 🟡 (geplant) | ARCHITECTURE.md |
| Apple StoreKit 2 Integration | ❌ | Phase 7 |
| Google Play Billing Integration | ❌ | Phase 7 |
| Server-seitige Receipt-Validation | ❌ | Phase 7 |
| Webhook für Subscription-Events | ❌ | Phase 7 |
| Stripe-Integration für Web | ❌ | Phase 7 (optional) |
| Feature-Limits im Free-Tier (z.B. max. 3 Projekte) | ❌ | Phase 7 |
| Tier-Downgrade ohne Datenverlust | ❌ | Phase 7 |

## Skalierung

| Anforderung | Status | Phase |
|---|---|---|
| Rate-Limiting global (MVP) | 🟡 (geplant) | SECURITY.md |
| Rate-Limiting per-User | ❌ | Phase 8 |
| Postgres Row-Level-Security als zweite Verteidigungslinie | ❌ | Phase 8 |
| Tenant-spezifische Backups | ❌ | Phase 8 |
| Branding pro User (Logo, Firmenadresse für Excel) | ❌ | Phase 8 |
| Monitoring & Error-Tracking (Sentry/Better Stack) | ❌ | Phase 8 |
| Lasttests (100+ parallele User) | ❌ | Phase 8 |
| Dunkelmodus / Theming | ❌ | Backlog |
| Mehrsprachigkeit (DE/EN) | ❌ | Backlog |

## Operations

| Anforderung | Status | Phase |
|---|---|---|
| Daily PG-Backups | 🟡 (Coolify) | Phase 5 |
| Off-Site Backup-Kopie | ❌ | Phase 5+ |
| Health-Check-Endpoint | 🟡 (geplant) | Phase 2 |
| Uptime-Monitoring | ❌ | Phase 5+ |
| Status-Page für User | ❌ | Phase 8 |
| Deployment-Rollback-Prozess | ❌ | Phase 5 |

---

## Was bedeutet das praktisch?

Wenn der User entscheidet, „Ich will jetzt in den App Store gehen", muss er **nicht** alle ❌-Punkte in einem Wurf abarbeiten — aber **mindestens** alle aus der Sektion **App-Store-Compliance** + **Auth & User-Management (Apple-Sign-In, Account-Löschung)** + **DSGVO**.

Die ✅- und 🟡-Punkte zeigen: das Schema und die Backend-Disziplin sind so vorbereitet, dass beim SaaS-Switch **keine Datenmigration** und **kein Schema-Bruch** anfällt — nur Feature-Erweiterungen.

## Pflicht-Hardlock vor App-Store-Submit (Apple)

1. **Apple Sign-In**, falls andere Drittanbieter-Logins angeboten werden
2. **In-App Account-Löschung** (Pflicht seit iOS 17)
3. **Privacy Manifest** mit erklärter Datennutzung
4. **App Tracking Transparency** Prompt, falls IDFA verwendet wird (im MVP nicht)
5. **Datenschutzerklärung URL** im App-Store-Eintrag
