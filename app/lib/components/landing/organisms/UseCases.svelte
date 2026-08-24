<script lang="ts">
  import { reveal } from '$lib/actions/reveal';

  const stages = [
    { label: 'Pending', detail: 'Verify customer data', count: '12', marker: 'bg-accent-blue', wash: 'bg-accent-blue/10' },
    { label: 'Confirmed', detail: 'Ready for the next step', count: '8', marker: 'bg-accent-yellow', wash: 'bg-accent-yellow/10' },
    { label: 'H-1 reminder', detail: 'WhatsApp scheduled', count: '20', marker: 'bg-accent-red', wash: 'bg-accent-red/10' },
    { label: 'Follow-up', detail: 'Waiting for a reply', count: '8', marker: 'bg-accent-yellow', wash: 'bg-accent-yellow/10' },
    { label: 'Converted', detail: 'Journey complete', count: '47', marker: 'bg-accent-green', wash: 'bg-accent-green/10' }
  ];
</script>

<section id="use-cases" class="mx-auto max-w-[1240px] scroll-mt-20 px-6 py-24">
  <div class="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20">
    <div use:reveal class="reveal max-w-xl">
      <h2 class="font-display text-[clamp(1.9rem,4vw,3rem)] font-extrabold leading-[1.12] tracking-[-0.035em] text-ink">
        A workflow that reads like the work.
      </h2>
      <p class="mt-5 text-lg leading-[1.6] text-body">
        Replace the spreadsheet maze with one operational spine. Every stage answers
        the same question: what should happen next?
      </p>
      <div class="mt-8 flex flex-wrap items-center gap-2 text-[12px] text-mute">
        <span class="rounded-full border border-hairline bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-control">Webinar registration</span>
        <span class="rounded-full border border-hairline bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-control">6 stages</span>
        <span class="rounded-full border border-hairline bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-control">12 active cards</span>
      </div>
    </div>

    <div
      use:reveal={80}
      role="img"
      aria-label="Flowboard workflow spine for webinar registration"
      class="reveal overflow-hidden rounded-2xl border border-hairline bg-card shadow-card"
    >
      <div class="flex items-center justify-between gap-4 border-b border-hairline bg-canvas-sunken px-5 py-4 sm:px-6">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">Active workflow</p>
          <p class="mt-1 text-sm font-bold text-ink">Webinar registration</p>
        </div>
        <span class="flex items-center gap-2 text-xs font-semibold text-mute">
          <span class="h-2 w-2 rounded-full bg-accent-green" aria-hidden="true"></span>
          Live
        </span>
      </div>

      <div class="divide-y divide-hairline">
        {#each stages as stage, i}
          <div class="flex items-center gap-4 px-5 py-4 sm:px-6 {stage.wash}">
            <span class="w-5 text-xs font-bold text-faint">{String(i + 1).padStart(2, '0')}</span>
            <span class="h-2.5 w-2.5 shrink-0 rounded-full {stage.marker}" aria-hidden="true"></span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-ink">{stage.label}</p>
              <p class="mt-0.5 truncate text-xs text-mute">{stage.detail}</p>
            </div>
            <span class="text-sm font-bold text-ink-soft">{stage.count}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>
