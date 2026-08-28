<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { dismissable, panelClass } from './shared.js';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		/** ISO start date, `YYYY-MM-DD`. */
		start?: string;
		/** ISO end date, `YYYY-MM-DD`. */
		end?: string;
		placeholder?: string;
		disabled?: boolean;
		locale?: string;
		onchange?: (start: string, end: string) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		start = $bindable(''),
		end = $bindable(''),
		placeholder = 'Pilih rentang tanggal',
		disabled = false,
		locale = 'id-ID',
		onchange,
		class: className,
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

	function fmtShort(iso: string) {
		const d = parse(iso);
		return d ? d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '';
	}

	function fmtLong(iso: string) {
		const d = parse(iso);
		return d ? d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
	}

	const today = new Date();

	type Preset = { label: string; days: number };
	const PRESETS: Preset[] = [
		{ label: '7 hari', days: 7 },
		{ label: '30 hari', days: 30 },
		{ label: '90 hari', days: 90 },
		{ label: '6 bulan', days: 180 },
		{ label: '1 tahun', days: 365 }
	];

	let cursor = $state(new Date(today.getFullYear(), today.getMonth(), 1));
	let open = $state(false);
	/** null = no selection yet, 'start' = waiting for end */
	let pickPhase: 'start' | 'end' | null = $state(null);
	let hoverIso = $state('');

	$effect(() => {
		const d = start ? parse(start) : null;
		if (d) cursor = new Date(d.getFullYear(), d.getMonth(), 1);
	});

	const monthLabel = $derived(
		cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
	);

	const days = $derived.by(() => {
		const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
		const offset = (first.getDay() + 6) % 7;
		const s = new Date(first);
		s.setDate(first.getDate() - offset);

		return Array.from({ length: 42 }, (_, i) => {
			const date = new Date(s);
			date.setDate(s.getDate() + i);
			const iso = toISO(date);
			return {
				iso,
				day: date.getDate(),
				outside: date.getMonth() !== cursor.getMonth(),
				isToday: iso === toISO(today)
			};
		});
	});

	const label = $derived.by(() => {
		if (start && end) {
			return `${fmtShort(start)} — ${fmtShort(end)}`;
		}
		if (start && pickPhase === 'end') {
			return `${fmtShort(start)} — pilih akhir`;
		}
		return placeholder;
	});

	const hasSelection = $derived(Boolean(start && end));

	/** Range boundaries for highlighting */
	const rangeStart = $derived(start || '');
	const rangeEnd = $derived(end || hoverIso);

	function isInRange(iso: string) {
		if (!rangeStart || !rangeEnd) return false;
		return iso > rangeStart && iso < rangeEnd;
	}

	function isRangeEdge(iso: string) {
		return iso === rangeStart || iso === rangeEnd;
	}

	function shiftMonth(delta: number) {
		cursor = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
	}

	function applyPreset(days: number) {
		const t = new Date();
		const f = new Date();
		f.setDate(f.getDate() - (days - 1));
		start = toISO(f);
		end = toISO(t);
		pickPhase = null;
		onchange?.(start, end);
		open = false;
	}

	function pick(iso: string) {
		if (!start || (start && end) || pickPhase === null) {
			// First click or re-start
			start = iso;
			end = '';
			pickPhase = 'end';
		} else {
			// Second click — set end
			if (iso < start) {
				end = start;
				start = iso;
			} else {
				end = iso;
			}
			pickPhase = null;
			onchange?.(start, end);
			open = false;
		}
	}

	function onDayHover(iso: string) {
		if (pickPhase === 'end') {
			hoverIso = iso < start ? start : iso;
		}
	}

	function clearRange() {
		start = '';
		end = '';
		pickPhase = null;
		onchange?.('', '');
	}
</script>

<div
	bind:this={ref}
	class={cn('relative w-full', className)}
	use:dismissable={() => (open = false)}
	{...rest}
>
	<button
		type="button"
		{disabled}
		onclick={() => (open = !open)}
		aria-haspopup="dialog"
		aria-expanded={open}
		class={cn(
			'ds-body flex w-full items-center justify-between gap-2 rounded-sm border bg-card px-3 py-2.5 text-left transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:bg-lane',
			hasSelection || pickPhase === 'end' ? 'text-ink' : 'text-faint',
			'border-hairline hover:border-primary-border focus-visible:border-primary'
		)}
	>
		<span class="truncate">{label}</span>
		<CalendarIcon class="size-4 shrink-0 text-mute" />
	</button>

	{#if open}
		<div
			role="dialog"
			aria-label="Pilih rentang tanggal"
			class={cn(panelClass, 'absolute top-[calc(100%+6px)] right-0 flex w-[40rem] p-0 overflow-hidden')}
		>
			<!-- Preset sidebar -->
			<div class="w-36 shrink-0 border-r border-hairline bg-canvas-sunken/50 p-2 space-y-0.5">
				<span class="ds-caption px-2 py-1.5 text-faint uppercase tracking-wider block">Preset</span>
				{#each PRESETS as preset (preset.label)}
					<button
						type="button"
						onclick={() => applyPreset(preset.days)}
						class="w-full rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-ink-soft transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
					>
						{preset.label}
					</button>
				{/each}
				<div class="border-t border-hairline my-1.5"></div>
				<button
					type="button"
					onclick={clearRange}
					class="w-full rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-mute transition-colors hover:bg-lane hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
				>
					Kosongkan
				</button>
			</div>

			<!-- Calendar -->
			<div class="flex-1 p-3">
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
							onclick={() => pick(day.iso)}
							onmouseenter={() => onDayHover(day.iso)}
							aria-current={day.isToday ? 'date' : undefined}
							class={cn(
								'grid h-8 place-items-center rounded-sm text-[13px] transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
								day.outside ? 'text-faint' : 'text-ink',
								// Range edges — solid primary
								isRangeEdge(day.iso)
									? 'bg-primary font-bold text-on-primary hover:bg-primary'
									: // In range — soft highlight
										isInRange(day.iso)
										? 'bg-primary-soft text-primary-ink'
										: 'hover:bg-primary-soft',
								day.isToday && !isRangeEdge(day.iso) && 'font-semibold text-primary'
							)}
						>
							{day.day}
						</button>
					{/each}
				</div>

				<!-- Footer with selected range info -->
				<div class="mt-2 flex items-center justify-between border-t border-hairline pt-2 text-[13px]">
					<span class="text-mute">
						{#if start && end}
							{fmtLong(start)} — {fmtLong(end)}
						{:else if start && pickPhase === 'end'}
							<span class="text-primary font-medium">Pilih tanggal akhir</span>
						{:else}
							Pilih tanggal mulai
						{/if}
					</span>
					{#if hasSelection}
						<button
							type="button"
							onclick={() => (open = false)}
							class="rounded-md px-2 py-1 text-primary font-medium transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
						>
							Selesai
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
