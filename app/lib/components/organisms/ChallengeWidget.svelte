<script lang="ts">
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Rocket01Icon,
    Tick02Icon,
    ChevronDownIcon,
    ArrowRight01Icon
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

<!-- Floating widget bottom-right -->
<div class="fixed bottom-4 right-4 z-[150] sm:bottom-6 sm:right-6">
  {#if expanded}
    <!-- Expanded panel -->
    <div class="w-80 rounded-2xl border border-hairline bg-card shadow-[var(--shadow-modal)] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3 bg-canvas-sunken">
        <div class="flex items-center gap-2.5">
          <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
            <HugeiconsIcon icon={Rocket01Icon} size={16} strokeWidth={1.8} class="text-primary" />
          </div>
          <div class="min-w-0">
            <p class="text-[13px] font-semibold text-ink">{labels.title}</p>
            <p class="text-[11px] text-mute">
              {allDone ? labels.complete : labels.progress(completedCount, totalCount)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onclick={() => (expanded = false)}
          class="grid size-7 shrink-0 place-items-center rounded-lg text-mute transition-colors hover:bg-lane hover:text-ink"
          aria-label="Collapse"
        >
          <HugeiconsIcon icon={ChevronDownIcon} size={16} strokeWidth={1.8} />
        </button>
      </div>

      <!-- Progress bar -->
      <div class="px-4 pt-3">
        <div class="h-1.5 overflow-hidden rounded-full bg-lane">
          <div class="h-full rounded-full bg-primary transition-all duration-500" style="width: {progressPct}%"></div>
        </div>
      </div>

      <!-- Challenge list -->
      <div class="max-h-[320px] space-y-2 overflow-y-auto p-3">
        {#each challenges as chal, i (chal.key)}
          <div
            class="rounded-xl border p-3 transition-colors {chal.completed
              ? 'border-status-done/30 bg-status-done-soft/30'
              : 'border-hairline bg-card'}"
          >
            <div class="flex items-start gap-2.5">
              <!-- Number badge -->
              <div
                class="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold {chal.completed
                  ? 'bg-status-done text-white'
                  : 'bg-lane text-mute'}"
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
            <a
              href={chal.href}
              class="mt-2 flex items-center gap-1 pl-8.5 text-[11px] font-semibold text-primary transition-colors hover:text-primary/80"
            >
              {chal.ctaLabel}
              <HugeiconsIcon icon={ArrowRight01Icon} size={11} strokeWidth={2} />
            </a>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <!-- Collapsed pill -->
    <button
      type="button"
      onclick={() => (expanded = true)}
      class="flex items-center gap-3 rounded-2xl border border-hairline bg-card px-3.5 py-2.5 shadow-[var(--shadow-control)] transition-all hover:border-hairline-strong hover:shadow-[var(--shadow-modal)]"
    >
      <!-- Progress badge -->
      <div class="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-lane">
        <svg class="absolute inset-0 -rotate-90" viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="15" stroke="var(--color-hairline-strong)" stroke-width="3" />
          <circle
            cx="18" cy="18" r="15"
            stroke="var(--color-primary)" stroke-width="3"
            stroke-dasharray="{2 * Math.PI * 15}"
            stroke-dashoffset="{2 * Math.PI * 15 * (1 - progressPct / 100)}"
            stroke-linecap="round"
            class="transition-all duration-500"
          />
        </svg>
        <span class="text-[10px] font-bold text-ink">{completedCount}/{totalCount}</span>
      </div>

      <!-- Two-line text -->
      <div class="min-w-0 flex-1 text-left">
        <p class="text-[9px] font-bold uppercase tracking-wider text-primary">{labels.goalLabel}</p>
        <p class="text-[12px] font-semibold text-ink whitespace-nowrap truncate">{labels.title}</p>
      </div>

      <HugeiconsIcon icon={ChevronDownIcon} size={16} strokeWidth={1.8} class="shrink-0 text-mute rotate-180" />
    </button>
  {/if}
</div>
