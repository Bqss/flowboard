<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Badge, Button, Avatar } from '$lib/components/atoms/index.js';
	import { DropdownMenu } from '$lib/components/molecules/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Add01Icon,
		Attachment01Icon,
		BubbleChatIcon,
		CheckmarkCircle02Icon,
		CheckListIcon,
		UserCircleIcon,
		WhatsappIcon,
		Alert02Icon,
		Clock01Icon,
		MoreHorizontalIcon,
		RepeatIcon,
		PencilEdit01Icon,
		Delete02Icon
	} from '@hugeicons/core-free-icons';
	import type { KanbanColumn, KanbanCard } from './shared.js';
	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		columns: KanbanColumn[];
		class?: string;
		addLabel?: string;
		emptyTitle?: string;
		emptyDropHint?: string;
		columnLabel?: string;
		countLabel?: string;
		waErrorLabel?: string;
		dragEnabled?: boolean;
		addButtonPosition?: 'top' | 'bottom';
		onloadmore?: (columnId: string) => void;
		oncardclick?: (columnId: string, cardId: string) => void;
		oncardmove?: (cardId: string, fromColumnId: string, toColumnId: string) => void | Promise<void>;
		oncomplete?: (cardId: string, completed: boolean) => void | Promise<void>;
		onadd?: (columnId: string) => void;
		onaddcard?: (columnId: string) => void;
		oneditcolumn?: (column: KanbanColumn) => void;
		ondeletecolumn?: (column: KanbanColumn) => void;
		renameColumnLabel?: string;
		deleteColumnLabel?: string;
		columnActions?: import('svelte').Snippet<[KanbanColumn]>;
		onaddcolumn?: () => void;
		showAddColumn?: boolean;
		addColumnLabel?: string;
		addColumnDescription?: string;
	};

	let {
		ref = $bindable(null),
		columns,
		class: className,
		addLabel = 'Add customer',
		emptyTitle = 'No customers yet',
		emptyDropHint = 'Drop card here',
		columnLabel = 'Column',
		countLabel = 'kad',
		waErrorLabel = 'WA Error',
		dragEnabled = true,
		addButtonPosition = 'bottom',
		onloadmore,
		oncardclick,
		oncardmove,
		oncomplete,
		onadd,
		onaddcard,
		oneditcolumn,
		ondeletecolumn,
		renameColumnLabel = 'Ubah lajur',
		deleteColumnLabel = 'Padam lajur',
		columnActions,
		onaddcolumn,
		showAddColumn = false,
		addColumnLabel = 'Tambah peringkat baharu',
		addColumnDescription = 'Tambah kolum peringkat baharu ke pipeline aliran kerja ini.',
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
	const colorDots: Record<string, string> = {
		indigo: 'bg-indigo-500',
		sky: 'bg-sky-500',
		amber: 'bg-amber-500',
		emerald: 'bg-emerald-500',
		rose: 'bg-rose-500'
	};
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
{#snippet editIconSnippet()}
	<HugeiconsIcon icon={PencilEdit01Icon} size={15} strokeWidth={1.8} />
{/snippet}

{#snippet deleteIconSnippet()}
	<HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.8} />
{/snippet}


<div
	bind:this={ref}
	class={cn('flex items-start gap-4 overflow-x-auto pb-2 pt-1 kanban-scrollbar-hidden', className)}
	{...rest}
>
	{#each columns as column, i (column.id)}
		{@const tone = laneTone(i)}
		<section
			role="group"
			aria-label={`${columnLabel} ${column.title}`}
			class={cn(
				'flex h-full min-h-0 w-lane shrink-0 flex-col rounded-2xl bg-canvas-sunken p-3.5 select-none shadow-xs border border-hairline transition-all duration-150',
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
					<span
						class={cn(
							'size-2.5 shrink-0 rounded-full shadow-xs',
							column.color && colorDots[column.color] ? colorDots[column.color] : laneDot[tone]
						)}
						aria-hidden="true"
					></span>
					<h3 class="text-sm font-bold text-ink truncate tracking-tight">{column.title}</h3>
				</div>
				<div class="flex items-center gap-1.5 shrink-0">
					<span class="text-xs font-semibold text-mute px-0.5">
						{column.count ?? column.items.length}{countLabel ? ` ${countLabel}` : ''}
					</span>
					{#if columnActions}
						{@render columnActions(column)}
					{:else if oneditcolumn || ondeletecolumn}
						<DropdownMenu
							items={[
								...(oneditcolumn
									? [
											{
												label: renameColumnLabel,
												icon: editIconSnippet,
												onselect: () => oneditcolumn(column)
											}
										]
									: []),
								...(ondeletecolumn
									? [
											{
												label: deleteColumnLabel,
												icon: deleteIconSnippet,
												destructive: true,
												separatorBefore: Boolean(oneditcolumn),
												onselect: () => ondeletecolumn(column)
											}
										]
									: [])
							]}
							align="end"
						>
							{#snippet trigger({ open, toggle })}
								<button
									type="button"
									class={cn(
										'flex size-6 items-center justify-center rounded-lg text-mute hover:bg-card hover:text-ink transition-colors cursor-pointer',
										open && 'bg-card text-ink shadow-xs'
									)}
									onclick={toggle}
									aria-label="Pilihan lajur"
								>
									<HugeiconsIcon icon={MoreHorizontalIcon} size={15} strokeWidth={1.8} />
								</button>
							{/snippet}
						</DropdownMenu>
					{/if}
				</div>
			</header>

			<!-- Top Add Customer Button (optional legacy position) -->
			{#if addButtonPosition === 'top' && (onadd || onaddcard)}
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
			{/if}
			<div
				class="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-3 kanban-scrollbar-hidden"
				onscroll={(event) => {
					const element = event.currentTarget as HTMLElement;
					if (
						column.hasMore &&
						!column.loadingMore &&
						element.scrollTop + element.clientHeight >= element.scrollHeight - 120
					) {
						onloadmore?.(column.id);
					}
				}}
			>
			{#if column.items.length === 0}
			<div class="flex min-h-[180px] flex-none flex-col items-center justify-center rounded-xl border border-dashed border-hairline p-6 text-center space-y-1.5">
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
					{@const attachmentCount = card.attachmentCount ?? 0}
					{@const commentCount = card.commentCount ?? 0}

					<div
						role="button"
						tabindex="0"
						draggable={dragEnabled && Boolean(oncardmove)}
						ondragstart={(event) => onDragStart(event, column.id, card.id)}
						ondragend={onDragEnd}
						onclick={() => handleCardClick(column.id, card.id)}
						onkeydown={(event) => {
							if (event.target !== event.currentTarget) return;
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								handleCardClick(column.id, card.id);
							}
						}}
						data-onboarding={i === 0 && ci === 0 ? 'kanban-card' : undefined}
						class={cn(
					'group relative flex flex-none flex-col gap-2.5 min-h-[88px] cursor-grab rounded-xl bg-card pl-4.5 p-3.5 text-left border border-hairline shadow-card hover:border-hairline-strong hover:shadow-card-hover transition-all duration-150 ease-out active:cursor-grabbing overflow-hidden',
							card.selected && 'ring-2 ring-primary border-transparent shadow-card-hover',
							draggingCardId === card.id && 'opacity-40 ring-2 ring-primary/40'
						)}
					>
						<!-- Left Accent Bar -->
						<div
							class="absolute top-3 bottom-3 left-0 w-1 rounded-full"
							style="background-color: {accentHex};"
						></div>
						<div class="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
							<button
								type="button"
								class="grid size-7 place-items-center rounded-full border border-hairline bg-card text-mute shadow-control hover:border-primary hover:text-primary"
								onclick={(event) => {
									event.stopPropagation();
									handleCardClick(column.id, card.id);
								}}
								onkeydown={(event) => event.stopPropagation()}
								aria-label={`Edit ${card.title}`}
							>
								<HugeiconsIcon icon={PencilEdit01Icon} size={14} strokeWidth={1.8} />
							</button>
						</div>

						<!-- Top Meta Row: Badges & Assignee Chip -->
						{#if card.waError || card.badge || card.dueBadge || card.recurrence || card.assignee}
							<div class="flex items-start justify-between gap-2 pt-0.5 min-h-[22px]">
								<div class="flex flex-col gap-1 items-start min-w-0">
									{#if card.waError}
										<Badge tone="urgent" variant="soft" class="text-[10px] font-semibold px-1.5 py-0.2">
											{waErrorLabel}
										</Badge>
									{/if}
									{#if card.dueBadge}
										<Badge tone={card.dueBadge.tone} variant="soft" class="text-[10px] font-semibold px-1.5 py-0.2 inline-flex items-center gap-1">
											<HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={2} />
											<span>{card.dueBadge.label}</span>
										</Badge>
									{/if}
									{#if card.recurrence}
										<Badge tone="info" variant="soft" class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold" title={`Recurring ${card.recurrence}`}>
											<HugeiconsIcon icon={RepeatIcon} size={11} strokeWidth={1.8} />
											<span>{card.recurrence === 'daily' ? 'Daily' : 'Weekly'}</span>
										</Badge>
									{/if}
									{#if card.badge}
										<Badge tone={badgeTone} variant="soft" class="text-[10px] font-semibold px-1.5 py-0.2">
											{card.badge}
										</Badge>
									{/if}
								</div>

								{#if card.assignee}
									<div class="flex min-w-0 items-center gap-1.5 rounded-full bg-canvas-sunken px-2 py-0.5 shrink-0 ml-auto">
										<Avatar name={card.assignee} src={card.assigneeAvatar} size={16} class="shrink-0" />
										<span class="truncate text-[11px] font-semibold text-ink-soft max-w-[90px]">
											{card.assignee}
										</span>
									</div>
								{/if}
							</div>
						{/if}

						<!-- Card Title (Customer Name) -->
						<div>
						<div class="flex items-start gap-2">
							{#if oncomplete && card.canComplete !== false}
							<button
								type="button"
								class={cn(
									'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors',
									card.completed
										? 'border-status-done bg-status-done text-on-primary'
										: 'border-mute text-transparent hover:border-primary hover:text-primary'
								)}
								onclick={(event) => {
									event.stopPropagation();
									void oncomplete?.(card.id, !card.completed);
								}}
								onkeydown={(event) => event.stopPropagation()}
								aria-label={card.completed ? `Buka kembali ${card.title}` : `Tandai selesai ${card.title}`}
								aria-pressed={card.completed}
							>
								{#if card.completed}<HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={2} />{/if}
							</button>
							{/if}
							<p class={cn('text-sm font-bold leading-snug break-words group-hover:underline transition-colors', card.completed ? 'text-mute line-through' : 'text-primary')}>
								{card.title}
							</p>
						</div>
							<!-- Subtitle (Product) -->
							{#if card.subtitle}
								<p class="text-xs text-mute mt-1 truncate">
									{card.subtitle}
								</p>
							{/if}
							<!-- WhatsApp number -->
							{#if card.whatsapp}
								<p class="text-xs text-mute mt-0.5 truncate">
									{card.whatsapp}
								</p>
							{/if}
							{#if card.dueDateText}
								<p class="text-[11px] text-mute mt-1 flex items-center gap-1 truncate">
									<HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={1.8} class="shrink-0 text-mute" />
									<span class="truncate">{card.dueDateText}</span>
								</p>
							{/if}
							{#if card.labels && card.labels.length > 0}
								<div class="flex flex-wrap items-center gap-1 mt-1.5">
									{#each card.labels as label (label)}
										<span class={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold border border-hairline/80', card.labelColors?.[label] ?? 'bg-canvas-sunken text-ink')}>
											{label}
										</span>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Footer Row: Progress and activity counts -->
						{#if card.progress || attachmentCount > 0 || commentCount > 0}
							<div class="mt-2.5 flex items-center justify-between gap-3 border-t border-hairline/70 pt-2 text-xs">
								{#if card.progress}
									<div class="flex min-w-0 items-center gap-1.5">
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
								{:else}
									<span aria-hidden="true"></span>
								{/if}
								<div class="ml-auto flex shrink-0 items-center gap-2.5 text-mute">
									{#if attachmentCount > 0}
										<span class="inline-flex items-center gap-1" aria-label={`${attachmentCount} attachment`}>
											<HugeiconsIcon icon={Attachment01Icon} size={14} strokeWidth={1.8} />
											<span class="text-[11px] font-semibold">{attachmentCount}</span>
										</span>
									{/if}
									{#if commentCount > 0}
										<span class="inline-flex items-center gap-1" aria-label={`${commentCount} comment`}>
											<HugeiconsIcon icon={BubbleChatIcon} size={14} strokeWidth={1.8} />
											<span class="text-[11px] font-semibold">{commentCount}</span>
										</span>
									{/if}
									{#if card.progressDone}
										<span class="inline-flex items-center gap-0.5 rounded-full border border-status-done/30 bg-status-done-soft px-1.5 py-0.2 text-[10px] font-semibold text-status-done-ink">
											✓ Selesai
										</span>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				{/each}
				{#if column.loadingMore}
					<div class="flex items-center justify-center py-2 text-xs text-faint" role="status">
						Memuat…
					</div>
				{/if}
			{/if}
		</div>
			<!-- Bottom Add Task Button -->
			{#if addButtonPosition === 'bottom' && (onadd || onaddcard)}
				<div class="mt-auto shrink-0 pt-2">
					<button
						type="button"
						data-onboarding={i === 0 ? 'kanban-add-card' : undefined}
						class="group flex w-full items-center justify-center gap-2 rounded-2xl border border-hairline bg-card px-3 py-3 text-sm font-semibold text-ink shadow-card transition-all hover:border-primary/30 hover:bg-primary-soft/20 hover:text-primary hover:shadow-card-hover active:scale-[0.99] cursor-pointer"
						onclick={() => {
							onadd?.(column.id);
							onaddcard?.(column.id);
						}}
					>
						<HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2.2} class="text-mute group-hover:text-primary transition-colors" />
						<span>{addLabel}</span>
					</button>
				</div>
			{/if}
		</section>
	{/each}
	<!-- Rightmost Ghost Lane: Add Column (Image #2) -->
	{#if onaddcolumn || showAddColumn}
		<div class="flex w-lane shrink-0 flex-col">
			<button
				type="button"
				onclick={onaddcolumn}
				class="flex w-full min-h-[170px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-hairline-strong hover:border-primary hover:bg-primary-soft/30 p-6 text-center transition-all cursor-pointer group select-none"
			>
				<div class="flex h-11 w-11 items-center justify-center rounded-full bg-lane group-hover:bg-primary-soft group-hover:text-primary transition-colors text-mute mb-2.5 shadow-xs">
					<HugeiconsIcon icon={Add01Icon} size={20} strokeWidth={2} />
				</div>
				<p class="text-[13px] font-bold text-ink group-hover:text-primary transition-colors">
					{addColumnLabel}
				</p>
				{#if addColumnDescription}
					<p class="text-[12px] text-mute mt-1 leading-relaxed max-w-[220px]">
						{addColumnDescription}
					</p>
				{/if}
			</button>
		</div>
	{/if}
</div>
