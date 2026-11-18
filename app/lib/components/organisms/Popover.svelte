<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { Popover as PopoverPrimitive } from 'bits-ui';
	import Portal from '$lib/components/atoms/Portal.svelte';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { panelClass } from '$lib/components/molecules/shared.js';

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

	// Bits toggles from the trigger wrapper (pointer + keyboard).
	// The caller's `toggle` is a no-op so a click doesn't open and close it again.
	const noopToggle = () => {};
</script>

<PopoverPrimitive.Root bind:open>
	<PopoverPrimitive.Trigger>
		{#snippet child({ props })}
			<span
				bind:this={ref}
				class={cn('relative inline-flex', className)}
				{...props}
				{...(rest as Record<string, unknown>)}
			>
				{@render trigger({ open, toggle: noopToggle })}
			</span>
		{/snippet}
	</PopoverPrimitive.Trigger>

	<Portal>
		<PopoverPrimitive.Content
			{side}
			{align}
			sideOffset={6}
			aria-label={label}
			class={cn(panelClass, 'z-[400] min-w-[14rem] p-3')}
		>
			{@render content()}
		</PopoverPrimitive.Content>
	</Portal>
</PopoverPrimitive.Root>
