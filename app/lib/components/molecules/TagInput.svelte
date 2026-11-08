<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<Omit<HTMLAttributes<HTMLDivElement>, 'onchange'>> & {
		value?: string[];
		placeholder?: string;
		id?: string;
		max?: number;
		disabled?: boolean;
		invalid?: boolean;
		bordered?: boolean;
		size?: 'sm' | 'md';
		tone?: 'neutral' | 'queued';
		/** Keys that commit the current draft into a tag. */
		separators?: string[];
		onchange?: (value: string[]) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		value = $bindable([]),
		placeholder = 'Tambah tag lalu Enter…',
		id,
		max,
		disabled = false,
		invalid = false,
		bordered = false,
		size = 'md',
		tone = 'queued',
		separators = ['Enter', ','],
		onchange: onchangeProp,
		class: className,
		...rest
	}: Props = $props();

	let draft = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);

	const full = $derived(max !== undefined && value.length >= max);

	function add(raw: string) {
		const tag = raw.trim().replace(/,$/, '');
		if (!tag || full || value.includes(tag)) {
			draft = '';
			return;
		}
		value = [...value, tag];
		draft = '';
		onchangeProp?.(value);
	}

	function remove(tag: string) {
		value = value.filter((t) => t !== tag);
		onchangeProp?.(value);
	}

	function onkeydown(event: KeyboardEvent) {
		if (separators.includes(event.key)) {
			event.preventDefault();
			add(draft);
		} else if (event.key === 'Backspace' && !draft && value.length) {
			remove(value[value.length - 1]);
		}
	}
</script>

<div
	bind:this={ref}
	onclick={() => inputEl?.focus()}
	onkeydown={(e) => e.key === 'Enter' && inputEl?.focus()}
	role="presentation"
	class={cn(
		'ds-body flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-full border bg-card px-4 py-1 text-ink transition-colors duration-150',
		invalid
			? 'border-status-urgent focus-within:border-status-urgent focus-within:ring-2 focus-within:ring-status-urgent/15'
			: 'border-hairline hover:border-hairline-strong focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15',
		disabled && 'pointer-events-none cursor-not-allowed bg-canvas-sunken opacity-60',
		size === 'sm' ? 'min-h-9 px-3 py-0.5 text-[13px]' : 'min-h-10',
		value.length > 2 && 'rounded-2xl',
		className
	)}
>
	{#each value as tag (tag)}
		<span
			class="inline-flex items-center gap-1 rounded-full border-0 bg-primary-soft text-primary text-xs font-semibold py-0.5 pl-2.5 pr-1.5 transition-colors select-none"
		>
			<span>{tag}</span>
			{#if !disabled}
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						remove(tag);
					}}
					class="grid size-4 place-items-center rounded-full text-primary/70 hover:bg-primary/20 hover:text-primary focus-visible:outline-none transition-colors cursor-pointer"
					aria-label={`Hapus ${tag}`}
				>
					<svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
						<path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
					</svg>
				</button>
			{/if}
		</span>
	{/each}

	<input
		bind:this={inputEl}
		bind:value={draft}
		{id}
		{onkeydown}
		{disabled}
		onblur={() => add(draft)}
		placeholder={full ? `Maksimal ${max} tag` : value.length ? '+ Tambah label…' : placeholder}
		readonly={full}
		class="min-w-24 flex-1 border-0 border-none bg-transparent px-1 py-1 text-sm text-ink outline-none placeholder:text-mute focus:outline-none focus:ring-0 focus:border-none shadow-none"
	/>
</div>
