<script lang="ts">
  import '../../ds.css';
  import { page } from '$app/stores';
  import { categories, isActiveCategory } from './showcase-nav.js';
  import { Toaster } from '$lib/components/organisms/index.js';

  let { children }: { children: import('svelte').Snippet } = $props();
</script>

<div data-theme="app" class="min-h-screen bg-canvas text-body">
  <header class="sticky top-0 z-30 border-b border-hairline bg-canvas/95 backdrop-blur-sm">
    <div class="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-4">
      <div class="min-w-0">
        <a href="/" class="ds-caption text-mute transition hover:text-primary">← Home</a>
        <h1 class="ds-page-title text-ink">Design System</h1>
        <p class="ds-body mt-0.5 text-mute">Flowboard · tokens from DESIGN.md</p>
      </div>
      <a
        href="/dashboard"
        class="ds-label shrink-0 rounded-full border border-hairline px-4 py-2 text-ink-soft transition hover:border-hairline-strong hover:bg-lane"
      >
        Open app
      </a>
    </div>

    <nav
      class="mx-auto flex max-w-[1280px] gap-1 overflow-x-auto px-6 pb-3"
      aria-label="Component layers"
    >
      {#each categories as cat (cat.href)}
        {@const active = isActiveCategory($page.url.pathname, cat.href)}
        <a
          href={cat.href}
          class={[
            'ds-label shrink-0 rounded-full px-4 py-2 transition',
            active
              ? 'bg-primary text-on-primary shadow-primary'
              : 'text-mute hover:bg-lane hover:text-ink-soft'
          ]}
        >
          {cat.label}
          {#if cat.count > 0}
            <span class={['ml-1.5 tabular-nums', active ? 'text-on-primary/80' : 'text-faint']}>
              {cat.count}
            </span>
          {/if}
        </a>
      {/each}
    </nav>
  </header>

  <main class="mx-auto max-w-[1280px] px-6 py-10">
    {@render children()}
  </main>

  <Toaster />
</div>
