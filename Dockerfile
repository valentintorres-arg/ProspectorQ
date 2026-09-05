# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-bookworm-slim

# --- deps: instala dependencias (con toolchain nativo para duckdb) ---
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- builder: compila la app Next.js ---
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# --- runner: imagen final, solo lo necesario para correr ---
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# duckdb es un addon nativo con carga de binario dinámica: el file tracing
# de `output: standalone` no siempre detecta el .node, así que se copia
# el paquete completo para asegurar que esté disponible en runtime.
COPY --from=builder /app/node_modules/duckdb ./node_modules/duckdb

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
