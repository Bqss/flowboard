<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { TabItem } from './shared.js';

	type Props = WithElementRef<Omit<HTMLAttributes<HTMLDivElement>, 'onchange'>> & {
		items: TabItem[];
		value?: string;
		/**
		 * `underline`: page/section navigation with active indicator line.
		 * `segmented`: outlined group with hairline vertical dividers.
		 * `pills`: floating elevated capsule tray.
		 */
		variant?: 'underline' | 'segmented' | 'pills';
		size?: 'sm' | 'md';
		full?: boolean;
		onchange?: (value: string) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		items,
		value = $bindable(items[0]?.value ?? ''),
		variant = 'underline',
		size = 'md',
		full = false,
		onchange,
		class: className,
		...rest
	}: Props = $props();

	let tablist = $state<HTMLElement | null>(null);

	function select(item: TabItem) {
		if (item.disabled) return;
		value = item.value;
		onchange?.(item.value);
	}

	function onkeydown(event: KeyboardEvent) {
		const enabled = items.filter((i) => !i.disabled);
		if (!enabled.length) return;

		let target: TabItem | undefined;

		if (event.key === 'ArrowRight') {
			event.preventDefault();
			const current = enabled.findIndex((i) => i.value === value);
			target = enabled[(current + 1) % enabled.length];
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			const current = enabled.findIndex((i) => i.value === value);
			target = enabled[(current - 1 + enabled.length) % enabled.length];
		} else if (event.key === 'Home') {
			event.preventDefault();
			target = enabled[0];
		} else if (event.key === 'End') {
			event.preventDefault();
			target = enabled[enabled.length - 1];
		}

		if (target) {
			select(target);
			tablist
				?.querySelector<HTMLElement>(`[data-value="${CSS.escape(target.value)}"]`)
				?.focus();
		}
	}
</script>

<div
	bind:this={ref}
	class={cn(variant === 'underline' && 'border-b border-hairline', className)}
	{...rest}
>
	<div
		bind:this={tablist}
		role="tablist"
		tabindex="0"
		{onkeydown}
		class={cn(
			'flex items-center',
			variant === 'segmented' &&
				'w-fit gap-0 overflow-hidden rounded-full border border-hairline bg-card p-0',
			variant === 'pills' &&
				'w-fit gap-1 overflow-x-auto rounded-full border border-hairline/60 bg-lane p-1',
			variant === 'underline' && 'gap-6 overflow-x-auto',
			full && 'w-full'
		)}
	>
		{#each items as item (item.value)}
			{@const active = item.value === value}
			<button
				type="button"
				role="tab"
				data-value={item.value}
				aria-selected={active}
				tabindex={active ? 0 : -1}
				disabled={item.disabled}
				onclick={() => select(item)}
				class={cn(
					'ds-button-text inline-flex shrink-0 items-center justify-center gap-2 transition-all duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:pointer-events-none disabled:text-faint',
					full && 'flex-1',
					// Size variants
					size === 'sm' && variant !== 'underline' && 'h-7.5 px-3 text-xs',
					size === 'md' && variant !== 'underline' && 'h-9 px-4 text-sm',
					size === 'sm' && variant === 'underline' && 'h-8 px-2 text-xs',
					size === 'md' && variant === 'underline' && 'h-10 px-3 text-sm',
					// Style variants
					variant === 'segmented' &&
						cn(
							'border-r border-hairline last:border-r-0 font-medium',
							active ? 'bg-lane font-bold text-ink' : 'text-mute hover:text-ink-soft hover:bg-canvas-sunken'
						),
					variant === 'pills' &&
						cn(
							'rounded-full font-medium',
							active
								? 'bg-card font-bold text-ink shadow-[0_1px_3px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-hairline/60'
								: 'text-mute hover:text-ink hover:bg-card/50'
						),
					variant === 'underline' &&
						cn(
							'-mb-px border-b-2 font-medium',
							active
								? 'border-primary font-bold text-primary'
								: 'border-transparent text-mute hover:border-primary-border hover:text-ink-soft'
						)
				)}
			>
				{#if item.icon}
					<span class={cn('shrink-0', active ? (variant === 'underline' ? 'text-primary' : 'text-ink') : 'text-faint')}>
						{@render item.icon()}
					</span>
				{/if}

				<span>{item.label}</span>

				{#if item.badge !== undefined && item.badge !== ''}
					<span
						class={cn(
							'ds-caption rounded-full px-1.5 py-0.5 text-[11px] font-semibold transition-colors',
							active
								? (variant === 'underline' || variant === 'pills'
										? 'bg-primary-soft text-primary-ink'
										: 'bg-card text-ink')
								: 'bg-card/70 text-mute'
						)}
					>
						{item.badge}
					</span>
				{/if}
			</button>
		{/each}
	</div>
</div>
