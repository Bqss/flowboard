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
			iconColor: 'text-status-done-ink',
			iconBackground: 'bg-status-done-soft',
			ariaLabel: 'Sukses'
		},
		error: {
			icon: CancelCircleIcon,
			iconColor: 'text-status-urgent-ink',
			iconBackground: 'bg-status-urgent-soft',
			ariaLabel: 'Gagal'
		},
		warning: {
			icon: Alert02Icon,
			iconColor: 'text-status-progress-ink',
			iconBackground: 'bg-status-progress-soft',
			ariaLabel: 'Peringatan'
		},
		info: {
			icon: InformationCircleIcon,
			iconColor: 'text-primary-ink',
			iconBackground: 'bg-primary-soft',
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
		'pointer-events-auto relative flex w-[calc(100vw-4.5rem)] max-w-[22rem] items-start gap-3 rounded-2xl border border-hairline bg-card p-3.5 shadow-popover transition-shadow duration-200 hover:shadow-lg',
		className
	)}
	{...rest}
>
	<div
		class={cn(
			'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
			cfg.iconColor,
			cfg.iconBackground
		)}
		aria-hidden="true"
	>
		<HugeiconsIcon icon={cfg.icon} size={18} strokeWidth={1.8} />
	</div>

	<div class="min-w-0 flex-1 pr-6">
		<p class="ds-label text-sm font-semibold text-ink-soft leading-snug break-words">
			{message}
		</p>
		{#if description}
			<p class="ds-caption mt-1 line-clamp-2 break-words text-xs leading-snug text-mute">
				{description}
			</p>
		{/if}
		{#if action}
			<button
				type="button"
				onclick={action.onclick}
				class="mt-2 inline-flex min-h-8 w-fit items-center rounded-full bg-primary-soft px-3 text-xs font-semibold text-primary-ink transition-colors hover:bg-primary-soft-hover cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
			>
				{action.label}
			</button>
		{/if}
	</div>

	{#if onclose}
		<button
			type="button"
			onclick={onclose}
			aria-label={closeLabel}
			class="absolute right-2 top-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-mute transition-colors hover:bg-lane hover:text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
		>
			<HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.8} />
		</button>
	{/if}
</div>
