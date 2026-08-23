<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLButtonAttributes> & {
		checked?: boolean;
		size?: 'sm' | 'md';
	};

	let {
		ref = $bindable(null),
		checked = $bindable(false),
		size = 'md',
		class: className,
		...rest
	}: Props = $props();

	const track = $derived(size === 'sm' ? 'h-4 w-7' : 'h-[22px] w-9');
	const knob = $derived(size === 'sm' ? 'size-3' : 'size-[18px]');
	const shift = $derived(size === 'sm' ? 'translate-x-3' : 'translate-x-4');
</script>

<button
	bind:this={ref}
	type="button"
	role="switch"
	aria-checked={checked}
	onclick={() => (checked = !checked)}
	class={cn(
		'relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-50',
		track,
		checked ? 'bg-primary' : 'bg-lane border-hairline',
		className
	)}
	{...rest}
>
	<span
		class={cn(
			'pointer-events-none inline-block transform rounded-full bg-card shadow-[var(--shadow-card)] transition-transform duration-200 ease-out',
			knob,
			checked ? shift : 'translate-x-0.5'
		)}
		aria-hidden="true"
	></span>
</button>