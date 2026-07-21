<script lang="ts">
  import Hero from '$lib/components/organisms/Hero.svelte';
  import FeatureGrid from '$lib/components/organisms/FeatureGrid.svelte';
  import Architecture from '$lib/components/organisms/Architecture.svelte';
  import BenchmarkSection from '$lib/components/organisms/BenchmarkSection.svelte';
  import SsrCsrSection from '$lib/components/organisms/SsrCsrSection.svelte';
  import StackSection from '$lib/components/organisms/StackSection.svelte';
  import CTASection from '$lib/components/organisms/CTASection.svelte';
  import type { LayoutData } from './$types';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  let { data }: { data: LayoutData } = $props();

  $effect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    // Get all sections except the Hero (which already has CSS intro animations)
    const sections = document.querySelectorAll('main section:not(:first-of-type)');

    sections.forEach((section) => {
      // Select main elements to stagger within each section
      // We target common block elements and interactive elements, avoiding deep nesting duplicates
      const elements = section.querySelectorAll(':scope > div h2, :scope > div h3, :scope > div p, :scope > div img, :scope > div .grid > *, :scope > div > a, :scope > div > button, .reveal');
      
      if (elements.length === 0) return;

      // Prepare elements
      gsap.set(elements, { opacity: 0, y: 40 });

      // Create scroll trigger for the section
      ScrollTrigger.create({
        trigger: section,
        start: 'top 80%',
        onEnter: () => {
          gsap.to(elements, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: 'power3.out',
            overwrite: 'auto'
          });
        },
        once: true
      });
    });
  });
</script>

<svelte:head>
  <title>Narko — The blisteringly fast modern monolith</title>
  <meta
    name="description"
    content="Experience the ultimate developer experience. Seamlessly serve SSR, CSR, and native APIs all from a single port on Bun. No reverse proxies, no CORS headaches—just pure speed and simplicity."
  />
</svelte:head>

<Hero user={data.user} />
<FeatureGrid />
<Architecture />
<BenchmarkSection />
<SsrCsrSection />
<StackSection />
<CTASection user={data.user} />
