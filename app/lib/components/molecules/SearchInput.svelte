<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';

	type Props = WithElementRef<Omit<HTMLInputAttributes, 'size' | 'type'>, HTMLInputElement> & {
		value?: string;
		placeholder?: string;
		/** Renders the ink submit circle inside the field (topbar search). */
		submit?: boolean;
		clearable?: boolean;
		size?: 'sm' | 'md';
		onsearch?: (value: string) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		value = $bindable(''),
		placeholder = 'Cari…',
		submit = true,
		clearable = true,
		size = 'md',
		onsearch,
		class: className,
		...rest
	}: Props = $props();

	function search() {
		onsearch?.(value);
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			search();
		}
		if (event.key === 'Escape' && value) {
			value = '';
			onsearch?.('');
		}
	}

	function clear() {
		value = '';
		onsearch?.('');
		ref?.focus();
	}
</script>

<div
	class={cn(
		'group relative flex w-full items-center rounded-full border border-hairline bg-card transition-colors duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15',
		size === 'sm' ? 'h-9' : 'h-10',
		className
	)}
>
	{#if !submit}
		<SearchIcon class="pointer-events-none absolute left-3.5 size-4 text-mute" />
	{/if}

	<input
		bind:this={ref}
		bind:value
		type="search"
		{placeholder}
		{onkeydown}
		class={cn(
			'ds-body h-full w-full min-w-0 rounded-full bg-transparent text-ink outline-none placeholder:text-mute [&::-webkit-search-cancel-button]:hidden',
			submit ? 'pl-4' : 'pl-10',
			size === 'sm' && 'text-[13px]'
		)}
		{...rest}
	/>

	<div class="flex shrink-0 items-center gap-1 pr-1.5 pl-1">
		{#if clearable && value}
			<button
				type="button"
				onclick={clear}
				aria-label="Bersihkan pencarian"
				class="grid size-6 place-items-center rounded-full text-mute transition-colors hover:bg-primary-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
			>
				<XIcon class="size-3.5" />
			</button>
		{/if}

		{#if submit}
			<button
				type="button"
				onclick={search}
				aria-label="Cari"
				class={cn(
					'grid place-items-center rounded-full bg-primary text-white shadow-xs transition-colors duration-150 ease-out hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
					size === 'sm' ? 'size-7' : 'size-8'
				)}
			>
				<SearchIcon class="size-4" />
			</button>
		{/if}
	</div>
</div>
