<script lang="ts">
  /**
   * Flowboard wordmark used by the marketing surface and auth chrome.
   * The mark is intentionally CSS-only so the landing has no starter-kit asset
   * dependency.
   */
  let {
    size = 'md',
    href = '/',
    class: klass = ''
  }: {
    size?: 'sm' | 'md' | 'lg';
    href?: string | null;
    class?: string;
  } = $props();

  let dims = $derived(
    {
      sm: { box: 18, gap: 'gap-2', text: 'text-[15px]' },
      md: { box: 22, gap: 'gap-2.5', text: 'text-[17px]' },
      lg: { box: 30, gap: 'gap-3', text: 'text-2xl' }
    }[size]
  );
</script>

{#snippet mark()}
  <span class="inline-flex items-center {dims.gap} font-display font-semibold tracking-tight text-ink {dims.text} {klass}">
    <span
      class="flex shrink-0 items-end gap-0.5 rounded-md border border-white/20 bg-white/5 p-1"
      style={`width: ${dims.box}px; height: ${dims.box}px`}
      aria-hidden="true"
    >
      <span class="h-1/2 flex-1 rounded-sm bg-accent-blue"></span>
      <span class="h-2/3 flex-1 rounded-sm bg-accent-green"></span>
      <span class="h-full flex-1 rounded-sm bg-ink"></span>
    </span>
    <span>flowboard</span>
  </span>
{/snippet}

{#if href}
  <a {href} class="inline-flex" aria-label="Flowboard home">{@render mark()}</a>
{:else}
  {@render mark()}
{/if}
