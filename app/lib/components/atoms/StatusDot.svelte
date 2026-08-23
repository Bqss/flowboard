<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Tone = 'positive' | 'negative' | 'warning' | 'info' | 'neutral' | 'queued' | 'progress' | 'done' | 'urgent' | 'idle';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		tone?: Tone;
		pulse?: boolean;
		label?: string;
		class?: string;
	};

	const toneColors: Record<Tone, string> = {
		positive: 'bg-status-done',
		negative: 'bg-status-urgent',
		warning: 'bg-status-progress',
		info: 'bg-status-queued',
		neutral: 'bg-status-idle',
		queued: 'bg-status-queued',
		progress: 'bg-status-progress',
		done: 'bg-status-done',
		urgent: 'bg-status-urgent',
		idle: 'bg-status-idle'
	};

	let {
		ref = $bindable(null),
		tone = 'neutral',
		pulse = false,
		label,
		class: className,
		...rest
	}: Props = $props();
</script>

<span bind:this={ref} class={cn('inline-flex items-center gap-1.5', className)} {...rest}>
	<span
		class={cn('size-2 rounded-full', toneColors[tone], pulse && 'animate-pulse')}
		aria-hidden="true"
	></span>
	{#if label}<span class="ds-label text-ink">{label}</span>{/if}
</span>
