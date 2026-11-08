<script lang="ts">
  import {
    addRecentStickerItem,
    clearRecentStickerItems,
    getRecentStickerItems,
    normalizeEmoji,
    type RecentStickerItem
  } from '$lib/chat/stickers.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Cancel01Icon,
    Search01Icon,
    SmileIcon
  } from '@hugeicons/core-free-icons';

  let {
    open = $bindable(false),
    onselectsticker,
    onclose,
    align = 'left'
  }: {
    open: boolean;
    onselectsticker: (sticker: { url: string; name: string }) => void;
    onclose?: () => void;
    align?: 'left' | 'right';
  } = $props();

  let searchQuery = $state('');
  let recentItems = $state<RecentStickerItem[]>([]);
  let pickerContainer = $state<HTMLDivElement | null>(null);
  let pickerEl = $state<HTMLDivElement | null>(null);
  let isLoaded = $state(false);

  // Load recents from localStorage whenever picker opens
  $effect(() => {
    if (open) {
      recentItems = getRecentStickerItems();
      searchQuery = '';
      if (pickerContainer) {
        const picker = pickerContainer.querySelector('emoji-picker');
        if (picker && picker.shadowRoot) {
          const input = picker.shadowRoot.querySelector('input#search') as HTMLInputElement;
          if (input) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
    }
  });

  // Deferred click-outside listener
  $effect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (pickerEl && !pickerEl.contains(e.target as Node)) {
        close();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', onDocClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', onDocClick);
    };
  });

  // Lazy-load emoji-picker-element
  $effect(() => {
    if (open && !isLoaded && typeof window !== 'undefined') {
      import('emoji-picker-element')
        .then(() => {
          isLoaded = true;
        })
        .catch(() => {});
    }
  });

  // Initialize emoji-picker-element: hide internal search and remove yellow hand
  $effect(() => {
    if (open && pickerContainer && isLoaded) {
      if (!pickerContainer.querySelector('emoji-picker')) {
        const picker: any = document.createElement('emoji-picker');
        picker.classList.add('w-full', 'h-full', 'border-0');

        picker.addEventListener('emoji-click', (event: any) => {
          const unicode = event.detail?.unicode;
          const name = event.detail?.emoji?.annotation || event.detail?.name || 'Stiker';
          if (unicode) {
            selectEmoji({ unicode, name });
          }
        });

        // Hide internal search row and skin-tone picker inside shadow DOM
        requestAnimationFrame(() => {
          if (picker.shadowRoot) {
            const style = document.createElement('style');
            style.textContent = `
              .search-row { display: none !important; }
              .skintone-button-wrapper { display: none !important; }
              .pad-top { display: none !important; }
            `;
            picker.shadowRoot.appendChild(style);
          }
        });

        pickerContainer.appendChild(picker);
      }
    }
  });

  function handleCustomSearch() {
    if (!pickerContainer) return;
    const picker = pickerContainer.querySelector('emoji-picker');
    if (picker && picker.shadowRoot) {
      const input = picker.shadowRoot.querySelector('input#search') as HTMLInputElement;
      if (input) {
        input.value = searchQuery;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  function selectEmoji(item: { unicode: string; name: string }) {
    recentItems = addRecentStickerItem(item);
    onselectsticker({ url: item.unicode, name: item.name });
    close();
  }

  function clearRecents() {
    clearRecentStickerItems();
    recentItems = [];
  }

  function close() {
    open = false;
    onclose?.();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      close();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    bind:this={pickerEl}
    role="dialog"
    tabindex="-1"
    aria-label="Pilih stiker dan emoji"
    onclick={(e) => e.stopPropagation()}
    onkeydown={handleKeydown}
    class="fixed sm:absolute inset-x-2 sm:inset-x-auto bottom-[74px] sm:bottom-full sm:mb-3 z-50 flex h-[430px] max-h-[75vh] sm:h-[450px] w-auto sm:w-[390px] {align === 'right' ? 'sm:right-0 sm:left-auto' : 'sm:left-0 sm:right-auto'} flex-col overflow-hidden rounded-2xl border border-hairline bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150"
  >
    <!-- Top Header: Title and Close Button -->
    <div class="flex items-center justify-between border-b border-hairline bg-canvas-sunken/60 px-3 py-2">
      <div class="flex items-center gap-2">
        <HugeiconsIcon icon={SmileIcon} size={17} strokeWidth={1.8} class="text-primary" />
        <span class="text-xs font-bold text-ink">Stiker & Emoji</span>
      </div>

      <!-- Close button -->
      <button
        type="button"
        onclick={close}
        class="flex size-7 items-center justify-center rounded-lg text-mute hover:bg-canvas-sunken hover:text-ink transition-colors cursor-pointer"
        aria-label="Tutup"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.8} />
      </button>
    </div>

    <!-- Custom Search Bar (Flowboard Design - No Yellow Hand) -->
    <div class="border-b border-hairline bg-card px-3 pt-2.5 pb-2">
      <div class="relative flex items-center">
        <HugeiconsIcon
          icon={Search01Icon}
          size={15}
          strokeWidth={1.8}
          class="pointer-events-none absolute left-3 text-mute"
        />
        <input
          type="text"
          bind:value={searchQuery}
          oninput={handleCustomSearch}
          placeholder="Cari stiker & emoji…"
          class="h-9 w-full rounded-xl border border-hairline bg-canvas-sunken/60 pl-9 pr-8 text-xs text-ink placeholder:text-mute focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
        />
        {#if searchQuery}
          <button
            type="button"
            onclick={() => {
              searchQuery = '';
              handleCustomSearch();
            }}
            class="absolute right-2.5 flex size-5 items-center justify-center rounded-full text-mute hover:bg-canvas-sunken hover:text-ink cursor-pointer"
            aria-label="Hapus pencarian"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
          </button>
        {/if}
      </div>
    </div>

    <!-- Recents Section ("Terakhir Digunakan") -->
    {#if recentItems.length > 0 && !searchQuery}
      <div class="border-b border-hairline/60 bg-canvas-sunken/30 px-3 pt-2 pb-2.5">
        <div class="flex items-center justify-between mb-1.5 px-0.5">
          <span class="text-[10px] font-bold uppercase tracking-wider text-mute flex items-center gap-1">
            <span>🕒</span>
            <span>Terakhir Digunakan</span>
          </span>
          <button
            type="button"
            onclick={clearRecents}
            class="text-[10px] font-medium text-mute hover:text-status-urgent-ink transition-colors cursor-pointer"
          >
            Hapus
          </button>
        </div>
        <div class="filter-scroll-container flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5" style="scrollbar-width: none;">
          {#each recentItems as item (normalizeEmoji(item.unicode))}
            <button
              type="button"
              onclick={() => selectEmoji(item)}
              class="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-card border border-hairline/80 hover:bg-primary-soft/40 hover:border-primary/30 text-2xl sm:text-[26px] transition-all hover:scale-120 active:scale-95 cursor-pointer shadow-2xs overflow-hidden"
              title={item.name}
            >
              <span class="leading-none select-none">{item.unicode}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Full Emoji / Sticker Library Container -->
    <div
      bind:this={pickerContainer}
      class="flex-1 overflow-hidden"
    >
      {#if !isLoaded}
        <div class="grid h-full place-items-center text-xs text-mute">
          Memuat stiker & emoji…
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  :global(emoji-picker) {
    width: 100% !important;
    height: 100% !important;
    --border-size: 0px !important;
    --background: var(--color-card, #ffffff);
    --input-border-color: var(--color-hairline, #e2e8f0);
    --input-border-radius: 12px;
    --indicator-color: var(--color-primary, #4f46e5);
    --emoji-size: 1.625rem;
    --emoji-padding: 0.35rem;
    font-family: inherit;
  }
</style>
