<script lang="ts">
  import Button from '../atoms/Button.svelte';
  import { reveal } from '$lib/actions/reveal';

  let { user = null }: { user?: { name: string } | null } = $props();
</script>

<section class="mx-auto max-w-[1240px] px-6 py-24">
  <div use:reveal class="reveal rounded-2xl border border-primary-border bg-primary-soft p-8 shadow-card sm:p-12">
    <div class="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
      <div class="max-w-2xl">
        <h2 class="font-display text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.08] tracking-[-0.04em] text-ink">
          Put the next step where the team can see it.
        </h2>
        <p class="mt-5 max-w-xl text-lg leading-[1.6] text-body">
          Start with one workflow. Keep the journey visible. Let the team spend its energy
          on customers instead of reconstructing status.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3 lg:pb-1">
        {#if user}
          <Button variant="primary" size="lg" href="/dashboard">Open workspace</Button>
        {:else}
          <Button variant="primary" size="lg" href="/register">Start free</Button>
          <Button variant="secondary" size="lg" href="/login">Sign in</Button>
        {/if}
      </div>
    </div>
  </div>
</section>
