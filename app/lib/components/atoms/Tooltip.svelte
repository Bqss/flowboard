<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { Tooltip as TooltipPrimitive } from 'bits-ui';
	import Portal from '$lib/components/atoms/Portal.svelte';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		text: string;
		side?: 'top' | 'bottom' | 'left' | 'right';
		/** Open delay in ms. Previously a hide delay; Bits controls hide timing itself. */
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
</script>

<TooltipPrimitive.Provider>
	<TooltipPrimitive.Root delayDuration={duration}>
		<TooltipPrimitive.Trigger>
			{#snippet child({ props })}
				<span
					bind:this={ref}
					class={cn('relative inline-flex', className)}
					{...props}
					{...(rest as Record<string, unknown>)}
				>
					{@render children?.()}
				</span>
			{/snippet}
		</TooltipPrimitive.Trigger>

		<Portal>
			<TooltipPrimitive.Content
				{side}
				sideOffset={6}
				role="tooltip"
				class="ds-caption pointer-events-none z-[400] w-max max-w-48 rounded-md bg-ink px-2 py-1 text-on-primary shadow-[var(--shadow-raised)]"
			>
				{text}
			</TooltipPrimitive.Content>
		</Portal>
	</TooltipPrimitive.Root>
</TooltipPrimitive.Provider>
