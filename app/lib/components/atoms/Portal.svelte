<script lang="ts">
	import type { Snippet } from 'svelte';
	import { portal } from '$lib/components/molecules/shared.js';

	type Props = {
		children: Snippet;
		class?: string;
	};

	let { children, class: className }: Props = $props();
</script>

<div class={className} use:portal data-theme="app">
	{@render children()}
</div>
