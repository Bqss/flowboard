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
  <title>Flowboard — Customer onboarding without blind spots</title>
  <meta
    name="description"
    content="Flowboard gives every customer a clear path from intake to completion with workflows, checklists, reminders, and WhatsApp automation in one workspace."
  />
</svelte:head>

<Hero user={data.user} />
<FeatureGrid />
<HowItWorks />
<UseCases />
<CTASection user={data.user} />
