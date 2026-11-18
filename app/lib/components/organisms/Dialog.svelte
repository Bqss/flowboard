<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import Portal from '$lib/components/atoms/Portal.svelte';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { modalPanelClass } from './shared.js';
	import { modalBackdrop, modalPanel } from './modal-transitions.js';
	import XIcon from '@lucide/svelte/icons/x';
	import { dashboardText } from '$lib/i18n/dashboard.js';
	import { locale } from '$lib/i18n/index.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		open?: boolean;
		title?: string;
		description?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
		onclose?: () => void;
		class?: string;
		titleClass?: string;
		children?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
		customHeader?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		open = $bindable(false),
		title,
		description,
		size = 'md',
		onclose,
		class: className,
		titleClass,
		children,
		footer,
		customHeader,
		...rest
	}: Props = $props();

	const closeLabel = $derived(dashboardText($locale, 'common.close'));
	let dialogBodyEl = $state<HTMLDivElement | null>(null);
	let visualViewportHeight = $state<number | null>(null);
	let visualViewportOffsetTop = $state(0);

	const dialogViewportHeight = $derived(
		visualViewportHeight === null ? '100dvh' : `${visualViewportHeight}px`
	);
	const dialogMaxHeight = $derived(
		visualViewportHeight === null
			? 'calc(100dvh - 2rem)'
			: `${Math.max(0, visualViewportHeight - 32)}px`
	);

	const sizes = {
		sm: 'max-w-sm',
		md: 'max-w-lg',
		lg: 'max-w-2xl',
		xl: 'max-w-3xl',
		full: 'max-w-[min(96vw,1440px)]'
	} as const;
	const panelWidths = {
		sm: '24rem',
		md: '32rem',
		lg: '42rem',
		xl: '48rem',
		full: 'min(96vw, 1440px)'
	} as const;
	const dialogPanelWidth = $derived(
		size === 'full'
			? panelWidths.full
			: `min(calc(100vw - 2rem), ${panelWidths[size]})`
	);

	// Bits handles Escape, outside-click, focus trap, focus restore and scroll lock.
	// onclose fires only for user-initiated closes, matching the old behaviour.
	function handleOpenChange(next: boolean) {
		if (!next) onclose?.();
	}

	function scrollFocusedFieldIntoView() {
		const focusedField = document.activeElement;
		if (
			!(focusedField instanceof HTMLElement) ||
			!dialogBodyEl?.contains(focusedField) ||
			!focusedField.matches('input:not([type="hidden"]), textarea, select, [contenteditable="true"]')
		) {
			return;
		}

		focusedField.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}

	function handleDialogFocusIn(event: FocusEvent) {
		const target = event.target;
		if (
			!(target instanceof HTMLElement) ||
			!dialogBodyEl?.contains(target) ||
			!target.matches('input:not([type="hidden"]), textarea, select, [contenteditable="true"]')
		) {
			return;
		}

		requestAnimationFrame(scrollFocusedFieldIntoView);
	}

	function updateVisualViewport() {
		const viewport = window.visualViewport;
		visualViewportHeight = viewport?.height ?? window.innerHeight;
		visualViewportOffsetTop = viewport?.offsetTop ?? 0;
		requestAnimationFrame(scrollFocusedFieldIntoView);
	}

	// Track the visual viewport so the panel stays above the mobile keyboard.
	$effect(() => {
		if (!open) return;

		const viewport = window.visualViewport;
		updateVisualViewport();
		viewport?.addEventListener('resize', updateVisualViewport);
		viewport?.addEventListener('scroll', updateVisualViewport);
		window.addEventListener('resize', updateVisualViewport);

		return () => {
			viewport?.removeEventListener('resize', updateVisualViewport);
			viewport?.removeEventListener('scroll', updateVisualViewport);
			window.removeEventListener('resize', updateVisualViewport);
			visualViewportHeight = null;
			visualViewportOffsetTop = 0;
		};
	});
</script>

<DialogPrimitive.Root bind:open onOpenChange={handleOpenChange}>
	<Portal>
		<DialogPrimitive.Overlay forceMount>
			{#snippet child({ props, open: isOpen })}
				{#if isOpen}
					<div
						{...props}
						class="fixed inset-0 z-[300] bg-[var(--overlay-scrim)] backdrop-blur-[2px]"
						transition:modalBackdrop={{ duration: 220 }}
					></div>
				{/if}
			{/snippet}
		</DialogPrimitive.Overlay>

		<DialogPrimitive.Content forceMount bind:ref>
			{#snippet child({ props, open: isOpen })}
				{#if isOpen}
					<div
						{...props}
						{...rest}
						class={cn('pointer-events-none fixed inset-x-0 z-[301] flex min-h-0 items-center justify-center overflow-y-auto p-4', className)}
						style={`top: ${visualViewportOffsetTop}px; height: ${dialogViewportHeight}; align-items: safe center`}
					>
						<div
							class={cn(
								modalPanelClass,
								sizes[size],
								'pointer-events-auto flex min-h-0 min-w-0 flex-col overflow-hidden',
								size === 'full' && 'p-0'
							)}
							style={`width: ${dialogPanelWidth}; max-width: calc(100vw - 2rem); max-height: ${dialogMaxHeight}`}
							transition:modalPanel={{ duration: 300, y: 8, startScale: 0.97 }}
						>
							{#if customHeader}
								{@render customHeader()}
							{:else}
								<div class="mb-4 flex shrink-0 items-start justify-between gap-3">
									<div class="min-w-0">
										{#if title}
										<DialogPrimitive.Title class={cn('text-heading-lg font-extrabold text-ink', titleClass)}>{title}</DialogPrimitive.Title>
										{/if}
										{#if description}
											<DialogPrimitive.Description class="ds-body mt-1 text-mute">
												{description}
											</DialogPrimitive.Description>
										{/if}
									</div>
									<DialogPrimitive.Close
										aria-label={closeLabel}
										class="grid size-8 shrink-0 place-items-center rounded-full text-mute transition-colors hover:bg-lane hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
									>
										<XIcon class="size-4" />
									</DialogPrimitive.Close>
								</div>
							{/if}

							<div
								bind:this={dialogBodyEl}
								onfocusin={handleDialogFocusIn}
								class="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain scroll-py-4"
							>
								{@render children?.()}
							</div>

							{#if footer}
								<div class="mt-6 flex shrink-0 justify-end gap-2 border-t border-hairline pt-4">
									{@render footer()}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			{/snippet}
		</DialogPrimitive.Content>
	</Portal>
</DialogPrimitive.Root>
