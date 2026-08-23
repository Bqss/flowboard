<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { dismissable, panelClass } from '$lib/components/molecules/shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		open?: boolean;
		align?: 'start' | 'end' | 'center';
		side?: 'bottom' | 'top';
		label?: string;
		class?: string;
		trigger: import('svelte').Snippet<[{ open: boolean; toggle: () => void }]>;
		content: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		open = $bindable(false),
		align = 'start',
		side = 'bottom',
		label = 'Panel',
		class: className,
		trigger,
		content,
		...rest
	}: Props = $props();
</script>

<div
	bind:this={ref}
	class={cn('relative inline-flex', className)}
	use:dismissable={() => (open = false)}
	{...rest}
>
	{@render trigger({ open, toggle: () => (open = !open) })}

	{#if open}
		<div
			role="dialog"
			aria-label={label}
			class={cn(
				panelClass,
				'absolute min-w-[14rem] p-3',
				side === 'bottom' ? 'top-[calc(100%+6px)]' : 'bottom-[calc(100%+6px)]',
				align === 'end' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'
			)}
		>
			{@render content()}
		</div>
	{/if}
</div>
