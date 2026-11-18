<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Calendar03Icon, ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Calendar as CalendarPrimitive, Popover as PopoverPrimitive } from 'bits-ui';
	import Portal from '$lib/components/atoms/Portal.svelte';
	import { parseDate, today as todayDate, getLocalTimeZone, type DateValue } from '@internationalized/date';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { panelClass } from './shared.js';

	type Props = WithElementRef<Omit<HTMLAttributes<HTMLDivElement>, 'onchange'>> & {
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

	type Preset = { label: string; days: number };
	const PRESETS: Preset[] = [
		{ label: '7 hari', days: 7 },
		{ label: '30 hari', days: 30 },
		{ label: '90 hari', days: 90 },
		{ label: '6 bulan', days: 180 },
		{ label: '1 tahun', days: 365 }
	];

	let open = $state(false);
	/** null = no selection yet, 'end' = waiting for the end date */
	let pickPhase: 'end' | null = $state(null);
	let hoverIso = $state('');

	function toDateValue(iso: string): DateValue | undefined {
		if (!iso) return undefined;
		try {
			return parseDate(iso);
		} catch {
			return undefined;
		}
	}

	function fmt(iso: string, opts: Intl.DateTimeFormatOptions) {
		const d = toDateValue(iso);
		return d ? d.toDate(getLocalTimeZone()).toLocaleDateString(locale, opts) : '';
	}
	const fmtShort = (iso: string) => fmt(iso, { day: 'numeric', month: 'short' });
	const fmtLong = (iso: string) => fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' });

	const label = $derived.by(() => {
		if (start && end) return `${fmtShort(start)} — ${fmtShort(end)}`;
		if (start && pickPhase === 'end') return `${fmtShort(start)} — pilih akhir`;
		return placeholder;
	});

	const hasSelection = $derived(Boolean(start && end));

	/** Range boundaries for highlighting (end follows hover while picking). */
	const rangeStart = $derived(start || '');
	const rangeEnd = $derived(end || hoverIso);

	function isInRange(iso: string) {
		if (!rangeStart || !rangeEnd) return false;
		return iso > rangeStart && iso < rangeEnd;
	}
	function isRangeEdge(iso: string) {
		return iso === rangeStart || iso === rangeEnd;
	}

	function pick(iso: string) {
		if (!start || (start && end) || pickPhase === null) {
			// First click (or restart): this is the start date.
			start = iso;
			end = '';
			pickPhase = 'end';
			return;
		}
		// Second click: this is the end date; keep the order sorted.
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

	function onDayHover(iso: string) {
		if (pickPhase === 'end') hoverIso = iso < start ? start : iso;
	}

	function applyPreset(days: number) {
		const f = todayDate(getLocalTimeZone()).subtract({ days: days - 1 });
		start = f.toString();
		end = todayDate(getLocalTimeZone()).toString();
		pickPhase = null;
		onchange?.(start, end);
		open = false;
	}

	function clearRange() {
		start = '';
		end = '';
		pickPhase = null;
		onchange?.('', '');
	}

	const navButtonClass =
		'grid size-7 place-items-center rounded-md text-mute transition-colors hover:bg-primary-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]';
</script>

<div bind:this={ref} class={cn('relative w-full', className)} {...rest}>
	<PopoverPrimitive.Root bind:open>
		<PopoverPrimitive.Trigger
			{disabled}
			class={cn(
				'text-sm flex w-full items-center justify-between gap-2 rounded-md border bg-card px-3 h-10 py-0 text-left transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:bg-lane',
				hasSelection || pickPhase === 'end' ? 'text-ink' : 'text-faint',
				'border-hairline hover:border-primary-border focus-visible:border-primary'
			)}
		>
			<span class="truncate">{label}</span>
			<HugeiconsIcon icon={Calendar03Icon} size={16} strokeWidth={1.8} class="size-4 shrink-0 text-mute" />
		</PopoverPrimitive.Trigger>

		<Portal>
			<PopoverPrimitive.Content
				side="bottom"
				align="end"
				sideOffset={6}
				aria-label="Pilih rentang tanggal"
				class={cn(panelClass, 'z-[400] flex w-[28rem] overflow-hidden p-0')}
			>
				<!-- Preset sidebar -->
				<div class="w-36 shrink-0 space-y-0.5 border-r border-hairline bg-canvas-sunken/50 p-2">
					<span class="ds-caption block px-2 py-1.5 font-semibold tracking-wider text-faint uppercase">Preset</span>
					{#each PRESETS as preset (preset.label)}
						<button
							type="button"
							onclick={() => applyPreset(preset.days)}
							class="w-full rounded-md px-2 py-1.5 text-left text-sm font-medium text-ink-soft transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
						>
							{preset.label}
						</button>
					{/each}
					<div class="my-1.5 border-t border-hairline"></div>
					<button
						type="button"
						onclick={clearRange}
						class="w-full rounded-md px-2 py-1.5 text-left text-sm font-medium text-mute transition-colors hover:bg-lane hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
					>
						Kosongkan
					</button>
				</div>

				<!-- Calendar -->
				<div class="flex-1 p-3">
					<CalendarPrimitive.Root
						type="single"
						calendarLabel="Pilih tanggal"
						value={undefined}
						onValueChange={(next) => next && pick(next.toString())}
						weekStartsOn={1}
						weekdayFormat="short"
						{locale}
						class="w-full"
					>
						{#snippet children({ months, weekdays })}
							<CalendarPrimitive.Header class="mb-1 flex items-center justify-between">
								<CalendarPrimitive.PrevButton>
									{#snippet child({ props })}
										<button {...props} type="button" aria-label="Bulan sebelumnya" class={navButtonClass}>
											<HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.8} class="size-4" />
										</button>
									{/snippet}
								</CalendarPrimitive.PrevButton>
								<CalendarPrimitive.Heading class="text-sm font-semibold text-ink capitalize" />
								<CalendarPrimitive.NextButton>
									{#snippet child({ props })}
										<button {...props} type="button" aria-label="Bulan berikutnya" class={navButtonClass}>
											<HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} class="size-4" />
										</button>
									{/snippet}
								</CalendarPrimitive.NextButton>
							</CalendarPrimitive.Header>

							{#each months as month (month.value)}
								<CalendarPrimitive.Grid class="w-full border-collapse">
									<CalendarPrimitive.GridHead>
										<CalendarPrimitive.GridRow class="grid grid-cols-[repeat(7,2.5rem)]">
											{#each weekdays as weekday (weekday)}
												<CalendarPrimitive.HeadCell class="grid h-7 place-items-center text-badge font-semibold text-mute">
													{weekday}
												</CalendarPrimitive.HeadCell>
											{/each}
										</CalendarPrimitive.GridRow>
									</CalendarPrimitive.GridHead>
									<CalendarPrimitive.GridBody>
										{#each month.weeks as weekDates (weekDates[0]?.toString())}
											<CalendarPrimitive.GridRow class="grid grid-cols-[repeat(7,2.5rem)]">
												{#each weekDates as date (date.toString())}
													{@const iso = date.toString()}
													<!-- The cell carries the continuous range band; the day itself is always the same pill size. -->
													<CalendarPrimitive.Cell
														{date}
														month={month.value}
														class={cn('flex h-8 items-center justify-center p-0', isInRange(iso) && 'bg-primary-soft')}
													>
														<CalendarPrimitive.Day
															onmouseenter={() => onDayHover(iso)}
															class={cn(
																'grid size-8 place-items-center rounded-md text-sm transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] data-[outside-month]:text-faint data-[disabled]:pointer-events-none data-[disabled]:text-faint/50',
																isRangeEdge(iso)
																	? 'bg-primary font-semibold text-on-primary hover:bg-primary'
																	: 'text-ink hover:bg-primary-soft'
															)}
														>
															{date.day}
														</CalendarPrimitive.Day>
													</CalendarPrimitive.Cell>
												{/each}
											</CalendarPrimitive.GridRow>
										{/each}
									</CalendarPrimitive.GridBody>
								</CalendarPrimitive.Grid>
							{/each}
						{/snippet}
					</CalendarPrimitive.Root>

					<!-- Footer with selected range info -->
					<div class="mt-2 flex items-center justify-between border-t border-hairline pt-2 text-meta">
						<span class="text-mute">
							{#if start && end}
								{fmtLong(start)} — {fmtLong(end)}
							{:else if start && pickPhase === 'end'}
								<span class="font-medium text-primary">Pilih tanggal akhir</span>
							{:else}
								Pilih tanggal mulai
							{/if}
						</span>
						{#if hasSelection}
							<button
								type="button"
								onclick={() => (open = false)}
								class="rounded-md px-2 py-1 font-medium text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
							>
								Selesai
							</button>
						{/if}
					</div>
				</div>
			</PopoverPrimitive.Content>
		</Portal>
	</PopoverPrimitive.Root>
</div>
