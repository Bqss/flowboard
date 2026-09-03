<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { Cancel01Icon } from '@hugeicons/core-free-icons';

  type SpotlightStep = {
    target?: string;
    title: string;
    body: string;
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto' | 'center';
  };

  type Props = {
    steps: SpotlightStep[];
    open: boolean;
    onClose: () => void;
    onComplete: () => void;
    labels: {
      next: string;
      prev: string;
      done: string;
      skip: string;
      step: (current: number, total: number) => string;
    };
  };

  let { steps, open, onClose, onComplete, labels }: Props = $props();

  let currentStep = $state(0);
  let targetRect = $state<DOMRect | null>(null);
  let tooltipPlacement = $state<'top' | 'bottom' | 'left' | 'right' | 'center'>('bottom');

  const PADDING = 8;
  const TOOLTIP_OFFSET = 16;

  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  let isWelcome = $state(false);

  function updateTargetRect() {
    if (!open || !steps || !steps.length || currentStep >= steps.length) return;
    const step = steps[currentStep];
    if (!step) return;

    // Welcome step — no target element, center tooltip
    if (!step.target) {
      isWelcome = true;
      targetRect = null;
      tooltipPlacement = 'center';
      return;
    }

    isWelcome = false;
    const el = document.querySelector(step.target);
    if (!el) {
      // Element not in DOM yet (e.g. async data still loading) — retry instead of skipping
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(updateTargetRect, 200);
      return;
    }

    const rect = el.getBoundingClientRect();
    targetRect = rect;

    const placement = step.placement ?? 'auto';
    if (placement === 'auto') {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      tooltipPlacement = spaceBelow > 280 || spaceBelow > spaceAbove ? 'bottom' : 'top';
    } else {
      tooltipPlacement = placement;
    }
  }

  $effect(() => {
    if (open && steps && steps.length) {
      currentStep = 0;
      requestAnimationFrame(updateTargetRect);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  // Re-compute on step change only
  $effect(() => {
    currentStep;
    if (open && steps && steps.length) {
      requestAnimationFrame(updateTargetRect);
    }
  });

  function handleResize() {
    if (open && steps && steps.length) updateTargetRect();
  }

  function handleKey(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      next();
    } else if (e.key === 'ArrowLeft') {
      prev();
    }
  }

  onMount(() => {
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKey);
  });

  onDestroy(() => {
    if (retryTimer) clearTimeout(retryTimer);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('keydown', handleKey);
  });
  function next() {
    if (!steps || !steps.length) return;
    if (currentStep < steps.length - 1) {
      currentStep++;
    } else {
      onComplete();
    }
  }

  function prev() {
    if (currentStep > 0) currentStep--;
  }

  // Compute clip-path to cut a hole around the target element
  const clipPath = $derived.by(() => {
    if (!targetRect) return 'none';
    const top = targetRect.top - PADDING;
    const left = targetRect.left - PADDING;
    const right = targetRect.right + PADDING;
    const bottom = targetRect.bottom + PADDING;
    return `polygon(
      0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
      ${left}px ${top}px,
      ${right}px ${top}px,
      ${right}px ${bottom}px,
      ${left}px ${bottom}px,
      ${left}px ${top}px
    )`;
  });

  const tooltipStyle = $derived.by(() => {
    const TOOLTIP_W = 320;
    const TOOLTIP_H = 200;
    const VW = window.innerWidth;
    const VH = window.innerHeight;
    const styles: string[] = ['position: fixed', `max-width: ${TOOLTIP_W}px`];

    // Welcome step — center on screen
    if (isWelcome) {
      styles.push(`top: ${(VH - TOOLTIP_H) / 2}px`);
      styles.push(`left: ${(VW - TOOLTIP_W) / 2}px`);
      return styles.join(';');
    }

    if (!targetRect) return '';
    const t = targetRect;

    let top: number;
    let left: number;

    if (tooltipPlacement === 'bottom') {
      top = t.bottom + TOOLTIP_OFFSET;
      left = t.left;
    } else if (tooltipPlacement === 'top') {
      top = t.top - TOOLTIP_OFFSET - TOOLTIP_H;
      left = t.left;
    } else if (tooltipPlacement === 'right') {
      top = t.top;
      left = t.right + TOOLTIP_OFFSET;
    } else {
      top = t.top;
      left = t.left - TOOLTIP_OFFSET - TOOLTIP_W;
    }

    // Clamp into viewport
    top = Math.max(16, Math.min(top, VH - TOOLTIP_H - 16));
    left = Math.max(16, Math.min(left, VW - TOOLTIP_W - 16));

    styles.push(`top: ${top}px`);
    styles.push(`left: ${left}px`);

    return styles.join(';');
  });
  const ringStyle = $derived.by(() => {
    if (!targetRect) return '';
    return [
      `position: fixed`,
      `top: ${targetRect.top - PADDING}px`,
      `left: ${targetRect.left - PADDING}px`,
      `width: ${targetRect.width + PADDING * 2}px`,
      `height: ${targetRect.height + PADDING * 2}px`,
      `border-radius: 12px`
    ].join(';');
  });
</script>

{#if open && steps && steps.length && (isWelcome || targetRect)}
  {#if !isWelcome}
    <!-- Overlay with cut-out hole — catches clicks outside target -->
    <div
      class="fixed inset-0 z-[200] transition-all duration-200"
      style="clip-path: {clipPath}; background: var(--overlay-scrim); backdrop-filter: blur(2px);"
    >
    </div>

    <!-- Highlight ring around target -->
    <div
      class="pointer-events-none z-[201] ring-2 ring-primary transition-all duration-200"
      style={ringStyle}
    >
    </div>
  {:else}
    <!-- Welcome step — full overlay, no hole, catches clicks -->
    <div
      class="fixed inset-0 z-[200] transition-all duration-200"
      style="background: var(--overlay-scrim); backdrop-filter: blur(2px);"
    >
    </div>
  {/if}

  <!-- Tooltip -->
  <div
    class="z-[202] rounded-xl border border-hairline bg-card p-5 shadow-[var(--shadow-modal)] transition-all duration-200"
    style={tooltipStyle}
  >
    <div class="mb-1 flex items-center justify-between gap-3">
      <span class="text-[11px] font-semibold uppercase tracking-wide text-mute">
        {labels.step(currentStep + 1, steps.length)}
      </span>
      <button
        type="button"
        onclick={onClose}
        class="grid size-6 shrink-0 place-items-center rounded-full text-mute transition-colors hover:bg-lane hover:text-ink"
        aria-label={labels.skip}
      >
        <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.8} />
      </button>
    </div>

    <h3 class="ds-label text-base font-semibold text-ink">{steps[currentStep].title}</h3>
    <p class="ds-body mt-1 text-sm text-mute">{steps[currentStep].body}</p>

    <div class="mt-4 flex items-center justify-between gap-2">
      <button
        type="button"
        onclick={onClose}
        class="text-[13px] font-medium text-mute transition-colors hover:text-ink"
      >
        {labels.skip}
      </button>

      <div class="flex items-center gap-2">
        {#if currentStep > 0}
          <button
            type="button"
            onclick={prev}
            class="rounded-lg border border-hairline bg-card px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-lane"
          >
            {labels.prev}
          </button>
        {/if}
        <button
          type="button"
          onclick={next}
          class="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary/90"
        >
          {currentStep < steps.length - 1 ? labels.next : labels.done}
        </button>
      </div>
    </div>

    <!-- Progress dots -->
    <div class="mt-3 flex items-center gap-1.5">
      {#each steps as _, i}
        <span
          class="h-1.5 rounded-full transition-all duration-200 {i === currentStep ? 'w-6 bg-primary' : i < currentStep ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-hairline-strong'}"
        ></span>
      {/each}
    </div>
  </div>
{/if}
