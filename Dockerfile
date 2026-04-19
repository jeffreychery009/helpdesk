# ── Stage 1: Install dependencies ──
FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY client/package.json client/
COPY server/package.json server/
COPY core/package.json core/

RUN bun install --frozen-lockfile

# ── Stage 2: Generate Prisma client (needed by both client and server builds) ──
FROM oven/bun:1 AS prisma-generate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY server/prisma/ server/prisma/
COPY server/prisma.config.ts server/prisma.config.ts

RUN cd server && bunx prisma generate

# ── Stage 3: Build client ──
FROM oven/bun:1 AS client-build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/core/node_modules ./core/node_modules

COPY package.json bun.lock ./
COPY client/ client/
COPY core/ core/
# Client imports `typeof auth` from server — needs full server source + generated Prisma
COPY server/src/ server/src/
COPY server/tsconfig.json server/tsconfig.json
COPY server/package.json server/package.json
COPY --from=prisma-generate /app/server/src/generated/ server/src/generated/

# In production, the client talks to the same origin (no separate API URL)
ENV VITE_API_URL=""

RUN cd client && bun run build

# ── Stage 4: Production image ──
FROM oven/bun:1-slim AS production
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/core/node_modules ./core/node_modules

# Copy server source and core (Bun runs TypeScript directly)
COPY server/ server/
COPY core/ core/
COPY package.json ./

# Copy generated Prisma client
COPY --from=prisma-generate /app/server/src/generated/ server/src/generated/

# Copy built client into server/dist/client for static serving
COPY --from=client-build /app/client/dist/ server/dist/client/

# Copy prisma schema and config for migrations
COPY server/prisma/ server/prisma/
COPY server/prisma.config.ts server/prisma.config.ts

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "cd server && bunx prisma migrate deploy && bun run src/seed.ts && bun run src/index.ts"]
