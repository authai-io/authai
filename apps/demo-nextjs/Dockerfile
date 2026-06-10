# syntax=docker/dockerfile:1.7
#
# AuthAI Next.js SSR demo — production image. Modeled on
# apps/cloud-web/Dockerfile.
#
# Build context is the monorepo root (Dokku is told via
# `dokku builder-dockerfile:set authai-nextjs-demo dockerfile-path
# apps/demo-nextjs/Dockerfile`).

FROM node:22-alpine AS deps

RUN corepack enable
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

# Demo manifests only. AuthAI SDK packages resolve from npm in this
# production image, not from local workspace packages.
COPY apps/demo-nextjs/package.json           apps/demo-nextjs/package.json

RUN pnpm install --frozen-lockfile --filter demo-nextjs...

# ---------------------------------------------------------------------------

FROM node:22-alpine AS builder

RUN corepack enable
WORKDIR /repo

COPY --from=deps /repo/node_modules     ./node_modules
COPY --from=deps /repo/apps             ./apps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

COPY apps/demo-nextjs apps/demo-nextjs

# Next.js standalone build against published AuthAI SDK packages.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter demo-nextjs build

# ---------------------------------------------------------------------------

FROM node:22-alpine AS runtime

WORKDIR /app

# Next.js standalone output: server.js + trimmed node_modules.
COPY --from=builder /repo/apps/demo-nextjs/.next/standalone ./
COPY --from=builder /repo/apps/demo-nextjs/.next/static    ./apps/demo-nextjs/.next/static

WORKDIR /app/apps/demo-nextjs

ENV NODE_ENV=production
ENV PORT=5000
ENV HOSTNAME=0.0.0.0

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O - http://localhost:5000/ || exit 1

CMD ["node", "server.js"]
