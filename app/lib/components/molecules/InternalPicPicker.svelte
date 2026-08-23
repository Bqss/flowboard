<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import Portal from '$lib/components/atoms/Portal.svelte';
	import {
		computeFloatingRect,
		fieldTriggerClass,
		panelClass,
		panelItemClass,
		type FloatingRect
	} from './shared.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';

	type Staff = { id: string; full_name: string };

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		staff: Staff[];
		assigned?: string[];
		primary?: string;
		class?: string;
	};

	let {
		ref = $bindable(null),
		staff,
		assigned = $bindable([]),
		primary = $bindable(''),
		class: className,
		...rest
	}: Props = $props();

	let triggerEl = $state<HTMLDivElement | null>(null);
	let open = $state(false);
	let search = $state('');
	let panelRect = $state<FloatingRect | null>(null);

	const filteredStaff = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return staff;
		return staff.filter((s) => s.full_name.toLowerCase().includes(q));
	});

	const panelStyle = $derived(
		panelRect
			? `top:${panelRect.top}px;left:${panelRect.left}px;width:${panelRect.width}px;max-height:${panelRect.maxHeight}px;`
			: ''
	);

	function updatePanelPosition() {
		if (!triggerEl || !open) return;
		panelRect = computeFloatingRect(triggerEl, 220);
	}

	function toggleOpen() {
		open = !open;
		if (open) requestAnimationFrame(updatePanelPosition);
	}

	function close() {
		open = false;
	}

	function togglePic(id: string) {
		if (assigned.includes(id)) {
			assigned = assigned.filter((x) => x !== id);
			if (primary === id) primary = assigned[0] ?? '';
		} else {
			assigned = [...assigned, id];
			if (!primary) primary = id;
		}
	}

	function setPrimary(id: string) {
		if (!assigned.includes(id)) assigned = [...assigned, id];
		primary = id;
	}

	$effect(() => {
		if (!open) return;
		updatePanelPosition();
		const onReflow = () => updatePanelPosition();
		window.addEventListener('scroll', onReflow, true);
		window.addEventListener('resize', onReflow);
		return () => {
			window.removeEventListener('scroll', onReflow, true);
			window.removeEventListener('resize', onReflow);
		};
	});
</script>

<div
	bind:this={ref}
	class={cn('relative', className)}
	data-testid="client-form-assigned-pics"
	{...rest}
>
	<div
		bind:this={triggerEl}
		class={cn(fieldTriggerClass, 'min-h-10 flex-wrap py-1.5')}
		onclick={toggleOpen}
		role="combobox"
		aria-expanded={open}
		aria-controls="pic-combobox-list"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && toggleOpen()}
	>
		{#each assigned as picId}
			{@const staffMember = staff.find((s) => s.id === picId)}
			{#if staffMember}
				<span
					class="inline-flex items-center gap-1 rounded-md border py-1 pl-2 pr-1 text-xs font-semibold transition-all {primary === picId
						? 'border-primary/30 bg-primary-soft text-primary'
						: 'border-hairline bg-lane text-ink'}"
				>
					<span>{staffMember.full_name}</span>
					{#if primary === picId}
						<span class="rounded bg-primary px-1 py-0.5 text-[10px] font-bold text-on-primary">Utama</span>
					{:else}
						<button
							type="button"
							class="px-1 text-[10px] text-mute underline hover:text-primary"
							title="Jadikan PIC utama"
							onclick={(e) => {
								e.stopPropagation();
								primary = picId;
							}}
						>
							Set utama
						</button>
					{/if}
					<button
						type="button"
						class="ml-0.5 grid size-4 place-items-center rounded-full text-mute hover:bg-lane hover:text-ink"
						onclick={(e) => {
							e.stopPropagation();
							togglePic(picId);
						}}
						title="Hapus PIC"
					>
						<XIcon class="size-3" />
					</button>
				</span>
			{/if}
		{:else}
			<span class="px-2 py-1 text-xs text-faint">Pilih satu atau beberapa PIC internal…</span>
		{/each}
		<div class="ml-auto flex items-center gap-1 pr-1">
			<ChevronDownIcon class="size-4 text-mute" />
		</div>
	</div>

	{#if open}
		<Portal>
			<div
				class="fixed inset-0 z-[105]"
				onclick={close}
				role="button"
				tabindex="-1"
				onkeydown={() => close()}
			></div>
			<div
				id="pic-combobox-list"
				class={cn(panelClass, 'fixed z-[110] overflow-y-auto p-2 space-y-1')}
				style={panelStyle}
			>
				<div class="relative px-1 pb-1">
					<SearchIcon class="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-mute" />
					<input
						type="text"
						placeholder="Cari nama staff…"
						class="ds-body h-8 w-full rounded-sm border border-hairline bg-card pl-8 pr-3 text-[13px] text-ink placeholder:text-faint focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
						bind:value={search}
						onclick={(e) => e.stopPropagation()}
					/>
				</div>
				<div class="max-h-48 space-y-0.5 overflow-y-auto pr-0.5">
					{#each filteredStaff as s}
						{@const isSelected = assigned.includes(s.id)}
						{@const isPrimary = primary === s.id}
						<div
							class={cn(
								panelItemClass,
								'justify-between text-xs font-medium',
								isSelected && 'bg-primary-soft/60 text-primary'
							)}
							onclick={(e) => {
								e.stopPropagation();
								togglePic(s.id);
							}}
							role="option"
							aria-selected={isSelected}
							tabindex="0"
							onkeydown={(e) => e.key === 'Enter' && togglePic(s.id)}
						>
							<div class="flex items-center gap-2">
								<div
									class="flex size-4 items-center justify-center rounded border border-hairline {isSelected
										? 'border-primary bg-primary text-on-primary'
										: 'bg-card'}"
								>
									{#if isSelected}
										<CheckIcon class="size-3 stroke-[3]" />
									{/if}
								</div>
								<span>{s.full_name}</span>
							</div>
							{#if isSelected}
								<button
									type="button"
									class="rounded border px-2 py-0.5 text-[10px] font-bold transition-colors {isPrimary
										? 'border-primary bg-primary text-on-primary'
										: 'border-hairline bg-lane text-mute hover:border-primary/30 hover:bg-primary-soft hover:text-primary'}"
									onclick={(e) => {
										e.stopPropagation();
										setPrimary(s.id);
									}}
								>
									{isPrimary ? 'PIC utama' : 'Jadikan utama'}
								</button>
							{/if}
						</div>
					{:else}
						<p class="py-3 text-center text-xs text-mute">Tidak ada staff ditemukan.</p>
					{/each}
				</div>
			</div>
		</Portal>
	{/if}

	{#each assigned as id}
		<input type="hidden" name="assignedPicIds" value={id} />
	{/each}
	{#if primary}
		<input type="hidden" name="primaryPicId" value={primary} />
	{/if}
</div>
