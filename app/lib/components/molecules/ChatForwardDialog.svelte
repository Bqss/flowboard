<script lang="ts">
  import type { ApiChatConversation, ApiChatMessage } from '$lib/api/client.js';
  import { Dialog } from '$lib/components/organisms/index.js';
  import { Button, Avatar, Badge } from '$lib/components/atoms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Search01Icon,
    Forward01Icon,
    Tick02Icon
  } from '@hugeicons/core-free-icons';

  type Props = {
    open?: boolean;
    message: ApiChatMessage | null;
    conversations: ApiChatConversation[];
    currentConversationId?: string | null;
    onforward: (targetConversationIds: string[]) => Promise<void>;
  };

  let {
    open = $bindable(false),
    message,
    conversations,
    currentConversationId,
    onforward
  }: Props = $props();

  let searchQuery = $state('');
  let selectedConversationIds = $state<string[]>([]);
  let forwarding = $state(false);
  let forwardError = $state(false);

  $effect(() => {
    if (open) {
      searchQuery = '';
      selectedConversationIds = [];
      forwarding = false;
      forwardError = false;
    }
  });

  const availableConversations = $derived.by(() => {
    const list = conversations.filter((c) => c.id !== currentConversationId);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const name = (c.name ?? c.partner?.name ?? '').toLowerCase();
      return name.includes(q);
    });
  });

  function toggleSelect(id: string) {
    if (selectedConversationIds.includes(id)) {
      selectedConversationIds = selectedConversationIds.filter((cid) => cid !== id);
    } else {
      selectedConversationIds = [...selectedConversationIds, id];
    }
  }

  async function handleConfirm() {
    if (selectedConversationIds.length === 0 || forwarding) return;
    forwarding = true;
    try {
      await onforward(selectedConversationIds);
      open = false;
    } catch {
      forwardError = true;
    } finally {
      forwarding = false;
    }
  }
</script>

<Dialog bind:open title="Teruskan Pesan" size="md">
  <div class="space-y-4">
    <!-- Preview Message -->
    {#if message}
      <div class="rounded-xl border border-hairline bg-canvas-sunken/60 p-3 text-xs">
        <div class="flex items-center gap-1.5 font-semibold text-ink mb-1">
          <HugeiconsIcon icon={Forward01Icon} size={14} class="text-primary" />
          <span>Pesan daripada {message.senderName}</span>
        </div>
        {#if message.body}
          <p class="text-ink-soft line-clamp-3 whitespace-pre-wrap">{message.body}</p>
        {/if}
        {#if message.attachments && message.attachments.length > 0}
          <p class="mt-1 text-[11px] font-medium text-mute italic">
            +{message.attachments.length} lampiran
          </p>
        {/if}
      </div>
    {/if}

    {#if forwardError}
      <p role="alert" class="rounded-lg bg-status-urgent-soft px-3 py-2 text-xs font-medium text-status-urgent-ink">
        Pesan gagal diteruskan. Periksa koneksi lalu coba lagi.
      </p>
    {/if}
    <!-- Search Filter -->
    <div class="relative">
      <HugeiconsIcon
        icon={Search01Icon}
        size={16}
        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
      />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Cari perbualan atau kenalan..."
        class="w-full rounded-xl border border-hairline bg-card py-2 pl-9 pr-3 text-xs text-ink placeholder:text-faint focus:border-primary focus:outline-hidden"
      />
    </div>

    <!-- Conversations List -->
    <div class="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-hairline/40">
      {#if availableConversations.length === 0}
        <div class="py-6 text-center text-xs text-mute">
          {searchQuery.trim() ? 'Tiada perbualan sepadan ditemui.' : 'Tiada perbualan lain yang tersedia.'}
        </div>
      {:else}
        {#each availableConversations as conv (conv.id)}
          {@const isSelected = selectedConversationIds.includes(conv.id)}
          {@const title = conv.name ?? conv.partner?.name ?? 'Perbualan'}
          <button
            type="button"
            onclick={() => toggleSelect(conv.id)}
            class="flex w-full items-center justify-between gap-3 rounded-xl p-2.5 text-left transition-colors {isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-lane'}"
          >
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <Avatar name={title} src={conv.partner?.avatarUrl ?? undefined} size={32} />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="truncate text-xs font-semibold text-ink">{title}</span>
                  {#if conv.kind === 'workflow'}
                    <Badge tone="queued" variant="soft" class="text-[9px] py-0 px-1.5">Workflow</Badge>
                  {:else if conv.kind === 'taskboard'}
                    <Badge tone="progress" variant="soft" class="text-[9px] py-0 px-1.5">Board</Badge>
                  {:else if conv.kind === 'group'}
                    <Badge tone="idle" variant="soft" class="text-[9px] py-0 px-1.5">Grup</Badge>
                  {/if}
                </div>
                {#if conv.lastMessage?.body}
                  <p class="truncate text-[11px] text-mute">{conv.lastMessage.body}</p>
                {/if}
              </div>
            </div>

            <!-- Selection Checkmark -->
            <div class="flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors {isSelected ? 'bg-primary border-primary text-white' : 'border-hairline bg-card'}">
              {#if isSelected}
                <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2.5} />
              {/if}
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>

  {#snippet footer()}
    <div class="flex items-center justify-between w-full">
      <span class="text-xs text-mute">
        {selectedConversationIds.length} perbualan dipilih
      </span>
      <div class="flex items-center gap-2">
        <Button variant="ghost" size="sm" onclick={() => (open = false)} disabled={forwarding}>
          Batal
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={selectedConversationIds.length === 0 || forwarding}
          loading={forwarding}
          onclick={handleConfirm}
        >
          <HugeiconsIcon icon={Forward01Icon} size={14} strokeWidth={2} />
          <span>Teruskan</span>
        </Button>
      </div>
    </div>
  {/snippet}
</Dialog>
