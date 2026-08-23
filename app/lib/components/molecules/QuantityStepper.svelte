<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import PlusIcon from '@lucide/svelte/icons/plus';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: number;
		min?: number;
		max?: number;
		step?: number;
		disabled?: boolean;
		size?: 'sm' | 'md';
		label?: string;
		onchange?: (value: number) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		value = $bindable(1),
		min = 0,
		max = 99,
		step = 1,
		disabled = false,
		size = 'md',
		label = 'Jumlah',
		onchange,
		class: className,
		...rest
	}: Props = $props();

	function clamp(next: number) {
		return Math.min(max, Math.max(min, next));
	}

	function set(next: number) {
		const clamped = clamp(Number.isFinite(next) ? next : min);
		if (clamped === value) return;
		value = clamped;
		onchange?.(clamped);
	}

	const btn =
		'grid shrink-0 place-items-center rounded-md text-mute transition-colors duration-150 ease-out hover:bg-primary-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:pointer-events-none disabled:text-faint';
</script>

<div
	bind:this={ref}
	class={cn(
		'inline-flex items-center gap-0.5 rounded-md border border-hairline bg-card p-1',
		disabled && 'opacity-60',
		className
	)}
	{...rest}
>
	<button
		type="button"
		class={cn(btn, size === 'sm' ? 'size-6' : 'size-8')}
		onclick={() => set(value - step)}
		disabled={disabled || value <= min}
		aria-label={`Kurangi ${label.toLowerCase()}`}
	>
		<MinusIcon class="size-3.5" />
	</button>

	<input
		type="text"
		inputmode="numeric"
		aria-label={label}
		{disabled}
		value={String(value)}
		onchange={(e) => set(parseInt(e.currentTarget.value, 10))}
		class={cn(
			'ds-mono w-10 bg-transparent text-center text-ink outline-none disabled:cursor-not-allowed',
			size === 'sm' ? 'text-[13px]' : 'text-sm font-medium'
		)}
	/>

	<button
		type="button"
		class={cn(btn, size === 'sm' ? 'size-6' : 'size-8')}
		onclick={() => set(value + step)}
		disabled={disabled || value >= max}
		aria-label={`Tambah ${label.toLowerCase()}`}
	>
		<PlusIcon class="size-3.5" />
	</button>
</div>
