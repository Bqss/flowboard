<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { dismissable, panelClass, panelItemClass } from './shared.js';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import CheckIcon from '@lucide/svelte/icons/check';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		/** 24h time, `HH:mm`. */
		value?: string;
		/** Minutes between generated slots. */
		step?: number;
		min?: string;
		max?: string;
		placeholder?: string;
		id?: string;
		disabled?: boolean;
		invalid?: boolean;
		onchange?: (value: string) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		value = $bindable(''),
		step = 30,
		min = '00:00',
		max = '23:59',
		placeholder = 'Pilih jam',
		id,
		disabled = false,
		invalid = false,
		onchange,
		class: className,
		'aria-describedby': ariaDescribedby,
		'aria-errormessage': ariaErrormessage,
		...rest
	}: Props = $props();

	let open = $state(false);
	let listEl = $state<HTMLElement | null>(null);

	const slots = $derived.by(() => {
		const out: string[] = [];
		for (let minutes = 0; minutes < 24 * 60; minutes += step) {
			const t = `${`${Math.floor(minutes / 60)}`.padStart(2, '0')}:${`${minutes % 60}`.padStart(2, '0')}`;
			if (t >= min && t <= max) out.push(t);
		}
		return out;
	});

	function pick(slot: string) {
		value = slot;
		onchange?.(slot);
		open = false;
	}

	$effect(() => {
		if (!open || !listEl) return;
		listEl.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'center' });
	});
</script>

<div
	bind:this={ref}
	class={cn('relative w-full', className)}
	use:dismissable={() => (open = false)}
	{...rest}
>
	<button
		{id}
		type="button"
		{disabled}
		aria-describedby={ariaDescribedby}
		onclick={() => (open = !open)}
		aria-haspopup="listbox"
		aria-expanded={open}
		class={cn(
			'ds-body flex w-full items-center justify-between gap-2 rounded-sm border bg-card px-3 py-2.5 text-left transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:bg-lane',
			value ? 'text-ink' : 'text-faint',
			invalid
				? 'border-status-urgent'
				: 'border-hairline hover:border-primary-border focus-visible:border-primary'
		)}
	>
		<span class={cn('truncate', value && 'ds-mono')}>{value || placeholder}</span>
		<ClockIcon class="size-4 shrink-0 text-mute" />
	</button>

	{#if open}
		<div
			bind:this={listEl}
			role="listbox"
			aria-label="Pilih jam"
			class={cn(panelClass, 'absolute top-[calc(100%+6px)] left-0 max-h-60 w-full overflow-y-auto')}
		>
			{#each slots as slot (slot)}
				<div
					role="option"
					tabindex="-1"
					aria-selected={slot === value}
					onclick={() => pick(slot)}
					onkeydown={(e) => e.key === 'Enter' && pick(slot)}
					class={cn(
						panelItemClass,
						'ds-mono justify-between text-[13px]',
						slot === value && 'bg-primary-soft font-medium'
					)}
				>
					{slot}
					{#if slot === value}
						<CheckIcon class="size-4 text-primary" />
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
