<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import Nav from '$lib/components/landing/organisms/Nav.svelte';
  import Footer from '$lib/components/landing/organisms/Footer.svelte';
  import type { LayoutData } from './$types';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import Lenis from 'lenis';
  import { ModeWatcher } from 'mode-watcher';
  import { initializeLocale, locale, localeToHtmlLang } from '$lib/i18n/index.js';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
  $effect(() => {
    initializeLocale();

    if (typeof document !== 'undefined') {
      document.documentElement.lang = localeToHtmlLang($locale);
    }
  });

  // The landing page is full-bleed and its hero renders behind the fixed nav.
  // Every other route gets top padding to clear the nav and a footer.
  let isHome = $derived($page.url.pathname === '/');
  let isDashboard = $derived($page.url.pathname.startsWith('/dashboard'));
  let isDesignSystem = $derived($page.url.pathname.startsWith('/design-system'));
  let isAuth = $derived(
    $page.url.pathname === '/login' ||
      $page.url.pathname === '/register' ||
      $page.url.pathname.startsWith('/invite/')
  );

  $effect(() => {
    if (isDashboard || isDesignSystem || isAuth) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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

{@html `<!-- THESIS: Flowboard turns customer operations into a route the whole team can see, refusing the generic centered SaaS hero and repeated feature grid. OWN-WORLD: Cold white routing glass, slate depth, indigo signal paths, concentric 12 to 30 pixel radii, and precise Geist typography. STORY: See a customer reply become a required handover, understand the operating layers, then start a workspace. FIRST VIEWPORT: A compact left thesis faces a large interactive routing console, with the Start free action visible and a native WebGL signal field behind it. FORM: Layered routing glass, grounded direction five, seed 28a00e56. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md. -->`}
<ModeWatcher defaultMode="light" themeColors={{ dark: '#0b1020', light: '#f8fafc' }} />
<div class="flex min-h-[100dvh] flex-col bg-canvas text-body" class:marketing-shell={isHome}>
  {#if isDashboard || isDesignSystem || isAuth}
    {@render children()}
  {:else}
    <Nav user={data.user} />

    {#if isHome}
      <main id="main-content" class="flex-1" tabindex="-1">
        {@render children()}
      </main>
      <Footer />
    {:else}
      <main id="main-content" class="flex flex-1 flex-col px-6 pb-24 pt-28" tabindex="-1">
        {@render children()}
      </main>
      <Footer />
    {/if}
  {/if}
</div>
