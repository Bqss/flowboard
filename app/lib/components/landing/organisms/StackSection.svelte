<script lang="ts">
  import { reveal } from '$lib/actions/reveal';

  /** The stack layer table. Each row is a marquee-free, calm layer listing —
   *  category accents used only on the small layer dots (illustration space). */
  const layers = [
    { layer: 'Runtime', choice: 'Bun', note: 'Fast JS/TS runtime + bundler', accent: 'bg-accent-yellow' },
    { layer: 'API', choice: 'Elysia', note: 'Mounted under /api, split by feature', accent: 'bg-accent-red' },
    { layer: 'Frontend', choice: 'SvelteKit + Svelte 5', note: 'Runes, Vite, Tailwind v4', accent: 'bg-accent-blue' },
    { layer: 'Database', choice: 'Postgres + Drizzle', note: 'Typed schema, generated migrations', accent: 'bg-accent-green' },
    { layer: 'Auth', choice: 'DB sessions', note: 'Bun.password argon2id hashing', accent: 'bg-accent-red' }
  ];
</script>

<section id="stack" class="mx-auto max-w-[1240px] scroll-mt-20 px-6 py-24">
  <div class="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
    <div use:reveal class="reveal">
      <p class="text-[13px] font-medium uppercase tracking-[0.18em] text-accent-red">Stack</p>
      <h2 class="font-display mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-ink">
        Modern picks, no ceremony.
      </h2>
      <p class="mt-4 text-lg leading-relaxed text-mute">
        Each layer is chosen to compose cleanly with the next. Swap any piece —
        the boundaries are plain functions and typed contracts, not framework magic.
      </p>
    </div>

    <div use:reveal={80} class="reveal overflow-hidden rounded-xl border border-hairline bg-surface">
      {#each layers as row, i (row.layer)}
        <div
          class="flex items-center gap-4 px-6 py-5 {i > 0 ? 'border-t border-hairline' : ''}"
        >
          <span class="h-2 w-2 shrink-0 rounded-full {row.accent} shadow-[0_0_10px_currentColor]"></span>
          <span class="w-24 shrink-0 text-[13px] font-medium uppercase tracking-wide text-ash">
            {row.layer}
          </span>
          <span class="flex-1">
            <span class="text-sm font-medium text-ink">{row.choice}</span>
            <span class="ml-2 text-[13px] text-mute">{row.note}</span>
          </span>
        </div>
      {/each}
    </div>
  </div>
</section>
