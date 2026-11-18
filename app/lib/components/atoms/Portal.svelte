<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Portal as PortalPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	type Props = {
		children: Snippet;
		class?: string;
	};

	let { children, class: className }: Props = $props();
</script>

<!-- Portalled content leaves [data-theme='app'], so the token variables (shadows, hairlines,
     focus, scrim) would be undefined. Re-enter the app theme here; `contents` keeps layout unchanged. -->
<PortalPrimitive>
	<div class={cn('contents', className)} data-theme="app">
		{@render children()}
	</div>
</PortalPrimitive>
