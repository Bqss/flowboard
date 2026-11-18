<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import Portal from '$lib/components/atoms/Portal.svelte';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import XIcon from '@lucide/svelte/icons/x';
	import { dashboardText } from '$lib/i18n/dashboard.js';
	import { locale } from '$lib/i18n/index.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		open?: boolean;
		title?: string;
		side?: 'right' | 'left';
		onclose?: () => void;
		class?: string;
		children?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
		headerActions?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		open = $bindable(false),
		title,
		side = 'right',
		onclose,
		class: className,
		children,
		footer,
		headerActions,
		...rest
	}: Props = $props();

	const closeLabel = $derived(dashboardText($locale, 'common.close'));

	function handleOpenChange(next: boolean) {
		if (!next) onclose?.();
	}
</script>

<DialogPrimitive.Root bind:open onOpenChange={handleOpenChange}>
	<Portal>
		<DialogPrimitive.Overlay forceMount>
			{#snippet child({ props, open: isOpen })}
				{#if isOpen}
					<div {...props} class="fixed inset-0 z-[300] bg-[var(--overlay-scrim)]"></div>
				{/if}
			{/snippet}
		</DialogPrimitive.Overlay>

		<DialogPrimitive.Content forceMount bind:ref>
			{#snippet child({ props, open: isOpen })}
				{#if isOpen}
					<div
						{...props}
						{...rest}
						class={cn(
							'fixed inset-y-0 z-[301] flex w-full max-w-md flex-col bg-card shadow-[var(--shadow-modal)]',
							side === 'right' ? 'right-0 rounded-l-xl' : 'left-0 rounded-r-xl',
							className
						)}
					>
						<div class="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
							<div class="min-w-0 flex-1">
								{#if title}
									<DialogPrimitive.Title class="text-heading-lg truncate font-extrabold text-ink">{title}</DialogPrimitive.Title>
								{/if}
							</div>
							<div class="flex shrink-0 items-center gap-2">
								{@render headerActions?.()}
								<DialogPrimitive.Close
									aria-label={closeLabel}
									class="grid size-8 place-items-center rounded-full text-mute transition-colors hover:bg-lane hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
								>
									<XIcon class="size-4" />
								</DialogPrimitive.Close>
							</div>
						</div>

						<div class="flex-1 overflow-y-auto px-5 py-4">{@render children?.()}</div>

						{#if footer}
							<div class="border-t border-hairline px-5 py-4">{@render footer()}</div>
						{/if}
					</div>
				{/if}
			{/snippet}
		</DialogPrimitive.Content>
	</Portal>
</DialogPrimitive.Root>
