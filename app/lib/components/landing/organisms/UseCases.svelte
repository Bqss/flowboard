<script lang="ts">
  import { reveal } from '$lib/actions/reveal';

  const stages = [
    { label: 'Pending', detail: 'Verify customer data', count: '12', marker: 'bg-accent-blue' },
    { label: 'Confirmed', detail: 'Ready for the next step', count: '8', marker: 'bg-accent-yellow' },
    { label: 'H-1 reminder', detail: 'WhatsApp scheduled', count: '20', marker: 'bg-accent-red' },
    { label: 'Follow-up', detail: 'Waiting for a reply', count: '8', marker: 'bg-accent-yellow' },
    { label: 'Converted', detail: 'Journey complete', count: '47', marker: 'bg-accent-green' }
  ];
</script>

<section id="use-cases" class="mx-auto max-w-[1240px] scroll-mt-20 px-6 py-24">
  <div class="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20">
    <div use:reveal class="reveal max-w-xl">
      <h2 class="font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.12] tracking-[-0.025em] text-ink">
        A workflow that reads like the work.
      </h2>
      <p class="mt-5 text-lg leading-[1.6] text-mute">
        Replace the spreadsheet maze with one operational spine. Every stage answers
        the same question: what should happen next?
      </p>
      <div class="mt-8 flex flex-wrap items-center gap-2 text-[12px] text-mute">
        <span class="rounded-md border border-hairline bg-elevated px-2.5 py-1.5">Webinar registration</span>
        <span class="rounded-md border border-hairline bg-elevated px-2.5 py-1.5">6 stages</span>
        <span class="rounded-md border border-hairline bg-elevated px-2.5 py-1.5">12 active cards</span>
      </div>
    </div>

    <div
      use:reveal={80}
      role="img"
      aria-label="Flowboard workflow spine for webinar registration"
      class="reveal overflow-hidden rounded-xl border border-hairline bg-surface"
    >
      <div class="flex items-center justify-between gap-4 border-b border-hairline bg-elevated px-5 py-4 sm:px-6">
        <div>
          <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-ash">Active workflow</p>
          <p class="mt-1 text-sm font-medium text-ink">Webinar registration</p>
        </div>
        <span class="flex items-center gap-2 text-[11px] text-mute">
          <span class="h-1.5 w-1.5 rounded-full bg-accent-green" aria-hidden="true"></span>
          Live
        </span>
      </div>

      <div class="divide-y divide-hairline">
        {#each stages as stage, i}
          <div class="flex items-center gap-4 px-5 py-4 sm:px-6">
            <span class="w-5 font-mono text-[11px] text-ash">{String(i + 1).padStart(2, '0')}</span>
            <span class="h-2.5 w-2.5 shrink-0 rounded-full {stage.marker}" aria-hidden="true"></span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-ink">{stage.label}</p>
              <p class="mt-0.5 truncate text-[12px] text-mute">{stage.detail}</p>
            </div>
            <span class="text-sm font-medium text-charcoal">{stage.count}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>
