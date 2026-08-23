<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes, HTMLAnchorAttributes } from 'svelte/elements';

  /**
   * The Narko button. `variant` maps to the DESIGN.landing.md button vocabulary:
   * - primary   → the universal white CTA pill (scarce: one per fold)
   * - secondary → transparent text button
   * - tertiary  → soft surface-elevated fill
   * - outline   → hairline-bordered "install" pill
   * Renders an <a> when `href` is set, else a <button>.
   */
  type Variant = 'primary' | 'secondary' | 'tertiary' | 'outline';
  type Size = 'sm' | 'md' | 'lg';

  let {
    variant = 'primary',
    size = 'md',
    href = undefined,
    type = 'button',
    full = false,
    loading = false,
    disabled = false,
    class: klass = '',
    children,
    ...rest
  }: {
    variant?: Variant;
    size?: Size;
    href?: string;
    type?: HTMLButtonAttributes['type'];
    full?: boolean;
    loading?: boolean;
    disabled?: boolean;
    class?: string;
    children: Snippet;
    [key: string]: unknown;
  } = $props();

  const base =
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium tracking-[0.01em] transition-all duration-200 select-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-55';

  const sizes: Record<Size, string> = {
    sm: 'h-8 px-3 text-[13px]',
    md: 'h-9 px-4 text-sm',
    lg: 'h-11 px-5 text-[15px]'
  };

  const variants: Record<Variant, string> = {
    primary:
      'bg-primary text-on-primary hover:bg-primary-pressed active:bg-primary-pressed shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_8px_30px_-12px_rgba(255,255,255,0.5)] hover:-translate-y-px',
    secondary: 'bg-transparent text-ink hover:bg-white/5',
    tertiary: 'bg-elevated text-ink hover:bg-card border border-hairline',
    outline: 'bg-transparent text-ink border border-hairline-strong hover:bg-white/5'
  };

  let cls = $derived(
    `${base} ${sizes[size]} ${variants[variant]} ${full ? 'w-full' : ''} ${klass}`
  );

  const spinner =
    'h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70';
</script>

{#if href}
  <a {href} class={cls} aria-busy={loading} {...rest}>
    {#if loading}<span class={spinner}></span>{/if}
    {@render children()}
  </a>
{:else}
  <button {type} class={cls} disabled={disabled || loading} aria-busy={loading} {...rest}>
    {#if loading}<span class={spinner}></span>{/if}
    {@render children()}
  </button>
{/if}
