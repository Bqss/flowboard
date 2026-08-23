<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Avatar } from '$lib/components/atoms/index.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		name: string;
		role?: string;
		src?: string;
		size?: 'sm' | 'md';
		class?: string;
	};

	let {
		ref = $bindable(null),
		name,
		role,
		src,
		size = 'md',
		class: className,
		...rest
	}: Props = $props();

	const avatarSize = $derived(size === 'sm' ? 28 : 32);
</script>

<div
	bind:this={ref}
	class={cn('inline-flex min-w-0 max-w-full items-center gap-2.5', className)}
	{...rest}
>
	<Avatar {name} {src} size={avatarSize} />
	<div class="min-w-0">
		<p class={cn('truncate text-ink', size === 'sm' ? 'text-[13px] font-medium' : 'ds-body font-semibold')}>
			{name}
		</p>
		{#if role}
			<p class="ds-caption truncate text-mute">{role}</p>
		{/if}
	</div>
</div>
