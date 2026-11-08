<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Tick02Icon, TickDouble02Icon } from '@hugeicons/core-free-icons';
	import { cn } from '$lib/utils.js';
	import type { ChatMessageStatus } from '$lib/api/client.js';

	type Props = {
		status: ChatMessageStatus;
		tone?: 'onPrimary' | 'neutral';
		size?: number;
		class?: string;
	};

	let { status, tone = 'neutral', size = 14, class: className }: Props = $props();

	const labels: Record<ChatMessageStatus, string> = {
		sent: 'Terkirim',
		delivered: 'Diterima',
		read: 'Dibaca'
	};

	const colorClass = $derived.by(() => {
		if (tone === 'onPrimary') return status === 'read' ? 'text-sky-300' : 'text-white/70';
		return status === 'read' ? 'text-primary' : 'text-faint';
	});

	const label = $derived(labels[status]);
</script>

<span
	role="img"
	aria-label={label}
	title={label}
	class={cn('inline-flex shrink-0 items-center align-middle leading-none', colorClass, className)}
>
	{#key status}
		<!-- HugeiconsIcon reads `icon` only on mount, so remount when the status changes -->
		<HugeiconsIcon icon={status === 'sent' ? Tick02Icon : TickDouble02Icon} {size} strokeWidth={1.8} />
	{/key}
</span>
