<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { NavLink } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		items: NavLink[];
		class?: string;
		ariaLabel?: string;
	};

	let {
		ref = $bindable(null),
		items,
		class: className,
		ariaLabel = 'Navigasi mudah alih',
		...rest
	}: Props = $props();
</script>

<nav
	bind:this={ref}
	class={cn(
		'fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-hairline bg-card/95 backdrop-blur-md px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden shadow-[0_-1px_3px_rgba(0,0,0,0.04)]',
		className
	)}
	aria-label={ariaLabel}
	{...rest}
>
	{#each items.slice(0, 5) as item (item.label)}
		{@const tag = item.href ? 'a' : 'button'}
		<svelte:element
			this={tag}
			href={item.href}
			type={item.href ? undefined : 'button'}
			onclick={item.onselect}
			aria-label={item.label}
			aria-current={item.active ? 'page' : undefined}
			aria-disabled={item.disabled || undefined}
			disabled={item.disabled}
			class={cn(
				'group relative flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer select-none rounded-xl',
				item.active
					? 'text-primary'
					: 'text-mute hover:text-ink active:scale-95',
				item.disabled && 'pointer-events-none opacity-40'
			)}
		>
			<div class="relative flex items-center justify-center">
				<div class={cn(
					'flex size-6 items-center justify-center transition-transform group-active:scale-90 [&_svg]:size-[22px]',
					item.active ? 'text-primary' : 'text-mute group-hover:text-ink'
				)}>
					{@render item.icon?.()}
				</div>

				{#if item.badge !== undefined && item.badge !== '' && item.badge !== 0}
					<span
						class="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-xs"
					>
						{item.badge}
					</span>
				{/if}
			</div>

			<span class={cn(
				'truncate text-[10.5px] tracking-tight leading-none max-w-full',
				item.active ? 'font-semibold text-primary' : 'font-medium text-mute group-hover:text-ink'
			)}>
				{item.label}
			</span>
		</svelte:element>
	{/each}
</nav>
