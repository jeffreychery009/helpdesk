# Ticket Manager

AI-powered ticket management system for support teams.

## Project Structure

- `client/` — React + TypeScript + Vite frontend
- `server/` — Node.js + Express + TypeScript backend
- Monorepo managed with **Bun workspaces**

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS v4, Vite, shadcn/ui
- **Backend:** Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL
- **Auth:** Better Auth (see details below)
- **AI:** Claude API
- **Email:** SendGrid or Mailgun
- **Runtime:** Bun
- **Deployment:** Docker + cloud provider

## Authentication

Authentication is handled by **Better Auth** with email/password credentials.

### Server (`server/src/lib/auth.ts`)
- Uses `betterAuth()` with Prisma adapter (PostgreSQL)
- Auth routes mounted at `/api/auth/*splat` via `toNodeHandler(auth)` — must be registered before `express.json()`
- Email/password enabled, **sign-up disabled** (`disableSignUp: true`) — users are created by admins or seed script only
- Trusted origins configured via `CLIENT_URL` env var

### Client (`client/src/lib/auth-client.ts`)
- Uses `createAuthClient()` from `better-auth/react`
- Connects to server via `VITE_API_URL` env var
- Exports: `useSession`, `signIn`, `signOut`

### Middleware (`server/src/middleware/auth.ts`)
- `requireAuth` middleware validates session via `auth.api.getSession()` and attaches `req.user` / `req.session`
- Returns 401 if no valid session

### Seed Script (`server/src/seed.ts`)
- Creates default admin user from `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars
- Uses `better-auth/crypto` for password hashing
- Run via: `npx tsx server/src/seed.ts`

### Roles
- `ADMIN` — can create and manage agents
- `AGENT` — handles and responds to tickets (default role)

### Prisma Models (Better Auth)
- `User` — id, name, email, emailVerified, role, image
- `Session` — token-based sessions with expiry, IP, user agent
- `Account` — credential provider with hashed password
- `Verification` — for email verification tokens

## Commands

- `bun run dev` — start both client and server
- `bun run dev:client` — start React dev server (port 5173)
- `bun run dev:server` — start Express server (port 3000)

## Documentation

Use the **context7** MCP server to fetch up-to-date documentation for any library or framework used in this project. Always prefer context7 over relying on training data, especially for:

- React, Vite, Tailwind CSS
- Express, Prisma
- Bun
- Claude API / Anthropic SDK

## Key Files

- `project-scope.md` — product requirements and feature list
- `tech-stack.md` — full tech stack details
- `implementation-plan.md` — phased build plan

## Conventions

- All API routes are prefixed with `/api`
- TypeScript strict mode enabled in both client and server
- Client uses `@/` path alias (maps to `client/src/`)
- UI components use shadcn/ui (base-nova style, neutral base color, Geist font)
- shadcn components live in `client/src/components/ui/`
