<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		src?: string;
		alt?: string;
		name?: string;
		size?: number;
		online?: boolean;
		class?: string;
	};

	let {
		ref = $bindable(null),
		src,
		alt = '',
		name = '',
		size = 28,
		online = false,
		class: className,
		...rest
	}: Props = $props();

	const initials = $derived(
		name
			.split(' ')
			.map((w) => w[0])
			.filter(Boolean)
			.slice(0, 2)
			.join('')
			.toUpperCase()
	);
</script>

<span
	bind:this={ref}
	class={cn(
		'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-semibold text-primary-ink ring-2 ring-canvas',
		className
	)}
	style={`width:${size}px;height:${size}px;font-size:${Math.max(10, size * 0.38)}px;`}
	{...rest}
>
	{#if src}
		<img {src} {alt} class="size-full object-cover" />
	{:else}
		{initials || '?'}
	{/if}
	{#if online}
		<span
			class="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-presence-online ring-2 ring-canvas"
			aria-hidden="true"
		></span>
	{/if}
</span>
