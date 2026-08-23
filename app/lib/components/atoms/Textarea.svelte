<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLTextareaAttributes> & {
		invalid?: boolean;
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		invalid = false,
		class: className,
		...rest
	}: Props = $props();
</script>

<textarea
	bind:this={ref}
	bind:value
	aria-invalid={invalid || undefined}
	class={cn(
		'ds-body block w-full min-w-0 rounded-sm border bg-card px-3 py-2.5 text-ink transition-colors duration-150 placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:bg-lane disabled:text-mute',
		invalid
			? 'border-status-urgent focus-visible:border-status-urgent focus-visible:ring-status-urgent/15'
			: 'border-hairline hover:border-primary-border focus-visible:border-primary',
		className
	)}
	{...rest}
></textarea>
