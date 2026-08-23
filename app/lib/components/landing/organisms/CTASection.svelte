<script lang="ts">
  import Button from '../atoms/Button.svelte';
  import Keycap from '../atoms/Keycap.svelte';
  import { reveal } from '$lib/actions/reveal';

  let { user = null }: { user?: { name: string } | null } = $props();
</script>

<section class="mx-auto max-w-[1240px] px-6 py-24">
  <div
    use:reveal
    class="reveal relative isolate overflow-hidden rounded-xl border border-hairline bg-surface px-8 py-16 text-center sm:px-16"
  >
    <!-- ambient red wash, echoing the hero band once more at the close -->
    <div
      class="pointer-events-none absolute inset-0 -z-10 opacity-70"
      aria-hidden="true"
      style="background:
        radial-gradient(80% 120% at 50% -20%, rgba(255,87,87,0.16), transparent 60%),
        radial-gradient(60% 80% at 50% 120%, rgba(161,19,26,0.14), transparent 60%);"
    ></div>

    <h2 class="font-display mx-auto max-w-2xl text-[clamp(1.75rem,4vw,3rem)] font-semibold leading-tight tracking-tight text-ink">
      Ship your next app on a single port.
    </h2>
    <p class="mx-auto mt-4 max-w-lg text-lg text-mute">
      Clone the boilerplate, run one command, and you’re serving an API and an
      app from the same process in seconds.
    </p>

    <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
      {#if user}
        <Button variant="primary" size="lg" href="/dashboard">Open dashboard</Button>
      {:else}
        <Button variant="primary" size="lg" href="/register">Create your account</Button>
        <Button variant="tertiary" size="lg" href="/login">Sign in</Button>
      {/if}
    </div>

    <div class="mt-6 flex items-center justify-center gap-2 text-[13px] text-ash">
      <span>or press</span><Keycap>⌘</Keycap><Keycap>K</Keycap><span>anywhere</span>
    </div>
  </div>
</section>
