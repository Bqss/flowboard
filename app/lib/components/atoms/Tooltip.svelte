<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		text: string;
		side?: 'top' | 'bottom' | 'left' | 'right';
		duration?: number;
		class?: string;
		children?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		text,
		side = 'top',
		duration = 150,
		class: className,
		children,
		...rest
	}: Props = $props();

	let open = $state(false);
	let timer: ReturnType<typeof setTimeout>;

	function show() {
		clearTimeout(timer);
		open = true;
	}
	function scheduleHide() {
		clearTimeout(timer);
		timer = setTimeout(() => (open = false), duration);
	}

	const posMap = {
		top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
		bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
		left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
		right: 'left-full top-1/2 -translate-y-1/2 ml-1.5'
	} as const;
</script>

<span
	bind:this={ref}
	class={cn('relative inline-flex', className)}
	onmouseenter={show}
	onmouseleave={scheduleHide}
	onfocusin={show}
	onfocusout={scheduleHide}
	{...rest}
>
	{@render children?.()}
	{#if open}
		<span
			role="tooltip"
			class={cn(
				'ds-caption pointer-events-none absolute z-50 w-max max-w-48 rounded-md bg-ink px-2 py-1 text-on-primary shadow-[var(--shadow-raised)]',
				posMap[side]
			)}
		>
			{text}
		</span>
	{/if}
</span>