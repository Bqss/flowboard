<script lang="ts">
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    PlayIcon,
    PauseIcon,
    Video01Icon,
    Maximize02Icon,
    Minimize02Icon
  } from '@hugeicons/core-free-icons';

  type Props = {
    src: string;
    fileName?: string;
    hasCaption?: boolean;
    timestamp?: string;
  };

  let { src, fileName: _fileName, hasCaption = false, timestamp }: Props = $props();

  let videoEl = $state<HTMLVideoElement | null>(null);
  let containerEl = $state<HTMLDivElement | null>(null);
  let isPlaying = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let isHovering = $state(false);
  let playbackRate = $state(1);
  let controlsTimer: ReturnType<typeof setTimeout> | null = null;
  let showControls = $state(true);
  let isFullscreen = $state(false);

  $effect(() => {
    const handleFullscreenChange = () => {
      isFullscreen = document.fullscreenElement === containerEl;
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  });

  const rates = [1, 1.5, 2];

  function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function togglePlay() {
    if (!videoEl) return;
    if (isPlaying) {
      videoEl.pause();
    } else {
      videoEl.play().catch(() => {});
    }
  }

  function handleLoadedMetadata() {
    if (videoEl && Number.isFinite(videoEl.duration) && videoEl.duration > 0) {
      duration = videoEl.duration;
    }
  }

  function handleTimeUpdate() {
    if (videoEl) {
      currentTime = videoEl.currentTime;
      if (!duration && Number.isFinite(videoEl.duration) && videoEl.duration > 0) {
        duration = videoEl.duration;
      }
    }
  }

  function handleEnded() {
    isPlaying = false;
    currentTime = 0;
    if (videoEl) videoEl.currentTime = 0;
    showControls = true;
  }

  function handleSeek(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const time = parseFloat(target.value);
    if (videoEl && Number.isFinite(time)) {
      videoEl.currentTime = time;
      currentTime = time;
    }
  }

  function cycleRate() {
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    playbackRate = rates[nextIdx];
    if (videoEl) videoEl.playbackRate = playbackRate;
  }

  function toggleFullscreen() {
    if (!containerEl) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerEl.requestFullscreen().catch(() => {});
    }
  }

  function handleMouseMove() {
    showControls = true;
    if (controlsTimer) clearTimeout(controlsTimer);
    if (isPlaying) {
      controlsTimer = setTimeout(() => {
        if (isPlaying) showControls = false;
      }, 2500);
    }
  }

  function handleMouseEnter() {
    isHovering = true;
    showControls = true;
  }

  function handleMouseLeave() {
    isHovering = false;
    if (isPlaying) {
      showControls = false;
    }
  }
</script>

<div
  bind:this={containerEl}
  role="region"
  aria-label="Pemutar video"
  class="relative w-full overflow-hidden bg-black select-none group {isFullscreen ? 'flex items-center justify-center h-screen w-screen' : ''}"
  onmousemove={handleMouseMove}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  <video
    bind:this={videoEl}
    {src}
    preload="metadata"
    playsinline
    class="{isFullscreen ? 'h-full w-full max-h-screen max-w-screen' : 'max-h-[380px] w-full'} object-contain cursor-pointer"
    onclick={togglePlay}
    onloadedmetadata={handleLoadedMetadata}
    ontimeupdate={handleTimeUpdate}
    onended={handleEnded}
    onplay={() => (isPlaying = true)}
    onpause={() => (isPlaying = false)}
  >
    <track kind="captions" />
  </video>

  <!-- Big Center Play Button (WhatsApp style, Image #3) -->
  {#if !isPlaying}
    <button
      type="button"
      onclick={togglePlay}
      class="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors cursor-pointer"
      aria-label="Putar video"
    >
      <div class="flex size-14 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-xs shadow-lg transition-transform hover:scale-105 active:scale-95 border border-white/20">
        <HugeiconsIcon icon={PlayIcon} size={28} strokeWidth={2.5} class="translate-x-0.5" />
      </div>
    </button>
  {/if}

  <!-- Duration Badge on bottom-left (WhatsApp style, Image #3) -->
  {#if !isPlaying}
    <div class="pointer-events-none absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white shadow-xs backdrop-blur-xs tabular-nums">
      <HugeiconsIcon icon={Video01Icon} size={13} strokeWidth={2} />
      <span>{formatTime(duration)}</span>
    </div>
  {/if}

  <!-- Timestamp Overlay on bottom-right if no caption (WhatsApp style, Image #3) -->
  {#if !hasCaption && timestamp && !isPlaying}
    <div class="pointer-events-none absolute bottom-2.5 right-2.5 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white shadow-xs backdrop-blur-xs tabular-nums">
      {timestamp}
    </div>
  {/if}

  <!-- Minimal Custom Controls Bar (WhatsApp style, Image #4) -->
  {#if isPlaying || (showControls && currentTime > 0)}
    <div
      class="absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pt-6 pb-2 transition-opacity duration-200 {showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}"
    >
      <div class="flex items-center gap-2 text-white">
        <!-- Play / Pause toggle -->
        <button
          type="button"
          onclick={togglePlay}
          class="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          aria-label={isPlaying ? 'Jeda video' : 'Putar video'}
        >
          {#if isPlaying}
            <HugeiconsIcon icon={PauseIcon} size={15} strokeWidth={2.2} />
          {:else}
            <HugeiconsIcon icon={PlayIcon} size={15} strokeWidth={2.2} class="translate-x-0.5" />
          {/if}
        </button>

        <!-- Current time -->
        <span class="text-xs tabular-nums font-mono text-white/90 shrink-0">
          {formatTime(currentTime)}
        </span>

        <!-- Scrubber Progress Bar -->
        <input
          type="range"
          min="0"
          max={duration || 1}
          step="0.05"
          value={currentTime}
          oninput={handleSeek}
          class="h-1 flex-1 cursor-pointer accent-white"
          aria-label="Posisi video"
        />

        <!-- Duration time -->
        <span class="text-xs tabular-nums font-mono text-white/80 shrink-0">
          {formatTime(duration)}
        </span>

        <!-- Playback speed pill -->
        <button
          type="button"
          onclick={cycleRate}
          class="rounded px-1.5 py-0.5 text-[11px] font-semibold text-white/90 hover:bg-white/20 transition-colors shrink-0"
          title="Kecepatan putar"
        >
          {playbackRate}x
        </button>

        <!-- Fullscreen -->
        <button
          type="button"
          onclick={toggleFullscreen}
          class="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          aria-label={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
          title={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
        >
          {#if isFullscreen}
            <HugeiconsIcon icon={Minimize02Icon} size={15} strokeWidth={2} />
          {:else}
            <HugeiconsIcon icon={Maximize02Icon} size={15} strokeWidth={2} />
          {/if}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  div:fullscreen {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100vw !important;
    height: 100vh !important;
    background-color: #000000 !important;
  }

  div:fullscreen video {
    max-height: 100vh !important;
    max-width: 100vw !important;
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
  }
</style>
