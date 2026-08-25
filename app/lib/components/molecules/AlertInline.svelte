<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import CheckCircle2Icon from '@lucide/svelte/icons/circle-check';
	import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
	import InfoIcon from '@lucide/svelte/icons/info';
	import XIcon from '@lucide/svelte/icons/x';
	import { dashboardText } from '$lib/i18n/dashboard.js';
	import { locale } from '$lib/i18n/index.js';

	type Tone = 'positive' | 'negative' | 'warning' | 'info';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		title?: string;
		tone?: Tone;
		dismissible?: boolean;
		onclose?: () => void;
		class?: string;
		children?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		title,
		tone = 'info',
		dismissible = false,
		onclose,
		class: className,
		children,
		...rest
	}: Props = $props();
	const closeLabel = $derived(dashboardText($locale, 'common.close'));

	const toneMap = {
		positive: {
			wrap: 'border-positive/20 bg-status-done-soft text-status-done-ink',
			icon: CheckCircle2Icon
		},
		negative: {
			wrap: 'border-status-urgent/20 bg-status-urgent-soft text-status-urgent',
			icon: AlertTriangleIcon
		},
		warning: {
			wrap: 'border-warning/20 bg-status-progress-soft text-status-progress-ink',
			icon: AlertTriangleIcon
		},
		info: {
			wrap: 'border-hairline bg-primary-soft text-primary',
			icon: InfoIcon
		}
	} as const;

	const cfg = $derived(toneMap[tone]);
</script>

<div
	bind:this={ref}
	role="status"
	class={cn(
		'flex items-start gap-2.5 rounded-lg border px-3 py-2.5',
		cfg.wrap,
		className
	)}
	{...rest}
>
	<cfg.icon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />

	<div class="min-w-0 flex-1">
		{#if title}
			<p class="ds-body font-semibold">{title}</p>
		{/if}
		<div class={cn('ds-body', title && 'mt-0.5 opacity-90')}>
			{@render children?.()}
		</div>
	</div>

	{#if dismissible}
		<button
			type="button"
			onclick={onclose}
			aria-label={closeLabel}
			class="grid size-6 shrink-0 place-items-center rounded-full transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
		>
			<XIcon class="size-3.5" />
		</button>
	{/if}
</div>
