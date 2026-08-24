<script lang="ts">
  /**
   * Landing wordmark matching the dashboard/auth brand mark.
   * The indigo F block is the shared Flowboard anchor.
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
      sm: { box: 28, gap: 'gap-2', text: 'text-sm' },
      md: { box: 32, gap: 'gap-2.5', text: 'text-base' },
      lg: { box: 40, gap: 'gap-3', text: 'text-xl' }
    }[size]
  );
</script>

{#snippet mark()}
  <span class="inline-flex items-center {dims.gap} font-sans font-bold tracking-tight text-ink {dims.text} {klass}">
    <span
      class="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary font-extrabold text-on-primary"
      style={`width: ${dims.box}px; height: ${dims.box}px; font-size: ${Math.max(14, dims.box * 0.44)}px`}
      aria-hidden="true"
    >
      F
    </span>
    <span>Flowboard</span>
  </span>
{/snippet}

{#if href}
  <a {href} class="inline-flex" aria-label="Flowboard home">{@render mark()}</a>
{:else}
  {@render mark()}
{/if}
