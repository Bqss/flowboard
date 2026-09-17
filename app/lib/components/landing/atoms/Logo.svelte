<script lang="ts">
  /**
   * Landing wordmark using the shared actjom logo asset.
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
      class="logo-mark relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-white shadow-[0_8px_20px_rgba(79,70,229,0.16)]"
      style={`width: ${dims.box}px; height: ${dims.box}px`}
      aria-hidden="true"
    >
      <img src="/logo_clean.png" alt="" class="size-full scale-[2.25] object-cover" />
    </span>
    <span>actjom</span>
  </span>
{/snippet}

{#if href}
  <a {href} class="inline-flex rounded-xl" aria-label="actjom home">{@render mark()}</a>
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
