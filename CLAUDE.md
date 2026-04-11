# Ticket Manager

AI-powered ticket management system for support teams.

## Project Structure

- `client/` — React + TypeScript + Vite frontend
- `server/` — Node.js + Express + TypeScript backend
- Monorepo managed with **Bun workspaces**

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL
- **Auth:** Database sessions (express-session + connect-pg-simple)
- **AI:** Claude API
- **Email:** SendGrid or Mailgun
- **Runtime:** Bun
- **Deployment:** Docker + cloud provider

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
