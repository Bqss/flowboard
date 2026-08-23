<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends WithElementRef<HTMLAttributes<HTMLElement>> {
		lead?: boolean;
		muted?: boolean;
		faint?: boolean;
		size?: 'sm' | 'base' | 'lg';
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		lead = false,
		muted = false,
		faint = false,
		size = 'base',
		ref = $bindable(null),
		class: className,
		children,
		...rest
	}: Props = $props();

	const sizeMap = {
		sm: 'text-[13px] leading-snug',
		base: 'ds-body',
		lg: 'text-[15px] leading-relaxed'
	} as const;

	const tone = $derived(muted ? 'text-mute' : faint ? 'text-faint' : 'text-ink');
</script>

<p
	bind:this={ref}
	class={cn(sizeMap[size], tone, lead && 'text-[17px] leading-relaxed', className)}
	{...rest}
>
	{@render children?.()}
</p>
