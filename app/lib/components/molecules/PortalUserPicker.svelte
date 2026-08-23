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
	import XIcon from '@lucide/svelte/icons/x';
	import UserIcon from '@lucide/svelte/icons/user';
	import SearchIcon from '@lucide/svelte/icons/search';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';

	export type PortalUser = {
		id: string;
		name: string;
		plan: string | null;
		email: string | null;
		created_at: string;
	};

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: string;
		onchange?: (value: string) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		value = $bindable(''),
		onchange,
		class: className,
		...rest
	}: Props = $props();

	let triggerEl = $state<HTMLDivElement | null>(null);
	let open = $state(false);
	let users = $state<PortalUser[]>([]);
	let loading = $state(false);
	let error = $state('');
	let search = $state('');
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let selected = $state<PortalUser | null>(null);
	let panelRect = $state<FloatingRect | null>(null);
	let loadedOnce = $state(false);

	const panelStyle = $derived(
		panelRect
			? `top:${panelRect.top}px;left:${panelRect.left}px;width:${panelRect.width}px;max-height:${panelRect.maxHeight}px;`
			: ''
	);

	async function loadUsers(q: string) {
		loading = true;
		error = '';
		try {
			const params = new URLSearchParams({ limit: '50' });
			if (q.trim()) params.set('search', q.trim());
			const res = await fetch(`/api/dripsender/users?${params.toString()}`);
			const body = (await res.json()) as {
				success: boolean;
				data?: PortalUser[];
				error?: string;
			};
			if (!res.ok || !body.success) {
				error = body.error || `Gagal memuat user (${res.status})`;
				users = [];
			} else {
				users = body.data ?? [];
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Gagal memuat user';
			users = [];
		} finally {
			loading = false;
			loadedOnce = true;
		}
	}

	async function resolveSelected(id: string) {
		if (!id) {
			selected = null;
			return;
		}
		if (selected?.id === id) return;
		const match = users.find((u) => u.id === id);
		if (match) {
			selected = match;
			return;
		}
		try {
			const params = new URLSearchParams({ search: id, limit: '5' });
			const res = await fetch(`/api/dripsender/users?${params.toString()}`);
			const body = (await res.json()) as { success: boolean; data?: PortalUser[] };
			const found = body.data?.find((u) => u.id === id);
			if (found) selected = found;
		} catch {
			/* keep empty selection */
		}
	}

	function updatePanelPosition() {
		if (!triggerEl || !open) return;
		panelRect = computeFloatingRect(triggerEl, 280);
	}

	function toggleOpen() {
		open = !open;
		if (open) {
			if (!loadedOnce) void loadUsers('');
			requestAnimationFrame(updatePanelPosition);
		}
	}

	function close() {
		open = false;
	}

	function pick(user: PortalUser) {
		selected = user;
		value = user.id;
		onchange?.(user.id);
		close();
	}

	function clear() {
		selected = null;
		value = '';
		search = '';
		onchange?.('');
	}

	function onSearchInput(v: string) {
		search = v;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => loadUsers(v), 300);
	}

	$effect(() => {
		if (value) {
			void resolveSelected(value);
		} else {
			selected = null;
		}
	});

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

<div bind:this={ref} class={cn('relative', className)} data-testid="client-form-external-id" {...rest}>
	<div
		bind:this={triggerEl}
		class={fieldTriggerClass}
		onclick={toggleOpen}
		role="combobox"
		aria-expanded={open}
		aria-controls="portal-user-list"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && toggleOpen()}
	>
		{#if selected}
			<div class="flex min-w-0 flex-1 items-center gap-2">
				<UserIcon class="size-4 shrink-0 text-primary" />
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-semibold text-ink">{selected.name}</p>
					<p class="truncate text-[11px] text-mute">{selected.email ?? '—'}</p>
					<p class="truncate text-[10px] text-faint">
						{selected.plan ? `Plan ${selected.plan}` : 'Tanpa plan'} · ID {selected.id.slice(0, 8)}…
					</p>
				</div>
			</div>
			<button
				type="button"
				class="grid size-6 place-items-center rounded-md text-mute transition-colors hover:bg-lane hover:text-ink"
				title="Hapus pilihan"
				onclick={(e) => {
					e.stopPropagation();
					clear();
				}}
			>
				<XIcon class="size-3.5" />
			</button>
		{:else if value}
			<div class="flex min-w-0 flex-1 items-center gap-2">
				<AlertCircleIcon class="size-4 shrink-0 text-status-progress-ink" />
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-semibold text-ink">User tidak ditemukan di portal</p>
					<p class="truncate font-mono text-[11px] text-mute">{value}</p>
				</div>
			</div>
			<button
				type="button"
				class="grid size-6 place-items-center rounded-md text-mute transition-colors hover:bg-lane hover:text-ink"
				title="Hapus pilihan"
				onclick={(e) => {
					e.stopPropagation();
					clear();
				}}
			>
				<XIcon class="size-3.5" />
			</button>
		{:else}
			<span class="flex-1 text-sm text-faint">Cari & pilih user DripSender…</span>
		{/if}
		<ChevronDownIcon class="size-4 shrink-0 text-mute" />
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
				id="portal-user-list"
				class={cn(panelClass, 'fixed z-[110] overflow-y-auto p-2 space-y-1')}
				style={panelStyle}
			>
				<div class="relative px-1 pb-1">
					<SearchIcon class="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-mute" />
					<input
						type="text"
						placeholder="Cari nama atau email user…"
						class="ds-body h-8 w-full rounded-sm border border-hairline bg-card pl-8 pr-3 text-[13px] text-ink placeholder:text-faint focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
						value={search}
						oninput={(e) => onSearchInput(e.currentTarget.value)}
						onclick={(e) => e.stopPropagation()}
					/>
				</div>
				<div class="max-h-56 space-y-0.5 overflow-y-auto pr-0.5">
					{#if loading}
						<div class="flex items-center justify-center gap-2 py-4 text-xs text-mute">
							<Loader2Icon class="size-3.5 animate-spin" />
							Memuat user…
						</div>
					{:else if error}
						<p class="px-2 py-3 text-center text-xs font-medium text-status-urgent" role="alert">{error}</p>
					{:else if users.length === 0}
						<p class="py-3 text-center text-xs text-mute">
							{search ? 'User tidak ditemukan.' : 'Belum ada user di portal.'}
						</p>
					{:else}
						{#each users as u (u.id)}
							{@const isSelected = value === u.id}
							<div
								class={cn(
									panelItemClass,
									'justify-between text-xs font-medium',
									isSelected && 'bg-primary-soft text-primary'
								)}
								onclick={(e) => {
									e.stopPropagation();
									pick(u);
								}}
								role="option"
								aria-selected={isSelected}
								tabindex="0"
								onkeydown={(e) => e.key === 'Enter' && pick(u)}
							>
								<div class="min-w-0 flex-1">
									<p class="truncate font-semibold">{u.name}</p>
									<p class="truncate text-[11px] text-mute">{u.email ?? '—'}</p>
									<p class="truncate text-[10px] text-faint">
										{u.plan ?? 'Tanpa plan'} · {u.id.slice(0, 8)}…
									</p>
								</div>
								{#if isSelected}
									<CheckIcon class="size-3.5 shrink-0 stroke-[3]" />
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</Portal>
	{/if}

	<input type="hidden" name="externalId" value={value} />
</div>
