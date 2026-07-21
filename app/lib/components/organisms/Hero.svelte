<script lang="ts">
  import ShaderBackground from './ShaderBackground.svelte';
  import CommandPalette from './CommandPalette.svelte';
  import Button from '../atoms/Button.svelte';
  import Badge from '../atoms/Badge.svelte';
  import Keycap from '../atoms/Keycap.svelte';

  /** Hero band: the one place the red stripe atmosphere appears (via the
   *  shader). Left column carries the headline + CTA; right column anchors the
   *  live command-palette mockup — the brand's load-bearing visual. */
  let { user = null }: { user?: { name: string } | null } = $props();
</script>

<section class="relative isolate overflow-hidden min-h-[100dvh] flex flex-col justify-center">
  <ShaderBackground class="-z-10" />

  <!-- diagonal stripe accents echoing the launch-banner motif, hero only -->
  <div
    class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 opacity-[0.18]"
    aria-hidden="true"
    style="background: repeating-linear-gradient(115deg, transparent 0 60px, rgba(255,87,87,0.5) 60px 62px);
      mask-image: linear-gradient(to bottom, black, transparent);"
  ></div>

  <div class="mx-auto w-full max-w-[1240px] px-6 py-24 pt-32">
    <div class="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
      <!-- copy -->
      <div class="flex flex-col items-start" style="animation: narko-fade-up 0.8s both;">
        <Badge tone="red" dot>v1.0 — now on Bun</Badge>

        <h1
          class="font-display mt-6 text-[clamp(2.5rem,6vw,4rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-ink"
        >
          The <span
            class="bg-gradient-to-r from-[#ff5757] via-[#ff8a6b] to-[#a1131a] bg-clip-text text-transparent"
          >blisteringly fast</span><br />
          modern monolith.
        </h1>

        <p class="mt-5 max-w-lg text-lg leading-relaxed text-body">
          Experience the ultimate developer experience. Seamlessly serve 
          <span class="text-ink font-medium">SSR, CSR, and native APIs</span> 
          all from a single port on Bun. No reverse proxies, no CORS headaches—just 
          pure speed and simplicity.
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-3">
          {#if user}
            <Button variant="primary" size="lg" href="/dashboard">
              Open dashboard
            </Button>
          {:else}
            <Button variant="primary" size="lg" href="/register">
              Start building
            </Button>
          {/if}
          <Button variant="tertiary" size="lg" href="#architecture">
            How it works
          </Button>
        </div>

        <div class="mt-6 flex items-center gap-2 text-[13px] text-mute">
          <span>Spin it up:</span>
          <span class="flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-2.5 py-1 font-mono text-[12px] text-body">
            bun&nbsp;run&nbsp;dev
          </span>
          <span class="hidden items-center gap-1 sm:flex">
            <Keycap>⌘</Keycap><Keycap>K</Keycap> to explore
          </span>
        </div>
      </div>

      <!-- mockup -->
      <div
        class="relative"
        style="animation: narko-fade-up 1s 0.15s both;"
      >
        <div class="[animation:narko-float_7s_ease-in-out_infinite]">
          <CommandPalette />
        </div>
      </div>
    </div>
  </div>
</section>
