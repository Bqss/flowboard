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
    <img
      src="/logo.png"
      alt="Logo"
      class="h-20 md:h-24 w-auto "
    />
  </span>
{/snippet}

{#if href}
  <a {href} class="inline-flex" aria-label="Narko home">{@render mark()}</a>
{:else}
  {@render mark()}
{/if}
