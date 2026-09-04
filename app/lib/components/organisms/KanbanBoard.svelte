<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Badge, Button, Avatar } from '$lib/components/atoms/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Add01Icon,
		CheckmarkCircle02Icon,
		CheckListIcon,
		UserCircleIcon,
		WhatsappIcon,
		Alert02Icon,
		Clock01Icon
	} from '@hugeicons/core-free-icons';
	import type { KanbanColumn, KanbanCard } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		columns: KanbanColumn[];
		class?: string;
		addLabel?: string;
		emptyTitle?: string;
		emptyDropHint?: string;
		columnLabel?: string;
		waErrorLabel?: string;
		dragEnabled?: boolean;
		oncardclick?: (columnId: string, cardId: string) => void;
		oncardmove?: (cardId: string, fromColumnId: string, toColumnId: string) => void | Promise<void>;
		onadd?: (columnId: string) => void;
		onaddcard?: (columnId: string) => void;
	};

	let {
		ref = $bindable(null),
		columns,
		class: className,
		addLabel = 'Add customer',
		emptyTitle = 'No customers yet',
		emptyDropHint = 'Drop card here',
		columnLabel = 'Column',
		waErrorLabel = 'WA Error',
		dragEnabled = true,
		oncardclick,
		oncardmove,
		onadd,
		onaddcard,
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
	const labelBarColor = {
		queued: '#4f46e5',
		progress: '#f59e0b',
		done: '#22c55e',
		urgent: '#f43f5e',
		idle: '#94a3b8'
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
	class={cn('flex gap-4 overflow-x-auto pb-6 pt-1 items-start', className)}
	{...rest}
>
	{#each columns as column, i (column.id)}
		{@const tone = laneTone(i)}
		<section
			role="group"
			aria-label={`${columnLabel} ${column.title}`}
			data-onboarding={i === 0 ? 'kanban-stage' : undefined}
			class={cn(
			'flex w-lane shrink-0 flex-col rounded-2xl bg-canvas-sunken p-3.5 select-none shadow-xs border border-hairline transition-all duration-150',
				dropTargetColumnId === column.id &&
					draggingCardId &&
					dragSourceColumnId !== column.id &&
					'bg-primary-soft/40 ring-2 ring-primary/30'
			)}
			ondragover={(event) => onDragOver(event, column.id)}
			ondragleave={(event) => onDragLeave(event, column.id)}
			ondrop={(event) => onDrop(event, column.id)}
		>
			<!-- Column Header -->
			<header class="mb-3 flex items-center justify-between gap-2">
				<div class="flex min-w-0 items-center gap-2">
					<span class={cn('size-2.5 shrink-0 rounded-full shadow-xs', laneDot[tone])} aria-hidden="true"></span>
					<h3 class="text-sm font-bold text-ink truncate tracking-tight">{column.title}</h3>
				</div>
			<span class="rounded-full bg-card/80 px-2.5 py-0.5 text-xs font-semibold text-mute">
					{column.items.length} {column.items.length === 1 ? 'kad' : 'kad'}
				</span>
			</header>

			<!-- Add Customer Button -->
	<button
		type="button"
		data-onboarding={i === 0 ? 'kanban-add-card' : undefined}
		class="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-hairline bg-card py-2.5 px-3 text-xs font-bold text-ink-soft shadow-control hover:border-primary hover:bg-primary-soft hover:text-primary transition-all cursor-pointer group active:scale-[0.99]"
		onclick={() => {
			onadd?.(column.id);
			onaddcard?.(column.id);
		}}
	>
		<HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2.2} class="text-mute group-hover:text-primary transition-colors" />
		<span>{addLabel}</span>
	</button>

			<!-- Cards Stack -->
			<div class="flex min-h-[140px] flex-1 flex-col gap-2.5">
				{#if column.items.length === 0}
				<div class="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-hairline p-6 text-center space-y-1.5">
						<p class="text-xs font-medium text-mute">{emptyTitle}</p>
						{#if dragEnabled && oncardmove}
							<p class="text-[11px] text-faint">{emptyDropHint}</p>
						{/if}
					</div>
				{:else}
					{#each column.items as card, ci (card.id)}
						{@const badgeTone = card.badgeTone ?? resolveTone(card.badge)}
						{@const barTone = card.labelBarTone ?? (badgeTone === 'neutral' ? tone : badgeTone)}
						{@const accentHex = labelBarColor[barTone as keyof typeof labelBarColor] ?? '#4f46e5'}

						<button
							type="button"
							draggable={dragEnabled && Boolean(oncardmove)}
							ondragstart={(event) => onDragStart(event, column.id, card.id)}
							ondragend={onDragEnd}
							onclick={() => handleCardClick(column.id, card.id)}
							data-onboarding={i === 0 && ci === 0 ? 'kanban-card' : undefined}
							class={cn(
						'group relative cursor-grab rounded-xl bg-card pl-4.5 p-3.5 text-left border border-hairline shadow-card hover:border-hairline-strong hover:shadow-card-hover transition-all duration-150 ease-out active:cursor-grabbing space-y-2.5 overflow-hidden',
								card.selected && 'ring-2 ring-primary border-transparent shadow-card-hover',
								draggingCardId === card.id && 'opacity-40 ring-2 ring-primary/40'
							)}
						>
							<!-- Left Accent Bar -->
							<div
								class="absolute top-3 bottom-3 left-0 w-1 rounded-full"
								style="background-color: {accentHex};"
							></div>

							<!-- Top Meta Row: Badges & Assignee Chip -->
							<div class="flex items-center justify-between gap-2 pt-0.5">
								<div class="flex flex-wrap items-center gap-1 min-w-0">
									{#if card.waError}
										<Badge tone="urgent" variant="soft" class="text-[10px] font-semibold px-1.5 py-0.2">
											{waErrorLabel}
										</Badge>
									{/if}
								{#if card.badge}
									<Badge tone={badgeTone} variant="soft" class="text-[10px] font-semibold px-1.5 py-0.2">
										{card.badge}
									</Badge>
								{/if}
								{#if card.dueBadge}
									<Badge tone={card.dueBadge.tone} variant="soft" class="text-[10px] font-semibold px-1.5 py-0.2 inline-flex items-center gap-0.5">
										<HugeiconsIcon icon={Clock01Icon} size={10} strokeWidth={2} />
										{card.dueBadge.label}
									</Badge>
								{/if}
								</div>

								{#if card.assignee}
								<div class="flex min-w-0 items-center gap-1.5 rounded-full bg-canvas-sunken px-2 py-0.5 shrink-0">
										<Avatar name={card.assignee} src={card.assigneeAvatar} size={16} class="shrink-0" />
										<span class="truncate text-[11px] font-semibold text-ink-soft max-w-[90px]">
											{card.assignee}
										</span>
									</div>
								{/if}
							</div>

							<!-- Card Title (Customer Name) -->
							<div>
								<p class="text-sm font-bold text-ink leading-snug break-words group-hover:text-primary transition-colors">
									{card.title}
								</p>

								<!-- Subtitle (Product / WhatsApp number) -->
								{#if card.subtitle}
									<p class="text-xs text-mute mt-1 truncate">
										{card.subtitle}
									</p>
								{/if}
								{#if card.dueDateText}
									<p class="text-[11px] text-mute mt-1 flex items-center gap-1 truncate">
										<HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={1.8} class="shrink-0 text-mute" />
										<span class="truncate">{card.dueDateText}</span>
									</p>
								{/if}
							</div>

							<!-- Footer Row: Checklist Progress -->
							{#if card.progress}
							<div class="mt-2.5 flex items-center justify-between pt-2 text-xs">
									<div class="flex items-center gap-1.5">
										<HugeiconsIcon
											icon={CheckListIcon}
											size={13}
											strokeWidth={1.8}
											class={card.progressDone ? 'text-status-done-ink' : 'text-mute'}
										/>
										<span
											class={cn(
												'text-[11px] font-semibold',
												card.progressDone ? 'text-status-done-ink' : 'text-mute'
											)}
										>
											{card.progress}
										</span>
									</div>
									{#if card.progressDone}
										<span class="inline-flex items-center gap-0.5 rounded-full bg-status-done-soft text-status-done-ink border border-status-done/30 px-1.5 py-0.2 text-[10px] font-semibold">
											✓ Selesai
										</span>
									{/if}
								</div>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		</section>
	{/each}
</div>
