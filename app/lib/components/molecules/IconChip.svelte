<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		size?: 'sm' | 'md' | 'lg';
		/** `squircle` is the default card-leading motif; `circle` for compact rows. */
		shape?: 'squircle' | 'circle';
		tone?: 'queued' | 'muted' | 'primary';
		class?: string;
		children?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		size = 'md',
		shape = 'squircle',
		tone = 'queued',
		class: className,
		children,
		...rest
	}: Props = $props();

	const sizes = {
		sm: 'size-8 [&_svg]:size-4',
		md: 'size-9 [&_svg]:size-[18px]',
		lg: 'size-12 [&_svg]:size-6'
	} as const;

	const tones = {
		queued: 'bg-primary-soft text-primary',
		muted: 'bg-lane text-mute',
		primary: 'bg-primary text-on-primary'
	} as const;
</script>

<span
	bind:this={ref}
	class={cn(
		'inline-grid shrink-0 place-items-center',
		sizes[size],
		tones[tone],
		shape === 'circle' ? 'rounded-full' : 'rounded-lg',
		className
	)}
	{...rest}
>
	{@render children?.()}
</span>
