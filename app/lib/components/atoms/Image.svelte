<script lang="ts">
	import type { HTMLImgAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Radius = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

	type Props = WithElementRef<HTMLImgAttributes> & {
		radius?: Radius;
		ratio?: 'square' | 'wide' | 'none';
		fallback?: string;
		class?: string;
	};

	const radiusMap: Record<Radius, string> = {
		xs: 'rounded-xs',
		sm: 'rounded-sm',
		md: 'rounded-md',
		lg: 'rounded-lg',
		xl: 'rounded-xl',
		full: 'rounded-full'
	} as const;

	let {
		ref = $bindable(null),
		src = '',
		alt = '',
		radius = 'xl',
		ratio = 'none',
		fallback = '...',
		class: className,
		...rest
	}: Props = $props();

	let failed = $state(false);
</script>

<div
	class={cn(
		'overflow-hidden bg-lane',
		radiusMap[radius],
		ratio === 'square' && 'aspect-square',
		ratio === 'wide' && 'aspect-video',
		className
	)}
>
	{#if src && !failed}
		<img
			bind:this={ref}
			{src}
			{alt}
			class="size-full object-cover"
			onerror={() => (failed = true)}
			{...rest}
		/>
	{:else}
		<div class="ds-caption flex size-full items-center justify-center text-faint">
			{fallback}
		</div>
	{/if}
</div>