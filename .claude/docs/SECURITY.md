# SECURITY

Security-Konzept für den Projekt-Tracker. Im MVP Single-User self-hosted; Architektur ist auf Multi-Tenant (App Store) vorbereitet.

## Threat-Model — wer gegen wen?

| Asset | Threat | Mitigation |
|---|---|---|
| Lokale App-Daten (Kunden, Zeiten, Sätze) | Geräte-Diebstahl, OS-Bypass | App-PIN + Biometrie, `expo-secure-store` für sensible Werte |
| JWT auf dem Device | Auslesen aus unsicherem Storage | `expo-secure-store` (Keychain/Keystore), nie `AsyncStorage` |
| Verbindung Mobile ↔ Backend | MITM, Sniffing | HTTPS only (via Coolify-Auto-TLS); HTTP-Strict-Transport |
| Backend-Endpoints | Unauthenticated Access | Auth-Middleware vor allen `/v1/*` außer `/v1/auth/*` und `/v1/healthz` |
| Cross-Tenant-Datenleak (Multi-User später) | Vergessener `user_id`-Filter in Query | Repository-Schicht erzwingt `userId`; statischer Test verbietet ungescopte Queries |
| DB-Backup-Diebstahl | gestohlenes Backup-File | Backups verschlüsselt; Speicherort getrennt vom App-Server |
| Secrets im Repo | Versehentlicher Commit | `.env*` in `.gitignore`, Coolify-Env nicht im Repo |
| Dependency-Supply-Chain | Compromised npm-Pakete | `npm audit` regelmäßig, `pnpm.overrides` für bekannte Issues, Lockfile-Checks |
| Excel-Export-Parameter (Zeitraum, customerId) | Cross-Tenant durch manipulierte Anfrage | Server-seitige `userId`-Validierung — ignoriert Client-IDs |

## App-Lock (Phase 4)

### PIN
- 4–6 Stellen, Bestätigungs-Eingabe beim Setup
- **Hash via SHA-256(salt+pin)** via `expo-crypto` — niemals Klartext speichern. Argon2id/PBKDF2 sind in Expo SDK 54 nicht verfügbar; SHA-256 ist ein akzeptiertes Restrisiko (Offline-Brute-Force erfordert physischen Gerätezugriff/Backup-Kompromittierung). Kommentiert in `pinStorage.ts`.
- Hash + Salt in `expo-secure-store` (Keys: `pt_pin_hash`, `pt_pin_salt`)
- 5 Fehlversuche → 30 s Wartezeit, dann eskalierend (60 s, 300 s, 900 s Cap) — implementiert in `lockStore.ts`
- 10 Fehlversuche im Setup-Mode → App-Daten löschen: **Post-MVP, noch nicht implementiert**

### Biometrie
- `expo-local-authentication`
- **Biometrie ist Convenience, nicht Security** — bei OS-Schwächen Fallback auf PIN
- Bei Wechsel der Biometrie (z.B. neuer FaceID-Scan registriert) → PIN-Re-Auth fordern (`authenticateAsync({ disableDeviceFallback: false })` korrekt konfigurieren)

### Lock-Trigger
- App-Start (Cold)
- App-Resume nach Hintergrund > 60 s
- Nach Sensitive-Operation (Settings öffnen, PIN ändern) → Re-Auth

## JWT-Handling

- **Storage**: `expo-secure-store` (Keychain auf iOS, Keystore auf Android)
- **Lifetime**: Long-Lived Device-Token (1 Jahr) — Refresh erst, wenn Token abläuft oder serverseitig revoked
- **Claims** (auch im MVP schon):
  - `sub` = `userId`
  - `tenantId` = `userId` (im MVP gleich; bei späterer Multi-Tenant-Erweiterung ggf. eigener Wert)
  - `tier` = `'pro'` (im MVP fix; Schema-bereit für `'free'`/`'expired'`)
  - `iat`, `exp`
- **Signing**: HS256 mit langem Secret (mind. 256 bit) aus Coolify-Env
- **Revocation**: Server hat eine `revoked_tokens`-Tabelle (Phase 2+) — beim Logout wird `jti` eingetragen

## Tenant-Isolation (auch im Single-User wichtig)

### Backend-Disziplin

```ts
// FALSCH — keine WHERE-Klausel auf user_id
const projects = await db.select().from(projectsTable);

// RICHTIG — Repository-Layer erzwingt userId
const projects = await projectRepo.list({ userId: ctx.userId });
```

**Enforcement**:
1. **Repository-Schicht**: alle Datenbank-Funktionen haben `userId` als Pflichtargument
2. **Lint-Regel** (geplant): `no-direct-drizzle-imports-outside-repos`
3. **Integrationstest**: pro Endpoint Test mit User A's JWT, der User B's `id` als URL-Parameter manipuliert → muss 404 zurückgeben

### Drizzle-RLS-Optionen (post-MVP)
- PostgreSQL Row-Level-Security als zusätzliche Verteidigungsschicht — aktuell zurückgestellt; kann in Phase 8 nachgerüstet werden

## Input-Validation

- **Alle** Request-Bodies via Zod-Schema validiert (Type + Range + Format)
- Keine `any`-Types in Endpoint-Handlern
- Filenames für Excel-Download serverseitig generiert (kein User-Input)
- Excel-Cell-Inhalte: ExcelJS quotet automatisch — trotzdem Vorsicht bei Formel-Injection (`=cmd|...`); Werte mit `'` prefixen, falls beginnt mit `=`/`+`/`-`/`@`

## Rate-Limiting

- MVP: globaler Limiter (Hono-Middleware oder Coolify-Layer): z.B. 60 req/min/IP für `/v1/*`
- Excel-Export: max. 5 Generierungen pro Stunde (verhindert versehentliche Lasten)
- Phase 8: per-User-Limits

## Logging & Monitoring

- pino-Logs strukturiert (JSON), kein PII (kein Klartext-Name, keine Adresse)
- Auth-Events: Login-Success/Failure, JWT-Revoked
- Sync-Konflikte → Log-Level `warn`
- Errors mit Stacktrace im Server-Log; Client schickt keine Stacktraces an Server (kein PII-Leak)

## Secrets-Management

- Lokale Entwicklung: `.env.local` (nicht committed, in `.gitignore`)
- Production: Coolify-eigene Env-Variablen
- Keine Secrets im Git, keine Secrets im Build-Output
- Mobile-App: Keine Server-Secrets! (Nur Public-API-URL und ggf. Public-Key)

## Container-Hardening

- Backend-Image: `node:22-alpine` (klein) oder Distroless für Production
- Non-root-User im Container (`USER node`)
- Read-only Filesystem wo möglich
- `HEALTHCHECK`-Direktive im Dockerfile

## Backups (Coolify-managed)

- Tägliche PG-Dumps via Coolify
- Retention: 14 Tage rolling
- Off-Site-Kopie (Phase 5+): gpg-verschlüsselt zu externem S3/B2

## Dependency-Hygiene

- Renovate/Dependabot für Updates
- `pnpm audit` / `npm audit` in CI
- Major-Updates manuell prüfen (Breaking Changes)

## App-Store-Compliance (Phase 6+)

- Privacy-Manifest (iOS): erklärt, welche Daten gesammelt werden
- Apple Sign-In als Pflicht-Option, falls Drittanbieter-Login angeboten
- DSGVO-Export-Endpoint
- In-App Account-Löschung mit Server-seitigem Cascade

## Was passiert bei einem Incident?

1. JWT-Secret rotieren (Coolify-Env-Update + Container-Restart) → invalidiert alle Tokens
2. PG-Dump aus dem letzten guten Stand wiederherstellen
3. Nutzer informieren (im MVP = User selbst), Vorfall in `INCIDENT.md` (neu anzulegen) dokumentieren
4. Root-Cause-Analyse + ADR-Update bei Schema-/Architektur-Issue
