<script lang="ts">
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { Alert02Icon, CheckListIcon, Layers01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
  import { locale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import { reveal } from '$lib/actions/reveal.js';

  const copy = $derived(landingCopy[$locale]);
  const icons = [Layers01Icon, CheckListIcon, Alert02Icon];
</script>

<section id="features" class="scroll-mt-24 bg-canvas py-20 sm:py-28 lg:py-32">
  <div class="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
    <div class="max-w-[820px]" use:reveal>
      <h2 class="font-display text-balance text-[clamp(2rem,3.8vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink">
        {copy.features.title}
      </h2>
      <p class="mt-5 max-w-[62ch] text-[clamp(0.95rem,1.3vw,1.1rem)] font-medium leading-[1.6] tracking-[-0.01em] text-body">
        {copy.features.body}
      </p>
    </div>

    <div class="signal-grid mt-12 grid gap-4 md:grid-cols-12 md:grid-rows-2 lg:mt-16">
      {#each copy.features.signals as signal, i}
        <article class="signal-panel relative overflow-hidden rounded-[24px] p-6 sm:p-8 {i === 0 ? 'md:col-span-7 md:row-span-2' : 'md:col-span-5'}" use:reveal={i * 120}>
          <div class="relative z-10 flex h-full flex-col">
            <div class="flex items-center justify-between gap-4">
              <span class="grid size-11 place-items-center rounded-[14px] bg-card/80 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <HugeiconsIcon icon={icons[i]} size={21} strokeWidth={1.8} />
              </span>
              <span class="text-xs font-semibold text-mute">{signal.label}</span>
            </div>

            <div class="mt-auto pt-16 sm:pt-24">
              <h3 class="max-w-[15ch] text-[clamp(1.4rem,2.4vw,2rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
                {signal.title}
              </h3>
              <p class="mt-3 max-w-[42ch] text-[13px] font-medium leading-[1.6] text-body sm:text-sm">{signal.body}</p>
            </div>

            {#if i === 0}
              <div class="journey-layer absolute right-5 top-16 w-[52%] max-w-[280px] rotate-[4deg] rounded-2xl bg-card p-4 shadow-[0_24px_70px_rgba(55,48,135,0.18)] sm:right-8 sm:top-10">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs font-semibold text-ink">Siti Aminah</span>
                  <span class="rounded-full bg-status-urgent-soft px-2 py-1 text-[9px] font-semibold text-status-urgent-ink">Reply waiting</span>
                </div>
                <div class="mt-4 flex items-center gap-2" aria-hidden="true">
                  <span class="size-2 rounded-full bg-primary"></span>
                  <span class="h-px flex-1 bg-primary/35"></span>
                  <span class="size-2 rounded-full bg-status-urgent"></span>
                  <span class="h-px flex-1 bg-hairline-strong"></span>
                  <span class="size-2 rounded-full bg-hairline-strong"></span>
                </div>
                <div class="mt-4 flex items-center justify-between text-[10px] font-semibold text-mute">
                  <span>Customer</span>
                  <span>Owner: Diana</span>
                </div>
              </div>
            {:else if i === 1}
              <div class="absolute right-6 top-6 w-[42%] space-y-2 sm:right-8 sm:top-7">
                {#each ['Customer confirmed', 'Template approved', 'Reply reviewed'] as task, taskIndex}
                  <div class="flex items-center gap-2 rounded-xl bg-card/85 px-3 py-2 text-[10px] font-semibold text-ink shadow-[0_7px_22px_rgba(55,48,135,0.08)]">
                    <span class="grid size-4 shrink-0 place-items-center rounded-full {taskIndex < 2 ? 'bg-status-done-soft text-status-done-ink' : 'bg-primary-soft text-primary'}">
                      {#if taskIndex < 2}<HugeiconsIcon icon={Tick02Icon} size={10} strokeWidth={2.2} />{/if}
                    </span>
                    <span class="truncate">{task}</span>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="absolute right-6 top-6 w-[42%] sm:right-8 sm:top-7">
                <div class="rounded-2xl bg-card/12 p-3 text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                  <div class="text-[10px] font-semibold text-on-primary/65">Reply received</div>
                  <div class="mt-2 text-xs font-semibold">Handover to Diana</div>
                  <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-on-primary/15">
                    <span class="block h-full w-3/4 rounded-full bg-on-primary/80"></span>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .signal-panel {
    min-height: 280px;
    background: var(--color-canvas-sunken);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--color-hairline) 82%, transparent);
  }

  :global(.dark) .signal-panel {
    background: color-mix(in oklab, var(--color-card) 60%, var(--color-canvas-sunken));
  }

  .signal-panel:first-child {
    min-height: 440px;
    background:
      radial-gradient(circle at 90% 8%, color-mix(in oklab, var(--color-primary) 18%, transparent), transparent 35%),
      var(--color-primary-soft);
  }

  :global(.dark) .signal-panel:first-child {
    background:
      radial-gradient(circle at 90% 8%, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 40%),
      color-mix(in oklab, var(--color-primary-soft) 50%, var(--color-card));
  }

  .signal-panel:last-child {
    background:
      radial-gradient(circle at 90% 0%, rgba(129, 140, 248, 0.26), transparent 42%),
      #272168;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.13);
  }

  .signal-panel:last-child :global(h3),
  .signal-panel:last-child :global(p) {
    color: #f8fafc;
  }

  .signal-panel:last-child :global(.text-mute) {
    color: #c7d2fe;
  }


  @media (max-width: 767px) {
    .signal-panel,
    .signal-panel:first-child {
      min-height: 360px;
    }

    .signal-panel:not(:first-child) {
      min-height: 280px;
    }
  }
</style>
