# ------------------------------------------------------------------------------
# IGNITRON 2K26 — PRODUCTION BACKEND DOCKERFILE
# Multi-stage production build for NestJS backend & Prisma ORM
# Target Platforms: Render / Docker Cloud
# ------------------------------------------------------------------------------

# --- Stage 1: Build Dependencies & Compile ---
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma engine & certificates
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package manifests for workspace resolution & layer caching
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Install workspace dependencies
RUN npm ci

# Copy shared definitions, backend source code, and Prisma schema
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Generate Prisma Client
RUN cd apps/backend && npx prisma generate

# Build shared library and backend application
RUN npm run build -w @ignitron/shared
RUN npm run build -w @ignitron/backend

# Prune dev dependencies for production footprint
RUN npm prune --omit=dev

# --- Stage 2: Production Minimal Runtime ---
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV BACKEND_PORT=4000
ENV API_PREFIX=api

# Install OpenSSL runtime dependency for Prisma client
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Create non-root system user for security compliance
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nestjs

# Copy root node_modules and compiled artifacts
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs

EXPOSE 4000

# Healthcheck monitoring endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const http = require('http'); const port = process.env.PORT || process.env.BACKEND_PORT || 4000; const req = http.get('http://localhost:' + port + '/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)); req.on('error', () => process.exit(1));"

# Launch NestJS production server
CMD ["node", "apps/backend/dist/main.js"]
