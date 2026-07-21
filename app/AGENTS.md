# App Directory Knowledge Base

This directory contains the main application logic, split between the backend (Elysia + Drizzle) and the frontend (SvelteKit).

## Directory Roles

- **`config/`**: Environment variables and constants.
- **`core/`**: Core utilities, custom error classes, response formatters.
- **`db/`**: Drizzle ORM schema (`schema.ts`), migrations, and seed scripts.
- **`handlers/`**: Elysia route handlers. These functions receive context from Elysia and interact with `db/` or `services/`.
- **`lib/`**: Frontend utilities, including API clients (like Elysia Eden) to talk to the backend.
- **`middlewares/`**: Elysia plugins/middlewares (auth guards, rate limiting, etc.).
- **`pages/`**: SvelteKit routes. This replaces the standard `src/routes/` directory. All frontend pages go here.
- **`services/`**: Complex business logic, third-party integrations (e.g., mailer, payment).
- **`types/`**: Shared TypeScript types used across both frontend and backend.
- **`validators/`**: Input validation schemas (using Elysia's `t` or Zod).

## Rules
1. Handlers should never return HTML; they return JSON for the API.
2. Frontend pages (`pages/`) should fetch data via `+page.server.ts` or directly using the API client.
3. Keep frontend and backend cleanly separated, sharing only `types/` and `validators/` when appropriate.
