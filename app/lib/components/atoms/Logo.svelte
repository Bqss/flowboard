<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		size?: number;
		class?: string;
	};

	let { ref = $bindable(null), size = 32, class: className, ...rest }: Props = $props();
</script>

<span
	bind:this={ref}
	class={cn('inline-flex items-center justify-center overflow-hidden rounded-lg bg-white', className)}
	style={`width:${size}px;height:${size}px;`}
	aria-label="actjom"
	role="img"
	{...rest}
>
	<img src="/logo_clean.png" alt="" class="size-full scale-[2.25] object-cover" />
</span>
