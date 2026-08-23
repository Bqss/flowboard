<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Inline keyboard-shortcut glyph. The signature "physical key" feel on a flat
   * dark canvas — a subtle key-bg gradient (surface-card → surface) with a
   * hairline edge and a soft top highlight.
   */
  let { children }: { children: Snippet } = $props();
</script>

<kbd
  class="inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-hairline bg-gradient-to-b from-[#161616] to-[#0d0d0d] px-1.5 text-[12px] font-medium leading-none text-body shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]"
>
  {@render children()}
</kbd>
