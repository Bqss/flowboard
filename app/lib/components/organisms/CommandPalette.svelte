<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { dismissable } from '$lib/components/molecules/shared.js';
	import { SearchInput } from '$lib/components/molecules/index.js';
	import type { CommandItem } from './shared.js';
	import { modalBackdrop, modalPanel } from './modal-transitions.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		open?: boolean;
		items: CommandItem[];
		placeholder?: string;
		emptyText?: string;
		onselect?: (item: CommandItem) => void;
		onclose?: () => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		open = $bindable(false),
		items,
		placeholder = 'Ketik perintah atau cari…',
		emptyText = 'Tidak ada hasil.',
		onselect,
		onclose,
		class: className,
		...rest
	}: Props = $props();

	let query = $state('');
	let active = $state(0);

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return items;
		return items.filter(
			(i) =>
				i.label.toLowerCase().includes(q) ||
				i.group?.toLowerCase().includes(q) ||
				i.keywords?.toLowerCase().includes(q)
		);
	});

	function close() {
		open = false;
		query = '';
		active = 0;
		onclose?.();
	}

	function choose(item: CommandItem) {
		item.onselect?.();
		onselect?.(item);
		close();
	}

	function onkeydown(event: KeyboardEvent) {
		if (!open) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			active = Math.min(active + 1, filtered.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			active = Math.max(active - 1, 0);
		} else if (event.key === 'Enter' && filtered[active]) {
			event.preventDefault();
			choose(filtered[active]);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			close();
		}
	}

	$effect(() => {
		if (!open) return;

		const scrollY = window.scrollY;
		const { style } = document.body;
		const prevOverflow = style.overflow;

		style.overflow = 'hidden';

		return () => {
			style.overflow = prevOverflow;
			window.scrollTo(0, scrollY);
		};
	});

	$effect(() => {
		if (!open) return;
		const onGlobal = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				close();
			}
		};
		window.addEventListener('keydown', onGlobal);
		return () => window.removeEventListener('keydown', onGlobal);
	});
</script>

<svelte:window onkeydown={onkeydown} />

{#if open}
	<div bind:this={ref} class={cn('fixed inset-0 z-[100]', className)} use:dismissable={close} {...rest}>
		<button
			type="button"
			class="absolute inset-0 bg-[var(--overlay-scrim)] backdrop-blur-[2px]"
			aria-label="Tutup command palette"
			transition:modalBackdrop={{ duration: 220 }}
			onclick={close}
		></button>

		<div
			class="pointer-events-none fixed inset-0 flex items-start justify-center p-4 pt-[12vh]"
			role="dialog"
			aria-modal="true"
			aria-label="Command palette"
		>
			<div
				class="pointer-events-auto w-full max-w-xl overflow-hidden rounded-xl border border-hairline bg-card shadow-[var(--shadow-modal)] origin-center will-change-[transform,opacity]"
				transition:modalPanel={{ duration: 300, y: 12, startScale: 0.98 }}
			>
			<div class="border-b border-hairline p-2">
				<SearchInput bind:value={query} {placeholder} submit={false} clearable class="!shadow-none" />
			</div>

			<div class="max-h-80 overflow-y-auto p-1.5" role="listbox">
				{#each filtered as item, i (item.id)}
					<button
						type="button"
						role="option"
						aria-selected={i === active}
						onmouseenter={() => (active = i)}
						onclick={() => choose(item)}
						class={cn(
							'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
							i === active ? 'bg-primary-soft' : 'hover:bg-primary-soft/60'
						)}
					>
						<span class="inline-flex min-w-0 items-center gap-2.5">
							{#if item.icon}
								<span class="grid size-4 shrink-0 place-items-center text-mute [&_svg]:size-4">
									{@render item.icon()}
								</span>
							{/if}
							<span>
								<span class="ds-body block text-ink">{item.label}</span>
								{#if item.group}
									<span class="ds-caption text-mute">{item.group}</span>
								{/if}
							</span>
						</span>
						{#if item.shortcut}
							<span class="ds-caption ds-mono shrink-0 text-faint">{item.shortcut}</span>
						{/if}
					</button>
				{:else}
					<p class="ds-body px-3 py-6 text-center text-mute">{emptyText}</p>
				{/each}
			</div>
			</div>
		</div>
	</div>
{/if}
