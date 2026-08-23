<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const iconButtonVariants = tv({
		base: 'inline-flex shrink-0 items-center justify-center transition-all duration-150 ease-out select-none outline-none active:scale-[.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
		variants: {
			variant: {
				card: 'rounded-full border border-hairline bg-card text-body shadow-control hover:border-hairline-strong hover:bg-canvas-sunken focus-visible:ring-[3px] focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2',
				ghost: 'rounded-sm text-faint hover:bg-lane hover:text-body focus-visible:ring-[3px] focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2',
				bare: 'rounded-sm text-faint hover:bg-lane hover:text-body focus-visible:ring-[3px] focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2',
				primary: 'rounded-full bg-primary text-on-primary shadow-primary hover:bg-primary-hover focus-visible:ring-[3px] focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2',
				rail: 'rounded-lg text-faint hover:bg-lane hover:text-body focus-visible:ring-[3px] focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2',
				'rail-active': 'rounded-lg bg-primary-soft text-primary focus-visible:ring-[3px] focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2'
			},
			size: {
				sm: 'size-7 [&_svg:not([class*=size-])]:size-4',
				md: 'size-10 [&_svg:not([class*=size-])]:size-[18px]',
				lg: 'size-12 [&_svg:not([class*=size-])]:size-6',
				bare: 'size-7 min-h-10 min-w-10 [&_svg:not([class*=size-])]:size-[18px]'
			}
		},
		defaultVariants: { variant: 'card', size: 'md' }
	});

	export type IconButtonVariant = VariantProps<typeof iconButtonVariants>['variant'];
	export type IconButtonSize = VariantProps<typeof iconButtonVariants>['size'];
</script>

<script lang="ts">
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: IconButtonVariant;
			size?: IconButtonSize;
			href?: string;
			label: string;
			children?: import('svelte').Snippet;
		};

	let {
		class: className,
		variant = 'card',
		size = 'md',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		label,
		disabled,
		children,
		...rest
	}: Props = $props();

	const resolvedSize = $derived(variant === 'bare' ? 'bare' : size);
</script>

{#if href}
	<a
		bind:this={ref}
		aria-label={label}
		title={label}
		class={cn(iconButtonVariants({ variant, size: resolvedSize }), className)}
		{href}
		aria-disabled={disabled || undefined}
		tabindex={disabled ? -1 : undefined}
		{...rest}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		aria-label={label}
		title={label}
		class={cn(iconButtonVariants({ variant, size: resolvedSize }), className)}
		{type}
		{disabled}
		{...rest}
	>
		{@render children?.()}
	</button>
{/if}
