<script lang="ts">
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Rocket01Icon,
    Tick02Icon,
    ChevronDownIcon,
    ArrowRight01Icon,
    Minimize02Icon
  } from '@hugeicons/core-free-icons';

  type Challenge = {
    key: string;
    label: string;
    desc: string;
    icon: any;
    href: string;
    ctaLabel: string;
    completed: boolean;
  };

  type Props = {
    challenges: Challenge[];
    labels: {
      title: string;
      progress: (done: number, total: number) => string;
      complete: string;
      notStarted: string;
      completed: string;
      goalLabel: string;
    };
  };

  let { challenges, labels }: Props = $props();

  let expanded = $state(false);

  const completedCount = $derived(challenges.filter((c) => c.completed).length);
  const totalCount = $derived(challenges.length);
  const allDone = $derived(completedCount === totalCount && totalCount > 0);
  const progressPct = $derived(totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0);
</script>

<!-- Challenge widget (rendered inside shared floating dock) -->
<div class="shrink-0" data-onboarding="challenge-widget">
  {#if expanded}
    <!-- Expanded panel — matches ChatDock desktop panel style -->
    <div class="flex w-[320px] flex-col rounded-2xl border border-hairline bg-card shadow-popover overflow-hidden h-[460px] max-h-[calc(100vh-120px)]">
      <!-- Header — clean, matches ChatDock header -->
      <div class="flex items-center gap-2.5 border-b border-hairline px-3.5 py-3">
        <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
          <HugeiconsIcon icon={Rocket01Icon} size={18} strokeWidth={1.8} class="text-primary" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-ink">{labels.title}</p>
          <p class="text-[11px] text-mute">
            {allDone ? labels.complete : labels.progress(completedCount, totalCount)}
          </p>
        </div>
        <button
          type="button"
          onclick={() => (expanded = false)}
          class="flex size-8 shrink-0 items-center justify-center rounded-lg text-mute transition-colors hover:bg-canvas-sunken hover:text-ink"
          aria-label="Collapse"
        >
          <HugeiconsIcon icon={Minimize02Icon} size={18} strokeWidth={1.8} />
        </button>
      </div>

      <!-- Progress bar -->
      <div class="px-3.5 pt-3 pb-1">
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <span class="text-[11px] font-medium text-mute">{progressPct}%</span>
          <span class="text-[11px] font-medium text-mute">{completedCount}/{totalCount}</span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-lane">
          <div class="h-full rounded-full bg-primary transition-all duration-500" style="width: {progressPct}%"></div>
        </div>
      </div>

      <!-- Challenge list — scrollable like ChatDock conversation list -->
      <div class="min-h-0 flex-1 overflow-y-auto p-2.5">
        {#each challenges as chal, i (chal.key)}
          <div
            class="mb-1.5 rounded-xl border p-3 transition-colors {chal.completed
              ? 'border-status-done/20 bg-status-done-soft/40'
              : 'border-hairline bg-card hover:bg-canvas-sunken/40'}"
          >
            <div class="flex items-start gap-2.5">
              <!-- Number badge -->
              <div
                class="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold {chal.completed
                  ? 'bg-status-done text-white'
                  : 'bg-primary-soft text-primary'}"
              >
                {#if chal.completed}
                  <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={2.5} />
                {:else}
                  {i + 1}
                {/if}
              </div>

              <!-- Content -->
              <div class="min-w-0 flex-1 space-y-0.5">
                <p class="text-[12px] font-semibold {chal.completed ? 'text-mute line-through' : 'text-ink'}">
                  {chal.label}
                </p>
                <p class="text-[11px] text-mute leading-relaxed">{chal.desc}</p>
              </div>
            </div>

            <!-- CTA link -->
            {#if !chal.completed}
              <a
                href={chal.href}
                class="mt-2 flex items-center gap-1 pl-8.5 text-[11px] font-semibold text-primary transition-colors hover:text-primary-hover"
              >
                {chal.ctaLabel}
                <HugeiconsIcon icon={ArrowRight01Icon} size={11} strokeWidth={2} />
              </a>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <!-- Collapsed pill — matches ChatDock collapsed button style -->
    <button
      type="button"
      onclick={() => (expanded = true)}
      class="flex items-center gap-2.5 rounded-full border border-hairline bg-card px-4 py-3 shadow-popover transition-all hover:border-hairline-strong hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
    >
      <!-- Progress ring -->
      <div class="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft">
        <svg class="absolute inset-0 -rotate-90" viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="15" stroke="var(--color-primary-border)" stroke-width="3" />
          <circle
            cx="18" cy="18" r="15"
            stroke="var(--color-primary)" stroke-width="3"
            stroke-dasharray="{2 * Math.PI * 15}"
            stroke-dashoffset="{2 * Math.PI * 15 * (1 - progressPct / 100)}"
            stroke-linecap="round"
            class="transition-all duration-500"
          />
        </svg>
        <span class="text-[10px] font-bold text-primary">{completedCount}/{totalCount}</span>
      </div>

      <span class="ds-label text-ink">{labels.goalLabel}</span>

      <HugeiconsIcon icon={ChevronDownIcon} size={16} strokeWidth={1.8} class="shrink-0 text-mute rotate-180" />
    </button>
  {/if}
</div>
