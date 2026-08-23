<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		tone?: 'neutral' | 'queued' | 'positive' | 'negative' | 'warning' | 'progress' | 'done' | 'urgent';
		removable?: boolean;
		onremove?: () => void;
		class?: string;
		children?: import('svelte').Snippet;
	};

	const toneMap = {
		neutral: 'border border-status-idle/25 bg-lane text-mute',
		queued: 'border border-status-queued/20 bg-primary-soft text-primary-ink',
		positive: 'border border-status-done/25 bg-status-done-soft text-status-done-ink',
		done: 'border border-status-done/25 bg-status-done-soft text-status-done-ink',
		negative: 'border border-status-urgent/25 bg-status-urgent-soft text-status-urgent-ink',
		urgent: 'border border-status-urgent/25 bg-status-urgent-soft text-status-urgent-ink',
		warning: 'border border-status-progress/25 bg-status-progress-soft text-status-progress-ink',
		progress: 'border border-status-progress/25 bg-status-progress-soft text-status-progress-ink'
	} as const;

	let {
		ref = $bindable(null),
		tone = 'neutral',
		removable = false,
		onremove,
		class: className,
		children,
		...rest
	}: Props = $props();
</script>

<span
	bind:this={ref}
	class={cn(
		'ds-caption inline-flex w-fit shrink-0 items-center gap-1 rounded-sm py-0.5 pl-2.5 pr-1.5 transition-colors',
		toneMap[tone],
		className
	)}
	{...rest}
>
	{@render children?.()}
	{#if removable}
		<button
			type="button"
			onclick={onremove}
			class="rounded-full p-0.5 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
			aria-label="Hapus"
		>
			<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
				<path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
			</svg>
		</button>
	{/if}
</span>
