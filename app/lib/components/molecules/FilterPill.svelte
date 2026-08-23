<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import XIcon from '@lucide/svelte/icons/x';

	type Props = WithElementRef<HTMLAttributes<HTMLButtonElement>> & {
		label: string;
		active?: boolean;
		count?: number;
		removable?: boolean;
		onremove?: () => void;
		onselect?: () => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		label,
		active = false,
		count,
		removable = false,
		onremove,
		onselect,
		class: className,
		...rest
	}: Props = $props();
</script>

<button
	bind:this={ref}
	type="button"
	aria-pressed={active}
	onclick={onselect}
	class={cn(
		'ds-caption inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
		active
			? 'border-primary bg-primary-soft text-primary'
			: 'border-hairline bg-card text-mute hover:border-primary-border hover:bg-lane hover:text-ink',
		className
	)}
	{...rest}
>
	{label}
	{#if count !== undefined}
		<span class={cn('ds-mono rounded-full px-1.5 py-0.5', active ? 'bg-primary/15' : 'bg-lane')}>
			{count}
		</span>
	{/if}
	{#if removable && active}
		<span
			role="button"
			tabindex="-1"
			onclick={(e) => {
				e.stopPropagation();
				onremove?.();
			}}
			onkeydown={(e) => e.key === 'Enter' && onremove?.()}
			aria-label={`Hapus filter ${label}`}
			class="grid size-4 place-items-center rounded-full hover:bg-black/10"
		>
			<XIcon class="size-3" />
		</span>
	{/if}
</button>
