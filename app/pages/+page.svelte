<script lang="ts">
  import Hero from '$lib/components/landing/organisms/Hero.svelte';
  import FeatureGrid from '$lib/components/landing/organisms/FeatureGrid.svelte';
  import HowItWorks from '$lib/components/landing/organisms/HowItWorks.svelte';
  import UseCases from '$lib/components/landing/organisms/UseCases.svelte';
  import Pricing from '$lib/components/landing/organisms/Pricing.svelte';
  import FAQ from '$lib/components/landing/organisms/FAQ.svelte';
  import CTASection from '$lib/components/landing/organisms/CTASection.svelte';
  import { locale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import type { LayoutData } from './$types';

  let { data }: { data: LayoutData } = $props();
  const copy = $derived(landingCopy[$locale]);
</script>

<svelte:head>
  <title>{copy.meta.title}</title>
  <meta name="description" content={copy.meta.description} />
</svelte:head>

<Hero user={data.user} />
<FeatureGrid />
<HowItWorks />
<UseCases />
<Pricing user={data.user} />
<FAQ />
<CTASection user={data.user} />
