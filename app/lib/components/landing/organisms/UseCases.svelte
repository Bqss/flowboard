<script lang="ts">
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    ArrowLeft01Icon,
    ArrowRight01Icon,
    CheckListIcon,
    Clock01Icon,
    UserGroupIcon,
    WhatsappIcon
  } from '@hugeicons/core-free-icons';
  import { locale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import { onMount, onDestroy } from 'svelte';
  import { reveal } from '$lib/actions/reveal.js';

  const copy = $derived(landingCopy[$locale]);
  let activeStage = $state(2);
  let paused = $state(false);
  let pauseTimer: ReturnType<typeof setTimeout>;
  let advanceTimer: ReturnType<typeof setInterval>;

  function moveStage(direction: number) {
    const total = copy.useCases.stages.length;
    activeStage = (activeStage + direction + total) % total;
  }

  function userSelect(index: number) {
    activeStage = index;
    pauseAutoAdvance();
  }

  function userMove(direction: number) {
    moveStage(direction);
    pauseAutoAdvance();
  }

  function pauseAutoAdvance() {
    paused = true;
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => (paused = false), 6000);
  }

  function handleStageKeys(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      userMove(1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      userMove(-1);
    }
  }

  onMount(() => {
    advanceTimer = setInterval(() => {
      if (!paused) moveStage(1);
    }, 3500);
  });

  onDestroy(() => {
    clearInterval(advanceTimer);
    clearTimeout(pauseTimer);
  });
</script>

<section id="use-cases" class="scroll-mt-24 overflow-hidden bg-canvas py-20 sm:py-28 lg:py-32">
  <div class="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
    <div class="max-w-[860px]" use:reveal>
      <h2 class="font-display text-balance text-[clamp(2rem,3.8vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink">
        {copy.useCases.title}
      </h2>
      <p class="mt-5 max-w-[62ch] text-[clamp(0.95rem,1.3vw,1.1rem)] font-medium leading-[1.6] tracking-[-0.01em] text-body">
        {copy.useCases.body}
      </p>
    </div>

    <figure class="workflow-shell mt-12 p-1.5 sm:mt-16 sm:p-2" use:reveal aria-label={copy.useCases.ariaLabel}>
      <figcaption class="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <div>
          <p class="text-sm font-semibold tracking-[-0.02em] text-ink">{copy.useCases.workflowName}</p>
          <p class="mt-1 text-xs font-medium text-mute">{copy.useCases.live}</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={() => userMove(-1)}
            aria-label={$locale === 'en' ? 'Previous stage' : 'Peringkat sebelumnya'}
            class="grid size-10 place-items-center rounded-full bg-card text-ink shadow-[0_5px_18px_rgba(47,46,101,0.09)] transition-transform duration-300 hover:-translate-x-0.5 active:scale-95"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={17} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onclick={() => userMove(1)}
            aria-label={$locale === 'en' ? 'Next stage' : 'Peringkat seterusnya'}
            class="grid size-10 place-items-center rounded-full bg-primary text-on-primary shadow-[0_8px_22px_rgba(79,70,229,0.24)] transition-transform duration-300 hover:translate-x-0.5 active:scale-95"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.8} />
          </button>
        </div>
      </figcaption>

      <div class="workflow-core overflow-hidden rounded-[22px] bg-canvas-sunken">
        <div class="overflow-x-auto px-5 pb-3 sm:px-7">
          <div class="stage-rail relative grid min-w-[820px] grid-cols-5 gap-2 py-8" role="tablist" aria-label={copy.useCases.activeWorkflow}>
            <div class="stage-track absolute left-[10%] right-[10%] top-[3.875rem] h-[2px] overflow-hidden rounded-full bg-hairline-strong/60" aria-hidden="true">
              <span class="stage-track-fill block h-full rounded-full bg-primary transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" style="width:{(activeStage / (copy.useCases.stages.length - 1)) * 100}%"></span>
            </div>
            {#each copy.useCases.stages as stage, i}
              <button
                type="button"
                role="tab"
                aria-selected={activeStage === i}
                tabindex={activeStage === i ? 0 : -1}
                onclick={() => userSelect(i)}
                onkeydown={handleStageKeys}
                class="stage-tab group relative z-10 flex min-h-[150px] flex-col items-start rounded-[18px] px-4 pb-4 pt-3 text-left transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] {activeStage === i ? 'is-active bg-card shadow-[0_18px_45px_rgba(47,46,101,0.14)]' : 'hover:-translate-y-1'}"
              >
                <span class="stage-dot grid size-9 place-items-center rounded-full ring-1 transition-[background-color,color,transform,box-shadow] duration-500 {i <= activeStage ? 'bg-primary-soft ring-primary/30' : 'bg-canvas-sunken ring-hairline-strong'}">
                  <span class="size-2 rounded-full {i <= activeStage ? 'bg-primary' : 'bg-hairline-strong'}"></span>
                </span>
                <span class="mt-auto text-xs font-semibold text-ink">{stage.label}</span>
                <span class="mt-1 text-[10px] font-medium leading-snug text-mute">{stage.detail}</span>
              </button>
            {/each}
          </div>
        </div>

        <div class="grid gap-3 p-3 sm:grid-cols-[1.1fr_.9fr] sm:p-4 lg:grid-cols-[1.25fr_.75fr]">
          {#key activeStage}
            <div class="active-stage-panel rounded-[20px] bg-card p-5 shadow-[0_16px_48px_rgba(47,46,101,0.1)] sm:p-7" role="tabpanel" aria-live="polite">
              <div class="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p class="text-xs font-semibold text-primary">{copy.useCases.stages[activeStage].label}</p>
                  <h3 class="mt-3 max-w-[18ch] text-2xl font-semibold leading-tight tracking-[-0.035em] text-ink sm:text-3xl">
                    {copy.useCases.stages[activeStage].detail}
                  </h3>
                </div>
                <span class="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary-ink">
                  {copy.useCases.stages[activeStage].count} cards
                </span>
              </div>

              <div class="mt-9 grid gap-3 sm:grid-cols-3">
                <div class="rounded-[16px] bg-canvas-sunken p-4">
                  <HugeiconsIcon icon={UserGroupIcon} size={18} strokeWidth={1.8} class="text-primary" />
                  <p class="mt-5 text-xs font-semibold text-ink">Assignee stays attached</p>
                </div>
                <div class="rounded-[16px] bg-canvas-sunken p-4">
                  <HugeiconsIcon icon={CheckListIcon} size={18} strokeWidth={1.8} class="text-primary" />
                  <p class="mt-5 text-xs font-semibold text-ink">Required work stays visible</p>
                </div>
                <div class="rounded-[16px] bg-canvas-sunken p-4">
                  <HugeiconsIcon icon={WhatsappIcon} size={18} strokeWidth={1.8} class="text-primary" />
                  <p class="mt-5 text-xs font-semibold text-ink">Messages keep their context</p>
                </div>
              </div>
            </div>
          {/key}

          <aside class="attention-panel rounded-[20px] bg-primary p-5 text-on-primary shadow-[0_18px_52px_rgba(79,70,229,0.28)] sm:p-7">
            <div class="flex items-center gap-2 text-xs font-semibold text-on-primary/70">
              <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />
              Team attention
            </div>
            <p class="mt-6 text-2xl font-semibold leading-tight tracking-[-0.035em]">The next action appears where the team already works.</p>
            <div class="mt-8 rounded-[16px] bg-on-primary/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
              <p class="text-[11px] font-semibold text-on-primary/65">Siti Aminah</p>
              <p class="mt-2 text-sm font-semibold">Review reply, then hand over to Diana</p>
            </div>
          </aside>
        </div>
      </div>
    </figure>
  </div>
</section>

<style>
  .workflow-shell {
    border-radius: 30px;
    background: color-mix(in oklab, var(--color-primary) 7%, var(--color-canvas));
    box-shadow:
      0 42px 110px rgba(47, 46, 101, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  :global(.dark) .workflow-shell {
    box-shadow:
      0 42px 110px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .workflow-core {
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-hairline) 78%, transparent);
  }

  .stage-tab.is-active {
    transform: translateY(-8px);
  }

  .stage-tab.is-active .stage-dot {
    transform: scale(1.12);
    box-shadow: 0 0 0 5px color-mix(in oklab, var(--color-primary) 12%, transparent);
  }

  .active-stage-panel {
    animation: panel-arrive 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes panel-arrive {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.985);
      filter: blur(6px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .active-stage-panel {
      animation: none;
    }
  }
</style>
