<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Chip } from '$lib/components/atoms/index.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: string[];
		placeholder?: string;
		id?: string;
		max?: number;
		disabled?: boolean;
		invalid?: boolean;
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
		tone = 'queued',
		separators = ['Enter', ','],
		onchange,
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
		onchange?.(value);
	}

	function remove(tag: string) {
		value = value.filter((t) => t !== tag);
		onchange?.(value);
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
		'flex w-full flex-wrap items-center gap-1.5 rounded-sm border bg-card px-2 py-1.5 transition-colors duration-150 focus-within:ring-2 focus-within:ring-[var(--focus)]',
		invalid
			? 'border-status-urgent'
			: 'border-hairline hover:border-primary-border focus-within:border-primary',
		disabled && 'pointer-events-none bg-lane',
		className
	)}
	{...rest}
>
	{#each value as tag (tag)}
		<Chip {tone} removable onremove={() => remove(tag)}>{tag}</Chip>
	{/each}

	<input
		bind:this={inputEl}
		bind:value={draft}
		{id}
		{onkeydown}
		{disabled}
		onblur={() => add(draft)}
		placeholder={full ? `Maksimal ${max} tag` : value.length ? '' : placeholder}
		readonly={full}
		class="ds-body min-w-24 flex-1 bg-transparent px-1 py-0.5 text-ink outline-none placeholder:text-faint"
	/>
</div>
