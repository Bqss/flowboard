<script lang="ts">
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Tick02Icon,
    SparklesIcon,
    Building02Icon
  } from '@hugeicons/core-free-icons';
  import { locale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import Button from '../atoms/Button.svelte';
  import { reveal } from '$lib/actions/reveal.js';

  let { user = null }: { user?: { name: string } | null } = $props();
  const copy = $derived(landingCopy[$locale]);
</script>

<section id="pricing" class="scroll-mt-24 bg-canvas-sunken py-20 sm:py-28 lg:py-32">
  <div class="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
    <div class="max-w-[820px]" use:reveal>
      <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{copy.pricing.eyebrow}</span>
      <h2 class="mt-4 font-display text-balance text-[clamp(2rem,3.8vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink">
        {copy.pricing.title}
      </h2>
      <p class="mt-5 max-w-[60ch] text-[clamp(0.95rem,1.3vw,1.1rem)] font-medium leading-[1.6] tracking-[-0.01em] text-body">
        {copy.pricing.body}
      </p>
    </div>

    <div class="pricing-grid mt-12 grid gap-4 lg:mt-16 lg:grid-cols-2 lg:gap-5">
      {#each copy.pricing.tiers as tier, i}
        <article
          class="tier-card relative overflow-hidden rounded-[24px] p-6 sm:p-8 lg:p-10 {tier.featured ? 'tier-featured' : ''}"
          class:tier-trial={!tier.featured}
          use:reveal={i * 150}
        >
          {#if tier.featured}
            <div class="tier-glow absolute -right-[18%] -top-[18%] size-[420px] rounded-full" aria-hidden="true"></div>
            <span class="tier-badge absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-on-primary/12 px-3 py-1.5 text-[11px] font-semibold text-on-primary/85 ring-1 ring-on-primary/15">
              <HugeiconsIcon icon={SparklesIcon} size={13} strokeWidth={2} />
              {copy.pricing.perWorkspace}
            </span>
          {:else}
            <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-[11px] font-semibold text-primary-ink">
              <HugeiconsIcon icon={Building02Icon} size={13} strokeWidth={2} />
              {tier.name}
            </span>
          {/if}

          <div class="relative z-10 flex h-full flex-col">
            <div class="mt-6">
              {#if !tier.featured}
                <p class="text-sm font-semibold text-ink">{tier.name}</p>
              {/if}
              <div class="mt-3 flex items-baseline gap-2">
                <span class="font-display text-[clamp(2.4rem,4vw,3.4rem)] font-semibold leading-none tracking-[-0.035em] {tier.featured ? 'text-on-primary' : 'text-ink'}">
                  {tier.price}
                </span>
                <span class="text-sm font-medium {tier.featured ? 'text-on-primary/65' : 'text-mute'}">{tier.period}</span>
              </div>
              <p class="mt-4 max-w-[42ch] text-[13px] font-medium leading-[1.6] {tier.featured ? 'text-on-primary/78' : 'text-body'}">
                {tier.description}
              </p>
            </div>

            <ul class="mt-7 space-y-3">
              {#each tier.features as feature}
                <li class="flex items-start gap-3">
                  <span class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full {tier.featured ? 'bg-on-primary/15 text-on-primary' : 'bg-status-done-soft text-status-done-ink'}">
                    <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2.2} />
                  </span>
                  <span class="text-[13px] font-medium leading-[1.55] {tier.featured ? 'text-on-primary/88' : 'text-body'}">{feature}</span>
                </li>
              {/each}
            </ul>

            <div class="mt-auto pt-8">
              {#if tier.featured}
                <Button
                  variant="secondary"
                  size="lg"
                  href={user ? '/dashboard' : tier.href}
                  arrow
                  class="tier-action"
                >
                  {user ? copy.nav.openWorkspace : tier.cta}
                </Button>
              {:else}
                <Button
                  variant="primary"
                  size="lg"
                  href={user ? '/dashboard' : tier.href}
                  arrow
                >
                  {user ? copy.nav.openWorkspace : tier.cta}
                </Button>
              {/if}
            </div>
          </div>
        </article>
      {/each}
    </div>

    <p class="pricing-note mx-auto mt-8 max-w-[68ch] text-center text-[13px] font-medium leading-[1.6] text-mute">
      {copy.pricing.note}
    </p>
  </div>
</section>

<style>
  .tier-card {
    background: var(--color-card);
    box-shadow:
      0 28px 80px rgba(47, 46, 101, 0.1),
      inset 0 0 0 1px color-mix(in oklab, var(--color-hairline) 82%, transparent);
    transition: transform 600ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 600ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  :global(.dark) .tier-card {
    box-shadow:
      0 28px 80px rgba(0, 0, 0, 0.3),
      inset 0 0 0 1px color-mix(in oklab, var(--color-hairline) 82%, transparent);
  }

  .tier-trial:hover {
    transform: translateY(-4px);
    box-shadow:
      0 36px 100px rgba(47, 46, 101, 0.16),
      inset 0 0 0 1px color-mix(in oklab, var(--color-primary-border) 80%, transparent);
  }

  .tier-featured {
    background:
      radial-gradient(circle at 88% 8%, rgba(129, 140, 248, 0.28), transparent 40%),
      linear-gradient(140deg, #312e81, #4f46e5 62%, #4338ca);
    box-shadow: 0 38px 110px rgba(49, 46, 129, 0.3);
    color: var(--color-on-primary);
  }

  .tier-featured:hover {
    transform: translateY(-4px);
    box-shadow: 0 46px 130px rgba(49, 46, 129, 0.38);
  }
  :global(.tier-action) {
    background: #ffffff !important;
    color: #312e81 !important;
  }

  :global(.tier-action .bg-white\/14) {
    background: rgba(49, 46, 129, 0.12) !important;
  }

  @media (max-width: 1023px) {
    .tier-featured {
      margin-top: 0.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tier-card,
    .tier-trial:hover,
    .tier-featured:hover {
      transition: none;
      transform: none;
    }
  }
</style>
