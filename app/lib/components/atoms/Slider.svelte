<script lang="ts">
	import { Slider as SliderPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	type Props = {
		ref?: HTMLSpanElement | null;
		value?: number;
		min?: number;
		max?: number;
		step?: number;
		size?: 'sm' | 'md';
		disabled?: boolean;
		id?: string;
		'aria-label'?: string;
		class?: string;
		onValueChange?: (value: number) => void;
	};

	let {
		ref = $bindable(null),
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		size = 'md',
		disabled = false,
		class: className,
		onValueChange,
		...rest
	}: Props = $props();

	const trackH = $derived(size === 'sm' ? 'h-1.5' : 'h-2');
	const thumb = $derived(size === 'sm' ? 'size-3.5' : 'size-4');
</script>

<SliderPrimitive.Root
	type="single"
	bind:value
	bind:ref
	{min}
	{max}
	{step}
	{disabled}
	onValueChange={(next) => onValueChange?.(next)}
	class={cn('relative flex w-full touch-none select-none items-center disabled:cursor-not-allowed disabled:opacity-50', className)}
	{...(rest as Record<string, unknown>)}
>
	<span class={cn('relative w-full grow overflow-hidden rounded-full bg-primary-soft', trackH)}>
		<SliderPrimitive.Range class="absolute h-full bg-primary" />
	</span>
	<SliderPrimitive.Thumb
		index={0}
		class={cn(
			'block rounded-full border-0 bg-primary shadow-[var(--shadow-card)] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:pointer-events-none',
			thumb
		)}
	/>
</SliderPrimitive.Root>
