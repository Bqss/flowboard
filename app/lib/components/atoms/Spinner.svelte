<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		size?: number;
		stroke?: number;
		class?: string;
		label?: string;
	};

	let {
		ref = $bindable(null),
		size = 24,
		stroke = 2,
		label,
		class: className,
		...rest
	}: Props = $props();
</script>

<span
	bind:this={ref}
	class={cn('inline-block text-primary animate-spin', className)}
	style={`width:${size}px;height:${size}px;`}
	role="status"
	aria-label={label}
	{...rest}
>
	<svg viewBox="0 0 24 24" fill="none" class="size-full">
		<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.25" stroke-width={stroke} />
		<path
			d="M21 12a9 9 0 0 0-9-9"
			stroke="currentColor"
			stroke-width={stroke}
			stroke-linecap="round"
		/>
	</svg>
</span>