<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowDown01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Select as SelectPrimitive } from 'bits-ui';
	import Portal from '$lib/components/atoms/Portal.svelte';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { panelClass, panelItemClass, type Option } from './shared.js';

	type Props = WithElementRef<Omit<HTMLAttributes<HTMLDivElement>, 'onchange'>> & {
		options: Option[];
		value?: string;
		placeholder?: string;
		id?: string;
		disabled?: boolean;
		invalid?: boolean;
		size?: 'sm' | 'md';
		/** Matches the quiet in-card period picker or a rounded toolbar filter. */
		variant?: 'input' | 'button' | 'filter';
		onchange?: (value: string) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		options,
		value = $bindable(''),
		placeholder = 'Pilih…',
		id,
		disabled = false,
		invalid = false,
		size = 'md',
		variant = 'input',
		onchange,
		class: className,
		'aria-describedby': ariaDescribedby,
		'aria-errormessage': ariaErrormessage,
		...rest
	}: Props = $props();

	let open = $state(false);
	const selected = $derived(options.find((o) => o.value === value));
	const bitsItems = $derived(options.map((o) => ({ value: o.value, label: o.label, disabled: o.disabled })));
</script>

<div
	bind:this={ref}
	class={cn('relative', variant === 'input' && 'w-full', className)}
	{...rest}
>
	<SelectPrimitive.Root
		type="single"
		bind:value
		bind:open
		items={bitsItems}
		{disabled}
		allowDeselect={false}
		onValueChange={(next) => onchange?.(next)}
	>
		<SelectPrimitive.Trigger
			{id}
			aria-describedby={ariaDescribedby}
			aria-errormessage={ariaErrormessage}
			aria-invalid={invalid || undefined}
			class={cn(
				'flex w-full items-center justify-between gap-2 transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed',
				variant === 'input'
					? cn(
							'ds-body rounded-md border bg-card text-left text-ink disabled:bg-lane disabled:text-mute',
							size === 'sm' ? 'px-2.5 py-1.5 text-meta' : 'px-3 py-2.5',
							invalid
								? 'border-status-urgent'
								: 'border-hairline hover:border-primary-border focus-visible:border-primary'
						)
					: variant === 'filter'
						? 'text-sm h-10 rounded-md border border-hairline bg-card px-4 text-left text-ink hover:border-primary-border focus-visible:border-primary disabled:bg-lane disabled:text-mute'
						: cn(
								'ds-button-text w-auto rounded-md border border-hairline bg-card text-ink hover:border-primary-border hover:bg-lane disabled:bg-lane disabled:text-mute',
								size === 'sm' ? 'h-8 px-3' : 'h-10 px-4'
							)
			)}
		>
			{#snippet children()}
				<span class={cn('truncate', !selected && 'text-faint')}>
					{selected?.label ?? placeholder}
				</span>
				<HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={1.8}
					class={cn(
						'size-4 shrink-0 text-mute transition-transform duration-150',
						open && 'rotate-180'
					)}
				/>
			{/snippet}
		</SelectPrimitive.Trigger>

		<Portal>
			<SelectPrimitive.Content
				sideOffset={6}
				class={cn(panelClass, 'z-[400] max-h-64 w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)] overflow-y-auto')}
			>
				<SelectPrimitive.Viewport>
					{#each options as option (option.value)}
						<SelectPrimitive.Item
							value={option.value}
							label={option.label}
							disabled={option.disabled}
							class={cn(
								panelItemClass,
								'justify-between data-[highlighted]:bg-primary-soft',
								option.value === value && 'font-medium'
							)}
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
						</SelectPrimitive.Item>
					{:else}
						<p class="ds-body px-2.5 py-3 text-center text-faint">Tidak ada pilihan</p>
					{/each}
				</SelectPrimitive.Viewport>
			</SelectPrimitive.Content>
		</Portal>
	</SelectPrimitive.Root>
</div>
