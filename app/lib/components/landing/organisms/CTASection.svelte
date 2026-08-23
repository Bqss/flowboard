<script lang="ts">
  import Button from '../atoms/Button.svelte';
  import { reveal } from '$lib/actions/reveal';

  let { user = null }: { user?: { name: string } | null } = $props();
</script>

<section class="mx-auto max-w-[1240px] px-6 py-24">
  <div
    use:reveal
    class="reveal relative isolate overflow-hidden rounded-xl border border-hairline bg-surface px-8 py-16 text-center sm:px-16"
  >

    <h2 class="font-display mx-auto max-w-2xl text-[clamp(1.75rem,4vw,3rem)] font-semibold leading-tight tracking-tight text-ink">
      Don’t let customers stall halfway through.
    </h2>
    <p class="mx-auto mt-4 max-w-lg text-lg text-mute">
      Create your first onboarding workflow, add customers, and make the next step clear
      for the whole team.
    </p>

    <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
      {#if user}
        <Button variant="primary" size="lg" href="/dashboard">Open workspace</Button>
      {:else}
        <Button variant="primary" size="lg" href="/register">Create workspace</Button>
        <Button variant="secondary" size="lg" href="/login">Sign in</Button>
      {/if}
    </div>
  </div>
</section>
