<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import Nav from '$lib/components/organisms/Nav.svelte';
  import Footer from '$lib/components/organisms/Footer.svelte';
  import type { LayoutData } from './$types';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import Lenis from 'lenis';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  // The landing page is full-bleed and its hero renders behind the fixed nav.
  // Every other route gets top padding to clear the nav and a footer.
  let isHome = $derived($page.url.pathname === '/');
  let isDashboard = $derived($page.url.pathname.startsWith('/dashboard'));

  $effect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis();
    lenis.on('scroll', ScrollTrigger.update);

    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(updateLenis);
    };
  });
</script>

<div class="flex min-h-screen flex-col bg-canvas text-body">
  {#if isDashboard}
    {@render children()}
  {:else}
    <Nav user={data.user} />

    {#if isHome}
      <main class="flex-1">
        {@render children()}
      </main>
      <Footer />
    {:else}
      <main class="flex flex-1 flex-col px-6 pb-24 pt-28">
        {@render children()}
      </main>
      <Footer />
    {/if}
  {/if}
</div>
