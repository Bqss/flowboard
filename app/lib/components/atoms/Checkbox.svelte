<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { Checkbox as CheckboxPrimitive } from 'bits-ui';
	import { cn, type WithElementRef } from '$lib/utils.js';

	// `onchange` is intentionally omitted: use `onCheckedChange` (Bits) instead.
	type Props = WithElementRef<Omit<HTMLButtonAttributes, 'onchange' | 'value' | 'checked' | 'type'>> & {
		checked?: boolean;
		indeterminate?: boolean;
		size?: 'sm' | 'md';
		name?: string;
		value?: string;
		onCheckedChange?: (checked: boolean) => void;
	};

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		indeterminate = $bindable(false),
		size = 'md',
		class: className,
		onCheckedChange,
		...rest
	}: Props = $props();

	const dim = $derived(size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]');
	const iconSize = $derived(size === 'sm' ? 12 : 14);
</script>

<CheckboxPrimitive.Root
	bind:ref
	bind:checked
	bind:indeterminate
	onCheckedChange={(next) => onCheckedChange?.(next)}
	class={cn(
		'peer inline-flex shrink-0 items-center justify-center rounded-xs border border-hairline bg-card text-on-primary transition-colors duration-150 hover:border-primary-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:bg-lane data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary',
		dim,
		className
	)}
	{...(rest as Record<string, unknown>)}
>
	{#snippet children({ checked: isChecked, indeterminate: isIndeterminate })}
		{#if isChecked || isIndeterminate}
			<svg
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="2.2"
				stroke-linecap="round"
				stroke-linejoin="round"
				width={iconSize}
				height={iconSize}
				aria-hidden="true"
			>
				{#if isIndeterminate}
					<path d="M3.5 8h9" />
				{:else}
					<path d="M3.5 8.5l3 3 6-6.5" />
				{/if}
			</svg>
		{/if}
	{/snippet}
</CheckboxPrimitive.Root>
