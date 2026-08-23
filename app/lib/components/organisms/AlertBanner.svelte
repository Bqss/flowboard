<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import XIcon from '@lucide/svelte/icons/x';

	type Tone = 'positive' | 'negative' | 'warning' | 'info';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		title?: string;
		tone?: Tone;
		dismissible?: boolean;
		onclose?: () => void;
		class?: string;
		children?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		title,
		tone = 'info',
		dismissible = true,
		onclose,
		class: className,
		children,
		...rest
	}: Props = $props();

	const toneMap = {
		positive: 'border-positive/25 bg-status-done-soft text-status-done-ink',
		negative: 'border-status-urgent/25 bg-status-urgent-soft text-status-urgent',
		warning: 'border-warning/25 bg-status-progress-soft text-status-progress-ink',
		info: 'border-hairline bg-primary-soft text-primary'
	} as const;
</script>

<div
	bind:this={ref}
	role="status"
	class={cn('flex items-start gap-3 border px-4 py-3', toneMap[tone], className)}
	{...rest}
>
	<div class="min-w-0 flex-1">
		{#if title}
			<p class="ds-body font-semibold">{title}</p>
		{/if}
		<div class={cn('ds-body', title && 'mt-0.5')}>
			{@render children?.()}
		</div>
	</div>

	{#if dismissible}
		<button
			type="button"
			onclick={onclose}
			aria-label="Tutup banner"
			class="grid size-7 shrink-0 place-items-center rounded-full hover:bg-black/5"
		>
			<XIcon class="size-4" />
		</button>
	{/if}
</div>
