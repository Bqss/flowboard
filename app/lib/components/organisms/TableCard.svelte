<script lang="ts" generics="T extends Record<string, unknown>">
	import DataTable from './DataTable.svelte';
	import type { TableColumn } from './shared.js';

	type Props = {
		title: string;
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
		class?: string;
		onselect?: (ids: string[]) => void;
		onsort?: (key: string, dir: 'asc' | 'desc') => void;
		onpagechange?: (page: number) => void;
		onrowclick?: (row: T) => void;
	};

	let {
		title,
		columns,
		rows,
		loading,
		selectable,
		selected = $bindable([]),
		rowKey,
		page = $bindable(1),
		total,
		perPage,
		sortKey,
		sortDir,
		class: className,
		onselect,
		onsort,
		onpagechange,
		onrowclick
	}: Props = $props();
</script>

<DataTable
	{title}
	{columns}
	{rows}
	{loading}
	{selectable}
	bind:selected
	{rowKey}
	bind:page
	{total}
	{perPage}
	{sortKey}
	{sortDir}
	class={className}
	{onselect}
	{onsort}
	{onpagechange}
	{onrowclick}
/>
