<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Checkbox } from '$lib/components/atoms/index.js';
	import type { Option } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		options: Option[];
		value?: string[];
		legend?: string;
		orientation?: 'vertical' | 'horizontal';
		size?: 'sm' | 'md';
		disabled?: boolean;
		onchange?: (value: string[]) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		options,
		value = $bindable([]),
		legend,
		orientation = 'vertical',
		size = 'md',
		disabled = false,
		onchange,
		class: className,
		...rest
	}: Props = $props();

	function toggle(option: Option) {
		value = value.includes(option.value)
			? value.filter((v) => v !== option.value)
			: [...value, option.value];
		onchange?.(value);
	}
</script>

<div bind:this={ref} role="group" aria-label={legend} class={cn('w-full', className)} {...rest}>
	{#if legend}
		<p class="ds-label mb-2 text-mute">{legend}</p>
	{/if}

	<div class={cn('flex gap-x-6 gap-y-2.5', orientation === 'vertical' ? 'flex-col' : 'flex-wrap')}>
		{#each options as option (option.value)}
			<label
				class={cn(
					'flex cursor-pointer items-start gap-2.5 select-none',
					(option.disabled || disabled) && 'cursor-not-allowed opacity-60'
				)}
			>
				<Checkbox
					{size}
					class="mt-0.5"
					checked={value.includes(option.value)}
					disabled={option.disabled || disabled}
					onchange={() => toggle(option)}
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
