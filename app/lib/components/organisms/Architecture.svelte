<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
  import StatCard from '../molecules/StatCard.svelte';
  import Badge from '../atoms/Badge.svelte';
</script>

<section id="architecture" class="scroll-mt-20 border-y border-hairline bg-surface/40">
  <div class="mx-auto max-w-[1240px] px-6 py-24">
    <div use:reveal class="reveal max-w-2xl">
      <p class="text-[13px] font-medium uppercase tracking-[0.18em] text-accent-red">Architecture</p>
      <h2 class="font-display mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-ink">
        One process. Two runtimes. No hop.
      </h2>
      <p class="mt-4 text-lg leading-relaxed text-mute">
        Elysia holds <code class="rounded bg-elevated px-1.5 py-0.5 text-[13px] text-ink">Bun.serve</code>.
        API requests are answered natively; everything else delegates to the
        SvelteKit handler. API traffic never pays the cost of the frontend pipeline.
      </p>
    </div>

    <!-- request-flow diagram -->
    <div use:reveal={80} class="reveal mt-14 overflow-hidden rounded-xl border border-hairline bg-canvas">
      <div class="grid gap-px bg-hairline md:grid-cols-[1fr_auto_1fr]">
        <div class="flex flex-col justify-center bg-canvas p-8">
          <span class="text-[12px] font-medium uppercase tracking-wider text-ash">Incoming</span>
          <div class="mt-3 flex items-center gap-3">
            <span class="flex h-11 w-11 items-center justify-center rounded-md bg-elevated text-ink">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12h16M13 5l7 7-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <div>
              <div class="text-sm font-medium text-ink">Bun.serve</div>
              <div class="text-[13px] text-mute">owned by Elysia</div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-center bg-canvas px-6 py-8">
          <div class="flex flex-col items-center gap-2 text-ash">
            <svg class="h-6 w-6 rotate-90 md:rotate-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 8h12m0 0-4-4m4 4-4 4M4 16h12m0 0-4 4m4-4-4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="text-[11px] uppercase tracking-wider">route split</span>
          </div>
        </div>

        <div class="flex flex-col gap-px bg-hairline">
          <div class="flex items-center gap-3 bg-canvas p-6">
            <Badge tone="red">/api/*</Badge>
            <span class="text-sm text-body">→ Elysia, answered natively</span>
          </div>
          <div class="flex items-center gap-3 bg-canvas p-6">
            <Badge tone="blue">else</Badge>
            <span class="text-sm text-body">→ SvelteKit handler (SSR + assets)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- throughput stats -->
    <div use:reveal={140} class="reveal mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard value="~2×" label="Throughput" sub="native vs. pipelined /api" />
      <StatCard value="1" label="Port" sub="API + app, one process" />
      <StatCard value="0" label="Reverse proxies" sub="no CORS, no nginx" />
      <StatCard value="0ms" label="SSR API hop" sub="resolved in-process" />
    </div>
  </div>
</section>
