<script lang="ts">
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { CheckListIcon, Route02Icon, UserSwitchIcon } from '@hugeicons/core-free-icons';
  import { locale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import Button from '../atoms/Button.svelte';
  import { reveal } from '$lib/actions/reveal.js';
  let { user = null }: { user?: { name: string } | null } = $props();
  const copy = $derived(landingCopy[$locale]);
</script>

<section class="bg-canvas px-3 pb-3 pt-16 sm:px-5 sm:pb-5 sm:pt-24">
  <div class="cta-field relative mx-auto min-h-[560px] max-w-[1440px] overflow-hidden rounded-[30px] px-6 py-16 text-on-primary sm:px-10 sm:py-20 lg:px-16 lg:py-24">
    <div class="cta-orbit absolute -right-[12%] top-1/2 size-[640px] -translate-y-1/2 rounded-full" aria-hidden="true"></div>
    <div class="cta-orbit cta-orbit-small absolute right-[9%] top-1/2 size-[340px] -translate-y-1/2 rounded-full" aria-hidden="true"></div>

    <div class="relative z-10 flex min-h-[440px] max-w-[850px] flex-col justify-between" use:reveal>
      <h2 class="font-display text-balance text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-[1.0] tracking-[-0.04em] text-on-primary">
        {copy.cta.title}
      </h2>

      <div>
        <p class="max-w-[52ch] text-[clamp(0.95rem,1.3vw,1.15rem)] font-medium leading-[1.6] text-on-primary/76">
          {copy.cta.body}
        </p>
        <div class="mt-9 flex flex-wrap items-center gap-4">
          {#if user}
            <Button variant="secondary" size="lg" href="/dashboard" arrow class="cta-action">{copy.cta.openWorkspace}</Button>
          {:else}
            <Button variant="secondary" size="lg" href="/register" arrow class="cta-action">{copy.cta.startFree}</Button>
            <a href="/login" class="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-on-primary/78 transition-colors duration-300 hover:text-on-primary">
              {copy.cta.signIn}
            </a>
          {/if}
        </div>
      </div>
    </div>

    <div class="route-constellation absolute bottom-14 right-8 hidden w-[38%] max-w-[460px] lg:block" aria-hidden="true">
      <div class="flex items-center justify-between text-on-primary/55">
        <span class="grid size-12 place-items-center rounded-[15px] bg-on-primary/10"><HugeiconsIcon icon={Route02Icon} size={22} strokeWidth={1.6} /></span>
        <span class="h-px flex-1 bg-on-primary/18"></span>
        <span class="grid size-12 place-items-center rounded-[15px] bg-on-primary/10"><HugeiconsIcon icon={CheckListIcon} size={22} strokeWidth={1.6} /></span>
        <span class="h-px flex-1 bg-on-primary/18"></span>
        <span class="grid size-12 place-items-center rounded-[15px] bg-on-primary text-primary"><HugeiconsIcon icon={UserSwitchIcon} size={22} strokeWidth={1.6} /></span>
      </div>
    </div>
  </div>
</section>

<style>
  .cta-field {
    background:
      radial-gradient(circle at 90% 15%, rgba(199, 210, 254, 0.23), transparent 32%),
      linear-gradient(135deg, #312e81, #4f46e5 58%, #4338ca);
    box-shadow: 0 38px 100px rgba(49, 46, 129, 0.24);
  }

  .cta-orbit {
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: inset 0 0 100px rgba(255, 255, 255, 0.06);
  }

  .cta-orbit-small {
    border-color: rgba(255, 255, 255, 0.2);
  }

  :global(.cta-action) {
    background: #ffffff !important;
    color: #312e81 !important;
  }

  :global(.cta-action .bg-white\/14) {
    background: rgba(49, 46, 129, 0.12) !important;
  }

  @supports (animation-timeline: view()) {
    @media (prefers-reduced-motion: no-preference) {
      .cta-orbit {
        animation: orbit-enter both cubic-bezier(0.16, 1, 0.3, 1);
        animation-timeline: view();
        animation-range: entry 5% cover 55%;
      }
    }
  }

  @keyframes orbit-enter {
    from {
      opacity: 0.1;
      transform: translateY(-50%) scale(0.74) rotate(-18deg);
    }
  }
</style>
