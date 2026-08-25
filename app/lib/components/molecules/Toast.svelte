<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		CheckmarkCircle02Icon,
		CancelCircleIcon,
		Alert02Icon,
		InformationCircleIcon,
		Cancel01Icon
	} from '@hugeicons/core-free-icons';
	import type { ToastTone } from './toast-state.svelte.js';
	import { dashboardText } from '$lib/i18n/dashboard.js';
	import { locale } from '$lib/i18n/index.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		id?: string;
		message: string;
		description?: string;
		tone?: ToastTone;
		onclose?: () => void;
		action?: {
			label: string;
			onclick: () => void;
		};
		class?: string;
	};

	let {
		ref = $bindable(null),
		id,
		message,
		description,
		tone = 'success',
		onclose,
		action,
		class: className,
		...rest
	}: Props = $props();
	const closeLabel = $derived(dashboardText($locale, 'common.close'));

	const toneConfig = {
		success: {
			icon: CheckmarkCircle02Icon,
			iconColor: 'text-status-done',
			ariaLabel: 'Sukses'
		},
		error: {
			icon: CancelCircleIcon,
			iconColor: 'text-status-urgent',
			ariaLabel: 'Gagal'
		},
		warning: {
			icon: Alert02Icon,
			iconColor: 'text-status-progress',
			ariaLabel: 'Peringatan'
		},
		info: {
			icon: InformationCircleIcon,
			iconColor: 'text-primary',
			ariaLabel: 'Informasi'
		}
	} as const;

	const cfg = $derived(toneConfig[tone] ?? toneConfig.success);
</script>

<div
	bind:this={ref}
	role="status"
	aria-live="polite"
	data-testid="toast-item"
	class={cn(
		'pointer-events-auto flex max-w-sm items-center gap-3 rounded-full border border-hairline bg-card py-2.5 pl-4 pr-3.5 shadow-popover transition-all duration-200 hover:shadow-lg',
		className
	)}
	{...rest}
>
	<div class={cn('flex shrink-0 items-center justify-center', cfg.iconColor)} aria-hidden="true">
		<HugeiconsIcon icon={cfg.icon} size={18} strokeWidth={1.8} />
	</div>

	<div class="min-w-0 flex-1">
		<p class="ds-label text-sm font-semibold text-ink-soft leading-snug break-words">
			{message}
		</p>
		{#if description}
			<p class="ds-caption text-xs text-mute mt-0.5 leading-tight break-words">
				{description}
			</p>
		{/if}
	</div>

	{#if action}
		<button
			type="button"
			onclick={action.onclick}
			class="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary-soft cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
		>
			{action.label}
		</button>
	{/if}

	{#if onclose}
		<button
			type="button"
			onclick={onclose}
			aria-label={closeLabel}
			class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-mute transition-colors hover:bg-lane hover:text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
		>
			<HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.8} />
		</button>
	{/if}
</div>
