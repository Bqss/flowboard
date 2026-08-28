<script lang="ts">
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    ArrowRight01Icon,
    CheckListIcon,
    MessageIncoming01Icon,
    UserSwitchIcon,
    WhatsappIcon
  } from '@hugeicons/core-free-icons';
  import { locale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import Button from '../atoms/Button.svelte';
  import FlowField from './FlowField.svelte';
  let { user = null }: { user?: { name: string } | null } = $props();
  let traceHandover = $state(false);
  const copy = $derived(landingCopy[$locale]);
  const stageToneClasses = [
    'bg-status-queued',
    'bg-status-queued',
    'bg-status-urgent',
    'bg-status-done'
  ];
</script>

<section class="hero relative isolate min-h-[100dvh] overflow-hidden pt-24 sm:pt-28">
  <div class="hero-atmosphere absolute inset-0 -z-20" aria-hidden="true"></div>
  <FlowField class="pointer-events-none absolute inset-0 -z-10 opacity-60 dark:opacity-40" />

  <div class="mx-auto grid min-h-[calc(100dvh-7rem)] w-full max-w-[1440px] items-center gap-14 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-8 lg:px-12 lg:pb-20 lg:pt-2">
    <div class="hero-copy max-w-[620px] lg:pb-10">
      <h1 class="font-display text-balance text-[clamp(2.5rem,4.2vw,4rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink">
        {copy.hero.title}
      </h1>
      <p class="mt-6 max-w-[50ch] text-[clamp(1rem,1.4vw,1.15rem)] font-medium leading-[1.55] tracking-[-0.015em] text-body">
        {copy.hero.body}
      </p>

      <div class="mt-8 flex flex-wrap items-center gap-3">
        {#if user}
          <Button variant="primary" size="lg" href="/dashboard" arrow>{copy.hero.openWorkspace}</Button>
        {:else}
          <Button variant="primary" size="lg" href="/register" arrow>{copy.hero.startFree}</Button>
        {/if}
        <a
          href="#how-it-works"
          class="group inline-flex h-13 items-center px-3 text-[15px] font-semibold tracking-[-0.015em] text-ink-soft transition-colors duration-300 hover:text-primary focus-visible:rounded-full"
        >
          {copy.hero.seeHow}
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} class="ml-2 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" />
        </a>
      </div>
    </div>

    <div class="hero-object relative flex min-h-[520px] items-center justify-center [perspective:1400px] sm:min-h-[580px] lg:min-h-[620px]" class:is-traced={traceHandover}>
      <div class="route-orbit absolute inset-[7%_1%_2%_4%] rounded-[40%]" aria-hidden="true"></div>

      <section class="route-console relative w-[min(100%,780px)]" aria-label={copy.hero.ariaLabel}>
        <div class="console-shell">
          <div class="console-core">
            <header class="flex items-start justify-between gap-5 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
              <div>
                <p class="text-xs font-semibold text-mute">{copy.hero.recordTitle}</p>
                <p class="mt-1.5 text-lg font-semibold tracking-[-0.025em] text-ink">{copy.hero.customer}</p>
              </div>
              <span class="rounded-full bg-primary-soft px-3 py-1.5 text-[11px] font-semibold text-primary-ink">
                {copy.hero.illustrative}
              </span>
            </header>

            <div class="route-map px-5 pb-6 sm:px-7 sm:pb-7">
              <div class="route-track" aria-hidden="true"><span class="route-fill"></span></div>
              <div class="relative grid grid-cols-4 gap-1">
                {#each copy.hero.stages as stage, i}
                  <div class="stage-node text-center" class:is-current={i === 2} class:is-complete={traceHandover && i === 3}>
                    <span class="stage-marker mx-auto grid size-10 place-items-center rounded-full bg-card ring-1 ring-hairline">
                      <span class="size-2.5 rounded-full {stageToneClasses[i]}"></span>
                    </span>
                    <span class="mt-3 block text-[11px] font-semibold text-ink sm:text-xs">{stage.label}</span>
                    <span class="mt-1 hidden text-[10px] leading-snug text-mute sm:block">{stage.detail}</span>
                  </div>
                {/each}
              </div>
            </div>

            <div class="grid gap-3 bg-canvas-sunken/75 p-3 sm:grid-cols-[1.08fr_.92fr] sm:p-4">
              <article class="customer-card relative overflow-hidden rounded-2xl bg-card p-5 shadow-[0_16px_42px_rgba(47,46,101,0.1)]">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p class="text-[11px] font-semibold text-mute">FB-0427</p>
                    <h2 class="mt-2 text-xl font-semibold tracking-[-0.03em] text-ink">{copy.hero.customer}</h2>
                    <p class="mt-1.5 text-xs leading-relaxed text-mute">{copy.hero.customerContext}</p>
                  </div>
                  <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <HugeiconsIcon icon={WhatsappIcon} size={18} strokeWidth={1.8} />
                  </span>
                </div>

                <div class="mt-7 flex items-center justify-between gap-4 rounded-xl bg-canvas-sunken px-3.5 py-3">
                  <span class="inline-flex items-center gap-2 text-xs font-semibold text-body">
                    <HugeiconsIcon icon={CheckListIcon} size={16} strokeWidth={1.8} class="text-primary" />
                    3 / 4 required
                  </span>
                  <span class="text-[11px] font-semibold text-status-progress-ink">Reply waiting</span>
                </div>
              </article>

              <article class="handover-card rounded-2xl bg-ink p-5 text-card shadow-[0_20px_48px_rgba(47,46,101,0.2)]">
                <div class="flex items-center gap-2 text-[11px] font-semibold text-card/65">
                  <HugeiconsIcon icon={MessageIncoming01Icon} size={15} strokeWidth={1.8} />
                  {copy.hero.nextAction}
                </div>
                <p class="mt-4 text-lg font-semibold leading-tight tracking-[-0.025em] text-card">
                  {traceHandover ? copy.hero.handoverCreated : copy.hero.reviewReply}
                </p>
                <p class="mt-3 text-xs leading-relaxed text-card/68" aria-live="polite">
                  {traceHandover ? copy.hero.traceMessage : copy.hero.replyMessage}
                </p>

                <button
                  type="button"
                  aria-pressed={traceHandover}
                  onclick={() => (traceHandover = !traceHandover)}
                  class="trace-button mt-6 inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-full bg-card px-2 pl-4 text-left text-xs font-semibold text-ink transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                >
                  <span>{traceHandover ? copy.hero.resetTrace : copy.hero.traceHandover}</span>
                  <span class="grid size-8 place-items-center rounded-full bg-primary text-on-primary">
                    <HugeiconsIcon icon={UserSwitchIcon} size={16} strokeWidth={1.8} />
                  </span>
                </button>
              </article>
            </div>
          </div>
        </div>

        <div class="signal-sheet absolute -right-2 -top-9 hidden w-[42%] rounded-2xl bg-primary p-4 text-on-primary shadow-[0_20px_60px_rgba(79,70,229,0.28)] sm:block">
          <div class="flex items-center gap-2 text-xs font-semibold">
            <HugeiconsIcon icon={traceHandover ? UserSwitchIcon : MessageIncoming01Icon} size={16} strokeWidth={1.8} />
            {traceHandover ? copy.hero.handoverCreated : copy.hero.reviewReply}
          </div>
        </div>
      </section>
    </div>
  </div>
</section>

<style>
  @property --handover-progress {
    syntax: '<number>';
    inherits: false;
    initial-value: 0.68;
  }

  .hero-atmosphere {
    background:
      radial-gradient(circle at 80% 20%, color-mix(in oklab, var(--color-primary) 14%, transparent), transparent 28%),
      radial-gradient(circle at 28% 75%, color-mix(in oklab, var(--color-primary) 8%, transparent), transparent 36%),
      linear-gradient(180deg, var(--color-canvas) 0%, color-mix(in oklab, var(--color-primary-soft) 34%, var(--color-canvas)) 100%);
  }

  :global(.dark) .hero-copy {
    position: relative;
  }

  :global(.dark) .hero-copy::before {
    content: '';
    position: absolute;
    inset: -2rem -4rem -2rem -2rem;
    background: radial-gradient(ellipse at 30% 50%, color-mix(in oklab, var(--color-canvas) 72%, transparent), transparent 70%);
    z-index: -1;
    pointer-events: none;
  }

  .route-orbit {
    border: 1px solid color-mix(in oklab, var(--color-primary) 14%, transparent);
    transform: rotate(-8deg) translateZ(-80px);
    box-shadow: inset 0 0 90px color-mix(in oklab, var(--color-primary) 8%, transparent);
  }

  .route-console {
    transform: rotateY(-4deg);
    transition: transform 900ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .hero-object:hover .route-console {
    transform: rotateY(-2deg) translateZ(12px);
  }

  .console-shell {
    padding: 8px;
    border-radius: 30px;
    background: color-mix(in oklab, var(--color-primary) 6%, var(--color-canvas));
    box-shadow:
      0 40px 100px rgba(45, 42, 105, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  :global(.dark) .console-shell {
    box-shadow:
      0 40px 100px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .console-core {
    overflow: hidden;
    border-radius: 23px;
    background: color-mix(in oklab, var(--color-card) 94%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-hairline) 78%, transparent);
  }

  .route-map {
    position: relative;
  }

  .route-track {
    position: absolute;
    left: 12%;
    right: 12%;
    top: 19px;
    height: 2px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--color-hairline);
  }

  .route-fill {
    display: block;
    width: 100%;
    height: 100%;
    transform: scaleX(var(--handover-progress));
    transform-origin: left;
    background: var(--color-primary);
  }

  .hero-object {
    --handover-progress: 0.68;
    transition: --handover-progress 900ms cubic-bezier(0.16, 1, 0.3, 1);
    container-type: inline-size;
  }

  .hero-object.is-traced {
    --handover-progress: 1;
  }

  .stage-marker,
  .signal-sheet,
  .handover-card {
    transition:
      transform 700ms cubic-bezier(0.16, 1, 0.3, 1),
      background-color 500ms cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 700ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .is-traced .stage-node.is-complete .stage-marker {
    transform: scale(1.08);
    background: var(--color-status-done-soft);
    box-shadow: 0 0 0 7px color-mix(in oklab, var(--color-status-done) 12%, transparent);
  }

  .is-traced .handover-card {
    transform: translateY(-3px);
  }

  .is-traced .signal-sheet {
    transform: translate3d(-8px, 4px, 28px) rotate(1deg);
    background: var(--color-status-done-strong);
    box-shadow: 0 24px 64px color-mix(in oklab, var(--color-status-done) 28%, transparent);
  }

  @media (prefers-reduced-motion: no-preference) {
    .hero-copy {
      animation: hero-copy-in 900ms 100ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .route-console {
      animation: console-in 1100ms 180ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .signal-sheet {
      animation: signal-in 900ms 650ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }
  }

  @keyframes hero-copy-in {
    from {
      opacity: 0;
      transform: translateY(24px);
      filter: blur(8px);
    }
  }

  @keyframes console-in {
    from {
      opacity: 0;
      transform: translateY(24px) rotateY(-10deg) scale(0.94);
      filter: blur(12px);
    }
  }

  @keyframes signal-in {
    from {
      opacity: 0;
      transform: translate3d(16px, 20px, -20px) rotate(5deg);
    }
  }

  @container (max-width: 560px) {
    .console-shell {
      padding: 5px;
      border-radius: 24px;
    }

    .console-core {
      border-radius: 19px;
    }
  }

  @media (max-width: 1023px) {
    .hero-object {
      min-height: 560px;
    }

    .route-console {
      transform: rotateY(-2deg);
    }
  }

  @media (max-width: 639px) {
    .hero-object {
      min-height: 500px;
    }

    .route-orbit {
      inset: 5% -14% 3% -8%;
    }

    .route-console,
    .hero-object:hover .route-console {
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .route-console,
    .stage-marker,
    .signal-sheet,
    .handover-card,
    .hero-object {
      animation: none;
      transition: none;
    }
  }
</style>
