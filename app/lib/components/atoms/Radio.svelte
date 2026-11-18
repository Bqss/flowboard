<script lang="ts">
	import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	/** Must be rendered inside a RadioGroup root (molecules/RadioGroup). */
	type Props = {
		ref?: HTMLButtonElement | null;
		value: string;
		size?: 'sm' | 'md';
		disabled?: boolean;
		id?: string;
		name?: string;
		class?: string;
	};

	let { ref = $bindable(null), value, size = 'md', disabled = false, id, name, class: className }: Props = $props();

	const dim = $derived(size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]');
</script>

<RadioGroupPrimitive.Item
	bind:ref
	{value}
	{disabled}
	{id}
	{name}
	class={cn(
		'relative inline-flex shrink-0 items-center justify-center rounded-full border border-hairline bg-card transition-colors duration-150 hover:border-primary-border data-[state=checked]:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:bg-lane',
		dim,
		className
	)}
>
	{#snippet children({ checked })}
		<span
			class={cn(
				'pointer-events-none absolute inset-0 m-auto h-2 w-2 rounded-full bg-primary transition-transform duration-150',
				checked ? 'scale-100' : 'scale-0'
			)}
			aria-hidden="true"
		></span>
	{/snippet}
</RadioGroupPrimitive.Item>
