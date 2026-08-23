<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Badge, Button, Avatar } from '$lib/components/atoms/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Add01Icon,
		CheckmarkCircle02Icon,
		CheckListIcon,
		UserCircleIcon
	} from '@hugeicons/core-free-icons';
	import type { KanbanColumn, KanbanCard } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		columns: KanbanColumn[];
		class?: string;
		addLabel?: string;
		dragEnabled?: boolean;
		oncardclick?: (columnId: string, cardId: string) => void;
		oncardmove?: (cardId: string, fromColumnId: string, toColumnId: string) => void | Promise<void>;
		onadd?: (columnId: string) => void;
	};

	let {
		ref = $bindable(null),
		columns,
		class: className,
		addLabel = 'Tambah card',
		dragEnabled = true,
		oncardclick,
		oncardmove,
		onadd,
		...rest
	}: Props = $props();

	let draggingCardId = $state<string | null>(null);
	let dragSourceColumnId = $state<string | null>(null);
	let dropTargetColumnId = $state<string | null>(null);
	let suppressClick = $state(false);

	const laneTone = (index: number) => {
		const tones = ['queued', 'progress', 'done'] as const;
		return tones[index % tones.length];
	};

	const laneDot = {
		queued: 'bg-status-queued',
		progress: 'bg-status-progress',
		done: 'bg-status-done'
	} as const;

	const labelBarBg = {
		queued: 'bg-status-queued',
		progress: 'bg-status-progress',
		done: 'bg-status-done',
		urgent: 'bg-status-urgent',
		idle: 'bg-status-idle'
	} as const;

	function resolveTone(tag?: string): 'urgent' | 'progress' | 'done' | 'queued' | 'neutral' {
		if (!tag) return 'neutral';
		const lower = tag.toLowerCase();
		if (lower.includes('urgent') || lower.includes('darurat') || lower.includes('vip')) return 'urgent';
		if (lower.includes('progress') || lower.includes('proses') || lower.includes('follow')) return 'progress';
		if (lower.includes('done') || lower.includes('selesai') || lower.includes('closing')) return 'done';
		if (lower.includes('queued') || lower.includes('pending') || lower.includes('baru')) return 'queued';
		return 'neutral';
	}

	function resetDragState() {
		draggingCardId = null;
		dragSourceColumnId = null;
		dropTargetColumnId = null;
	}

	function onDragStart(event: DragEvent, columnId: string, cardId: string) {
		if (!dragEnabled || !oncardmove) return;

		draggingCardId = cardId;
		dragSourceColumnId = columnId;
		dropTargetColumnId = columnId;
		event.dataTransfer?.setData('text/plain', cardId);
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function onDragEnd() {
		if (draggingCardId) {
			suppressClick = true;
			queueMicrotask(() => {
				suppressClick = false;
			});
		}
		resetDragState();
	}

	function onDragOver(event: DragEvent, columnId: string) {
		if (!draggingCardId || !oncardmove) return;
		event.preventDefault();
		dropTargetColumnId = columnId;
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}

	function onDragLeave(event: DragEvent, columnId: string) {
		const related = event.relatedTarget as Node | null;
		const current = event.currentTarget as HTMLElement;
		if (related && current.contains(related)) return;
		if (dropTargetColumnId === columnId) {
			dropTargetColumnId = null;
		}
	}

	async function onDrop(event: DragEvent, columnId: string) {
		event.preventDefault();
		const cardId = draggingCardId;
		const fromColumnId = dragSourceColumnId;
		resetDragState();

		if (!cardId || !fromColumnId || !oncardmove || fromColumnId === columnId) return;
		await oncardmove(cardId, fromColumnId, columnId);
	}

	function handleCardClick(columnId: string, cardId: string) {
		if (suppressClick) return;
		oncardclick?.(columnId, cardId);
	}
</script>

<div
	bind:this={ref}
	class={cn('flex gap-4 overflow-x-auto pb-4 pt-1', className)}
	{...rest}
>
	{#each columns as column, i (column.id)}
		{@const tone = laneTone(i)}
		<section
			role="group"
			aria-label={`Kolom ${column.title}`}
			class={cn(
				'flex w-lane shrink-0 flex-col rounded-lane bg-lane p-4 select-none transition-colors duration-150',
				dropTargetColumnId === column.id &&
					draggingCardId &&
					dragSourceColumnId !== column.id &&
					'bg-primary-soft/30 ring-2 ring-primary/30'
			)}
			ondragover={(event) => onDragOver(event, column.id)}
			ondragleave={(event) => onDragLeave(event, column.id)}
			ondrop={(event) => onDrop(event, column.id)}
		>
			<header class="mb-3 flex items-center justify-between gap-2">
				<div class="flex min-w-0 items-center gap-2.5">
					<span class={cn('size-2.5 shrink-0 rounded-full', laneDot[tone])} aria-hidden="true"></span>
					<h3 class="ds-section-title truncate text-ink">{column.title}</h3>
				</div>
				<span class="ds-caption shrink-0 rounded-full border border-hairline bg-card px-2.5 py-0.5 font-semibold text-mute shadow-control">
					{column.items.length} Total
				</span>
			</header>

			<Button variant="lane" lane={tone} size="lane" class="mb-4 shadow-primary/10" onclick={() => onadd?.(column.id)}>
				<HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
				<span>{addLabel}</span>
			</Button>

			<div class="flex min-h-[140px] flex-1 flex-col gap-3">
				{#if column.items.length === 0}
					<div class="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-hairline-strong/60 bg-card/40 p-6 text-center">
						<p class="ds-caption font-medium text-mute">Belum ada pelanggan</p>
						{#if dragEnabled && oncardmove}
							<p class="ds-caption mt-1 text-faint">Lepaskan card di sini</p>
						{/if}
					</div>
				{:else}
					{#each column.items as card (card.id)}
						{@const badgeTone = card.badgeTone ?? resolveTone(card.badge)}
						{@const barTone = card.labelBarTone ?? (badgeTone === 'neutral' ? tone : badgeTone)}
						<button
							type="button"
							draggable={dragEnabled && Boolean(oncardmove)}
							ondragstart={(event) => onDragStart(event, column.id, card.id)}
							ondragend={onDragEnd}
							onclick={() => handleCardClick(column.id, card.id)}
							class={cn(
								'group relative cursor-grab rounded-card bg-card p-3.5 text-left shadow-card transition-all duration-150 ease-out hover:-translate-y-px hover:shadow-card-hover hover:ring-1 hover:ring-ring-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)] active:cursor-grabbing',
								card.selected && 'ring-2 ring-primary border-transparent shadow-card-hover',
								draggingCardId === card.id && 'opacity-45 ring-2 ring-primary/40'
							)}
						>
							<!-- Top signature label bar -->
							<div class="mb-2.5 flex items-center gap-1.5">
								<div class={cn('h-1 w-7 rounded-full', labelBarBg[barTone as keyof typeof labelBarBg] ?? 'bg-primary')}></div>
							</div>

							<!-- Badges and Assignee Row -->
							<div class="mb-2 flex items-center justify-between gap-2">
								<div class="flex flex-wrap items-center gap-1.5">
									{#if card.waError}
										<Badge tone="urgent" variant="soft">WA Error</Badge>
									{/if}
									{#if card.badge}
										<Badge tone={badgeTone} variant="soft">{card.badge}</Badge>
									{/if}
								</div>

								{#if card.assignee}
									<div class="flex min-w-0 items-center gap-1 rounded-full border border-hairline bg-canvas-sunken px-2 py-0.5">
										<Avatar name={card.assignee} src={card.assigneeAvatar} size={16} class="shrink-0" />
										<span class="ds-caption truncate text-[11px] font-semibold text-ink-soft">
											{card.assignee}
										</span>
									</div>
								{/if}
							</div>

							<!-- Title with task marker -->
							<div class="flex items-start gap-1.5">
								<HugeiconsIcon
									icon={CheckmarkCircle02Icon}
									size={16}
									strokeWidth={1.8}
									class="mt-0.5 shrink-0 text-faint group-hover:text-primary transition-colors"
								/>
								<p class="ds-body line-clamp-2 font-bold text-ink group-hover:text-primary-ink transition-colors">
									{card.title}
								</p>
							</div>

							<!-- Subtitle (Product / WhatsApp) -->
							{#if card.subtitle}
								<p class="ds-caption mt-1.5 pl-[22px] text-mute line-clamp-1">
									{card.subtitle}
								</p>
							{/if}

							<!-- Footer Row: Checklist Progress & Metadata -->
							{#if card.progress}
								<div class="mt-3 flex items-center justify-between border-t border-hairline/60 pt-2 pl-[22px]">
									<div class="flex items-center gap-1.5">
										<HugeiconsIcon
											icon={CheckListIcon}
											size={14}
											strokeWidth={1.8}
											class={card.progressDone ? 'text-status-done' : 'text-faint'}
										/>
										<span
											class={cn(
												'ds-caption font-semibold',
												card.progressDone ? 'text-status-done-ink' : 'text-ink-soft'
											)}
										>
											{card.progress}
										</span>
									</div>
								</div>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		</section>
	{/each}
</div>
