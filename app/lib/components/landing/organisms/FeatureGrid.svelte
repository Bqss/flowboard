<script lang="ts">
  import { locale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import { reveal } from '$lib/actions/reveal';

  const copy = $derived(landingCopy[$locale]);
  const signalVisuals = [
    { marker: 'bg-accent-blue', wash: 'bg-accent-blue/10' },
    { marker: 'bg-accent-green', wash: 'bg-accent-green/10' },
    { marker: 'bg-accent-red', wash: 'bg-accent-red/10' }
  ];
</script>

<section id="features" class="mx-auto max-w-[1240px] scroll-mt-20 px-6 py-24">
  <div class="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20">
    <div use:reveal class="reveal max-w-xl">
      <h2 class="font-display text-[clamp(1.9rem,4vw,3rem)] font-extrabold leading-[1.12] tracking-[-0.035em] text-ink">
        {copy.features.title}
      </h2>
      <p class="mt-5 text-lg leading-[1.6] text-body">
        {copy.features.body}
      </p>
      <a
        href="#how-it-works"
        class="mt-7 inline-flex items-center gap-2 rounded-full px-0 py-2 text-sm font-semibold text-primary transition-colors hover:text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2"
      >
        {copy.features.link}
      </a>
    </div>

    <div use:reveal={80} class="reveal overflow-hidden rounded-2xl border border-hairline bg-card shadow-card">
      <div class="flex items-center justify-between gap-4 border-b border-hairline bg-canvas-sunken px-5 py-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{copy.features.eyebrow}</p>
          <p class="mt-1 text-sm font-bold text-ink">{copy.features.panelTitle}</p>
        </div>
        <span class="text-xs font-semibold text-mute">{copy.features.signalsCount}</span>
      </div>

      <div class="divide-y divide-hairline">
        {#each copy.features.signals as signal, i}
          <div class="flex gap-4 px-5 py-6 sm:px-6 {signalVisuals[i].wash}">
            <span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full {signalVisuals[i].marker}" aria-hidden="true"></span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{signal.label}</p>
                <span class="text-[11px] font-bold tracking-[0.08em] text-faint">{signal.meta}</span>
              </div>
              <h3 class="mt-2 text-base font-bold text-ink">{signal.title}</h3>
              <p class="mt-1.5 max-w-lg text-sm leading-relaxed text-body">{signal.body}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>
