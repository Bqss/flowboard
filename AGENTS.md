# Starter - Project Knowledge Base

> **Skills:** Deep-dive procedures live in [`.agents/skills/`](./.agents/skills/SKILL.md) — load on demand.

## AI Quickstart — First time here?

Read in this order:

1. **[CODEMAP.md](./CODEMAP.md)** — codebase topology in one read.
2. **This file** — conventions, anti-patterns, dependency policy.
3. **[DESIGN.md](./DESIGN.md)** — the design system for the app UI (light kanban workspace). Read before writing any markup.
4. **[`routes/`](./routes/)** — API routes.
5. **[`app/pages/`](./app/pages/)** — SvelteKit frontend routes.
6. **[`.agents/skills/SKILL.md`](./.agents/skills/SKILL.md)** — skill index.
7. **`/design-system`** — live component showcase (browse before building UI).

> **Two design systems, no crossover.** [`DESIGN.md`](./DESIGN.md) governs the authenticated app (light canvas, indigo `#4f46e5`, Hugeicons stroke-rounded, derived from `reference/`). [`DESIGN.landing.md`](./DESIGN.landing.md) governs the dark marketing landing page that the starter shipped with. Never mix their tokens in one screen.

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
5. **Compose, don't rebuild** — use the existing component library in `app/lib/components/` before writing any new UI markup. Raw `<button>`, `<input>`, or hand-rolled cards are only allowed when no existing component fits (rare).

## Frontend — Component Library

**110+ Svelte components** live in `app/lib/components/`. They implement [`DESIGN.md`](./DESIGN.md) tokens and patterns. **Do not build UI from scratch** when a component already exists.

### Showcase (browse before coding)

| Route | Contents |
|---|---|
| `/design-system` | Overview + import cheat sheet |
| `/design-system/atoms` | 30 atoms — Button, Input, Badge, Avatar, Skeleton, … |
| `/design-system/molecules` | 35 molecules — FormField, Tabs, StatCard, SearchInput, … |
| `/design-system/organisms` | 36 organisms — KanbanBoard, Dialog, FileUploader, Topbar, … |

Run `bun run dev` and open these pages to see live demos of every export.

### Import paths

```ts
import { Button, Badge, Input } from '$lib/components/atoms/index.js';
import { Tabs, StatCard, FormField } from '$lib/components/molecules/index.js';
import { KanbanBoard, Dialog, Topbar } from '$lib/components/organisms/index.js';
// or barrel:
import { Button, Tabs, KanbanBoard } from '$lib/components/index.js';
```

### Layer rules (atomic design)

| Layer | Path | Use for | Do not |
|---|---|---|---|
| **Atoms** | `atoms/` | Buttons, inputs, badges, typography primitives | Import organisms |
| **Molecules** | `molecules/` | FormField, Tabs, StatCard, SearchInput, … | Re-implement atom styling inline |
| **Organisms** | `organisms/` | KanbanBoard, DataTable, LoginForm, SidebarRail, … | Duplicate molecule logic |
| **Templates** | `templates/` | Page shells — AuthLayout, SettingsLayout, WizardLayout | Business logic |

**Compose up the stack:** atoms → molecules → organisms → pages. A page should mostly wire organisms and pass data; it should not contain bespoke button/input CSS.

### App theme (required for app UI)

Authenticated app and design-system pages use the **light Flowboard theme**:

```svelte
<script>
  import '../../ds.css'; // or relative path to app/ds.css
</script>

<div data-theme="app">
  <!-- content -->
</div>
```

- Tokens: `app/ds.css` (scoped via `[data-theme="app"]`)
- Tailwind utilities: `bg-lane`, `text-ink`, `bg-status-queued`, `rounded-card`, …
- Typography: `ds-page-title`, `ds-body`, `ds-label`, `ds-caption`

See `app/pages/dashboard/+layout.svelte` and `app/pages/design-system/+layout.svelte` for the pattern.

### Landing vs app (no crossover)

| Surface | Components | Design doc |
|---|---|---|
| Marketing (`/`, login chrome) | `app/lib/components/landing/` | [`DESIGN.landing.md`](./DESIGN.landing.md) |
| App (`/dashboard`, `/design-system`) | `app/lib/components/{atoms,molecules,organisms}/` | [`DESIGN.md`](./DESIGN.md) |

Never mix landing dark tokens with app light tokens on the same screen.

### When to add a new component

1. **Search the showcase** and `app/lib/components/` first — the UI you need probably exists.
2. **Compose** existing atoms/molecules in the page if the gap is layout-only.
3. **Extend** an existing component (new variant/prop) before creating a sibling file.
4. **Add new** only when the pattern is reusable and absent from the library — place it in the correct layer, export from that layer's `index.ts`, and add a demo to the matching `/design-system/*` page.

`app/lib/references/` is **read-only** source material from the initial port — do not import from it in app code.

### Common mappings (design spec → component)

| Need | Component |
|---|---|
| Primary / secondary / danger action | `Button` (`variant="primary|secondary|destructive|success|warning|info"`) |
| Text field | `Input` inside `FormField` |
| Password | `PasswordInput` inside `FormField` |
| Search bar | `SearchInput` |
| Status tag | `Badge` (`tone="queued|progress|done|urgent|idle"`) |
| Kanban board | `KanbanBoard` |
| Modal / drawer | `Dialog` / `Sheet` |
| File dropzone | `FileUploader` |
| Data table | `DataTable` or `TableCard` |
| Dashboard shell | `DashboardLayout` (organism) or `templates/DashboardLayout` |
| Loading placeholder | `Skeleton` (not spinners on board surfaces) |
| Icons (app) | `@hugeicons/svelte` + `@hugeicons/core-free-icons`, `strokeWidth={1.8}` |

## Structure

```
./
├── app/
│   ├── config/          # Environment & constants
│   ├── core/            # Core utilities and errors
│   ├── db/              # Drizzle schema, migrations, seed
│   ├── handlers/        # API request handlers
│   ├── lib/             # Frontend libraries & API client
│   │   ├── components/  # Design system — atoms, molecules, organisms, templates, landing
│   │   └── references/  # Read-only port source — do not import in app code
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
bun run dev          # Dev server (Vite)
bun run build        # Production build
bun run start        # Run production server
bun run check        # Typecheck & Svelte check
```

## Tooling

| Command | Purpose |
|---|---|
| `bun run check` | Typecheck & Svelte check |
| `bun run scripts/codemap.ts` | Regenerate `CODEMAP.md` |
