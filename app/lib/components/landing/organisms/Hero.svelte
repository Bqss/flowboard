<script lang="ts">
  import Button from '../atoms/Button.svelte';
  import Keycap from '../atoms/Keycap.svelte';

  let { user = null }: { user?: { name: string } | null } = $props();
</script>

<section class="relative isolate overflow-hidden">
  <div
    class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 opacity-90"
    aria-hidden="true"
    style="background: repeating-linear-gradient(115deg, transparent 0 58px, color-mix(in srgb, var(--color-accent-red) 48%, transparent) 58px 60px); mask-image: linear-gradient(to bottom, black, transparent);"
  ></div>

  <div class="mx-auto w-full max-w-[1240px] px-6 pb-24 pt-32 lg:pb-28 lg:pt-40">
    <div class="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
      <div class="flex flex-col items-start">

        <h1 class="font-display mt-0 max-w-2xl text-[clamp(2.75rem,6vw,4rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-ink">
          Customer onboarding
          <span class="block text-charcoal">without blind spots.</span>
        </h1>

        <p class="mt-6 max-w-xl text-lg leading-[1.6] text-body">
          Flowboard gives every customer a clear path from intake to completion:
          workflow, checklist, reminders, and handover in one workspace.
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-3">
          {#if user}
            <Button variant="primary" size="lg" href="/dashboard">Open workspace</Button>
          {:else}
            <Button variant="primary" size="lg" href="/register">Start free</Button>
          {/if}
          <Button variant="secondary" size="lg" href="#how-it-works">See how it works</Button>
        </div>

        <div class="mt-7 flex items-center gap-2 text-[13px] text-mute">
          <span>Set up workflows in one place</span>
          <Keycap>⌘ K</Keycap>
        </div>
      </div>

      <div
        role="img"
        aria-label="Flowboard command palette for customer operations"
        class="relative overflow-hidden rounded-xl border border-hairline bg-surface"
      >
        <div class="flex items-center gap-2 border-b border-hairline bg-elevated px-4 py-3">
          <span class="h-2.5 w-2.5 rounded-full bg-[#ff5f56]"></span>
          <span class="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]"></span>
          <span class="h-2.5 w-2.5 rounded-full bg-[#27c93f]"></span>
          <span class="ml-2 text-[12px] text-ash">flowboard — customer operations</span>
        </div>

        <div class="p-3 sm:p-4">
          <div class="flex h-10 items-center gap-3 rounded-md border border-hairline bg-elevated px-3 text-sm text-mute">
            <span class="flex h-5 w-5 items-center justify-center rounded border border-hairline-strong text-[11px] text-charcoal">/</span>
            <span class="flex-1">Search customers, workflows, or actions…</span>
            <Keycap>Esc</Keycap>
          </div>

          <div class="mt-3 space-y-1">
            <div class="flex items-center gap-3 rounded-md bg-card px-3 py-2.5">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-blue/12 text-xs font-medium text-accent-blue">01</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm text-ink">Open Webinar Registration</p>
                <p class="mt-0.5 text-[12px] text-mute">Workflow · 12 pending</p>
              </div>
              <Keycap>↵</Keycap>
            </div>
            <div class="flex items-center gap-3 rounded-md px-3 py-2.5">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-yellow/12 text-xs font-medium text-accent-yellow">02</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm text-ink">View Waiting Action</p>
                <p class="mt-0.5 text-[12px] text-mute">8 cards need attention</p>
              </div>
              <Keycap>⌘ 2</Keycap>
            </div>
            <div class="flex items-center gap-3 rounded-md px-3 py-2.5">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-green/12 text-xs font-medium text-accent-green">03</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm text-ink">Add a new customer</p>
                <p class="mt-0.5 text-[12px] text-mute">Manual · CSV · API/MCP</p>
              </div>
              <Keycap>⌘ 3</Keycap>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between border-t border-hairline px-1 pt-3 text-[11px] text-ash">
            <span>Flowboard command palette</span>
            <span>Customer ops</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
