# Starter - Project Knowledge Base

> **Skills:** Deep-dive procedures live in [`.agents/skills/`](./.agents/skills/SKILL.md) — load on demand.

## AI Quickstart — First time here?

Read in this order:

1. **[CODEMAP.md](./CODEMAP.md)** — codebase topology in one read.
2. **This file** — conventions, anti-patterns, dependency policy.
3. **[`routes/`](./routes/)** — API routes.
4. **[`app/pages/`](./app/pages/)** — SvelteKit frontend routes.
5. **[`.agents/skills/SKILL.md`](./.agents/skills/SKILL.md)** — skill index.

## Overview

AI-first TypeScript full-stack starter kit. Functions over classes, Drizzle ORM for Postgres, unified server.

- **Backend**: Elysia + Drizzle ORM + Postgres (run via Bun)
- **Frontend**: SvelteKit (Svelte 5) + TailwindCSS v4
- **Routing**: API handled by Elysia (`routes/`), Pages by SvelteKit (`app/pages/`) served on the same port.

## Philosophy

- **No classes** — functions only
- **Unified Server** — `server.ts` routes `/api` to Elysia, rest to SvelteKit.
- **Type Safety** — End-to-end type safety via Elysia Eden or direct trpc-like patterns.
- **Minimal code** — less code = less bugs

## Golden Principles

1. **Functions over classes** — `export const fn = () => ...`
2. **Descriptive handler names** — `createUser`, `addRole`.
3. **Layer boundaries** — handlers → db/services → core.
4. **Svelte 5 runes only** — `$state`, `$derived`, `$effect`, `$props`. Never `onMount`, `$:`, `export let`.

## Structure

```
./
├── app/
│   ├── config/          # Environment & constants
│   ├── core/            # Core utilities and errors
│   ├── db/              # Drizzle schema, migrations, seed
│   ├── handlers/        # API request handlers
│   ├── lib/             # Frontend libraries & API client
│   ├── middlewares/     # Elysia middlewares
│   ├── pages/           # SvelteKit routes (+page.svelte, +page.server.ts)
│   ├── services/        # Business logic & integrations
│   ├── types/           # Shared interfaces
│   └── validators/      # Zod / Elysia t.Object schemas
├── routes/              # Elysia route definitions (e.g. api.ts, auth.ts)
├── server.ts            # Entry point for production (Bun.serve)
├── svelte.config.js     # SvelteKit config (points to app/pages)
└── package.json         # Scripts and dependencies
```

## Skills (load on demand)

| Skill | When to load |
|---|---|
| [`.agents/skills/crud-pattern.md`](./.agents/skills/crud-pattern.md) | Adding a new resource (full stack) |

## Database Schema

Defined in `app/db/schema.ts` using Drizzle ORM.
Run `bun run db:generate` and `bun run db:migrate` after changing schema.

## Build/Test

```bash
npm run dev          # Dev server (Vite)
npm run build        # Production build
npm run start        # Run production server
```

## Tooling

| Command | Purpose |
|---|---|
| `npm run check` | Typecheck |
| `bun run scripts/codemap.ts` | Regenerate `CODEMAP.md` |
