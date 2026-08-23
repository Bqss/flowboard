<script lang="ts">
  import type { Snippet } from 'svelte';
  import Keycap from '../atoms/Keycap.svelte';

  /**
   * A single row inside the command-palette mockup: a small accent-tinted icon
   * tile, a label, optional trailing keycap shortcut. `active` paints the
   * selection state (surface-card, one notch lighter than the palette).
   */
  type Accent = 'blue' | 'red' | 'green' | 'yellow';

  let {
    label,
    shortcut = undefined,
    accent = 'blue',
    active = false,
    glyph
  }: {
    label: string;
    shortcut?: string;
    accent?: Accent;
    active?: boolean;
    glyph?: Snippet;
  } = $props();

  const tiles: Record<Accent, string> = {
    blue: 'bg-accent-blue/15 text-accent-blue',
    red: 'bg-accent-red/15 text-accent-red',
    green: 'bg-accent-green/15 text-accent-green',
    yellow: 'bg-accent-yellow/15 text-accent-yellow'
  };
</script>

<div
  class="flex items-center gap-3 rounded-sm px-2.5 py-2 transition-colors
    {active ? 'bg-card' : 'bg-transparent'}"
>
  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md {tiles[accent]}">
    {#if glyph}{@render glyph()}{/if}
  </span>
  <span class="flex-1 truncate text-sm {active ? 'text-ink' : 'text-body'}">{label}</span>
  {#if shortcut}
    <span class="flex items-center gap-1">
      {#each shortcut.split(' ') as key (key)}
        <Keycap>{key}</Keycap>
      {/each}
    </span>
  {/if}
</div>
