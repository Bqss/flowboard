<script lang="ts">
  import Hero from '$lib/components/landing/organisms/Hero.svelte';
  import FeatureGrid from '$lib/components/landing/organisms/FeatureGrid.svelte';
  import HowItWorks from '$lib/components/landing/organisms/HowItWorks.svelte';
  import UseCases from '$lib/components/landing/organisms/UseCases.svelte';
  import CTASection from '$lib/components/landing/organisms/CTASection.svelte';
  import type { LayoutData } from './$types';

  let { data }: { data: LayoutData } = $props();
</script>

<svelte:head>
  <title>Flowboard — Make the next handover obvious</title>
  <meta
    name="description"
    content="Flowboard gives customer-onboarding teams a visible path from intake to completion, with the next handover clear for everyone."
  />
</svelte:head>

<Hero user={data.user} />
<FeatureGrid />
<HowItWorks />
<UseCases />
<CTASection user={data.user} />
