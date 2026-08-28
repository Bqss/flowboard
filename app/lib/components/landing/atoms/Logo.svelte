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
      md: { box: 34, gap: 'gap-2.5', text: 'text-[15px]' },
      lg: { box: 42, gap: 'gap-3', text: 'text-xl' }
    }[size]
  );
</script>

{#snippet mark()}
  <span class="inline-flex items-center {dims.gap} font-semibold tracking-[-0.03em] text-ink {dims.text} {klass}">
    <span
      class="logo-mark relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-primary font-bold text-on-primary shadow-[0_8px_20px_rgba(79,70,229,0.24)]"
      style={`width: ${dims.box}px; height: ${dims.box}px; font-size: ${Math.max(14, dims.box * 0.42)}px`}
      aria-hidden="true"
    >
      <span class="relative z-10">F</span>
    </span>
    <span>Flowboard</span>
  </span>
{/snippet}

{#if href}
  <a {href} class="inline-flex rounded-xl" aria-label="Flowboard home">{@render mark()}</a>
{:else}
  {@render mark()}
{/if}

<style>
  .logo-mark::after {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 10px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.32);
  }
</style>
