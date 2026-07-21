<script lang="ts">
  import FeatureCard from '../molecules/FeatureCard.svelte';
  import { reveal } from '$lib/actions/reveal';

  /** "Everything wired, nothing in the way" — the core feature grid. Each card
   *  carries a category-accent icon (accents live in illustrations only). */
  const features = [
    {
      title: 'Single-port by construction',
      accent: 'red' as const,
      body: 'Elysia owns Bun.serve. /api is handled natively; everything else falls through to SvelteKit. No proxy, no CORS, no second process.',
      path: 'M4 12h16M4 12l4-4M4 12l4 4'
    },
    {
      title: 'Typed end to end',
      accent: 'blue' as const,
      body: 'Handlers are plain functions over a light Ctx. Validators use Elysia’s t schema. The client is a same-origin typed fetch wrapper.',
      path: 'M6 4h8l4 4v12H6zM13 4v5h5'
    },
    {
      title: 'Sessions, done right',
      accent: 'green' as const,
      body: 'DB-backed sessions in Postgres behind an httpOnly cookie. Passwords hashed with Bun.password (argon2id). No JWT footguns.',
      path: 'M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7z'
    },
    {
      title: 'Drizzle + Postgres',
      accent: 'yellow' as const,
      body: 'A typed schema, generated migrations, seed scripts, and Drizzle Studio. The postgres.js driver connects lazily so non-DB routes boot instantly.',
      path: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6'
    },
    {
      title: 'SSR without a hop',
      accent: 'blue' as const,
      body: 'Server loads call the same api instance in-process — no network round-trip. External /api traffic goes straight to Elysia. Identical behavior, either path.',
      path: 'M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0zM3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18'
    },
    {
      title: 'Atomic components',
      accent: 'green' as const,
      body: 'A Svelte 5 runes component library organized atoms → molecules → organisms, on a dark design system with Inter ss03 and a strict surface ladder.',
      path: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 3v18M4 7.5l8 4.5 8-4.5'
    }
  ];
</script>

<section id="features" class="mx-auto max-w-[1240px] scroll-mt-20 px-6 py-24">
  <div use:reveal class="reveal max-w-2xl">
    <p class="text-[13px] font-medium uppercase tracking-[0.18em] text-accent-red">Features</p>
    <h2 class="font-display mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-ink">
      Everything wired. Nothing in the way.
    </h2>
    <p class="mt-4 text-lg leading-relaxed text-mute">
      A batteries-included foundation that stays out of your way — the boring
      parts are solved so you can ship the interesting ones.
    </p>
  </div>

  <div class="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each features as f, i (f.title)}
      <FeatureCard title={f.title} accent={f.accent} delay={i * 60}>
        {#snippet icon()}
          <span
            class="flex h-10 w-10 items-center justify-center rounded-md
              {f.accent === 'red' ? 'bg-accent-red/12 text-accent-red' : ''}
              {f.accent === 'blue' ? 'bg-accent-blue/12 text-accent-blue' : ''}
              {f.accent === 'green' ? 'bg-accent-green/12 text-accent-green' : ''}
              {f.accent === 'yellow' ? 'bg-accent-yellow/12 text-accent-yellow' : ''}"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d={f.path} stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        {/snippet}
        {f.body}
      </FeatureCard>
    {/each}
  </div>
</section>
