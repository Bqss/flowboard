<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { dismissable, panelClass, panelItemClass, type Option } from './shared.js';
	import SearchIcon from '@lucide/svelte/icons/search';
	import CheckIcon from '@lucide/svelte/icons/check';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		options: Option[];
		value?: string;
		placeholder?: string;
		emptyText?: string;
		id?: string;
		disabled?: boolean;
		invalid?: boolean;
		/** Skip local filtering when the caller queries a server. */
		manualFilter?: boolean;
		onsearch?: (query: string) => void;
		onchange?: (value: string) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		options,
		value = $bindable(''),
		placeholder = 'Cari atau pilih…',
		emptyText = 'Tidak ditemukan',
		id,
		disabled = false,
		invalid = false,
		manualFilter = false,
		onsearch,
		onchange,
		class: className,
		...rest
	}: Props = $props();

	let open = $state(false);
	let query = $state('');
	let activeIndex = $state(0);
	let inputEl = $state<HTMLInputElement | null>(null);

	const selected = $derived(options.find((o) => o.value === value));

	const filtered = $derived.by(() => {
		if (manualFilter || !query.trim()) return options;
		const q = query.trim().toLowerCase();
		return options.filter(
			(o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q)
		);
	});

	const display = $derived(open ? query : (selected?.label ?? ''));

	function choose(option: Option) {
		if (option.disabled) return;
		value = option.value;
		onchange?.(option.value);
		query = '';
		open = false;
		inputEl?.blur();
	}

	function oninput(event: Event) {
		query = (event.currentTarget as HTMLInputElement).value;
		open = true;
		activeIndex = 0;
		onsearch?.(query);
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			open = true;
			activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			activeIndex = Math.max(activeIndex - 1, 0);
		} else if (event.key === 'Enter') {
			if (open && filtered[activeIndex]) {
				event.preventDefault();
				choose(filtered[activeIndex]);
			}
		} else if (event.key === 'Escape') {
			open = false;
			query = '';
		}
	}
</script>

<div
	bind:this={ref}
	class={cn('relative w-full', className)}
	use:dismissable={() => {
		open = false;
		query = '';
	}}
	{...rest}
>
	<div class="relative flex items-center">
		<SearchIcon class="pointer-events-none absolute left-3 size-4 text-mute" />
		<input
			bind:this={inputEl}
			{id}
			{disabled}
			{oninput}
			{onkeydown}
			value={display}
			{placeholder}
			role="combobox"
			aria-expanded={open}
			aria-controls={`${id ?? 'combobox'}-list`}
			aria-autocomplete="list"
			aria-invalid={invalid || undefined}
			onfocus={() => (open = true)}
			class={cn(
				'ds-body w-full rounded-sm border bg-card py-2.5 pr-3 pl-9 text-ink transition-colors duration-150 placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:bg-lane',
				invalid
					? 'border-status-urgent'
					: 'border-hairline hover:border-primary-border focus-visible:border-primary'
			)}
		/>
	</div>

	{#if open}
		<div
			id={`${id ?? 'combobox'}-list`}
			role="listbox"
			class={cn(panelClass, 'absolute top-[calc(100%+6px)] left-0 max-h-64 w-full overflow-y-auto')}
		>
			{#each filtered as option, i (option.value)}
				<div
					role="option"
					tabindex="-1"
					aria-selected={option.value === value}
					data-disabled={option.disabled ?? false}
					onclick={() => choose(option)}
					onmouseenter={() => (activeIndex = i)}
					onkeydown={(e) => e.key === 'Enter' && choose(option)}
					class={cn(panelItemClass, 'justify-between', i === activeIndex && 'bg-primary-soft')}
				>
					<span class="min-w-0">
						<span class="block truncate">{option.label}</span>
						{#if option.description}
							<span class="ds-caption block text-mute">{option.description}</span>
						{/if}
					</span>
					{#if option.value === value}
						<CheckIcon class="size-4 shrink-0 text-primary" />
					{/if}
				</div>
			{:else}
				<p class="ds-body px-2.5 py-3 text-center text-faint">{emptyText}</p>
			{/each}
		</div>
	{/if}
</div>
