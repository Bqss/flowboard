<script lang="ts">
  import Button from '../atoms/Button.svelte';
  import Keycap from '../atoms/Keycap.svelte';

  let { user = null }: { user?: { name: string } | null } = $props();
  let traceHandover = $state(false);

  const stages = [
    { label: 'Intake', detail: 'Customer added', marker: 'bg-accent-blue' },
    { label: 'Confirm', detail: 'Required checks', marker: 'bg-accent-yellow' },
    { label: 'Follow-up', detail: 'Reply received', current: true, marker: 'bg-accent-red' },
    { label: 'Complete', detail: 'Journey closed', marker: 'bg-accent-green' }
  ];
</script>

<section class="relative isolate overflow-hidden">

  <div class="mx-auto w-full max-w-[1240px] px-6 pb-24 pt-32 lg:pb-32 lg:pt-40">
    <div class="grid items-start gap-14 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:gap-20">
      <div class="flex flex-col items-start">
        <h1 class="font-display max-w-2xl text-[clamp(2.8rem,6vw,4.25rem)] font-extrabold leading-[1.08] tracking-[-0.04em] text-ink">
          Make the next handover obvious.
        </h1>
        <p class="mt-6 max-w-lg text-lg leading-[1.6] text-body">
          Keep every customer journey moving from intake to completion. Flowboard gives
          owners the system and staff the next action.
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-3">
          {#if user}
            <Button variant="primary" size="lg" href="/dashboard">Open workspace</Button>
          {:else}
            <Button variant="primary" size="lg" href="/register">Start free</Button>
          {/if}
          <Button variant="secondary" size="lg" href="#how-it-works">See how it moves</Button>
        </div>

        <div class="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-mute">
          <span>Workflow</span>
          <span class="text-faint">/</span>
          <span>Checklist</span>
          <span class="text-faint">/</span>
          <span>Handover</span>
          <Keycap>⌘ K</Keycap>
        </div>
      </div>

      <div
        role="img"
        aria-label="Illustrative Flowboard customer handover record"
        class="relative overflow-hidden rounded-2xl border border-hairline bg-card shadow-card"
      >
        <div class="flex items-center justify-between gap-4 border-b border-hairline bg-canvas-sunken px-5 py-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">Demo record / 04—07</p>
            <p class="mt-1.5 text-sm font-bold text-ink">Customer handover ledger</p>
          </div>
          <span class="rounded-full border border-primary-border bg-primary-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-primary-ink">Illustrative</span>
        </div>

        <div class="relative p-5 sm:p-7">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">Customer</p>
              <h2 class="mt-2 text-xl font-extrabold tracking-[-0.02em] text-ink">Siti Aminah</h2>
              <p class="mt-1 text-sm text-mute">Webinar registration · owner: Diana</p>
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
              {#each stages as stage}
                <div class="flex min-w-0 flex-col items-center gap-2 text-center">
                  <span
                    class="relative z-10 h-3 w-3 rounded-full border-2 border-card {stage.marker} {stage.current ? 'ring-2 ring-accent-red/25' : ''}"
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
                <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">Next action</p>
                <p class="mt-1.5 text-sm font-bold text-ink">
                  {traceHandover ? 'Staff handover created' : 'Review customer reply'}
                </p>
              </div>
              <Button variant="tertiary" size="sm" onclick={() => (traceHandover = !traceHandover)}>
                {traceHandover ? 'Reset trace' : 'Trace handover'}
              </Button>
            </div>

            <div class="mt-4 flex items-start gap-3 rounded-xl border border-hairline bg-canvas-sunken px-4 py-3 shadow-control" aria-live="polite">
              <span class="mt-1 h-2 w-2 shrink-0 rounded-full {traceHandover ? 'bg-accent-green' : 'bg-accent-red'}" aria-hidden="true"></span>
              {#if traceHandover}
                <p class="text-sm leading-relaxed text-body">Reply received at 09:42. Diana has the context and the next step.</p>
              {:else}
                <p class="text-sm leading-relaxed text-body">A reply can become a visible handover instead of disappearing in a chat thread.</p>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
