<script lang="ts">
  import Button from '../atoms/Button.svelte';
  import Badge from '../atoms/Badge.svelte';
  import { reveal } from '$lib/actions/reveal';

  /**
   * Pricing tier card. The `featured` tier flips to surface-elevated (one notch
   * lighter) — the only visual cue distinguishing it, per DESIGN.landing.md. Feature
   * checklist uses ✓ glyphs. CTA is the white pill on the featured tier only.
   */
  let {
    name,
    price,
    period = '/mo',
    description,
    features,
    cta,
    featured = false,
    delay = 0
  }: {
    name: string;
    price: string;
    period?: string;
    description: string;
    features: string[];
    cta: string;
    featured?: boolean;
    delay?: number;
  } = $props();
</script>

<div
  use:reveal={delay}
  class="reveal relative flex flex-col rounded-lg border p-6
    {featured
    ? 'border-hairline-strong bg-elevated'
    : 'border-hairline bg-surface'}"
>
  {#if featured}
    <div class="absolute right-6 top-6">
      <Badge tone="red" dot>Popular</Badge>
    </div>
  {/if}

  <h3 class="text-xl font-medium text-ink">{name}</h3>
  <div class="mt-4 flex items-baseline gap-1">
    <span class="font-display text-4xl font-semibold tracking-tight text-ink">{price}</span>
    {#if period}<span class="text-sm text-mute">{period}</span>{/if}
  </div>
  <p class="mt-2 text-sm leading-relaxed text-mute">{description}</p>

  <div class="mt-6">
    <Button variant={featured ? 'primary' : 'tertiary'} size="md" full href="/register">
      {cta}
    </Button>
  </div>

  <ul class="mt-6 flex flex-col gap-3 border-t border-hairline pt-6">
    {#each features as feature (feature)}
      <li class="flex items-start gap-2.5 text-sm text-body">
        <svg
          class="mt-0.5 h-4 w-4 shrink-0 text-accent-green"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        {feature}
      </li>
    {/each}
  </ul>
</div>
