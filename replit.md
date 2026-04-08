# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (Tailwind CSS, shadcn/ui, framer-motion, wouter)

## Artifacts

### Barbearia Premium (`artifacts/barbearia`)
- **Type**: react-vite web app
- **Preview path**: `/`
- A premium men's barbershop booking platform with:
  - Landing page with hero, services grid, and booking CTA
  - Multi-step booking flow: service selection → calendar date picker → time slots → customer info → payment checkout
  - Simulated payment form (card details) — booking only confirmed after payment
  - Confirmation page with appointment details
  - Admin dashboard with stats and appointments list

### API Server (`artifacts/api-server`)
- **Type**: Express 5 API
- **Preview path**: `/api`
- Endpoints:
  - `GET /api/services` — list all barbershop services
  - `GET /api/availability?date=&serviceId=` — available time slots for a date
  - `GET /api/appointments` — list confirmed appointments
  - `POST /api/appointments/checkout` — create payment session
  - `POST /api/appointments/confirm` — confirm appointment after payment
  - `GET /api/appointments/:id` — get appointment by ID
  - `GET /api/stats/summary` — stats dashboard

## Database Schema

- `services` — barbershop services (name, description, price, durationMinutes, imageUrl)
- `appointments` — confirmed appointments (customerName, customerEmail, customerPhone, serviceId, serviceName, servicePrice, appointmentDate, appointmentTime, status, paymentId)
- `checkout_sessions` — payment sessions with 30-min expiry

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
