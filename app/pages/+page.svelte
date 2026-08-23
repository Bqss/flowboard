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
  <title>Flowboard — Customer onboarding yang tidak terlewat</title>
  <meta
    name="description"
    content="Flowboard membantu tim menjalankan customer onboarding dengan workflow, checklist, reminder, dan WhatsApp automation yang terlihat jelas."
  />
</svelte:head>

<Hero user={data.user} />
<FeatureGrid />
<HowItWorks />
<UseCases />
<CTASection user={data.user} />
