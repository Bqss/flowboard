<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Inline keyboard shortcut matching the small rounded controls in the app.
   * The surface follows the active landing theme.
   */
  let { children }: { children: Snippet } = $props();
</script>

<kbd
  class="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-hairline bg-card px-1.5 font-sans text-[11px] font-bold leading-none text-ink-soft shadow-control"
>
  {@render children()}
</kbd>
