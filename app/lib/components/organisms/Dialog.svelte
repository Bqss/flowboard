<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { dismissable } from '$lib/components/molecules/shared.js';
	import { modalPanelClass } from './shared.js';
	import { modalBackdrop, modalPanel } from './modal-transitions.js';
	import XIcon from '@lucide/svelte/icons/x';
	import { dashboardText } from '$lib/i18n/dashboard.js';
	import { locale } from '$lib/i18n/index.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		open?: boolean;
		title?: string;
		description?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		onclose?: () => void;
		class?: string;
		children?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		open = $bindable(false),
		title,
		description,
		size = 'md',
		onclose,
		class: className,
		children,
		footer,
		...rest
	}: Props = $props();
	const closeLabel = $derived(dashboardText($locale, 'common.close'));

	const sizes = {
		sm: 'max-w-sm',
		md: 'max-w-lg',
		lg: 'max-w-2xl',
		xl: 'max-w-3xl'
	} as const;

	function close() {
		open = false;
		onclose?.();
	}

	$effect(() => {
		if (!open) return;

		const scrollY = window.scrollY;
		const { style } = document.body;
		const prevOverflow = style.overflow;

		style.overflow = 'hidden';

		return () => {
			style.overflow = prevOverflow;
			window.scrollTo(0, scrollY);
		};
	});
</script>

{#if open}
	<div
		bind:this={ref}
		class={cn('fixed inset-0 z-[100]', className)}
		use:dismissable={close}
		{...rest}
	>
		<button
			type="button"
			class="absolute inset-0 bg-[var(--overlay-scrim)] backdrop-blur-[2px]"
			aria-label={closeLabel}
			transition:modalBackdrop={{ duration: 220 }}
			onclick={close}
		></button>

		<div
			class="pointer-events-none fixed inset-0 flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'dialog-title' : undefined}
		>
			<div
				class={cn(
					modalPanelClass,
					sizes[size],
					'pointer-events-auto flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden'
				)}
				transition:modalPanel={{ duration: 300, y: 8, startScale: 0.97 }}
			>
				<div class="mb-4 flex shrink-0 items-start justify-between gap-3">
					<div class="min-w-0">
						{#if title}
							<h2 id="dialog-title" class="ds-section-title text-ink">{title}</h2>
						{/if}
						{#if description}
							<p class="ds-body mt-1 text-mute">{description}</p>
						{/if}
					</div>
					<button
						type="button"
						onclick={close}
						aria-label={closeLabel}
						class="grid size-8 shrink-0 place-items-center rounded-full text-mute transition-colors hover:bg-lane hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
					>
						<XIcon class="size-4" />
					</button>
				</div>

				<div class="min-w-0 flex-1 overflow-y-auto overscroll-contain">{@render children?.()}</div>

				{#if footer}
					<div class="mt-6 flex shrink-0 justify-end gap-2 border-t border-hairline pt-4">
						{@render footer()}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
