<script lang="ts">
  import { locale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import Button from '../atoms/Button.svelte';
  import Keycap from '../atoms/Keycap.svelte';

  let { user = null }: { user?: { name: string } | null } = $props();
  let traceHandover = $state(false);
  const copy = $derived(landingCopy[$locale]);

  const stageVisuals = [
    { marker: 'bg-accent-blue' },
    { marker: 'bg-accent-yellow' },
    { marker: 'bg-accent-red', current: true },
    { marker: 'bg-accent-green' }
  ];
</script>

<section class="relative isolate overflow-hidden">

  <div class="mx-auto w-full max-w-[1240px] px-6 pb-24 pt-32 lg:pb-32 lg:pt-40">
    <div class="grid items-start gap-14 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:gap-20">
      <div class="flex flex-col items-start">
        <h1 class="font-display max-w-2xl text-[clamp(2.8rem,6vw,4.25rem)] font-extrabold leading-[1.08] tracking-[-0.04em] text-ink">
          {copy.hero.title}
        </h1>
        <p class="mt-6 max-w-lg text-lg leading-[1.6] text-body">
          {copy.hero.body}
</p>

        <div class="mt-8 flex flex-wrap items-center gap-3">
          {#if user}
            <Button variant="primary" size="lg" href="/dashboard">{copy.hero.openWorkspace}</Button>
          {:else}
            <Button variant="primary" size="lg" href="/register">{copy.hero.startFree}</Button>
          {/if}
          <Button variant="secondary" size="lg" href="#how-it-works">{copy.hero.seeHow}</Button>
        </div>

        <div class="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-mute">
          <span>{copy.hero.workflow}</span>
          <span class="text-faint">/</span>
          <span>{copy.hero.checklist}</span>
          <span class="text-faint">/</span>
          <span>{copy.hero.handover}</span>
          <Keycap>⌘ K</Keycap>
        </div>
      </div>

      <div
        role="img"
        aria-label={copy.hero.ariaLabel}
        class="relative overflow-hidden rounded-2xl border border-hairline bg-card shadow-card"
      >
        <div class="flex items-center justify-between gap-4 border-b border-hairline bg-canvas-sunken px-5 py-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{copy.hero.recordLabel}</p>
            <p class="mt-1.5 text-sm font-bold text-ink">{copy.hero.recordTitle}</p>
          </div>
          <span class="rounded-full border border-primary-border bg-primary-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-primary-ink">{copy.hero.illustrative}</span>
        </div>

        <div class="relative p-5 sm:p-7">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{copy.hero.customerLabel}</p>
              <h2 class="mt-2 text-xl font-extrabold tracking-[-0.02em] text-ink">{copy.hero.customer}</h2>
              <p class="mt-1 text-sm text-mute">{copy.hero.customerContext}</p>
            </div>
            <span class="text-xs font-bold text-faint">FB-0427</span>
          </div>

          <div class="relative mt-8">
            <div
              class="pointer-events-none absolute inset-x-[11%] top-1.5 h-0.5 rounded-full bg-hairline-strong"
              aria-hidden="true"
            >
              <div class="h-full w-2/3 rounded-full bg-accent-red"></div>
            </div>

            <div class="relative grid grid-cols-4 gap-2">
              {#each copy.hero.stages as stage, i}
                <div class="flex min-w-0 flex-col items-center gap-2 text-center">
                  <span
                    class="relative z-10 h-3 w-3 rounded-full border-2 border-card {stageVisuals[i].marker} {stageVisuals[i].current ? 'ring-2 ring-accent-red/25' : ''}"
                  ></span>
                  <span class="text-xs font-semibold text-ink">{stage.label}</span>
                  <span class="hidden text-xs text-mute sm:block">{stage.detail}</span>
                </div>
              {/each}
            </div>
          </div>

          <div class="mt-12 border-t border-hairline pt-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{copy.hero.nextAction}</p>
                <p class="mt-1.5 text-sm font-bold text-ink">
                  {traceHandover ? copy.hero.handoverCreated : copy.hero.reviewReply}
                </p>
              </div>
              <Button variant="tertiary" size="sm" onclick={() => (traceHandover = !traceHandover)}>
                {traceHandover ? copy.hero.resetTrace : copy.hero.traceHandover}
              </Button>
            </div>

            <div class="mt-4 flex items-start gap-3 rounded-xl border border-hairline bg-canvas-sunken px-4 py-3 shadow-control" aria-live="polite">
              <span class="mt-1 h-2 w-2 shrink-0 rounded-full {traceHandover ? 'bg-accent-green' : 'bg-accent-red'}" aria-hidden="true"></span>
              {#if traceHandover}
                <p class="text-sm leading-relaxed text-body">{copy.hero.traceMessage}</p>
              {:else}
                <p class="text-sm leading-relaxed text-body">{copy.hero.replyMessage}</p>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
