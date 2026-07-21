<script lang="ts">
  /**
   * Narko wordmark. A small angular glyph mark (three diagonal strokes echoing
   * the hero stripe motif) beside the lowercase wordmark. `size` scales both.
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
  <span
    class="inline-flex items-center {dims.gap} font-display font-semibold tracking-tight text-ink {dims.text} {klass}"
  >
    <svg
      width={dims.box}
      height={dims.box}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      class="shrink-0"
    >
      <defs>
        <linearGradient id="narko-mark" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stop-color="#ff5757" />
          <stop offset="1" stop-color="#a1131a" />
        </linearGradient>
      </defs>
      <path d="M4 19 L10 5" stroke="url(#narko-mark)" stroke-width="3.2" stroke-linecap="round" />
      <path d="M11 19 L17 5" stroke="url(#narko-mark)" stroke-width="3.2" stroke-linecap="round" opacity="0.7" />
      <path d="M18 19 L24 5" stroke="url(#narko-mark)" stroke-width="3.2" stroke-linecap="round" opacity="0.4" />
    </svg>
    <span>Narko</span>
  </span>
{/snippet}

{#if href}
  <a {href} class="inline-flex" aria-label="Narko home">{@render mark()}</a>
{:else}
  {@render mark()}
{/if}
