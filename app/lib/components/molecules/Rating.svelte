<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import StarIcon from '@lucide/svelte/icons/star';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: number;
		max?: number;
		readonly?: boolean;
		size?: 'sm' | 'md';
		onchange?: (value: number) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		value = $bindable(0),
		max = 5,
		readonly = false,
		size = 'md',
		onchange,
		class: className,
		...rest
	}: Props = $props();

	const iconSize = $derived(size === 'sm' ? 'size-4' : 'size-5');

	function set(next: number) {
		if (readonly) return;
		value = next;
		onchange?.(next);
	}
</script>

<div
	bind:this={ref}
	role={readonly ? 'img' : 'radiogroup'}
	aria-label={readonly ? `Rating ${value} dari ${max}` : 'Pilih rating'}
	class={cn('inline-flex items-center gap-0.5', className)}
	{...rest}
>
	{#each Array.from({ length: max }, (_, i) => i + 1) as star (star)}
		<button
			type="button"
			disabled={readonly}
			role={readonly ? undefined : 'radio'}
			aria-checked={!readonly ? star === value : undefined}
			aria-label={`${star} bintang`}
			onclick={() => set(star)}
			class={cn(
				'rounded-sm transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:pointer-events-none',
				star <= value ? 'text-status-progress-ink' : 'text-faint hover:text-status-progress-ink/70'
			)}
		>
			<StarIcon class={cn(iconSize, star <= value && 'fill-current')} />
		</button>
	{/each}
</div>
