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
    <div
      class="pointer-events-none absolute inset-0 -z-10 opacity-80"
      aria-hidden="true"
      style="background:
        radial-gradient(80% 120% at 20% 0%, rgba(87,193,255,0.16), transparent 60%),
        radial-gradient(70% 100% at 90% 100%, rgba(89,212,153,0.12), transparent 65%);"
    ></div>

    <h2 class="font-display mx-auto max-w-2xl text-[clamp(1.75rem,4vw,3rem)] font-semibold leading-tight tracking-tight text-ink">
      Jangan biarkan customer berhenti di tengah jalan.
    </h2>
    <p class="mx-auto mt-4 max-w-lg text-lg text-mute">
      Buat workflow onboarding pertamamu, masukkan customer, dan lihat langkah berikutnya
      menjadi jelas untuk seluruh tim.
    </p>

    <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
      {#if user}
        <Button variant="primary" size="lg" href="/dashboard">Buka workspace</Button>
      {:else}
        <Button variant="primary" size="lg" href="/register">Buat workspace</Button>
        <Button variant="tertiary" size="lg" href="/login">Masuk</Button>
      {/if}
    </div>
  </div>
</section>
