# Implementation Plan

## Phase 1: Project Setup & Foundation

- [ ] Initialize monorepo structure (`/client`, `/server`)
- [ ] Set up React + TypeScript + Vite frontend
- [ ] Set up Node.js + Express + TypeScript backend
- [ ] Setup PostgreSQL database

## Phase 2: Authentication

- [ ] Implement password hashing (bcrypt)
- [ ] Implement session middleware (`express-session` + `connect-pg-simple`)
- [ ] Build login endpoint (`POST /api/auth/login`)
- [ ] Build logout endpoint (`POST /api/auth/logout`)
- [ ] Build session check endpoint (`GET /api/auth/me`)
- [ ] Add role-based authorization middleware (admin vs agent)
- [ ] Build login page on frontend
- [ ] Add protected route wrapper component

## Phase 3: User Management (Admin)

- [ ] Build CRUD endpoints for agents:
  - `POST /api/users` (admin creates agent)
  - `GET /api/users` (list agents)
  - `PATCH /api/users/:id` (update agent)
  - `DELETE /api/users/:id` (deactivate agent)
- [ ] Build user management page (admin only)
- [ ] Add form for creating/editing agents

## Phase 4: Ticket CRUD & Dashboard

- [ ] Build ticket endpoints:
  - `GET /api/tickets` (list with filtering by status, category, assignee + sorting)
  - `GET /api/tickets/:id` (detail with replies)
  - `PATCH /api/tickets/:id` (update status, category, assignment)
- [ ] Build dashboard page:
  - Ticket count summary cards (by status)
  - Ticket table with filters and sorting
- [ ] Build ticket detail page:
  - Ticket info (subject, sender, status, category, assignee)
  - Conversation thread (replies)
  - Reply composer
- [ ] Build reply endpoint (`POST /api/tickets/:id/replies`)

## Phase 5: Email Integration

- [ ] Set up SendGrid/Mailgun inbound parse webhook
- [ ] Build webhook endpoint (`POST /api/webhooks/inbound-email`)
  - Parse incoming email (sender, subject, body, attachments)
  - Create ticket from email
  - Thread replies to existing tickets (match by subject or sender)
- [ ] Set up outbound email sending
- [ ] Send email to student when an agent replies

## Phase 6: AI Features

- [ ] Integrate Claude API client
- [ ] Build AI classification endpoint — auto-categorize new tickets on creation
- [ ] Build AI summary endpoint (`POST /api/tickets/:id/summarize`)
- [ ] Build AI suggested reply endpoint (`POST /api/tickets/:id/suggest-reply`)
- [ ] Build knowledge base storage (markdown files or DB table)
- [ ] Implement RAG: retrieve relevant knowledge base content and include in AI prompts
- [ ] Add AI features to ticket detail UI:
  - "Summarize" button
  - "Suggest reply" button
  - Auto-assigned category badge (with option to override)

## Phase 7: Polish & Production Readiness

- [ ] Add input validation on all endpoints (zod)
- [ ] Add error handling middleware
- [ ] Add request logging
- [ ] Build production Dockerfiles (frontend + backend)
- [ ] Set up Docker Compose for production
- [ ] Add pagination to ticket list
- [ ] Loading states and error states in the UI
- [ ] Basic responsive design for the dashboard
