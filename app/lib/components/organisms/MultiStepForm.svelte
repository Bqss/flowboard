<script lang="ts">
	import { Stepper } from '$lib/components/molecules/index.js';
	import { Button } from '$lib/components/atoms/index.js';
	import type { StepItem } from '$lib/components/molecules/shared.js';

	type Props = {
		steps: StepItem[];
		current?: number;
		nextLabel?: string;
		backLabel?: string;
		finishLabel?: string;
		loading?: boolean;
		onnext?: () => void;
		onback?: () => void;
		onfinish?: () => void;
		children: import('svelte').Snippet<[number]>;
	};

	let {
		steps,
		current = $bindable(0),
		nextLabel = 'Lanjut',
		backLabel = 'Kembali',
		finishLabel = 'Selesai',
		loading = false,
		onnext,
		onback,
		onfinish,
		children
	}: Props = $props();

	const last = $derived(current >= steps.length - 1);
</script>

<div class="space-y-8">
	<Stepper {steps} bind:current clickable />

	<div class="rounded-xl bg-card p-6 shadow-[var(--shadow-card)]">
		{@render children(current)}
	</div>

	<div class="flex justify-between gap-3">
		<Button variant="secondary" disabled={current === 0 || loading} onclick={onback}>{backLabel}</Button>
		{#if last}
			<Button variant="primary" {loading} onclick={onfinish}>{finishLabel}</Button>
		{:else}
			<Button variant="primary" {loading} onclick={onnext}>{nextLabel}</Button>
		{/if}
	</div>
</div>
