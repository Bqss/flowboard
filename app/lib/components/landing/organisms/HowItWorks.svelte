<script lang="ts">
  import { locale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import { reveal } from '$lib/actions/reveal';

  const copy = $derived(landingCopy[$locale]);
  const stepBars = ['bg-accent-blue', 'bg-accent-yellow', 'bg-accent-red'];
</script>

<section id="how-it-works" class="scroll-mt-20 border-y border-hairline bg-canvas-sunken">
  <div class="mx-auto max-w-[1240px] px-6 py-24">
    <div use:reveal class="reveal max-w-2xl">
      <h2 class="font-display text-[clamp(1.9rem,4vw,3rem)] font-extrabold leading-[1.12] tracking-[-0.035em] text-ink">
        {copy.howItWorks.title}
      </h2>
      <p class="mt-5 text-lg leading-[1.6] text-body">
        {copy.howItWorks.body}
      </p>
    </div>

    <div use:reveal={80} class="reveal mt-14 overflow-hidden rounded-2xl border border-hairline bg-card shadow-card">
      <div class="grid gap-px bg-hairline md:grid-cols-3">
        {#each copy.howItWorks.steps as step, i}
          <div class="relative bg-card p-6 sm:p-8">
            <span class="absolute inset-x-0 top-0 h-1.5 {stepBars[i]}" aria-hidden="true"></span>
            <span class="text-xs font-bold tracking-[0.08em] text-faint">{step.number}</span>
            <h3 class="mt-8 text-lg font-extrabold text-ink">{step.title}</h3>
            <p class="mt-3 text-sm leading-[1.6] text-body">{step.body}</p>
          </div>
        {/each}
      </div>
    </div>

    <div use:reveal={140} class="reveal mt-8 grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline shadow-card sm:grid-cols-2">
      <div class="bg-card px-6 py-5 sm:px-8">
        <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{copy.howItWorks.ownerMode}</p>
        <p class="mt-2 text-sm font-bold text-ink">{copy.howItWorks.ownerTitle}</p>
        <p class="mt-1.5 text-sm leading-relaxed text-body">{copy.howItWorks.ownerBody}</p>
      </div>
      <div class="bg-card px-6 py-5 sm:px-8">
        <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{copy.howItWorks.staffMode}</p>
        <p class="mt-2 text-sm font-bold text-ink">{copy.howItWorks.staffTitle}</p>
        <p class="mt-1.5 text-sm leading-relaxed text-body">{copy.howItWorks.staffBody}</p>
      </div>
    </div>
  </div>
</section>
