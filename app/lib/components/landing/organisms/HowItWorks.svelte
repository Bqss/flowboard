<script lang="ts">
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    CheckListIcon,
    MessageNotification01Icon,
    Route02Icon,
    Tick02Icon,
    UserGroupIcon,
    WorkflowSquare01Icon
  } from '@hugeicons/core-free-icons';
  import { locale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import { reveal } from '$lib/actions/reveal.js';

  const copy = $derived(landingCopy[$locale]);
  const icons = [Route02Icon, CheckListIcon, MessageNotification01Icon];
</script>

<section id="how-it-works" class="scroll-mt-24 bg-canvas-sunken py-20 sm:py-28 lg:py-32">
  <div class="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
    <div class="max-w-[820px]" use:reveal>
      <h2 class="font-display text-balance text-[clamp(2rem,3.8vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink">
        {copy.howItWorks.title}
      </h2>
      <p class="mt-5 max-w-[58ch] text-[clamp(0.95rem,1.3vw,1.1rem)] font-medium leading-[1.6] tracking-[-0.01em] text-body">
        {copy.howItWorks.body}
      </p>
    </div>

    <div class="route-stack mt-12 lg:mt-16">
      {#each copy.howItWorks.steps as step, i}
        <div class="stack-slot">
          <article class="step-card relative mx-auto min-h-[420px] max-w-[1100px] overflow-hidden rounded-[28px] p-6 sm:min-h-[480px] sm:p-8 lg:p-12">
            <div class="relative z-10 grid min-h-[340px] gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
              <div>
                <span class="grid size-12 place-items-center rounded-[15px] bg-primary text-on-primary shadow-[0_14px_32px_rgba(79,70,229,0.24)]">
                  <HugeiconsIcon icon={icons[i]} size={23} strokeWidth={1.8} />
                </span>
                <h3 class="step-heading mt-6 max-w-[12ch] text-[clamp(1.75rem,3vw,2.75rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink">
                  {step.title}
                </h3>
                <p class="step-copy mt-4 max-w-[38ch] text-[clamp(0.9rem,1.2vw,1rem)] font-medium leading-[1.6] text-body">{step.body}</p>
              </div>

              {#if i === 0}
                <div class="route-builder self-center rounded-[20px] bg-card p-4 shadow-[0_26px_70px_rgba(47,46,101,0.15)] sm:p-5">
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-2 text-sm font-semibold text-ink">
                      <HugeiconsIcon icon={WorkflowSquare01Icon} size={18} strokeWidth={1.8} class="text-primary" />
                      Webinar onboarding
                    </div>
                    <span class="rounded-full bg-primary-soft px-3 py-1 text-[10px] font-semibold text-primary-ink">Illustrative</span>
                  </div>
                  <div class="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {#each copy.hero.stages as stage, stageIndex}
                      <div class="rounded-[14px] bg-canvas-sunken p-3">
                        <span class="block h-1.5 w-8 rounded-full {stageIndex < 3 ? 'bg-primary' : 'bg-hairline-strong'}"></span>
                        <span class="mt-6 block text-xs font-semibold text-ink">{stage.label}</span>
                        <span class="mt-1 block text-[10px] leading-snug text-mute">{stage.detail}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {:else if i === 1}
                <div class="checklist-sheet self-center rounded-[20px] bg-card p-4 shadow-[0_26px_70px_rgba(47,46,101,0.15)] sm:p-6">
                  <div class="flex items-center justify-between gap-4">
                    <div>
                      <p class="text-sm font-semibold text-ink">Confirm customer</p>
                      <p class="mt-1 text-xs text-mute">Required before Follow-up</p>
                    </div>
                    <span class="rounded-full bg-status-progress-soft px-3 py-1 text-[10px] font-semibold text-status-progress-ink">3 of 4</span>
                  </div>
                  <div class="mt-5 space-y-2">
                    {#each ['Verify contact details', 'Confirm attendance', 'Approve message template', 'Review customer reply'] as task, taskIndex}
                      <div class="flex items-center gap-3 rounded-2xl bg-canvas-sunken px-4 py-3.5">
                        <span class="grid size-6 shrink-0 place-items-center rounded-full {taskIndex < 3 ? 'bg-status-done-soft text-status-done-ink' : 'bg-card text-primary ring-1 ring-primary-border'}">
                          {#if taskIndex < 3}<HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2.2} />{/if}
                        </span>
                        <span class="text-xs font-semibold {taskIndex < 3 ? 'text-mute line-through' : 'text-ink'}">{task}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {:else}
                <div class="signal-exchange self-center">
                  <div class="ml-auto max-w-[320px] rounded-[20px] bg-white p-4 text-slate-900 shadow-[0_22px_60px_rgba(8,13,35,0.3)] sm:p-5">
                    <div class="flex items-center gap-2 text-xs font-semibold text-mute">
                      <HugeiconsIcon icon={MessageNotification01Icon} size={16} strokeWidth={1.8} class="text-primary" />
                      Customer reply
                    </div>
                    <p class="mt-4 text-lg font-semibold leading-snug tracking-[-0.025em]">“Yes, I can make the session.”</p>
                  </div>
                  <div class="relative -mt-3 mr-auto max-w-[360px] rounded-[20px] bg-primary p-4 text-on-primary shadow-[0_24px_70px_rgba(79,70,229,0.35)] sm:p-5">
                    <div class="flex items-center gap-2 text-xs font-semibold text-on-primary/70">
                      <HugeiconsIcon icon={UserGroupIcon} size={16} strokeWidth={1.8} />
                      Visible handover
                    </div>
                    <p class="mt-4 text-lg font-semibold leading-snug tracking-[-0.025em]">Diana has the context and the next action.</p>
                  </div>
                </div>
              {/if}
            </div>
          </article>
        </div>
      {/each}
    </div>

    <div class="role-bridge mx-auto mt-10 grid max-w-[1100px] gap-8 py-8 sm:grid-cols-2 sm:gap-12 sm:py-12" use:reveal>
      <div class="flex gap-4">
        <span class="grid size-10 shrink-0 place-items-center rounded-[13px] bg-primary-soft text-primary">
          <HugeiconsIcon icon={WorkflowSquare01Icon} size={19} strokeWidth={1.8} />
        </span>
        <div>
          <h3 class="text-lg font-semibold tracking-[-0.025em] text-ink">{copy.howItWorks.ownerTitle}</h3>
          <p class="mt-2 max-w-[42ch] text-sm font-medium leading-relaxed text-body">{copy.howItWorks.ownerBody}</p>
        </div>
      </div>
      <div class="flex gap-4">
        <span class="grid size-10 shrink-0 place-items-center rounded-[13px] bg-primary-soft text-primary">
          <HugeiconsIcon icon={UserGroupIcon} size={19} strokeWidth={1.8} />
        </span>
        <div>
          <h3 class="text-lg font-semibold tracking-[-0.025em] text-ink">{copy.howItWorks.staffTitle}</h3>
          <p class="mt-2 max-w-[42ch] text-sm font-medium leading-relaxed text-body">{copy.howItWorks.staffBody}</p>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .stack-slot {
    min-height: 72vh;
  }

  .step-card {
    position: sticky;
    top: 6rem;
    z-index: 1;
    background: var(--color-card);
    box-shadow:
      0 35px 100px rgba(47, 46, 101, 0.13),
      inset 0 1px 0 rgba(255, 255, 255, 0.72);
  }

  :global(.dark) .step-card {
    box-shadow:
      0 35px 100px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .stack-slot:nth-child(1) .step-card {
    z-index: 1;
    background:
      radial-gradient(circle at 80% 20%, color-mix(in oklab, var(--color-primary) 16%, transparent), transparent 35%),
      var(--color-primary-soft);
    rotate: -0.7deg;
  }

  .stack-slot:nth-child(2) .step-card {
    z-index: 2;
    rotate: 0.45deg;
  }

  .stack-slot:nth-child(3) .step-card {
    z-index: 3;
    background:
      radial-gradient(circle at 85% 12%, rgba(129, 140, 248, 0.28), transparent 38%),
      #15123e;
    rotate: -0.25deg;
    box-shadow: 0 38px 110px rgba(20, 18, 62, 0.34);
  }

  .stack-slot:nth-child(3) .step-heading,
  .stack-slot:nth-child(3) .step-copy {
    color: #f8fafc;
  }

  .stack-slot:nth-child(3) .step-copy {
    color: #c7d2fe;
  }

  .role-bridge {
    box-shadow: inset 0 1px 0 var(--color-hairline);
  }

  @media (max-width: 767px) {
    .stack-slot {
      min-height: auto;
    }

    .stack-slot + .stack-slot {
      margin-top: 1rem;
    }

    .step-card,
    .stack-slot:nth-child(1) .step-card,
    .stack-slot:nth-child(2) .step-card,
    .stack-slot:nth-child(3) .step-card {
      position: relative;
      top: auto;
      z-index: auto;
      min-height: 520px;
      transform: none;
      rotate: none;
    }
  }

</style>
