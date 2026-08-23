<script lang="ts">
	import Dialog from './Dialog.svelte';
	import { Button } from '$lib/components/atoms/index.js';

	type Props = {
		open?: boolean;
		title?: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		destructive?: boolean;
		loading?: boolean;
		testId?: string;
		confirmTestId?: string;
		onconfirm?: () => void;
		oncancel?: () => void;
	};

	let {
		open = $bindable(false),
		title = 'Konfirmasi',
		description,
		confirmLabel = 'Ya, lanjutkan',
		cancelLabel = 'Batal',
		destructive = false,
		loading = false,
		testId,
		confirmTestId,
		onconfirm,
		oncancel
	}: Props = $props();

	function cancel() {
		open = false;
		oncancel?.();
	}
</script>

<Dialog bind:open {title} {description} size="sm" onclose={cancel} data-testid={testId}>
	{#snippet footer()}
		<Button variant="secondary" onclick={cancel} disabled={loading}>{cancelLabel}</Button>
		<Button
			variant={destructive ? 'destructive' : 'primary'}
			loading={loading}
			onclick={onconfirm}
			data-testid={confirmTestId}
		>
			{confirmLabel}
		</Button>
	{/snippet}
</Dialog>
