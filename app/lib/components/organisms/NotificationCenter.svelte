<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { dismissable } from '$lib/components/molecules/shared.js';
	import { IconButton } from '$lib/components/atoms/index.js';
	import BellIcon from '@lucide/svelte/icons/bell';
	import type { NotificationItem } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		items: NotificationItem[];
		title?: string;
		emptyText?: string;
		onmarkAllRead?: () => void;
		onOpenChange?: (open: boolean) => void;
		listTestId?: string;
		itemTestId?: string;
		countTestId?: string;
		class?: string;
	};

	let {
		ref = $bindable(null),
		items,
		title = 'Notifikasi',
		emptyText = 'Tidak ada notifikasi terbaru.',
		onmarkAllRead,
		onOpenChange,
		listTestId,
		itemTestId,
		countTestId,
		class: className,
		...rest
	}: Props = $props();

	let open = $state(false);
	const unread = $derived(items.filter((n) => n.unread).length);

	function setOpen(next: boolean) {
		open = next;
		onOpenChange?.(next);
	}
</script>

<div
	bind:this={ref}
	class={cn('relative inline-flex', className)}
	use:dismissable={() => setOpen(false)}
	{...rest}
>
	<div class="relative">
		<IconButton
			variant="card"
			label={title}
			onclick={() => setOpen(!open)}
			aria-expanded={open}
		>
			<BellIcon />
		</IconButton>
		{#if unread > 0}
			<span
				class="pointer-events-none absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-status-urgent px-1 text-[10px] font-bold text-white tabular-nums ring-2 ring-card"
				data-testid={countTestId}
			>
				{unread > 99 ? '99+' : unread}
			</span>
		{/if}
	</div>

	{#if open}
		<div
			class="absolute top-[calc(100%+8px)] right-0 z-50 w-80 overflow-hidden rounded-xl border border-hairline bg-card shadow-[var(--shadow-raised)]"
			role="region"
			aria-label={title}
		>
			<div class="flex items-center justify-between border-b border-hairline px-4 py-3">
				<span class="ds-section-title text-ink">{title}</span>
				{#if unread > 0}
					<button
						type="button"
						onclick={onmarkAllRead}
						class="ds-caption text-primary transition-colors hover:text-primary"
					>
						Tandai dibaca
					</button>
				{:else}
					<span class="ds-caption text-mute">Semua dibaca</span>
				{/if}
			</div>

			<div class="max-h-80 overflow-y-auto" data-testid={listTestId}>
				{#if items.length === 0}
					<p class="ds-body px-4 py-8 text-center text-mute">{emptyText}</p>
				{:else}
					{#each items as item (item.id)}
						<button
							type="button"
							data-testid={itemTestId}
							onclick={() => {
								item.onselect?.();
								setOpen(false);
							}}
							class="flex w-full flex-col gap-1 border-b border-hairline/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-primary-soft/40 focus-visible:bg-primary-soft/40 focus-visible:outline-none"
						>
							<div class="flex items-start justify-between gap-2">
								<span class="ds-body line-clamp-1 font-semibold text-ink">{item.title}</span>
								{#if item.unread}
									<span class="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true"></span>
								{/if}
							</div>
							{#if item.body}
								<span class="ds-caption line-clamp-2 text-mute">{item.body}</span>
							{/if}
							{#if item.time}
								<span class="ds-caption text-faint">{item.time}</span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
