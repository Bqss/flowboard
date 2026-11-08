<script lang="ts" module>
  let activeAudioEl: HTMLAudioElement | null = null;
</script>

<script lang="ts">
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { PlayIcon, PauseIcon } from '@hugeicons/core-free-icons';

  type Props = {
    src: string;
    fileName?: string;
    isOwn?: boolean;
    compact?: boolean;
    class?: string;
    onplay?: () => void;
    onpause?: () => void;
    onended?: () => void;
  };

  let {
    src,
    fileName = 'Rekaman suara',
    isOwn = false,
    compact = false,
    class: className = '',
    onplay,
    onpause,
    onended
  }: Props = $props();

  let audioEl = $state<HTMLAudioElement | null>(null);
  let isPlaying = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let isSeeking = $state(false);

  function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function togglePlay() {
    if (!audioEl) return;
    if (isPlaying) {
      audioEl.pause();
    } else {
      if (activeAudioEl && activeAudioEl !== audioEl) {
        activeAudioEl.pause();
      }
      activeAudioEl = audioEl;
      audioEl.play().catch(() => {});
    }
  }

  function handleLoadedMetadata() {
    if (!audioEl) return;
    if (Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
      duration = audioEl.duration;
    } else if (audioEl.duration === Infinity) {
      // Chromium WebM duration fix: seeking to a large offset forces duration calculation
      const tempSeek = () => {
        if (!audioEl) return;
        audioEl.removeEventListener('seeked', tempSeek);
        if (Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
          duration = audioEl.duration;
        }
        audioEl.currentTime = 0;
      };
      audioEl.addEventListener('seeked', tempSeek, { once: true });
      audioEl.currentTime = 1e10;
    }
  }

  function handleDurationChange() {
    if (audioEl && Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
      duration = audioEl.duration;
    }
  }

  function handleTimeUpdate() {
    if (!audioEl || isSeeking) return;
    currentTime = audioEl.currentTime;
    if (!duration && Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
      duration = audioEl.duration;
    } else if (audioEl.currentTime > duration) {
      duration = audioEl.currentTime;
    }
  }

  function handlePlay() {
    isPlaying = true;
    if (activeAudioEl && activeAudioEl !== audioEl) {
      activeAudioEl.pause();
    }
    activeAudioEl = audioEl;
    onplay?.();
  }

  function handlePause() {
    isPlaying = false;
    onpause?.();
  }

  function handleEnded() {
    isPlaying = false;
    currentTime = 0;
    if (audioEl) audioEl.currentTime = 0;
    if (activeAudioEl === audioEl) {
      activeAudioEl = null;
    }
    onended?.();
  }

  function handleSeekStart() {
    isSeeking = true;
  }

  function handleSeek(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const val = parseFloat(target.value);
    if (Number.isFinite(val)) {
      currentTime = val;
      if (audioEl) {
        audioEl.currentTime = val;
      }
    }
  }

  function handleSeekEnd() {
    isSeeking = false;
  }

  $effect(() => {
    // Pause and reset if source changes or component unmounts
    const el = audioEl;
    return () => {
      if (el) {
        el.pause();
      }
      if (activeAudioEl === el) {
        activeAudioEl = null;
      }
    };
  });

  let progressPercent = $derived.by(() => {
    if (!duration || duration <= 0 || !Number.isFinite(duration)) return 0;
    const pct = (currentTime / duration) * 100;
    return Math.min(100, Math.max(0, pct));
  });
</script>

{#if compact}
  <div
    class="flex items-center gap-2 w-full max-w-[240px] select-none {className}"
    role="group"
    aria-label={`Pratinjau rekaman suara ${fileName}`}
  >
    <audio
      bind:this={audioEl}
      src={src}
      preload="metadata"
      onloadedmetadata={handleLoadedMetadata}
      ondurationchange={handleDurationChange}
      ontimeupdate={handleTimeUpdate}
      onplay={handlePlay}
      onpause={handlePause}
      onended={handleEnded}
    ></audio>

    <!-- Compact Play Button -->
    <button
      type="button"
      onclick={togglePlay}
      class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-xs transition-transform hover:bg-primary-hover active:scale-95 focus:outline-hidden"
      aria-label={isPlaying ? 'Jeda rekaman' : 'Putar rekaman'}
    >
      {#if isPlaying}
        <HugeiconsIcon icon={PauseIcon} size={13} strokeWidth={2.4} />
      {:else}
        <HugeiconsIcon icon={PlayIcon} size={13} strokeWidth={2.4} class="translate-x-0.5" />
      {/if}
    </button>

    <!-- Compact Progress Bar Track -->
    <div class="relative flex h-3 flex-1 cursor-pointer items-center">
      <div class="relative h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
        <div
          class="h-full rounded-full bg-primary transition-[width] duration-75"
          style="width: {progressPercent}%;"
        ></div>
      </div>
      <input
        type="range"
        min="0"
        max={duration || 1}
        step="0.01"
        value={currentTime}
        oninput={handleSeek}
        onmousedown={handleSeekStart}
        onmouseup={handleSeekEnd}
        ontouchstart={handleSeekStart}
        ontouchend={handleSeekEnd}
        class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label="Posisi rekaman suara"
      />
    </div>

    <!-- Compact Duration -->
    <span class="shrink-0 text-[11px] font-medium tabular-nums text-mute">
      {formatTime(currentTime)} / {formatTime(duration)}
    </span>
  </div>
{:else}
  <div
    class="flex items-center gap-3 w-full min-w-[200px] max-w-[280px] select-none py-0.5 {className}"
    role="group"
    aria-label={`Pesan suara ${fileName}`}
  >
    <audio
      bind:this={audioEl}
      src={src}
      preload="metadata"
      onloadedmetadata={handleLoadedMetadata}
      ondurationchange={handleDurationChange}
      ontimeupdate={handleTimeUpdate}
      onplay={handlePlay}
      onpause={handlePause}
      onended={handleEnded}
    ></audio>

    <!-- Play/Pause Button -->
    <button
      type="button"
      onclick={togglePlay}
      class="relative flex size-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 focus:outline-hidden focus-visible:ring-2 {isOwn
        ? 'bg-white text-[#2563eb] shadow-xs hover:bg-white/95 focus-visible:ring-white/80'
        : 'bg-primary text-white shadow-xs hover:bg-primary-hover focus-visible:ring-primary/80'}"
      aria-label={isPlaying ? 'Jeda pesan suara' : 'Putar pesan suara'}
    >
      {#if isPlaying}
        <HugeiconsIcon icon={PauseIcon} size={16} strokeWidth={2.4} />
      {:else}
        <HugeiconsIcon icon={PlayIcon} size={16} strokeWidth={2.4} class="translate-x-0.5" />
      {/if}
    </button>

    <!-- Progress Bar and Duration Column -->
    <div class="flex flex-1 flex-col justify-center gap-1.5 min-w-0">
      <!-- Scrubber Track -->
      <div
        class="group/track relative flex h-3 w-full cursor-pointer items-center"
      >
        <!-- Background track -->
        <div class="relative h-1.5 w-full overflow-hidden rounded-full {isOwn ? 'bg-white/25' : 'bg-black/10 dark:bg-white/15'}">
          <!-- Filled track -->
          <div
            class="h-full rounded-full transition-[width] duration-75 {isOwn ? 'bg-white' : 'bg-primary'}"
            style="width: {progressPercent}%;"
          ></div>
        </div>

        <!-- Scrubber Thumb -->
        <div
          class="pointer-events-none absolute size-3 rounded-full transition-transform duration-75 {isOwn ? 'bg-white shadow-xs' : 'bg-primary shadow-xs'} {isSeeking ? 'scale-125' : 'scale-100 group-hover/track:scale-125'}"
          style="left: calc({progressPercent}% - 6px);"
        ></div>

        <!-- Range Input Overlay -->
        <input
          type="range"
          min="0"
          max={duration || 1}
          step="0.01"
          value={currentTime}
          oninput={handleSeek}
          onmousedown={handleSeekStart}
          onmouseup={handleSeekEnd}
          ontouchstart={handleSeekStart}
          ontouchend={handleSeekEnd}
          class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Posisi rekaman suara"
        />
      </div>

      <!-- Duration Times: elapsed time on left, total duration on right -->
      <div class="flex items-center justify-between text-[11px] font-medium tabular-nums {isOwn ? 'text-white/90' : 'text-mute'}">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  </div>
{/if}
