# Ticket Manager

AI-powered ticket management system for support teams.

## Project Structure

- `client/` — React + TypeScript + Vite frontend
- `server/` — Node.js + Express + TypeScript backend
- `core/` — Shared Zod schemas and types used by both client and server
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
- Custom `role` field exposed via `user.additionalFields`

### Client (`client/src/lib/auth-client.ts`)

- Uses `createAuthClient()` from `better-auth/react`
- Connects to server via `VITE_API_URL` env var
- Uses `inferAdditionalFields<typeof auth>()` plugin (imports server auth type) to type custom user fields
- Exports: `useSession`, `signIn`, `signOut`

### Middleware (`server/src/middleware/auth.ts`)

- `requireAuth` middleware validates session via `auth.api.getSession()` and attaches `req.user` / `req.session`
- Returns 401 if no valid session

### Seed Script (`server/src/seed.ts`)

- Creates default admin user from `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars
- Uses `better-auth/crypto` for password hashing
- Run via: `npx tsx server/src/seed.ts`

### Roles

- `ADMIN` — can create and manage agents, access `/users` page
- `AGENT` — handles and responds to tickets (default role)

### Route Guards

- `ProtectedRoute` — redirects unauthenticated users to `/login`
- `AdminRoute` — redirects non-admin users to `/` (checks `session.user.role === "ADMIN"`)

### Prisma Models (Better Auth)

- `User` — id, name, email, emailVerified, role, image
- `Session` — token-based sessions with expiry, IP, user agent
- `Account` — credential provider with hashed password
- `Verification` — for email verification tokens

## Commands

- `bun run dev` — start both client and server
- `bun run dev:client` — start React dev server (port 5173)
- `bun run dev:server` — start Express server (port 3000)
- `bun run test` — run client component tests (from root)
- `bun run test:watch` — run client component tests in watch mode
- `bun run test:e2e` — run all E2E tests
- `bun run test:e2e:ui` — Playwright UI mode
- `bun run test:e2e:headed` — run with visible browser
- `bun run test:e2e:install` — install Playwright browsers

## Component Testing

Component tests use **Vitest** + **React Testing Library** with jsdom.

- Config: `client/vite.config.ts` (test section)
- Setup file: `client/src/test/setup.ts` (loads `@testing-library/jest-dom` matchers)
- Test files: colocated next to components as `*.test.tsx` (e.g., `UsersPage.test.tsx`)
- Run: `bun run test` from root or `bunx vitest run` from `client/`

### Writing component tests

- Mock API calls by mocking `@/lib/api` with `vi.mock()` — mock `api.get`, `api.post`, etc.
- Wrap components in `QueryClientProvider` with `retry: false` for deterministic tests
- Create a fresh `QueryClient` per test to avoid shared cache
- Test: loading states, successful data rendering, empty states, error states, and correct API calls
- Use `screen.findBy*` (async) to wait for data to appear after mocked fetches resolve

## E2E Testing

E2E tests use Playwright with a separate test database (`helpdesk_test`). Use the **e2e-test-writer** agent for all test writing, updating, and debugging. Do not write e2e tests directly — always delegate to the agent.

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
- Use **Zod** for request body validation on both client and server
  - Define schemas in `core/src/schemas/` and import from both client and server (e.g., `import { createUserSchema } from "core/schemas/user"`)
  - Client: zod + `@hookform/resolvers/zod` with react-hook-form
  - Server: `z.safeParse()` on `req.body`, return first issue message on failure with 400 status
