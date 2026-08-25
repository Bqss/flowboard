<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { dismissable } from '$lib/components/molecules/shared.js';
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
		...rest
	}: Props = $props();
	const closeLabel = $derived(dashboardText($locale, 'common.close'));

	function close() {
		open = false;
		onclose?.();
	}
</script>

{#if open}
	<div class="fixed inset-0 z-[100]" use:dismissable={close}>
		<div class="fixed inset-0 bg-[var(--overlay-scrim)]" aria-hidden="true"></div>

		<div
			bind:this={ref}
			role="dialog"
			aria-modal="true"
			aria-label={title}
			class={cn(
				'fixed inset-y-0 z-[101] flex w-full max-w-md flex-col bg-card shadow-[var(--shadow-modal)]',
				side === 'right' ? 'right-0 rounded-l-xl' : 'left-0 rounded-r-xl',
				className
			)}
			{...rest}
		>
			<div class="flex items-center justify-between border-b border-hairline px-5 py-4">
				{#if title}
					<h2 class="ds-section-title text-ink">{title}</h2>
				{/if}
				<button
					type="button"
					onclick={close}
					aria-label={closeLabel}
					class="grid size-8 place-items-center rounded-full text-mute hover:bg-lane hover:text-ink"
				>
					<XIcon class="size-4" />
				</button>
			</div>

			<div class="flex-1 overflow-y-auto px-5 py-4">{@render children?.()}</div>

			{#if footer}
				<div class="border-t border-hairline px-5 py-4">{@render footer()}</div>
			{/if}
		</div>
	</div>
{/if}
