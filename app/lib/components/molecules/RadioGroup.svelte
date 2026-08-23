<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Radio } from '$lib/components/atoms/index.js';
	import type { Option } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		options: Option[];
		value?: string;
		name?: string;
		legend?: string;
		orientation?: 'vertical' | 'horizontal';
		size?: 'sm' | 'md';
		disabled?: boolean;
		/** Renders each option as a selectable card instead of a bare row. */
		variant?: 'plain' | 'card';
		onchange?: (value: string) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		options,
		value = $bindable(''),
		name,
		legend,
		orientation = 'vertical',
		size = 'md',
		disabled = false,
		variant = 'plain',
		onchange,
		class: className,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const groupName = $derived(name ?? `radio-${uid}`);

	function select(option: Option) {
		if (option.disabled || disabled) return;
		value = option.value;
		onchange?.(option.value);
	}
</script>

<div
	bind:this={ref}
	role="radiogroup"
	aria-label={legend}
	class={cn('w-full', className)}
	{...rest}
>
	{#if legend}
		<p class="ds-label mb-2 text-mute">{legend}</p>
	{/if}

	<div
		class={cn(
			'flex gap-x-6 gap-y-2.5',
			orientation === 'vertical' ? 'flex-col' : 'flex-wrap',
			variant === 'card' && 'gap-2.5'
		)}
	>
		{#each options as option (option.value)}
			<label
				class={cn(
					'flex cursor-pointer items-start gap-2.5 select-none',
					variant === 'card' &&
						'rounded-lg border border-hairline bg-card p-3 transition-colors duration-150 ease-out hover:border-primary-border',
					variant === 'card' && value === option.value && 'border-primary bg-primary-soft/50',
					(option.disabled || disabled) && 'cursor-not-allowed opacity-60'
				)}
			>
				<Radio
					{size}
					class="mt-0.5"
					name={groupName}
					value={option.value}
					group={value}
					disabled={option.disabled || disabled}
					onchange={() => select(option)}
				/>
				<span class="min-w-0">
					<span class={cn('block text-ink', size === 'sm' ? 'text-[13px]' : 'ds-body')}>
						{option.label}
					</span>
					{#if option.description}
						<span class="ds-caption block text-mute">{option.description}</span>
					{/if}
				</span>
			</label>
		{/each}
	</div>
</div>
