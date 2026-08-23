<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { dismissable, panelClass, panelItemClass, type Option } from './shared.js';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CheckIcon from '@lucide/svelte/icons/check';

	type Props = WithElementRef<Omit<HTMLAttributes<HTMLDivElement>, 'onchange'>> & {
		options: Option[];
		value?: string;
		placeholder?: string;
		id?: string;
		disabled?: boolean;
		invalid?: boolean;
		size?: 'sm' | 'md';
		/** Matches the quiet in-card period picker ("Monthly ▾"). */
		variant?: 'input' | 'button';
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
	let activeIndex = $state(-1);
	let listEl = $state<HTMLElement | null>(null);

	const selected = $derived(options.find((o) => o.value === value));

	function choose(option: Option) {
		if (option.disabled) return;
		value = option.value;
		onchange?.(option.value);
		open = false;
	}

	function toggle() {
		if (disabled) return;
		open = !open;
		if (open) activeIndex = options.findIndex((o) => o.value === value);
	}

	function move(delta: number) {
		if (!options.length) return;
		let next = activeIndex;
		for (let i = 0; i < options.length; i++) {
			next = (next + delta + options.length) % options.length;
			if (!options[next].disabled) break;
		}
		activeIndex = next;
		listEl?.querySelectorAll('[role="option"]')[next]?.scrollIntoView({ block: 'nearest' });
	}

	function onkeydown(event: KeyboardEvent) {
		if (disabled) return;
		if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			toggle();
			return;
		}
		if (!open) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			move(1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			move(-1);
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (activeIndex >= 0) choose(options[activeIndex]);
		} else if (event.key === 'Tab') {
			open = false;
		}
	}
</script>

<div
	bind:this={ref}
	class={cn('relative', variant === 'input' && 'w-full', className)}
	use:dismissable={() => (open = false)}
	{...rest}
>
	<button
		{id}
		type="button"
		{disabled}
		{onkeydown}
		aria-describedby={ariaDescribedby}
		onclick={toggle}
		aria-haspopup="listbox"
		aria-expanded={open}
		class={cn(
			'flex w-full items-center justify-between gap-2 transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:bg-lane disabled:text-mute',
			variant === 'input'
				? cn(
						'ds-body rounded-sm border bg-card text-left text-ink',
						size === 'sm' ? 'px-2.5 py-1.5 text-[13px]' : 'px-3 py-2.5',
						invalid
							? 'border-status-urgent'
							: 'border-hairline hover:border-primary-border focus-visible:border-primary'
					)
				: cn(
						'ds-button-text w-auto rounded-md border border-hairline bg-card text-ink hover:border-primary-border hover:bg-lane',
						size === 'sm' ? 'h-8 px-3' : 'h-10 px-4'
					)
		)}
	>
		<span class={cn('truncate', !selected && 'text-faint')}>
			{selected?.label ?? placeholder}
		</span>
		<ChevronDownIcon
			class={cn(
				'size-4 shrink-0 text-mute transition-transform duration-150',
				open && 'rotate-180'
			)}
		/>
	</button>

	{#if open}
		<div
			bind:this={listEl}
			role="listbox"
			tabindex="-1"
			aria-label={placeholder}
			class={cn(panelClass, 'absolute top-[calc(100%+6px)] left-0 max-h-64 w-full overflow-y-auto')}
		>
			{#each options as option, i (option.value)}
				<div
					role="option"
					tabindex="-1"
					aria-selected={option.value === value}
					data-disabled={option.disabled ?? false}
					onclick={() => choose(option)}
					onmouseenter={() => (activeIndex = i)}
					onkeydown={(e) => e.key === 'Enter' && choose(option)}
					class={cn(
						panelItemClass,
						'justify-between',
						i === activeIndex && 'bg-primary-soft',
						option.value === value && 'font-medium'
					)}
				>
					<span class="min-w-0">
						<span class="block truncate">{option.label}</span>
						{#if option.description}
							<span class="ds-caption block text-mute">{option.description}</span>
						{/if}
					</span>
					{#if option.value === value}
						<CheckIcon class="size-4 shrink-0 text-primary" />
					{/if}
				</div>
			{/each}

			{#if !options.length}
				<p class="ds-body px-2.5 py-3 text-center text-faint">Tidak ada pilihan</p>
			{/if}
		</div>
	{/if}
</div>
