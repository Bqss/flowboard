<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value: string;
		label?: string;
		/** Shows the raw value beside the copy button. */
		showValue?: boolean;
		size?: 'sm' | 'md';
		oncopy?: () => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		value,
		label = 'Salin',
		showValue = true,
		size = 'md',
		oncopy,
		class: className,
		...rest
	}: Props = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout>;

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			oncopy?.();
			clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 1800);
		} catch {
			/* clipboard unavailable */
		}
	}
</script>

<div
	bind:this={ref}
	class={cn('inline-flex min-w-0 max-w-full items-center gap-2', className)}
	{...rest}
>
	{#if showValue}
		<code
			class={cn(
				'ds-mono min-w-0 truncate rounded-sm bg-lane px-2 py-1 text-ink',
				size === 'sm' ? 'text-[12px]' : 'text-[13px]'
			)}
		>
			{value}
		</code>
	{/if}

	<button
		type="button"
		onclick={copy}
		aria-label={copied ? 'Tersalin' : label}
		title={copied ? 'Tersalin' : label}
		class={cn(
			'inline-flex shrink-0 items-center gap-1.5 rounded-md border border-hairline bg-card text-mute transition-colors duration-150 ease-out hover:border-primary-border hover:bg-lane hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
			size === 'sm' ? 'h-7 px-2 text-[12px]' : 'h-8 px-2.5 text-[13px]'
		)}
	>
		{#if copied}
			<CheckIcon class="size-3.5 text-status-done-ink" />
			<span class="font-medium text-status-done-ink">Tersalin</span>
		{:else}
			<CopyIcon class="size-3.5" />
			<span class="font-medium">{label}</span>
		{/if}
	</button>
</div>
