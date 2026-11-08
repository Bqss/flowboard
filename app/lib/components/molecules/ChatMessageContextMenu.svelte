<script lang="ts">
  import type { ApiChatMessage } from '$lib/api/client.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    MailReply01Icon,
    Forward01Icon,
    PinIcon,
    PinOffIcon,
    Edit02Icon,
    Delete02Icon,
    SmileIcon
  } from '@hugeicons/core-free-icons';

  type Props = {
    open?: boolean;
    x?: number;
    y?: number;
    message: ApiChatMessage | null;
    currentUserId?: string;
    onreply?: (msg: ApiChatMessage) => void;
    onreact?: (msg: ApiChatMessage) => void;
    ontogglereaction?: (msg: ApiChatMessage, reaction: string) => void;
    onforward?: (msg: ApiChatMessage) => void;
    onpin?: (msg: ApiChatMessage) => void;
    onedit?: (msg: ApiChatMessage) => void;
    ondelete?: (msg: ApiChatMessage) => void;
    onclose?: () => void;
  };

  let {
    open = $bindable(false),
    x = 0,
    y = 0,
    message,
    currentUserId,
    onreply,
    onreact,
    ontogglereaction,
    onforward,
    onpin,
    onedit,
    ondelete,
    onclose
  }: Props = $props();

  let panel = $state<HTMLElement | null>(null);
  const MENU_WIDTH = 192;
  const MENU_HEIGHT = 210;

  // Compute position synchronously on first paint to eliminate any layout shift / position jump
  const adjustedX = $derived.by(() => {
    if (typeof window === 'undefined') return x;
    const maxX = window.innerWidth - MENU_WIDTH - 12;
    return x > maxX ? Math.max(12, maxX) : Math.max(12, x);
  });

  const adjustedY = $derived.by(() => {
    if (typeof window === 'undefined') return y;
    const maxY = window.innerHeight - MENU_HEIGHT - 12;
    return y > maxY ? Math.max(12, maxY) : Math.max(12, y);
  });

  let openedAt = 0;
  $effect(() => {
    if (open) {
      openedAt = Date.now();
    }
  });

  function close(force = false) {
    if (!force && Date.now() - openedAt < 350) return;
    open = false;
    onclose?.();
  }

  function handleWindowPointerDown(e: PointerEvent) {
    if (!open || !panel) return;
    if (!panel.contains(e.target as Node)) {
      close();
    }
  }

  function handleWindowKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      close(true);
    }
  }
  const isOwn = $derived(Boolean(message && currentUserId && message.senderId === currentUserId));
  const isDeleted = $derived(Boolean(message?.deletedAt));
  const isPinned = $derived(Boolean(message?.pinnedAt));

  // Edit window: maximum 3 hours after creation
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  const canEdit = $derived.by(() => {
    if (!message || !isOwn || isDeleted) return false;
    const elapsed = Date.now() - new Date(message.createdAt).getTime();
    return elapsed <= THREE_HOURS_MS;
  });

</script>

<svelte:window onpointerdown={handleWindowPointerDown} onkeydown={handleWindowKeyDown} />

{#if open && message}
  <!-- Backdrop for dismissing on click / tap -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] transition-opacity duration-150 animate-in fade-in"
    onclick={() => close()}
    onpointerdown={() => close()}
    oncontextmenu={(e) => { e.preventDefault(); close(); }}
  ></div>

  <div
    bind:this={panel}
    role="menu"
    tabindex="-1"
    class="fixed z-50 w-48 rounded-xl border border-hairline bg-card p-1 shadow-popover select-none animate-in fade-in zoom-in-95 duration-75 {adjustedX > (typeof window !== 'undefined' ? window.innerWidth / 2 : 500) ? 'origin-top-right' : 'origin-top-left'}"
    style="left: {adjustedX}px; top: {adjustedY}px;"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    oncontextmenu={(e) => e.preventDefault()}
  >
    {#if !isDeleted}
      <!-- WhatsApp-style Quick Reactions Bar at Top of Context Menu -->
      <div class="flex items-center justify-between border-b border-hairline/80 px-1 py-1 mb-1">
        {#each ['👍', '❤️', '😂', '😮', '😢', '🙏'] as r}
          <button
            type="button"
            onclick={() => {
              if (message) {
                ontogglereaction?.(message, r);
              }
              close(true);
            }}
            class="flex size-7 items-center justify-center rounded-full text-base transition-transform hover:scale-125 active:scale-95 cursor-pointer hover:bg-canvas-sunken"
            title={r}
          >
            <span>{r}</span>
          </button>
        {/each}
      </div>

      <button
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-ink transition-colors hover:bg-lane"
        onclick={() => {
          close(true);
          onreact?.(message);
        }}
      >
        <HugeiconsIcon icon={SmileIcon} size={15} strokeWidth={1.8} class="text-mute" />
        <span>Beri Reaksi</span>
      </button>

      <!-- 1. Balas -->
      <button
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-ink transition-colors hover:bg-lane"
        onclick={() => {
          close(true);
          onreply?.(message);
        }}
      >
        <HugeiconsIcon icon={MailReply01Icon} size={15} strokeWidth={1.8} class="text-mute" />
        <span>Balas</span>
      </button>

      <!-- 2. Teruskan -->
      <button
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-ink transition-colors hover:bg-lane"
        onclick={() => {
          close(true);
          onforward?.(message);
        }}
      >
        <HugeiconsIcon icon={Forward01Icon} size={15} strokeWidth={1.8} class="text-mute" />
        <span>Teruskan</span>
      </button>

      <!-- 3. Sematkan / Lepas Sematan -->
      <button
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-ink transition-colors hover:bg-lane"
        onclick={() => {
          close(true);
          onpin?.(message);
        }}
      >
        {#if isPinned}
          <HugeiconsIcon icon={PinOffIcon} size={15} strokeWidth={1.8} class="text-mute" />
          <span>Lepas Sematan</span>
        {:else}
          <HugeiconsIcon icon={PinIcon} size={15} strokeWidth={1.8} class="text-mute" />
          <span>Sematkan Pesan</span>
        {/if}
      </button>
    {/if}

    <!-- 4. Edit (Hanya pesan sendiri & maks 3 jam) -->
    {#if isOwn && !isDeleted}
      <div class="my-1 h-px bg-hairline" role="separator"></div>
      {#if canEdit}
        <button
          type="button"
          role="menuitem"
          class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-ink transition-colors hover:bg-lane"
          onclick={() => {
            close(true);
            onedit?.(message);
          }}
        >
          <HugeiconsIcon icon={Edit02Icon} size={15} strokeWidth={1.8} class="text-mute" />
          <span>Edit Pesan</span>
        </button>
      {:else}
        <div
          role="menuitem"
          aria-disabled="true"
          class="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-faint cursor-not-allowed opacity-60"
          title="Pesan melebihi had masa 3 jam dan tidak boleh diedit lagi"
        >
          <div class="flex items-center gap-2.5">
            <HugeiconsIcon icon={Edit02Icon} size={15} strokeWidth={1.8} class="text-faint" />
            <span>Edit Pesan</span>
          </div>
          <span class="text-[10px] text-mute">&gt;3 jam</span>
        </div>
      {/if}

      <!-- 5. Hapus -->
      <button
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-status-urgent transition-colors hover:bg-status-urgent/10"
        onclick={() => {
          close(true);
          ondelete?.(message);
        }}
      >
        <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.8} />
        <span>Hapus Pesan</span>
      </button>
    {/if}
  </div>
{/if}
