<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	type Props = WithElementRef<Omit<HTMLAttributes<HTMLElement>, 'onchange'>> & {
		page?: number;
		total: number;
		perPage?: number;
		/** Page buttons rendered around the current page before ellipsing. */
		siblings?: number;
		showSummary?: boolean;
		onchange?: (page: number) => void;
		prevTestId?: string;
		nextTestId?: string;
		class?: string;
	};

	let {
		ref = $bindable(null),
		page = $bindable(1),
		total,
		perPage = 10,
		siblings = 1,
		showSummary = true,
		onchange,
		prevTestId,
		nextTestId,
		class: className,
		...rest
	}: Props = $props();

	const pageCount = $derived(Math.max(1, Math.ceil(total / perPage)));
	const from = $derived(total === 0 ? 0 : (page - 1) * perPage + 1);
	const to = $derived(Math.min(page * perPage, total));

	const pages = $derived.by(() => {
		const out: Array<number | 'gap'> = [];
		const first = 1;
		const last = pageCount;
		const start = Math.max(first + 1, page - siblings);
		const end = Math.min(last - 1, page + siblings);

		out.push(first);
		if (start > first + 1) out.push('gap');
		for (let p = start; p <= end; p++) out.push(p);
		if (end < last - 1) out.push('gap');
		if (last > first) out.push(last);
		return out;
	});

	function go(next: number) {
		const clamped = Math.min(pageCount, Math.max(1, next));
		if (clamped === page) return;
		page = clamped;
		onchange?.(clamped);
	}

	const arrow =
		'grid size-9 place-items-center rounded-md border border-hairline bg-card text-mute transition-colors duration-150 ease-out hover:border-primary-border hover:bg-lane hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:pointer-events-none disabled:opacity-40';
</script>

<nav
	bind:this={ref}
	aria-label="Pagination"
	class={cn('flex flex-wrap items-center justify-between gap-3', className)}
	{...rest}
>
	{#if showSummary}
		<p class="ds-label text-mute">
			Menampilkan <span class="ds-mono text-ink">{from}–{to}</span> dari
			<span class="ds-mono text-ink">{total}</span>
		</p>
	{/if}

	<div class="flex items-center gap-1">
		<button
			type="button"
			class={arrow}
			onclick={() => go(page - 1)}
			disabled={page <= 1}
			aria-label="Halaman sebelumnya"
			data-testid={prevTestId}
		>
			<ChevronLeftIcon class="size-4" />
		</button>

		{#each pages as item, i (typeof item === 'number' ? item : `gap-${i}`)}
			{#if item === 'gap'}
				<span class="ds-label grid size-9 place-items-center text-faint" aria-hidden="true">
					…
				</span>
			{:else}
				<button
					type="button"
					onclick={() => go(item)}
					aria-current={item === page ? 'page' : undefined}
					class={cn(
						'ds-button-text grid size-9 place-items-center rounded-md transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
						item === page
							? 'bg-primary text-on-primary'
							: 'text-mute hover:bg-primary-soft hover:text-ink'
					)}
				>
					{item}
				</button>
			{/if}
		{/each}

		<button
			type="button"
			class={arrow}
			onclick={() => go(page + 1)}
			disabled={page >= pageCount}
			aria-label="Halaman berikutnya"
			data-testid={nextTestId}
		>
			<ChevronRightIcon class="size-4" />
		</button>
	</div>
</nav>
