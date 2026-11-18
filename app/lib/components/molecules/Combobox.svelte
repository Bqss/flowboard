<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Tick02Icon, Search01Icon } from '@hugeicons/core-free-icons';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Combobox as ComboboxPrimitive } from 'bits-ui';
	import Portal from '$lib/components/atoms/Portal.svelte';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { panelClass, panelItemClass, type Option } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		options: Option[];
		value?: string;
		placeholder?: string;
		emptyText?: string;
		id?: string;
		disabled?: boolean;
		invalid?: boolean;
		/** Skip local filtering when the caller queries a server. */
		manualFilter?: boolean;
		onsearch?: (query: string) => void;
		onchange?: (value: string) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		options,
		value = $bindable(''),
		placeholder = 'Cari atau pilih…',
		emptyText = 'Tidak ditemukan',
		id,
		disabled = false,
		invalid = false,
		manualFilter = false,
		onsearch,
		onchange,
		class: className,
		...rest
	}: Props = $props();

	let open = $state(false);
	let query = $state('');

	const bitsItems = $derived(options.map((o) => ({ value: o.value, label: o.label, disabled: o.disabled })));

	const filtered = $derived.by(() => {
		if (manualFilter || !query.trim()) return options;
		const q = query.trim().toLowerCase();
		return options.filter(
			(o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q)
		);
	});

	function handleInput(event: Event) {
		query = (event.currentTarget as HTMLInputElement).value;
		onsearch?.(query);
	}
</script>

<div bind:this={ref} class={cn('relative w-full', className)} {...rest}>
	<ComboboxPrimitive.Root
		type="single"
		bind:value
		bind:open
		items={bitsItems}
		{disabled}
		allowDeselect={false}
		onValueChange={(next) => {
			query = '';
			onchange?.(next);
		}}
	>
		<div class="relative flex items-center">
			<HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={1.8} class="pointer-events-none absolute left-3 text-mute" />
			<ComboboxPrimitive.Input
				{id}
				{placeholder}
				oninput={handleInput}
				aria-invalid={invalid || undefined}
				class={cn(
					'text-sm h-10 w-full rounded-md border bg-card py-0 pr-3 pl-9 text-ink transition-colors duration-150 placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:bg-lane',
					invalid
						? 'border-status-urgent'
						: 'border-hairline hover:border-primary-border focus-visible:border-primary'
				)}
			/>
		</div>

		<Portal>
			<ComboboxPrimitive.Content
				sideOffset={6}
				class={cn(panelClass, 'z-[400] max-h-64 w-[var(--bits-combobox-anchor-width)] min-w-[var(--bits-combobox-anchor-width)] overflow-y-auto')}
			>
				<ComboboxPrimitive.Viewport>
					{#each filtered as option (option.value)}
						<ComboboxPrimitive.Item
							value={option.value}
							label={option.label}
							disabled={option.disabled}
							class={cn(panelItemClass, 'justify-between data-[highlighted]:bg-primary-soft')}
						>
							{#snippet children({ selected: isSelected })}
								<span class="min-w-0">
									<span class="block truncate">{option.label}</span>
									{#if option.description}
										<span class="ds-caption block text-mute">{option.description}</span>
									{/if}
								</span>
								{#if isSelected}
									<HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} class="size-4 shrink-0 text-primary" />
								{/if}
							{/snippet}
						</ComboboxPrimitive.Item>
					{:else}
						<p class="ds-body px-2.5 py-3 text-center text-faint">{emptyText}</p>
					{/each}
				</ComboboxPrimitive.Viewport>
			</ComboboxPrimitive.Content>
		</Portal>
	</ComboboxPrimitive.Root>
</div>
