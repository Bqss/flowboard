<script lang="ts">
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { Add01Icon } from '@hugeicons/core-free-icons';

  let {
    open = $bindable(false),
    onselect,
    onclose,
    activeReactions = [],
    align = 'left'
  }: {
    open: boolean;
    onselect: (reaction: string) => void;
    onclose?: () => void;
    activeReactions?: string[];
    align?: 'left' | 'right';
  } = $props();

  const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  let showMoreEmojis = $state(false);
  let morePickerContainer = $state<HTMLDivElement | null>(null);
  let emojiPickerLoaded = $state(false);
  let pickerEl = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (showMoreEmojis && !emojiPickerLoaded && typeof window !== 'undefined') {
      import('emoji-picker-element')
        .then(() => {
          emojiPickerLoaded = true;
        })
        .catch(() => {});
    }
  });

  $effect(() => {
    if (showMoreEmojis && morePickerContainer && emojiPickerLoaded) {
      if (!morePickerContainer.querySelector('emoji-picker')) {
        const picker = document.createElement('emoji-picker');
        picker.classList.add('w-full', 'h-full', 'border-0');
        picker.addEventListener('emoji-click', (event: any) => {
          const unicode = event.detail?.unicode;
          if (unicode) {
            onselect(unicode);
            close();
          }
        });
        morePickerContainer.appendChild(picker);
      }
    }
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
    showMoreEmojis = false;
    onclose?.();
  }

  function handleSelect(emoji: string) {
    onselect(emoji);
    close(true);
  }
  $effect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (Date.now() - openedAt < 350) return;
      if (pickerEl && !pickerEl.contains(e.target as Node)) {
        close(true);
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
    aria-label="Reaksi pesan"
    onclick={(e) => e.stopPropagation()}
    onkeydown={handleKeydown}
    class="absolute -top-12 z-50 {align === 'right' ? 'right-0' : 'left-0'} flex items-center gap-1 rounded-full border border-hairline bg-card/95 backdrop-blur-md px-2 py-1 shadow-xl animate-in fade-in zoom-in-95 duration-150"
  >
    {#each QUICK_REACTIONS as r}
      {@const isReacted = activeReactions.includes(r)}
      <button
        type="button"
        onclick={() => handleSelect(r)}
        class="flex size-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-130 active:scale-95 cursor-pointer {isReacted ? 'bg-primary-soft ring-1 ring-primary/40' : 'hover:bg-canvas-sunken'}"
        title={r}
      >
        <span>{r}</span>
      </button>
    {/each}

    <!-- '+' button to open full emoji picker -->
    <button
      type="button"
      onclick={() => (showMoreEmojis = !showMoreEmojis)}
      class="flex size-7 items-center justify-center rounded-full bg-canvas-sunken text-mute hover:bg-hairline hover:text-ink transition-colors cursor-pointer"
      title="Pilih reaksi lain"
      aria-label="Pilih reaksi lain"
    >
      <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
    </button>

    <!-- Full emoji picker popover for more reactions -->
    {#if showMoreEmojis}
      <div
        class="fixed sm:absolute inset-x-3 sm:inset-x-auto bottom-16 sm:bottom-full mb-2 {align === 'right' ? 'sm:right-0 sm:left-auto' : 'sm:left-0 sm:right-auto'} z-50 h-[320px] w-auto sm:w-[340px] overflow-hidden rounded-2xl border border-hairline bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div
          bind:this={morePickerContainer}
          class="h-full w-full"
        >
          {#if !emojiPickerLoaded}
            <div class="grid h-full place-items-center text-xs text-mute">
              Memuat emoji…
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  :global(emoji-picker) {
    width: 100% !important;
    height: 100% !important;
    --border-size: 0px !important;
    --background: var(--color-card, #ffffff);
    --input-border-color: var(--color-hairline, #e2e8f0);
    --input-border-radius: 8px;
    font-family: inherit;
  }
</style>
