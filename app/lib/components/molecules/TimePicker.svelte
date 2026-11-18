<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Clock01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Select as SelectPrimitive } from 'bits-ui';
	import Portal from '$lib/components/atoms/Portal.svelte';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { panelClass, panelItemClass } from './shared.js';

	type Props = WithElementRef<Omit<HTMLAttributes<HTMLDivElement>, 'onchange'>> & {
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

	const slots = $derived.by(() => {
		const out: string[] = [];
		for (let minutes = 0; minutes < 24 * 60; minutes += step) {
			const t = `${`${Math.floor(minutes / 60)}`.padStart(2, '0')}:${`${minutes % 60}`.padStart(2, '0')}`;
			if (t >= min && t <= max) out.push(t);
		}
		return out;
	});

	const bitsItems = $derived(slots.map((t) => ({ value: t, label: t })));
</script>

<div bind:this={ref} class={cn('relative w-full', className)} {...rest}>
	<SelectPrimitive.Root
		type="single"
		bind:value
		bind:open
		items={bitsItems}
		{disabled}
		allowDeselect={false}
		onValueChange={(next) => onchange?.(next)}
	>
		<SelectPrimitive.Trigger
			{id}
			aria-describedby={ariaDescribedby}
			aria-errormessage={ariaErrormessage}
			aria-invalid={invalid || undefined}
			class={cn(
				'text-sm flex w-full items-center justify-between gap-2 rounded-md border bg-card px-3 h-10 py-0 text-left transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:bg-lane',
				value ? 'text-ink' : 'text-faint',
				invalid
					? 'border-status-urgent'
					: 'border-hairline hover:border-primary-border focus-visible:border-primary'
			)}
		>
			{#snippet children()}
				<span class={cn('truncate', value && 'ds-mono')}>{value || placeholder}</span>
				<HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} class="size-4 shrink-0 text-mute" />
			{/snippet}
		</SelectPrimitive.Trigger>

		<Portal>
			<SelectPrimitive.Content
				sideOffset={6}
				class={cn(panelClass, 'z-[400] max-h-60 w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)] overflow-y-auto')}
			>
				<SelectPrimitive.Viewport>
					{#each slots as slot (slot)}
						<SelectPrimitive.Item
							value={slot}
							label={slot}
							class={cn(
								panelItemClass,
								'ds-mono justify-between text-meta data-[highlighted]:bg-primary-soft',
								slot === value && 'bg-primary-soft font-medium'
							)}
						>
							{#snippet children({ selected })}
								{slot}
								{#if selected}
									<HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} class="size-4 text-primary" />
								{/if}
							{/snippet}
						</SelectPrimitive.Item>
					{/each}
				</SelectPrimitive.Viewport>
			</SelectPrimitive.Content>
		</Portal>
	</SelectPrimitive.Root>
</div>
