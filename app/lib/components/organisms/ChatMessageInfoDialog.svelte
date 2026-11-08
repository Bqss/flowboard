<script lang="ts">
	import type { ApiChatMessage, ApiChatReceiptCursor, ChatMessageStatus } from '$lib/api/client.js';
	import { Avatar, MessageTicks } from '$lib/components/atoms/index.js';
	import { getMessageReceiptGroups, type ReceiptEntry } from '$lib/chat/receipts.js';
	import Dialog from './Dialog.svelte';

	type Props = {
		open?: boolean;
		message: ApiChatMessage | null;
		receipts: ApiChatReceiptCursor[];
		onclose?: () => void;
	};

	let { open = $bindable(false), message, receipts, onclose }: Props = $props();

	const groups = $derived(message ? getMessageReceiptGroups(message, receipts) : null);

	const sections = $derived.by(() => {
		if (!groups) return [];
		const list: { key: string; title: string; status: ChatMessageStatus; entries: ReceiptEntry[] }[] = [
			{ key: 'read', title: 'Dibaca', status: 'read', entries: groups.read },
			{ key: 'delivered', title: 'Diterima', status: 'delivered', entries: groups.delivered },
			{ key: 'pending', title: 'Belum diterima', status: 'sent', entries: groups.pending }
		];
		return list.filter((s) => s.entries.length > 0);
	});

	const previewText = $derived.by(() => {
		if (!message) return '';
		if (message.deletedAt) return 'Pesan telah dihapus';
		const body = message.body?.trim();
		if (body) return body;
		return message.attachments?.length ? 'Lampiran' : '';
	});

	const timeFormatter = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });
	const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });
	const dateYearFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

	const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

	const formatReceiptTime = (value: string | null): string => {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		const now = new Date();
		const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
		const time = timeFormatter.format(date);
		if (dayDiff === 0) return `Hari ini ${time}`;
		if (dayDiff === 1) return `Kemarin ${time}`;
		const day = date.getFullYear() === now.getFullYear() ? dateFormatter.format(date) : dateYearFormatter.format(date);
		return `${day} ${time}`;
	};

</script>

<Dialog bind:open size="sm" title="Info Pesan" {onclose}>
	{#if message}
		<div class="space-y-4">
			<div class="flex justify-end">
				<div class="max-w-[85%] rounded-2xl rounded-br-md bg-primary-soft px-3 py-2">
					<p class="ds-body line-clamp-3 whitespace-pre-wrap break-words text-ink">{previewText}</p>
					<p class="ds-caption mt-1 text-right text-mute">{formatReceiptTime(message.createdAt)}</p>
				</div>
			</div>

			<div class="-mx-1 max-h-[60vh] overflow-y-auto px-1">
				{#if sections.length === 0}
					<p class="ds-caption py-6 text-center text-mute">Belum ada penerima</p>
				{:else}
					<div class="space-y-4">
						{#each sections as section (section.key)}
							<section>
								<div class="mb-1.5 flex items-center gap-1.5">
									<MessageTicks status={section.status} size={15} />
									<h3 class="ds-label text-ink-soft">{section.title} · {section.entries.length}</h3>
								</div>
								<ul class="divide-y divide-hairline rounded-xl border border-hairline">
									{#each section.entries as entry (entry.userId)}
										<li class="flex items-center gap-3 px-3 py-2">
											<Avatar name={entry.name} src={entry.avatarUrl ?? undefined} size={32} />
											<span class="ds-body min-w-0 flex-1 truncate text-ink">{entry.name}</span>
											{#if entry.at}
												<span class="ds-caption shrink-0 text-mute tabular-nums">{formatReceiptTime(entry.at)}</span>
											{/if}
										</li>
									{/each}
								</ul>
							</section>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</Dialog>
