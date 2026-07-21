# Fullstack Starter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> A modern, AI-optimized full-stack boilerplate using Elysia, SvelteKit, and Postgres.

This starter kit is designed to be easily understandable by AI agents and humans alike. It unites a blazing fast backend (Elysia) with a modern frontend (SvelteKit) running on a single port via Bun.

---

## The Stack

- **Backend**: Elysia (running on Bun)
- **Frontend**: SvelteKit (Svelte 5) + TailwindCSS v4
- **Database**: Postgres + Drizzle ORM
- **Tooling**: Vite, TypeScript, Biome/ESLint (optional)

---

## AI-First Architecture

This project is explicitly designed for AI agents (like Nara). It includes:
- `AGENTS.md` in the root and subdirectories to define conventions.
- `.agents/skills/` for specific workflow instructions.
- `CODEMAP.md` to map the codebase topology.
- `scripts/codemap.ts` to auto-generate the codemap.

---

## Getting Started

```bash
# 1. Install dependencies
bun install

# 2. Setup environment
cp .env.example .env

# 3. Database setup
bun run db:generate
bun run db:migrate
bun run db:seed

# 4. Start development server
bun run dev
```

---

## Unified Server Model

In development, Vite handles the server and forwards `/api` requests to Elysia.
In production, `server.ts` boots up `Bun.serve`, routing `/api` directly to Elysia and delegating everything else to the SvelteKit handler built by `svelte-adapter-bun`.

This means **one port, one process, zero overhead** for API calls.

---

## Commands

- `bun run dev` - Start development server.
- `bun run build` - Build for production.
- `bun run start` - Start production server.
- `bun run check` - Svelte check and TypeScript verification.
- `bun run db:generate` - Generate Drizzle migrations.
- `bun run db:migrate` - Run migrations.
- `bun run db:push` - Push schema to DB (prototyping).
- `bun run db:studio` - Open Drizzle Studio.
- `bun run scripts/codemap.ts` - Regenerate `CODEMAP.md`.
