<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Search01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
	import { dashboardText } from '$lib/i18n/dashboard.js';
	import { locale } from '$lib/i18n/index.js';

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
	const tr = (key: string) => dashboardText($locale, key);
	const clearLabel = $derived(tr('common.clearSearch'));
	const searchLabel = $derived(tr('common.search'));

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
		'group relative flex h-10 w-full items-center rounded-md border border-hairline bg-card transition-colors duration-150 hover:border-primary-border focus-within:border-primary focus-within:ring-2 focus-within:ring-[var(--focus)]',
		size === 'sm' ? 'h-9' : 'h-10',
		className
	)}
>
	{#if !submit}
		<HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={1.8} class="pointer-events-none absolute left-3 text-mute" />
	{/if}

	<input
		bind:this={ref}
		bind:value
		type="search"
		{placeholder}
		{onkeydown}
		class={cn(
			'ds-body h-full w-full min-w-0 rounded-md bg-transparent text-ink outline-none placeholder:text-mute [&::-webkit-search-cancel-button]:hidden',
			submit ? 'pl-4' : 'pl-10',
			size === 'sm' && '!text-sm'
		)}
		{...rest}
	/>

	<div class="flex shrink-0 items-center gap-1 pr-1.5 pl-1">
		{#if clearable && value}
			<button
				type="button"
				onclick={clear}
				aria-label={clearLabel}
				class="grid size-6 place-items-center rounded-md text-mute transition-colors hover:bg-primary-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
			>
				<HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.8} />
			</button>
		{/if}

		{#if submit}
			<button
				type="button"
				onclick={search}
				aria-label={searchLabel}
				class={cn(
					'grid place-items-center rounded-md bg-primary text-on-primary shadow-xs transition-colors duration-150 ease-out hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
					size === 'sm' ? 'size-7' : 'size-8'
				)}
			>
				<HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={1.8} />
			</button>
		{/if}
	</div>
</div>
