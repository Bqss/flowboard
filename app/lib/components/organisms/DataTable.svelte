<script lang="ts" generics="T extends Record<string, unknown>">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Checkbox, Spinner } from '$lib/components/atoms/index.js';
	import { EmptyStateBlock, Pagination } from '$lib/components/molecules/index.js';
	import type { TableColumn } from './shared.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<
		Omit<HTMLAttributes<HTMLElement>, 'onselect' | 'onsort' | 'onpagechange' | 'onrowclick'>
	> & {
		title?: string;
		columns: TableColumn<T>[];
		rows: T[];
		loading?: boolean;
		selectable?: boolean;
		selected?: string[];
		rowKey?: keyof T & string;
		page?: number;
		total?: number;
		perPage?: number;
		sortKey?: string;
		sortDir?: 'asc' | 'desc';
		emptyTitle?: string;
		emptyDescription?: string;
		onselect?: (ids: string[]) => void;
		onsort?: (key: string, dir: 'asc' | 'desc') => void;
		onpagechange?: (page: number) => void;
		onrowclick?: (row: T) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		title,
		columns,
		rows,
		loading = false,
		selectable = false,
		selected = $bindable([]),
		rowKey = 'id' as keyof T & string,
		page = $bindable(1),
		total,
		perPage = 10,
		sortKey,
		sortDir = 'asc',
		emptyTitle = 'Belum ada data',
		emptyDescription = 'Data akan muncul setelah ada entri.',
		onselect,
		onsort,
		onpagechange,
		onrowclick,
		class: className,
		...rest
	}: Props = $props();

	const allIds = $derived(rows.map((r) => String(r[rowKey])));
	const allSelected = $derived(allIds.length > 0 && allIds.every((id) => selected.includes(id)));

	function toggleAll() {
		selected = allSelected ? [] : [...allIds];
		onselect?.(selected);
	}

	function toggleRow(id: string) {
		selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
		onselect?.(selected);
	}

	function sort(key: string) {
		const nextDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
		onsort?.(key, nextDir);
	}

	function cell(row: T, col: TableColumn<T>) {
		if (col.render) return col.render(row);
		return String(row[col.key as keyof T] ?? '—');
	}
</script>

<article bind:this={ref} class={cn(cardShellClass, 'overflow-hidden', className)} {...rest}>
	{#if title}
		<div class="border-b border-hairline px-6 py-4">
			<h3 class="ds-section-title text-ink">{title}</h3>
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center gap-3 px-6 py-16">
			<Spinner size={24} />
			<span class="ds-body text-mute">Memuat data…</span>
		</div>
	{:else if rows.length === 0}
		<EmptyStateBlock title={emptyTitle} description={emptyDescription} class="!shadow-none" />
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full min-w-[640px] border-collapse">
				<thead>
					<tr class="border-b border-hairline">
						{#if selectable}
							<th class="w-10 px-4 py-3">
								<Checkbox checked={allSelected} indeterminate={selected.length > 0 && !allSelected} onchange={toggleAll} />
							</th>
						{/if}
						{#each columns as col (col.key)}
							<th class={cn('px-4 py-3 text-left', col.align === 'right' && 'text-right', col.align === 'center' && 'text-center')}>
								{#if col.sortable}
									<button
										type="button"
										onclick={() => sort(col.key)}
										class="ds-caption inline-flex items-center gap-1 text-mute hover:text-ink"
									>
										{col.label}
										{#if sortKey === col.key}
											<span aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>
										{/if}
									</button>
								{:else}
									<span class="ds-caption text-mute">{col.label}</span>
								{/if}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each rows as row (String(row[rowKey]))}
						{@const id = String(row[rowKey])}
						<tr
							class="border-b border-hairline transition-colors hover:bg-primary-soft/30"
							onclick={() => onrowclick?.(row)}
						>
							{#if selectable}
								<td class="px-4 py-3" onclick={(e) => e.stopPropagation()}>
									<Checkbox checked={selected.includes(id)} onchange={() => toggleRow(id)} />
								</td>
							{/if}
							{#each columns as col (col.key)}
								<td
									class={cn(
										'px-4 py-3 text-ink',
										col.mono && 'ds-mono text-[13px]',
										col.align === 'right' && 'text-right',
										col.align === 'center' && 'text-center'
									)}
								>
									{cell(row, col)}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if total !== undefined && total > perPage}
		<div class="border-t border-hairline px-6 py-4">
			<Pagination bind:page {total} {perPage} onchange={onpagechange} />
		</div>
	{/if}
</article>
