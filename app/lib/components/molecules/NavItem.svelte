<script lang="ts">
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAnchorAttributes> & {
		label: string;
		href?: string;
		active?: boolean;
		/** `rail` = 40px circle (76px sidebar); `expanded` = icon + label row. */
		variant?: 'rail' | 'expanded';
		badge?: number | string;
		disabled?: boolean;
		icon?: import('svelte').Snippet;
		onselect?: () => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		label,
		href,
		active = false,
		variant = 'rail',
		badge,
		disabled = false,
		icon,
		onselect,
		class: className,
		...rest
	}: Props = $props();

	const tag = $derived(href ? 'a' : 'button');

	const base =
		'group relative inline-flex shrink-0 items-center transition-all duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]';

	const shape = $derived(
		variant === 'rail'
			? cn(
					'size-10 justify-center rounded-xl [&_svg]:size-5',
					active
						? 'bg-primary-soft text-primary shadow-xs'
						: 'text-mute hover:bg-lane/80 hover:text-ink'
				)
			: cn(
					'h-9 w-full gap-3 rounded-lg px-2.5 text-[13.5px] font-medium leading-none [&_svg]:size-[18px]',
					active
						? 'bg-primary-soft text-primary font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r-full before:bg-primary'
						: 'text-mute hover:bg-lane/80 hover:text-ink'
				)
	);
</script>

<svelte:element
	this={tag}
	bind:this={ref}
	{href}
	type={href ? undefined : 'button'}
	onclick={onselect}
	aria-label={variant === 'rail' ? label : undefined}
	aria-current={active ? 'page' : undefined}
	aria-disabled={disabled || undefined}
	title={variant === 'rail' ? label : undefined}
	tabindex={disabled ? -1 : 0}
	class={cn(base, shape, disabled && 'pointer-events-none opacity-50', className)}
	{...rest}
>
	{@render icon?.()}

	{#if variant === 'expanded'}
		<span class="min-w-0 flex-1 truncate text-left">{label}</span>
	{/if}

	{#if badge !== undefined && badge !== ''}
		<span
			class={cn(
				'ds-caption grid place-items-center rounded-full text-center font-bold tracking-tight',
				variant === 'rail'
					? 'absolute -top-0.5 -right-0.5 min-w-4 border-2 border-card bg-status-urgent px-1 text-[10px] text-white leading-4'
					: active
						? 'ml-auto min-w-5 bg-primary/15 px-2 py-0.5 text-[11px] text-primary'
						: 'ml-auto min-w-5 bg-lane px-2 py-0.5 text-[11px] text-mute'
			)}
		>
			{badge}
		</span>
	{/if}
</svelte:element>
