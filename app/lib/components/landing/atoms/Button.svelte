<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes, HTMLAnchorAttributes } from 'svelte/elements';

  /**
   * The landing action component mirrors the shared dashboard/auth button language:
   * full pills, indigo primary actions, white secondary surfaces, and semantic
   * focus/hover states. It keeps landing-specific auth destinations and loading.
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
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-[-0.005em] transition-all duration-150 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50';

  const sizes: Record<Size, string> = {
    sm: 'h-9 px-4 text-[13px]',
    md: 'h-10 px-5 text-sm',
    lg: 'h-11 px-5 text-[14px]'
  };

  const variants: Record<Variant, string> = {
    primary:
      'bg-primary text-on-primary shadow-primary hover:bg-primary-hover active:bg-primary-pressed',
    secondary:
      'border border-hairline bg-card text-ink-soft hover:border-hairline-strong hover:bg-canvas-sunken',
    tertiary: 'border border-transparent bg-lane text-ink-soft hover:bg-primary-soft',
    outline:
      'border border-hairline-strong bg-card text-ink-soft hover:bg-canvas-sunken'
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
