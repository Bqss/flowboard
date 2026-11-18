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
		/** ISO date, `YYYY-MM-DD`. */
		value?: string;
		min?: string;
		max?: string;
		placeholder?: string;
		id?: string;
		disabled?: boolean;
		invalid?: boolean;
		locale?: string;
		inline?: boolean;
		rangeStart?: string;
		rangeEnd?: string;
		showQuickActions?: boolean;
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
		inline = false,
		rangeStart,
		rangeEnd,
		showQuickActions = true,
		onchange,
		class: className,
		'aria-describedby': ariaDescribedby,
		'aria-errormessage': ariaErrormessage,
		...rest
	}: Props = $props();

	let open = $state(false);

	/** Parses an ISO string, ignoring malformed input so the calendar never throws. */
	function toDateValue(iso: string | undefined): DateValue | undefined {
		if (!iso) return undefined;
		try {
			return parseDate(iso);
		} catch {
			return undefined;
		}
	}

	const selected = $derived(toDateValue(value));
	const minValue = $derived(toDateValue(min));
	const maxValue = $derived(toDateValue(max));

	const label = $derived(
		selected
			? selected.toDate(getLocalTimeZone()).toLocaleDateString(locale, {
					day: 'numeric',
					month: 'short',
					year: 'numeric'
				})
			: placeholder
	);

	function commit(next: DateValue | undefined) {
		value = next ? next.toString() : '';
		onchange?.(value);
		if (!inline) open = false;
	}

	function inRange(date: DateValue) {
		const iso = date.toString();
		return Boolean(rangeStart && rangeEnd && iso > rangeStart && iso < rangeEnd);
	}
	function isRangeEdge(date: DateValue) {
		const iso = date.toString();
		return Boolean((rangeStart && iso === rangeStart) || (rangeEnd && iso === rangeEnd));
	}

	const navButtonClass =
		'grid size-7 place-items-center rounded-full text-mute transition-colors hover:bg-primary-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]';
</script>

{#snippet calendarPanel()}
	<CalendarPrimitive.Root
		type="single"
		calendarLabel="Pilih tanggal"
		value={selected}
		onValueChange={(next) => commit(next)}
		{minValue}
		{maxValue}
		weekStartsOn={1}
		weekdayFormat="short"
		{locale}
		class="w-full"
	>
		{#snippet children({ months, weekdays })}
			<CalendarPrimitive.Header class="mb-2 flex items-center justify-between">
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
						<CalendarPrimitive.GridRow class="grid grid-cols-7 gap-1">
							{#each weekdays as weekday (weekday)}
								<CalendarPrimitive.HeadCell class="grid h-8 place-items-center text-badge font-semibold text-mute">
									{weekday}
								</CalendarPrimitive.HeadCell>
							{/each}
						</CalendarPrimitive.GridRow>
					</CalendarPrimitive.GridHead>
					<CalendarPrimitive.GridBody>
						{#each month.weeks as weekDates (weekDates[0]?.toString())}
							<CalendarPrimitive.GridRow class="grid grid-cols-7 gap-1">
								{#each weekDates as date (date.toString())}
									<CalendarPrimitive.Cell {date} month={month.value} class="flex justify-center p-0">
										<CalendarPrimitive.Day
											class={cn(
												'grid size-9 place-items-center rounded-md text-sm transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] data-[outside-month]:text-faint data-[disabled]:pointer-events-none data-[disabled]:text-faint/50 data-[selected]:bg-primary data-[selected]:font-semibold data-[selected]:text-on-primary hover:bg-primary-soft data-[selected]:hover:bg-primary',
												inRange(date) && 'bg-primary-soft',
												isRangeEdge(date) && 'bg-primary-soft font-semibold text-primary'
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

	{#if showQuickActions}
		<div class="mt-2 flex items-center justify-between border-t border-hairline pt-2">
			<button
				type="button"
				onclick={() => commit(todayDate(getLocalTimeZone()))}
				class="ds-caption rounded-md px-2 py-1 text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
			>
				Hari ini
			</button>
			<button
				type="button"
				onclick={() => commit(undefined)}
				class="ds-caption rounded-md px-2 py-1 text-mute transition-colors hover:bg-lane hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
			>
				Kosongkan
			</button>
		</div>
	{/if}
{/snippet}

{#if inline}
	<div bind:this={ref} class={cn('relative w-full', className)} {...rest}>
		<div role="dialog" aria-label="Pilih tanggal" class={cn(panelClass, 'w-full p-3')}>
			{@render calendarPanel()}
		</div>
	</div>
{:else}
	<div bind:this={ref} class={cn('relative w-full', className)} {...rest}>
		<PopoverPrimitive.Root bind:open>
			<PopoverPrimitive.Trigger
				{id}
				{disabled}
				aria-describedby={ariaDescribedby}
				aria-errormessage={ariaErrormessage}
				aria-invalid={invalid || undefined}
				class={cn(
					'text-sm flex w-full items-center justify-between gap-2 rounded-md border bg-card px-3 h-10 py-0 text-left transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:bg-lane',
					selected ? 'text-ink' : 'text-faint',
					invalid
						? 'border-status-urgent'
						: 'border-hairline hover:border-primary-border focus-visible:border-primary'
				)}
			>
				<span class="truncate">{label}</span>
				<HugeiconsIcon icon={Calendar03Icon} size={16} strokeWidth={1.8} class="size-4 shrink-0 text-mute" />
			</PopoverPrimitive.Trigger>

			<Portal>
				<PopoverPrimitive.Content
					side="bottom"
					align="start"
					sideOffset={6}
					aria-label="Pilih tanggal"
					class={cn(panelClass, 'z-[400] w-[17.5rem] p-3')}
				>
					{@render calendarPanel()}
				</PopoverPrimitive.Content>
			</Portal>
		</PopoverPrimitive.Root>
	</div>
{/if}
