# DEPLOYMENT

Deployment-Setup für den Projekt-Tracker. Backend + DB laufen im Docker auf einem Hostinger-VPS, orchestriert durch **Coolify**.

> Detail-Provisioning (konkrete Domain, exakte Resource-Konfiguration in der Coolify-UI) wird erst in Phase 5 erledigt — dieses Dokument hält die Skizze + Entscheidungen.

## Topologie

```
┌──────────────────────────────────────────────────────────┐
│                Hostinger VPS (Coolify)                   │
│                                                          │
│   ┌──────────────────┐     ┌──────────────────────┐      │
│   │  Backend (Hono)  │────>│  PostgreSQL 16       │      │
│   │  Node 22 Alpine  │     │  Coolify-managed     │      │
│   │  /v1/...         │     │  + Daily Backups     │      │
│   └──────────────────┘     └──────────────────────┘      │
│             ▲                                            │
│             │ HTTPS via Coolify-Reverse-Proxy            │
│             │ (Auto-TLS via Let's Encrypt)               │
└─────────────┼────────────────────────────────────────────┘
              │
              ▼
   ┌────────────────────────┐
   │   Mobile App (iOS/    │
   │   Android/Web)         │
   │   API-URL via Build-   │
   │   Variable             │
   └────────────────────────┘
```

## Coolify-Resources

### 1. Backend-App
- **Source**: Git-Repo (Branch `main` für Production, `staging` optional später)
- **Build Pack**: Dockerfile (multi-stage: build → runtime)
- **Port**: intern `3000` (Hono Default), extern via Coolify-Proxy
- **Health-Check**: `GET /v1/healthz` → `{ok: true}` mit `200`
- **Auto-Deploy**: bei Git-Push auf `main`

### 2. PostgreSQL-Service
- **Image**: `postgres:16-alpine` via Coolify-Service
- **Volume**: persistent
- **Backups**: Coolify-eigener Daily Backup, 14 Tage Retention
- **Erreichbar**: nur intern für Backend (kein public Port)

## Dockerfile-Skizze (Backend)

```dockerfile
# ── Build Stage ──
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY packages/schema ./packages/schema
COPY packages/server ./packages/server
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @projekt-tracker/server build

# ── Runtime Stage ──
FROM node:22-alpine AS runtime
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/packages/server/dist ./dist
COPY --from=build --chown=app:app /app/node_modules ./node_modules
USER app
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/v1/healthz || exit 1
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

> Final-Version + monorepo-spezifische Optimierungen entstehen in Phase 5.

## Env-Variablen (Coolify-managed)

| Variable | Wo? | Zweck |
|---|---|---|
| `DATABASE_URL` | Backend | Connection-String zum PG-Service (Coolify generiert) |
| `JWT_SECRET` | Backend | Signing-Key (mind. 256 bit, einmalig generiert) |
| `LOG_LEVEL` | Backend | `info` in Prod, `debug` in Dev |
| `ALLOWED_ORIGINS` | Backend | CORS-Whitelist für Web-Client (z.B. `https://app.example.com`) |
| `PORT` | Backend | meist `3000` |
| `NODE_ENV` | Backend | `production` |

**Mobile-App-Build** (EAS Build):
| Variable | Zweck |
|---|---|
| `EXPO_PUBLIC_API_URL` | Production-API-URL (z.B. `https://api.example.com`) |
| `EXPO_PUBLIC_API_VERSION` | meist `v1` |

## Migrations beim Container-Start

Backend führt vor dem Server-Start `drizzle-kit migrate` aus (oder Drizzle-Migrate-Programm). Bei Fehler → Container exit 1, Coolify-Health-Check fängt es ab.

```ts
// packages/server/src/migrate.ts
import { migrate } from 'drizzle-orm/node-postgres/migrator';
await migrate(db, { migrationsFolder: './drizzle/migrations' });
```

In Dockerfile-CMD:
```bash
node dist/migrate.js && node dist/index.js
```

## Domain & TLS

- Eine Domain (z.B. `api.projekt-tracker.example.com`) wird in Coolify gemappt
- Auto-TLS via Let's Encrypt
- HSTS-Header serverseitig setzen

## Backups

### Automatisch (Coolify)
- Daily PG-Dump
- 14 Tage Retention

### Off-Site (Phase 5+)
- Cron-Job auf VPS, der Backup verschlüsselt nach S3/B2 schiebt:
  ```bash
  pg_dump $DATABASE_URL | gpg --encrypt --recipient backup@... | aws s3 cp - s3://backups/$(date +%F).sql.gpg
  ```
- Test-Restore monatlich!

## Logs

- Coolify aggregiert stdout-Logs aller Container
- Production: Log-Level `info`, JSON-Format (pino)
- Optional Phase 8: zentrale Log-Aggregation (Loki, Better Stack, etc.)

## Mobile-App-Builds

- **EAS Build** (Expo) für iOS + Android
- Build-Variants: `development`, `preview`, `production`
- Production-Build setzt `EXPO_PUBLIC_API_URL` auf produktive Domain
- App-Store-Submit erst ab Phase 6

## Disaster Recovery

| Szenario | Recovery |
|---|---|
| Container crashed | Coolify auto-restart |
| DB-Volume korrupt | Restore aus Daily Backup |
| VPS down | Coolify-Backup + neuer VPS mit Coolify-Restore |
| Zertifikat abgelaufen | Coolify auto-renewt; manuelle Force-Renewal möglich |
| JWT-Secret kompromittiert | Secret rotieren → alle Sessions invalidiert → User re-auth |

## Phase 5 Runbook (manual steps)

### 1. Merge feature branch to main

```bash
git checkout main && git merge feat/phase1 && git push origin main
```

Coolify auto-deploy watches `main`.

### 2. Add PostgreSQL service in Coolify

1. Open Coolify → **New Resource** → **Database** → **PostgreSQL 16**.
2. Set name: `projekt-tracker-db`.
3. Set **Volume**: enabled (persistent).
4. Under **Backups**: enable daily backups, retention 14 days.
5. **Do NOT** enable a public port — only internal access for the backend.
6. Note the internal **Database URL** Coolify generates (format: `postgresql://user:pass@service-name:5432/db`).

### 3. Add backend application in Coolify

1. **New Resource** → **Application** → **Git** → select your repo.
2. Branch: `main`. Build Pack: **Dockerfile** (Coolify auto-detects the `Dockerfile` at repo root).
3. Port: `3000`.
4. Health check path: `/v1/healthz`.
5. **Environment variables** (set all before first deploy):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Internal DB URL from step 2 |
| `JWT_SECRET` | `openssl rand -hex 32` (run this once, copy result) |
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | `info` |
| `ALLOWED_ORIGINS` | leave empty unless you add a web client |
| `PORT` | `3000` |

### 4. Map domain + enable TLS

1. In the backend application settings → **Domains**: add your domain (e.g., `api.example.com`).
2. Point a DNS A record at the VPS IP.
3. Coolify provisions Let's Encrypt automatically once DNS propagates.
4. Test: `curl https://api.example.com/v1/healthz` → `{"ok":true}`.

### 5. Trigger first deploy

1. Coolify → backend app → **Deploy**.
2. Watch the build log — first build is slowest (installing pnpm deps).
3. Health check turns green when server is listening and migrations passed.

### 6. Update EAS config with production domain

In `project-tracker/eas.json`, change:

```json
"EXPO_PUBLIC_API_URL": "https://api.example.com"
```

to your actual domain. Commit + push.

### 7. Produce production mobile build

```bash
cd project-tracker
eas build --platform all --profile production
```

This submits the build to EAS cloud. When done, download the `.ipa` / `.apk` and install on device for final smoke test.

### 8. Verify backup + restore

1. Coolify → `projekt-tracker-db` → **Backups**: confirm a backup ran.
2. Test restore: create a new Coolify DB service, restore the backup dump, run a `SELECT` to verify data integrity.
3. Delete the test restore service.

### 9. Health-check monitoring (optional)

Coolify's built-in health check pings `/v1/healthz` every 30 s and restarts the container on failure. For external uptime monitoring, services like BetterStack Uptime (free tier) or UptimeRobot can be pointed at the same endpoint.

---

## Open Questions (post-Phase 5)

- [ ] Off-site backup target (S3/B2/Hetzner Object Storage)
- [ ] iOS/Android Bundle IDs for App Store submission (Phase 6)
- [ ] Status page / public uptime URL (optional)
