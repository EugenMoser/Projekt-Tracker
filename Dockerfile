# ── Build Stage ───────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# Cache dependency install layer separately from source changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/schema/package.json ./packages/schema/package.json
COPY packages/server/package.json ./packages/server/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source and build schema first (server depends on compiled schema at runtime)
COPY packages/schema ./packages/schema
COPY packages/server ./packages/server
RUN pnpm --filter @projekt-tracker/schema build
RUN pnpm --filter @projekt-tracker/server build

# Create a portable production bundle:
# - resolves workspace symlinks → real package copies
# - installs only production deps
# - respects server's "files" field → only dist/ + migrations/ are included
# --legacy flag required for pnpm 10+ workspace deploy (resolves symlinks correctly)
RUN pnpm --filter @projekt-tracker/server deploy --prod --legacy /deploy

# ── Runtime Stage ─────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /deploy ./
USER app
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3000/v1/healthz || exit 1
EXPOSE 3000
CMD ["node", "dist/index.js"]
