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
2. Keep frontend and backend cleanly separated, sharing only `types/` and `validators/` when appropriate.

## Backend Processing — API First (No Server Actions)

All business logic runs in the **Elysia runtime** (`routes/` → `handlers/` → `services/` → `db/`). The SvelteKit layer is UI + routing only.

### Do

| Task | Where | How |
|---|---|---|
| **Read data (SSR)** | `+page.server.ts` / `+layout.server.ts` | `load` only — call `api.*(fetch)` and pass SvelteKit's `fetch` so requests hit `/api/...` internally |
| **Mutations (create / update / delete)** | `+page.svelte` (or organisms) | Call `api.*()` from event handlers (`onSubmit`, `onclick`, …) — never `export const actions` |
| **Auth session** | `+layout.server.ts` | `api.me(fetch)` in `load`; return `null` on 401 for public pages |
| **After a mutation** | Client | `invalidateAll()` then `goto()` if navigation is needed |

```ts
// +page.server.ts — load-only (reads)
export const load: PageServerLoad = async ({ fetch }) => {
  const data = await api.me(fetch);
  return { user: data.user };
};

// +page.svelte — mutations via API client
async function handleSubmit(payload) {
  await api.login(payload);
  await invalidateAll();
  await goto('/dashboard');
}
```

### Don't

- **No SvelteKit form actions** — never `export const actions` or `use:enhance` against a server action for business logic.
- **No direct DB / service imports in `pages/`** — no `import { db } from '@/db'` or `import { … } from '@/services'` in `+page.server.ts`.
- **No duplicating handler logic in SvelteKit** — if it touches the database, it belongs in `handlers/` + `routes/`, not in a `+page.server.ts` action.

### Request flow

```
+page.svelte  →  $lib/api/client  →  /api/*  →  Elysia routes  →  handlers  →  services  →  db
+page.server.ts (load)  →  api.*(fetch)  →  same path as above
```

### Reference implementations

| Flow | Files |
|---|---|
| Login | `(auth)/login/+page.svelte` — `api.login()` on submit; `+page.server.ts` — redirect if already signed in |
| Register | `(auth)/register/+page.svelte` — `api.register()` on submit; `+page.server.ts` — redirect if already signed in |
| Session bootstrap | `+layout.server.ts` — `api.me(fetch)` |
