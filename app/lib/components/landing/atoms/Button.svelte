<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { ArrowRight01Icon } from '@hugeicons/core-free-icons';

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
    arrow = false,
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
    arrow?: boolean;
    class?: string;
    children: Snippet;
    [key: string]: unknown;
  } = $props();

  const base =
    'group relative inline-flex select-none items-center justify-center gap-3 whitespace-nowrap rounded-full font-semibold tracking-[-0.015em] transition-[transform,background-color,color,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:scale-[.975] disabled:pointer-events-none disabled:opacity-50';

  const sizes: Record<Size, string> = {
    sm: 'h-10 px-4 text-[13px]',
    md: 'h-11 px-5 text-sm',
    lg: 'h-13 px-6 text-[15px]'
  };

  const variants: Record<Variant, string> = {
    primary:
      'bg-primary text-on-primary shadow-[0_12px_30px_rgba(79,70,229,0.22)] hover:bg-primary-hover hover:shadow-[0_16px_38px_rgba(79,70,229,0.3)] active:bg-primary-pressed',
    secondary:
      'bg-card text-ink-soft ring-1 ring-hairline hover:bg-canvas-sunken hover:ring-hairline-strong',
    tertiary: 'bg-lane text-ink-soft hover:bg-primary-soft hover:text-primary-ink',
    outline:
      'bg-transparent text-ink-soft ring-1 ring-hairline-strong hover:bg-card hover:text-ink'
  };

  let cls = $derived(
    `${base} ${size === 'lg' && arrow ? 'h-13 py-1.5 pl-6 pr-1.5 text-[15px]' : sizes[size]} ${variants[variant]} ${full ? 'w-full' : ''} ${klass}`
  );

  const spinner =
    'h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70';
</script>

{#snippet content()}
  {#if loading}<span class={spinner}></span>{/if}
  <span>{@render children()}</span>
  {#if arrow}
    <span class="grid size-10 shrink-0 place-items-center rounded-full bg-white/14 text-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-active:scale-95">
      <HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.8} />
    </span>
  {/if}
{/snippet}

{#if href}
  <a {href} class={cls} aria-busy={loading} {...rest}>{@render content()}</a>
{:else}
  <button {type} class={cls} disabled={disabled || loading} aria-busy={loading} {...rest}>
    {@render content()}
  </button>
{/if}
