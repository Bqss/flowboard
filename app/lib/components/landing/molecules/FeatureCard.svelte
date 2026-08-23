<script lang="ts">
  import type { Snippet } from 'svelte';
  import { reveal } from '$lib/actions/reveal';

  /**
   * Standard product feature card — surface fill, hairline edge, tight 24px
   * padding (per DESIGN.landing.md, never 32px+). Elevation comes from the surface
   * ladder, not shadows. `elevated` bumps it one notch lighter to break rhythm.
   * A faint accent glow tints the top edge on hover only.
   */
  type Accent = 'blue' | 'red' | 'green' | 'yellow' | 'none';

  let {
    title,
    accent = 'none',
    delay = 0,
    icon,
    children
  }: {
    title: string;
    accent?: Accent;
    delay?: number;
    icon?: Snippet;
    children: Snippet;
  } = $props();

  const glows: Record<Accent, string> = {
    none: 'group-hover:before:bg-white/10',
    blue: 'group-hover:before:bg-accent-blue/40',
    red: 'group-hover:before:bg-accent-red/40',
    green: 'group-hover:before:bg-accent-green/40',
    yellow: 'group-hover:before:bg-accent-yellow/40'
  };
</script>

<div
  use:reveal={delay}
  class="reveal group relative overflow-hidden rounded-lg border border-hairline bg-surface p-6
    transition-colors duration-300 hover:border-hairline-strong
    before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-transparent
    before:transition-colors before:duration-300 {glows[accent]}"
>
  {#if icon}
    <div class="mb-4">{@render icon()}</div>
  {/if}
  <h3 class="text-[17px] font-medium tracking-[0.01em] text-ink">{title}</h3>
  <div class="mt-2 text-sm leading-relaxed text-mute">
    {@render children()}
  </div>
</div>
