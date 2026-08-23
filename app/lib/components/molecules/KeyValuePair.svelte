<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		label: string;
		value?: string;
		mono?: boolean;
		/** Stacks label above value instead of side-by-side. */
		stacked?: boolean;
		class?: string;
	};

	let {
		ref = $bindable(null),
		label,
		value,
		mono = false,
		stacked = false,
		class: className,
		...rest
	}: Props = $props();
</script>

<div
	bind:this={ref}
	class={cn(
		stacked ? 'flex flex-col gap-0.5' : 'flex items-baseline justify-between gap-4',
		className
	)}
	{...rest}
>
	<dt class="ds-label shrink-0 text-mute">{label}</dt>
	<dd class={cn('min-w-0 text-right text-ink', mono ? 'ds-mono text-[13px]' : 'ds-body')}>
		{value ?? '—'}
	</dd>
</div>
