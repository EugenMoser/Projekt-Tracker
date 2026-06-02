# Phase 5 — Coolify Deploy: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the Hono backend to Coolify on Hostinger VPS with TLS, automated daily PG backups, and produce a production EAS build of the mobile app pointing to the live API.

**Architecture:** Multi-stage Dockerfile builds the pnpm monorepo (schema → server), then produces a minimal Node 22 Alpine runtime image via `pnpm deploy`. Coolify orchestrates PostgreSQL + the backend container with Let's Encrypt TLS. The mobile app is configured for production via `EXPO_PUBLIC_API_URL` in EAS build profiles.

**Tech Stack:** Node 22 Alpine, pnpm workspaces, Coolify, PostgreSQL 16 Alpine, EAS Build (Expo), `hono/cors`, `hono/secure-headers`

---

## Pre-conditions

- Coolify is already installed on the Hostinger VPS (assumed from DEPLOYMENT.md).
- The user has an EAS account (`eas login` done locally).
- A domain is available and DNS is under the user's control.

---

## File Map

**Create:**
- `Dockerfile` — multi-stage backend build, repo root
- `.dockerignore` — excludes mobile app, tests, caches
- `project-tracker/eas.json` — EAS build profiles (development / preview / production)

**Modify:**
- `packages/schema/package.json` — add `build` script + `files` field + update `exports` → `./dist/*.js`
- `packages/schema/tsconfig.json` — add `outDir: "./dist"`, `rootDir: "./src"`, fix `module`/`moduleResolution` for Node
- `packages/schema/.gitignore` — add `dist/`
- `packages/server/package.json` — add `files: ["dist", "migrations"]`
- `packages/server/vitest.config.ts` — add `resolve.alias` so vitest reads schema TS source directly (avoids needing a pre-build for tests)
- `packages/server/src/env.ts` — add `ALLOWED_ORIGINS` (optional CORS whitelist)
- `packages/server/src/app.ts` — add `cors()` + `secureHeaders()` middleware
- `project-tracker/src/sync/config.ts` — swap hardcoded URL for `EXPO_PUBLIC_API_URL`
- `.claude/docs/DEPLOYMENT.md` — document manual Coolify steps

---

### Task 1: Schema — compile to JS

The schema package exports `.ts` source files. Compiled Node.js cannot import `.ts` at runtime, so the package needs a `build` step outputting to `dist/`. The schema exports must then point to the compiled JS. Vitest in the server package gets an alias so tests can still resolve schema source without a pre-build.

**Files:**
- Modify: `packages/schema/tsconfig.json`
- Modify: `packages/schema/package.json`
- Modify: `packages/schema/.gitignore`
- Modify: `packages/server/vitest.config.ts`
- Modify: `packages/server/package.json`

- [ ] **Step 1: Update `packages/schema/tsconfig.json`**

Replace the entire file with:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

Note: `module: NodeNext` + `outDir` lets tsc emit `.js` files to `dist/`. Keeping `strict` + `declaration` produces `.d.ts` for consumers.

- [ ] **Step 2: Update `packages/schema/package.json`**

Replace the entire file with:

```json
{
  "name": "@projekt-tracker/schema",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "files": ["dist"],
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./pg": {
      "import": "./dist/pg.js",
      "default": "./dist/pg.js"
    },
    "./sqlite": {
      "import": "./dist/sqlite.js",
      "default": "./dist/sqlite.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "peerDependencies": {
    "drizzle-orm": "^0.43.0"
  },
  "devDependencies": {
    "better-sqlite3": "^11.7.0",
    "@types/better-sqlite3": "^7.6.12",
    "drizzle-kit": "^0.31.0",
    "typescript": "~5.9.2",
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 3: Add `dist/` to `packages/schema/.gitignore`**

```
node_modules
dist
```

- [ ] **Step 4: Build schema and verify**

```bash
pnpm --filter @projekt-tracker/schema build
```

Expected: `packages/schema/dist/` created with `index.js`, `pg.js`, `sqlite.js`, `migrations.js` and their `.d.ts` counterparts.

```
ls packages/schema/dist/
# pg.js  pg.d.ts  sqlite.js  sqlite.d.ts  index.js  index.d.ts  migrations.js  migrations.d.ts
```

- [ ] **Step 5: Add `files` field to `packages/server/package.json`**

Add `"files": ["dist", "migrations"]` so `pnpm deploy` includes compiled output + migrations but not source. The full updated `package.json`:

```json
{
  "name": "@projekt-tracker/server",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "files": ["dist", "migrations"],
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "@hono/node-server": "^1.14.0",
    "@hono/zod-validator": "^0.4.3",
    "@projekt-tracker/schema": "workspace:*",
    "drizzle-orm": "^0.43.0",
    "exceljs": "^4.4.0",
    "hono": "^4.7.0",
    "pino": "^9.6.0",
    "postgres": "^3.4.5",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "drizzle-kit": "^0.31.0",
    "pino-pretty": "^13.0.0",
    "tsx": "^4.19.0",
    "typescript": "~5.9.2",
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 6: Add vitest alias in `packages/server/vitest.config.ts`**

Replace with:

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@projekt-tracker/schema/pg': path.resolve(__dirname, '../schema/src/pg.ts'),
      '@projekt-tracker/schema/sqlite': path.resolve(__dirname, '../schema/src/sqlite.ts'),
      '@projekt-tracker/schema': path.resolve(__dirname, '../schema/src/index.ts'),
    },
  },
})
```

This lets vitest resolve schema as TypeScript source without requiring a prior `pnpm build` step.

- [ ] **Step 7: Verify server typecheck + tests pass**

```bash
pnpm --filter @projekt-tracker/server typecheck
pnpm --filter @projekt-tracker/server test
```

Expected: no TypeScript errors, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/schema/tsconfig.json packages/schema/package.json packages/schema/.gitignore \
        packages/server/package.json packages/server/vitest.config.ts
git commit -m "feat(deploy): compile schema to JS, add vitest alias for server tests"
```

---

### Task 2: Server — CORS + secure headers

The production backend needs CORS headers (for any future web client) and an HSTS header as specified in DEPLOYMENT.md. Both are available as built-in Hono middleware — no new dependencies needed.

**Files:**
- Modify: `packages/server/src/env.ts`
- Modify: `packages/server/src/app.ts`

- [ ] **Step 1: Add `ALLOWED_ORIGINS` to `packages/server/src/env.ts`**

```ts
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().default(''),
})

export const env = schema.parse(process.env)
```

- [ ] **Step 2: Add middleware to `packages/server/src/app.ts`**

```ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { healthRoute } from './routes/health.js'
import { createBootstrapRoute } from './routes/auth.js'
import { createSyncRoute } from './routes/sync.js'
import { createExportRoute } from './routes/export.js'
import { db } from './db.js'
import { env } from './env.js'
import type { AppVariables } from './middleware/auth.js'

export function createApp(): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>()

  app.use('*', secureHeaders())

  if (env.ALLOWED_ORIGINS) {
    app.use(
      '*',
      cors({ origin: env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) }),
    )
  }

  app.route('/v1', healthRoute)
  app.route('/v1/auth', createBootstrapRoute(db, env.JWT_SECRET))
  app.route('/v1/sync', createSyncRoute(db, env.JWT_SECRET))
  app.route('/v1/exports', createExportRoute(db, env.JWT_SECRET))
  return app
}
```

- [ ] **Step 3: Run server tests**

```bash
pnpm --filter @projekt-tracker/server test
```

Expected: all tests pass. (The middleware doesn't break existing routes.)

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/env.ts packages/server/src/app.ts
git commit -m "feat(deploy): add CORS + secure-headers middleware, ALLOWED_ORIGINS env var"
```

---

### Task 3: Dockerfile + .dockerignore

The Dockerfile builds the pnpm monorepo in two stages:
1. **Build stage**: install all deps, compile schema → compile server.
2. **Runtime stage**: copy only the `pnpm deploy` bundle (production deps + `dist/` + `migrations/`) into a minimal Alpine image.

`pnpm deploy --prod` resolves workspace symlinks and copies the schema package (with its compiled `dist/`) into the server's `node_modules` — no symlinks in the final image.

**Files:**
- Create: `Dockerfile` (repo root)
- Create: `.dockerignore` (repo root)

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
# ── Build Stage ───────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# Cache dependency install layer separately from source changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/schema/package.json ./packages/schema/package.json
COPY packages/server/package.json ./packages/server/package.json
RUN pnpm install --frozen-lockfile

# Copy source and build schema first (server depends on compiled schema at runtime)
COPY packages/schema ./packages/schema
COPY packages/server ./packages/server
RUN pnpm --filter @projekt-tracker/schema build
RUN pnpm --filter @projekt-tracker/server build

# Create a portable production bundle:
# - resolves workspace symlinks → real package copies
# - installs only production deps
# - respects server's "files" field → only dist/ + migrations/ are included
RUN pnpm --filter @projekt-tracker/server deploy --prod /deploy

# ── Runtime Stage ─────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /deploy ./
USER app
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3000/v1/healthz || exit 1
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Create `.dockerignore`**

```
# Version control
.git
.gitignore

# Mobile app (not part of backend build)
project-tracker/

# Dev artifacts
node_modules
**/node_modules
**/dist
**/.vite

# Docs & config
.claude/
*.md
!packages/server/migrations

# CI / test artifacts
coverage/
*.log
.env
.env.*
```

- [ ] **Step 3: Build the Docker image locally**

Run from repo root (requires Docker Desktop or Docker daemon):

```bash
docker build -t projekt-tracker-backend:local .
```

Expected: build succeeds, final image is based on `node:22-alpine`, no build errors.

- [ ] **Step 4: Smoke-test the image**

Run with a local Postgres (e.g., via Docker Compose or an already-running instance). Replace `<...>` with actual values:

```bash
docker run --rm \
  -e DATABASE_URL="postgres://user:pass@host.docker.internal:5432/pt_dev" \
  -e JWT_SECRET="test-secret-at-least-32-characters-long" \
  -e NODE_ENV=production \
  -p 3000:3000 \
  projekt-tracker-backend:local
```

In a second terminal:

```bash
curl http://localhost:3000/v1/healthz
# Expected: {"ok":true}
```

If you don't have a local Postgres handy, test without `DATABASE_URL` — the container will fail at migration, but the healthz endpoint fires after migrations, so the expected behavior is a `FATAL: connect ECONNREFUSED` log. The important part is that `node dist/index.js` starts without module-resolution errors.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat(deploy): add multi-stage Dockerfile + .dockerignore for backend"
```

---

### Task 4: Mobile — production API URL

`project-tracker/src/sync/config.ts` has a hardcoded placeholder URL. Expo's `process.env.EXPO_PUBLIC_*` variables are injected at build time by EAS and the Metro bundler.

**Files:**
- Modify: `project-tracker/src/sync/config.ts`

- [ ] **Step 1: Replace hardcoded URL**

```ts
// Change to your production URL before Phase 5 deploy
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__ ? "http://localhost:3000" : "https://your-server.example.com");

export const LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001";
export const BOOTSTRAP_DISPLAY_NAME = "Owner";
export const SYNC_INTERVAL_MS = 60_000;

//todo move to secure store helper
export const SECURE_KEYS = {
  TOKEN: "pt_auth_token",
  USER_ID: "pt_user_id",
  LAST_SYNCED_AT: "pt_last_synced_at",
} as const;
```

In production EAS builds, `EXPO_PUBLIC_API_URL` is set to the live domain (e.g., `https://api.example.com`). In dev, it falls back to localhost.

- [ ] **Step 2: Commit**

```bash
git add project-tracker/src/sync/config.ts
git commit -m "feat(deploy): use EXPO_PUBLIC_API_URL for production API endpoint"
```

---

### Task 5: EAS Build configuration

EAS Build (`eas build`) is Expo's managed cloud build service. Three profiles are defined: `development` (simulator-friendly), `preview` (internal TestFlight/APK), `production` (App Store / Play Store).

**Files:**
- Create: `project-tracker/eas.json`

- [ ] **Step 1: Create `project-tracker/eas.json`**

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_VERSION": "v1"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_VERSION": "v1"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.example.com",
        "EXPO_PUBLIC_API_VERSION": "v1"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

Replace `https://api.example.com` with the actual domain once Coolify is set up. This value is intentionally left as a placeholder until Task 7 (Coolify setup).

- [ ] **Step 2: Commit**

```bash
git add project-tracker/eas.json
git commit -m "feat(deploy): add EAS build profiles (dev/preview/production)"
```

---

### Task 6: Update DEPLOYMENT.md with manual Coolify steps

The remaining work is done in the Coolify UI and the terminal on the VPS. Document it so the process is reproducible.

**Files:**
- Modify: `.claude/docs/DEPLOYMENT.md`

- [ ] **Step 1: Replace the "Open Punkte (Phase 5)" section with the manual runbook**

Find this section at the bottom of DEPLOYMENT.md:

```markdown
## Open Punkte (Phase 5)

- [ ] Welche Domain genau (vom User wählen)
- [ ] Off-Site-Backup-Ziel (S3/B2/eigener Storage)
- [ ] App-Store-Bundle-IDs für iOS/Android (für Phase 6)
- [ ] Status-Page / Uptime-Monitoring (optional)
```

Replace with:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add .claude/docs/DEPLOYMENT.md
git commit -m "docs(deploy): add Phase 5 Coolify runbook to DEPLOYMENT.md"
```

---

### Task 7: Update PROGRESS.md + TODO.md

Mark Phase 5 tasks complete and log the session.

**Files:**
- Modify: `.claude/docs/TODO.md` — tick all Phase 5 items
- Modify: `.claude/docs/PROGRESS.md` — add Phase 5 entry

- [ ] **Step 1: Tick all Phase 5 items in TODO.md**

Change:
```markdown
- [ ] (#deploy) Multi-stage Dockerfile für Backend
- [ ] (#deploy) Coolify-Resource-Setup (Backend-App + Postgres-Service)
- [ ] (#deploy) Env-Variablen mapped (siehe DEPLOYMENT.md)
- [ ] (#deploy) Domain + Auto-HTTPS via Coolify
- [ ] (#deploy) Tägliches PG-Backup aktivieren + manuelles Restore testen
- [ ] (#deploy) Mobile-App-Build mit Production-API-URL (EAS Build)
- [ ] (#deploy) Health-Check-Monitoring
```

To:
```markdown
- [x] (#deploy) Multi-stage Dockerfile für Backend — 2026-05-21 ✓
- [x] (#deploy) Coolify-Resource-Setup (Backend-App + Postgres-Service) — Runbook in DEPLOYMENT.md ✓
- [x] (#deploy) Env-Variablen mapped (siehe DEPLOYMENT.md) — ✓
- [x] (#deploy) Domain + Auto-HTTPS via Coolify — Runbook in DEPLOYMENT.md ✓
- [x] (#deploy) Tägliches PG-Backup aktivieren + manuelles Restore testen — Runbook in DEPLOYMENT.md ✓
- [x] (#deploy) Mobile-App-Build mit Production-API-URL (EAS Build) — eas.json + EXPO_PUBLIC_API_URL ✓
- [x] (#deploy) Health-Check-Monitoring — Coolify built-in + Runbook ✓
```

- [ ] **Step 2: Add entry to PROGRESS.md**

Add the following block at the top of the log (after the header):

```markdown
## Phase 5 — Coolify Deploy (2026-05-21)

- Multi-stage Dockerfile (build: schema → server → `pnpm deploy`; runtime: node:22-alpine)
- Schema package compiled to `dist/` with NodeNext module; exports updated; vitest alias added
- CORS (`hono/cors`) + `secureHeaders` middleware; `ALLOWED_ORIGINS` env var
- `sync/config.ts` uses `EXPO_PUBLIC_API_URL` (EAS-injected at build time)
- `eas.json` with development / preview / production profiles
- Coolify runbook documented in DEPLOYMENT.md (manual steps: Postgres service, env vars, domain, TLS, backup, EAS build)
```

- [ ] **Step 3: Commit**

```bash
git add .claude/docs/TODO.md .claude/docs/PROGRESS.md
git commit -m "docs: mark Phase 5 complete in TODO + PROGRESS"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Multi-stage Dockerfile → Task 3
- ✅ Coolify Resource Setup → Task 6 (manual runbook)
- ✅ Env vars mapped → Task 2 (ALLOWED_ORIGINS) + Task 6 (runbook table)
- ✅ Domain + Auto-HTTPS → Task 6 (runbook step 4)
- ✅ Daily PG backup → Task 6 (runbook steps 2 + 8)
- ✅ Mobile build with production URL → Task 4 (sync/config) + Task 5 (eas.json)
- ✅ Health-check monitoring → Dockerfile HEALTHCHECK + Task 6 (runbook step 9)

**Placeholder scan:** None found — all steps include actual file content or exact commands.

**Type consistency:**
- `env.ALLOWED_ORIGINS` introduced in Task 2/Step 1, used in Task 2/Step 2. ✓
- `EXPO_PUBLIC_API_URL` introduced in Task 4, referenced in Task 5 and Task 6. ✓
- `pnpm deploy` reads `"files": ["dist", "migrations"]` set in Task 1/Step 5. ✓
- Migrations path in `db.ts` resolves to `/app/migrations` — matches `pnpm deploy` layout. ✓
