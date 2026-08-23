<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { dismissable, panelClass } from './shared.js';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		/** ISO date, `YYYY-MM-DD`. */
		value?: string;
		min?: string;
		max?: string;
		placeholder?: string;
		id?: string;
		disabled?: boolean;
		invalid?: boolean;
		locale?: string;
		onchange?: (value: string) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		value = $bindable(''),
		min,
		max,
		placeholder = 'Pilih tanggal',
		id,
		disabled = false,
		invalid = false,
		locale = 'id-ID',
		onchange,
		class: className,
		'aria-describedby': ariaDescribedby,
		'aria-errormessage': ariaErrormessage,
		...rest
	}: Props = $props();

	const WEEKDAYS = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg'];

	function toISO(date: Date) {
		const m = `${date.getMonth() + 1}`.padStart(2, '0');
		const d = `${date.getDate()}`.padStart(2, '0');
		return `${date.getFullYear()}-${m}-${d}`;
	}

	function parse(iso: string) {
		const [y, m, d] = iso.split('-').map(Number);
		return y && m && d ? new Date(y, m - 1, d) : null;
	}

	const today = new Date();
	const selectedDate = $derived(value ? parse(value) : null);

	let cursor = $state(new Date(today.getFullYear(), today.getMonth(), 1));
	let open = $state(false);

	$effect(() => {
		const d = value ? parse(value) : null;
		if (d) cursor = new Date(d.getFullYear(), d.getMonth(), 1);
	});

	const monthLabel = $derived(
		cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
	);

	/** Monday-first grid, padded to whole weeks. */
	const days = $derived.by(() => {
		const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
		const offset = (first.getDay() + 6) % 7;
		const start = new Date(first);
		start.setDate(first.getDate() - offset);

		return Array.from({ length: 42 }, (_, i) => {
			const date = new Date(start);
			date.setDate(start.getDate() + i);
			const iso = toISO(date);
			return {
				iso,
				day: date.getDate(),
				outside: date.getMonth() !== cursor.getMonth(),
				isToday: iso === toISO(today),
				disabled: (min && iso < min) || (max && iso > max) || false
			};
		});
	});

	const label = $derived(
		selectedDate
			? selectedDate.toLocaleDateString(locale, {
					day: 'numeric',
					month: 'short',
					year: 'numeric'
				})
			: placeholder
	);

	function shiftMonth(delta: number) {
		cursor = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
	}

	function pick(iso: string) {
		value = iso;
		onchange?.(iso);
		open = false;
	}
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
		aria-haspopup="dialog"
		aria-expanded={open}
		class={cn(
			'ds-body flex w-full items-center justify-between gap-2 rounded-sm border bg-card px-3 py-2.5 text-left transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:bg-lane',
			selectedDate ? 'text-ink' : 'text-faint',
			invalid
				? 'border-status-urgent'
				: 'border-hairline hover:border-primary-border focus-visible:border-primary'
		)}
	>
		<span class="truncate">{label}</span>
		<CalendarIcon class="size-4 shrink-0 text-mute" />
	</button>

	{#if open}
		<div
			role="dialog"
			aria-label="Pilih tanggal"
			class={cn(panelClass, 'absolute top-[calc(100%+6px)] left-0 w-[17.5rem] p-3')}
		>
			<div class="mb-2 flex items-center justify-between">
				<button
					type="button"
					onclick={() => shiftMonth(-1)}
					aria-label="Bulan sebelumnya"
					class="grid size-7 place-items-center rounded-full text-mute transition-colors hover:bg-primary-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
				>
					<ChevronLeftIcon class="size-4" />
				</button>
				<span class="ds-section-title text-ink capitalize">{monthLabel}</span>
				<button
					type="button"
					onclick={() => shiftMonth(1)}
					aria-label="Bulan berikutnya"
					class="grid size-7 place-items-center rounded-full text-mute transition-colors hover:bg-primary-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
				>
					<ChevronRightIcon class="size-4" />
				</button>
			</div>

			<div class="grid grid-cols-7 gap-0.5">
				{#each WEEKDAYS as weekday (weekday)}
					<span class="ds-caption grid h-7 place-items-center text-faint">{weekday}</span>
				{/each}

				{#each days as day (day.iso)}
					<button
						type="button"
						disabled={day.disabled}
						onclick={() => pick(day.iso)}
						aria-current={day.isToday ? 'date' : undefined}
						aria-pressed={day.iso === value}
						class={cn(
							'grid h-8 place-items-center rounded-sm text-[13px] transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:pointer-events-none disabled:text-faint/50',
							day.outside ? 'text-faint' : 'text-ink',
							day.iso === value
								? 'bg-primary font-semibold text-on-primary hover:bg-primary'
								: 'hover:bg-primary-soft',
							day.isToday && day.iso !== value && 'font-semibold text-primary'
						)}
					>
						{day.day}
					</button>
				{/each}
			</div>

			<div class="mt-2 flex items-center justify-between border-t border-hairline pt-2">
				<button
					type="button"
					onclick={() => pick(toISO(new Date()))}
					class="ds-caption rounded-md px-2 py-1 text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
				>
					Hari ini
				</button>
				<button
					type="button"
					onclick={() => pick('')}
					class="ds-caption rounded-md px-2 py-1 text-mute transition-colors hover:bg-lane hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
				>
					Kosongkan
				</button>
			</div>
		</div>
	{/if}
</div>
